import { NextRequest, NextResponse } from "next/server";

// Allowed asset classes and basic guardrails
const ALLOWED_CLASSES = ["Stocks","Mutual Funds","Gold","Real Estate","Debt","Liquid"] as const;

type AllowedClass = typeof ALLOWED_CLASSES[number];

// Call Groq to get refined allocation percentages
async function callGroqForAllocation(prompt: string): Promise<{ buckets: Array<{ class: string; pct: number }>; rationale?: string; confidence?: number }> {
	const apiKey = (process.env.GROQ_API_KEY || "").trim();
	if (!apiKey) return { buckets: [] };
	try {
		const system = `You are a portfolio allocation assistant. Allowed classes: ${ALLOWED_CLASSES.join(", ")}. Respond ONLY JSON like {"buckets":[{"class":"Stocks","pct":35},...], "rationale": string, "confidence": 0.0-1.0}. Percentages must sum to ~100.`;
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
				temperature: 0.2,
			})
		});
		const data = await res.json();
		const txt = (data?.choices?.[0]?.message?.content as string) || "";
		try {
			const parsed = JSON.parse(txt);
			return {
				buckets: Array.isArray(parsed?.buckets) ? parsed.buckets : [],
				rationale: typeof parsed?.rationale === "string" ? parsed.rationale : undefined,
				confidence: typeof parsed?.confidence === "number" ? parsed.confidence : undefined,
			};
		} catch {
			return { buckets: [] };
		}
	} catch {
		return { buckets: [] };
	}
}

function clampRefined(
	baseline: Array<{ class: AllowedClass; pct: number; min: number; max: number }>,
	ai: Array<{ class: string; pct: number }>,
): Array<{ class: AllowedClass; pct: number; min: number; max: number }>{
	const baseMap = new Map<AllowedClass, { pct: number; min: number; max: number }>();
	for (const b of baseline) baseMap.set(b.class, { pct: b.pct, min: b.min, max: b.max });
	const out: Array<{ class: AllowedClass; pct: number; min: number; max: number }> = [];
	for (const [cls, v] of baseMap.entries()) {
		const aiEntry = ai.find(x => x.class?.toLowerCase() === cls.toLowerCase());
		let pct = v.pct;
		if (aiEntry && Number.isFinite(aiEntry.pct)) {
			pct = Math.max(v.min, Math.min(v.max, Number(aiEntry.pct)));
		}
		out.push({ class: cls, pct, min: v.min, max: v.max });
	}
	// Ensure minimum Liquid 5%
	const liq = out.find(o => o.class === "Liquid");
	if (liq && liq.pct < 5) liq.pct = 5;
	// Normalize to 100
	const sum = out.reduce((s, x) => s + x.pct, 0) || 1;
	for (const o of out) o.pct = +(o.pct * 100 / sum).toFixed(2);
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

		// Prepare prompt for Groq
		const prefs = (questionnaire?.preferredAssets || []).join(", ");
		const prompt = `User profile: risk=${questionnaire.riskAppetite||""}, horizon=${questionnaire.horizon||""}, volatility=${questionnaire.volatilityComfort||""}, interests=[${prefs}].
Current suggested mix: ${baseline.buckets.map(b=>`${b.class}:${b.pct}%`).join(", ")}. Propose a refined mix (allowed classes only) keeping changes within reasonable bounds by risk.`;
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
		});
	} catch (err) {
		return NextResponse.json({ error: "Failed to suggest plan" }, { status: 500 });
	}
}

