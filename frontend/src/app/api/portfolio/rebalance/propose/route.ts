import { NextRequest, NextResponse } from "next/server";
import { getUserSubFromJwt } from "../../../_utils/auth";

// Types aligned with frontend
interface Bucket { class: string; pct: number; range?: [number, number]; }
interface Plan { buckets: Bucket[]; riskLevel?: string; rationale?: string }
interface Holding { instrumentClass: string; currentValue?: number; units?: number; price?: number; investedAmount?: number }

function valueOfHolding(h: Holding): number {
	if (typeof h.currentValue === "number") return h.currentValue;
	if (typeof h.units === "number" && typeof h.price === "number") return h.units * h.price;
	if (typeof h.investedAmount === "number") return h.investedAmount;
	return 0;
}

export async function POST(req: NextRequest) {
	const sub = await getUserSubFromJwt(req);
	if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	try {
		const { plan, holdings, mode, options } = await req.json();
		if (!plan || !Array.isArray(plan?.buckets) || !Array.isArray(holdings)) {
			return NextResponse.json({ error: "Missing or invalid plan/holdings" }, { status: 400 });
		}
		const modeKind = (mode === 'to-target') ? 'to-target' : 'to-band';
		const cashOnly = !!(options?.cashOnly);
		const turnoverLimitPct = Math.max(0, Math.min(10, Number(options?.turnoverLimitPct) || 1));

		const total = holdings.reduce((s: number, h: Holding) => s + valueOfHolding(h), 0) || 0;
		const classToValue = new Map<string, number>();
		for (const h of holdings as Holding[]) {
			const v = valueOfHolding(h);
			const k = h.instrumentClass;
			classToValue.set(k, (classToValue.get(k) || 0) + v);
		}
		const allClasses = new Set<string>([...plan.buckets.map((b: Bucket)=> b.class), ...Array.from(classToValue.keys())]);

		// Build current and target maps
		const currentPct: Record<string, number> = {};
		const targetPct: Record<string, number> = {};
		for (const cls of allClasses) {
			const cur = total > 0 ? ((classToValue.get(cls) || 0) / total) * 100 : 0;
			currentPct[cls] = +(cur.toFixed(2));
			const pb = (plan.buckets as Bucket[]).find(b => b.class === cls);
			const baseTarget = pb ? Number(pb.pct) || 0 : 0;
			if (modeKind === 'to-target') {
				targetPct[cls] = baseTarget;
			} else {
				const band: [number, number] = pb?.range ? [Math.round(pb.range[0]||0), Math.round(pb.range[1]||100)] : [0, 100];
				if (cur > band[1]) targetPct[cls] = band[1];
				else if (cur < band[0]) targetPct[cls] = band[0];
				else targetPct[cls] = cur; // already inside band
			}
		}

		// Compose trades
		type Trade = { class: string; action: 'Increase'|'Reduce'; amount: number; actualPct: number; targetPct: number; reason: string };
		const sells: Trade[] = [];
		const buys: Trade[] = [];
		for (const cls of Object.keys(currentPct)) {
			const cur = currentPct[cls];
			const tgt = targetPct[cls] ?? cur;
			if (Math.abs(tgt - cur) < 0.5) continue; // ignore tiny deltas < 0.5%
			const deltaPct = tgt - cur;
			const amt = +(total * (Math.abs(deltaPct) / 100)).toFixed(2);
			if (deltaPct > 0) buys.push({ class: cls, action: 'Increase', amount: amt, actualPct: cur, targetPct: tgt, reason: modeKind==='to-band' ? (cur < tgt ? 'below band' : 'to band') : 'to target' });
			else sells.push({ class: cls, action: 'Reduce', amount: amt, actualPct: cur, targetPct: tgt, reason: modeKind==='to-band' ? (cur > tgt ? 'above band' : 'to band') : 'to target' });
		}

		// Apply options: cashOnly removes sells
		let effectiveSells = cashOnly ? [] as Trade[] : sells.sort((a,b)=> b.amount - a.amount);
		let effectiveBuys = buys.sort((a,b)=> b.amount - a.amount);

		// Turnover cap (approx): limit sells to turnoverLimitPct of portfolio value
		let sellBudget = (turnoverLimitPct/100) * total;
		const filteredSells: Trade[] = [];
		for (const t of effectiveSells) {
			if (sellBudget <= 0) break;
			const take = Math.min(t.amount, sellBudget);
			if (take >= 1) { filteredSells.push({ ...t, amount: +take.toFixed(2) }); sellBudget -= take; }
		}
		// Buys: if cashOnly, these imply contributions; otherwise match sells sum
		const sellsSum = filteredSells.reduce((s, t)=> s + t.amount, 0);
		let buyBudget = cashOnly ? effectiveBuys.reduce((s,t)=> s + t.amount, 0) : sellsSum;
		const filteredBuys: Trade[] = [];
		for (const t of effectiveBuys) {
			if (buyBudget <= 0) break;
			const take = Math.min(t.amount, buyBudget);
			if (take >= 1) { filteredBuys.push({ ...t, amount: +take.toFixed(2) }); buyBudget -= take; }
		}

		const trades = [...filteredSells, ...filteredBuys];
		const turnoverPct = total > 0 ? +((trades.reduce((s,t)=> s + t.amount, 0) / total) * 100).toFixed(2) : 0;
		const rationale = modeKind === 'to-band'
			? `We bring assets back inside comfort bands using ${cashOnly? 'new contributions':'minimal sells and buys'}, within a turnover cap of ${turnoverLimitPct}%.`
			: `We realign to exact targets${cashOnly? ' using contributions only':''}, keeping turnover under ${turnoverLimitPct}%.`;

		// After-mix (approx): apply targetPct where trades exist; else keep current
		const afterMix: Record<string, number> = {};
		for (const cls of Object.keys(currentPct)) {
			afterMix[cls] = Math.round(targetPct[cls] ?? currentPct[cls]);
		}

		return NextResponse.json({
			mode: modeKind,
			trades,
			beforeMix: currentPct,
			afterMix,
			turnoverPct,
			rationale,
		});
	} catch (e:any) {
		return NextResponse.json({ error: 'Bad request', detail: String(e?.message||e) }, { status: 400 });
	}
}