import { NextRequest, NextResponse } from "next/server";

// Allowed asset classes and basic guardrails
const ALLOWED_CLASSES = ["Stocks","Mutual Funds","Gold","Real Estate","Debt","Liquid"] as const;

type AllowedClass = typeof ALLOWED_CLASSES[number];

// Call Groq to get refined allocation percentages and optional comfort ranges
type AiResult = { buckets: Array<{ class: string; pct: number; min?: number; max?: number; range?: [number, number] }>; rationale?: string; confidence?: number; diag?: { missingKey?: boolean; status?: number; parseError?: string; raw?: string } };
async function callGroqForAllocation(prompt: string): Promise<AiResult> {
	const apiKey = (process.env.GROQ_API_KEY || "").trim();
	if (!apiKey) return { buckets: [], diag: { missingKey: true } };
	try {
		const system = `You are a portfolio allocation assistant. Allowed classes: ${ALLOWED_CLASSES.join(", ")}. Respond ONLY JSON like {"buckets":[{"class":"Stocks","pct":35,"min":30,"max":40},...], "rationale": string, "confidence": 0.0-1.0}. Percentages must sum to ~100. For each bucket, include a reasonable comfort range (min/max in percent) that contains pct.`;
		const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Accept": "application/json",
				"Authorization": `Bearer ${apiKey}`,
				"User-Agent": "finsight-next/1.0"
			},
			body: JSON.stringify({
				model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: prompt }
				],
				temperature: 0,
				top_p: 1,
			})
		});
		const status = res.status;
		const data = await res.json();
		const txt = (data?.choices?.[0]?.message?.content as string) || "";
		try {
			const parsed = JSON.parse(txt);
			return {
				buckets: Array.isArray(parsed?.buckets) ? parsed.buckets : [],
				rationale: typeof parsed?.rationale === "string" ? parsed.rationale : undefined,
				confidence: typeof parsed?.confidence === "number" ? parsed.confidence : undefined,
				diag: { status, raw: typeof txt === 'string' ? txt.slice(0, 300) : undefined }
			};
		} catch (e: any) {
			return { buckets: [], diag: { status, parseError: String(e), raw: typeof txt === 'string' ? txt.slice(0, 300) : undefined } };
		}
	} catch {
		return { buckets: [], diag: { parseError: "request_failed" } };
	}
}

function clampRefined(
	baseline: Array<{ class: AllowedClass; pct: number; min: number; max: number }>,
	ai: Array<{ class: string; pct: number; min?: number; max?: number; range?: [number, number] }>,
): Array<{ class: AllowedClass; pct: number; min: number; max: number }>{
	const baseMap = new Map<AllowedClass, { pct: number; min: number; max: number }>();
	for (const b of baseline) baseMap.set(b.class, { pct: b.pct, min: b.min, max: b.max });
	const out: Array<{ class: AllowedClass; pct: number; min: number; max: number }> = [];
	for (const [cls, v] of baseMap.entries()) {
		const aiEntry = ai.find(x => x.class?.toLowerCase() === cls.toLowerCase());
		let pct = v.pct;
		let min = v.min;
		let max = v.max;
		if (aiEntry) {
			// Accept ai-provided min/max (or range) but clamp within baseline bounds
			const aiMin = Number.isFinite(aiEntry.min) ? Number(aiEntry.min) : (Array.isArray(aiEntry.range) ? Number(aiEntry.range[0]) : undefined);
			const aiMax = Number.isFinite(aiEntry.max) ? Number(aiEntry.max) : (Array.isArray(aiEntry.range) ? Number(aiEntry.range[1]) : undefined);
			if (Number.isFinite(aiMin)) min = Math.max(v.min, Math.min(v.max, aiMin as number));
			if (Number.isFinite(aiMax)) max = Math.max(v.min, Math.min(v.max, aiMax as number));
			if (min > max) { const mid = (min + max) / 2; min = Math.max(v.min, Math.min(v.max, Math.floor(mid))); max = Math.max(min, Math.min(v.max, Math.ceil(mid))); }
			if (Number.isFinite(aiEntry.pct)) {
				pct = Math.max(min, Math.min(max, Number(aiEntry.pct)));
			}
		}
		out.push({ class: cls, pct, min, max });
	}
	// Ensure minimum Liquid 5%
	const liq = out.find(o => o.class === "Liquid");
	if (liq && liq.pct < 5) liq.pct = 5;
	// Normalize to 100
	const sum = out.reduce((s, x) => s + x.pct, 0) || 1;
	for (const o of out) o.pct = +(o.pct * 100 / sum).toFixed(2);
	// Final clamp pct within its min/max after normalization
	for (const o of out) o.pct = Math.max(o.min, Math.min(o.max, o.pct));
	return out;
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { questionnaire, baseline } = body as {
			questionnaire: Record<string, any>,
			baseline: { riskLevel: string; buckets: Array<{ class: AllowedClass; pct: number; range: [number, number] }> }
		};
		if (!questionnaire || !baseline) return NextResponse.json({ error: "Missing questionnaire or baseline" }, { status: 400 });
		const debug = (req.nextUrl?.searchParams?.get('debug') === '1');

		// Prepare prompt for Groq (include all available answers)
		const prefs = (questionnaire?.emphasizeAssets || []).join(", ");
		const prompt = `User profile: risk=${questionnaire.riskAppetite||""}, horizon=${questionnaire.horizon||""}, volatility=${questionnaire.volatilityComfort||""}, knowledge=${questionnaire.investmentKnowledge||""}, liquidity=${questionnaire.liquidityPreference||""}, income_balance=${questionnaire.incomeVsExpenses||""}, age=${questionnaire.ageBand||""}, income_stability=${questionnaire.incomeStability||""}, drawdown_tol=${questionnaire.maxDrawdownTolerance||""}, big_expense=${questionnaire.bigExpenseTimeline||""}, intl_equity=${questionnaire.intlEquityPreference||""}, rebalance_pref=${questionnaire.rebalancingComfort||""}, sip=${questionnaire.sipRegularity||""}, ef_months=${questionnaire.emergencyFundMonthsTarget||""}, interests=[${prefs}].\nCurrent suggested mix: ${baseline.buckets.map(b=>`${b.class}:${b.pct}% [${b.range[0]}-${b.range[1]}]`).join(", ")}. Propose a refined mix (allowed classes only) keeping changes within per-class ranges and overall risk. For each class, also propose a comfort range (min/max in percent) that contains the proposed pct. Ensure Liquid remains at least 5% and totals sum to ~100%.`;
		const ai = await callGroqForAllocation(prompt);

		// Build baseline with min/max derived from provided ranges
		const baseForClamp = baseline.buckets.map(b => ({ class: b.class, pct: b.pct, min: b.range[0], max: b.range[1] }));
		const refined = clampRefined(baseForClamp, ai.buckets || []);

		return NextResponse.json({
			aiPlan: {
				riskLevel: baseline?.riskLevel || "Moderate",
				buckets: refined.map(r => ({ class: r.class, pct: r.pct, range: [r.min, r.max], riskCategory: "", notes: "" }))
			},
			rationale: ai.rationale || "Refined based on your risk and preferences.",
			confidence: typeof ai.confidence === "number" ? ai.confidence : undefined,
			...(debug ? { diag: ai.diag || {} } : {})
		});
	} catch (err) {
		return NextResponse.json({ error: "Failed to suggest plan" }, { status: 500 });
	}
}