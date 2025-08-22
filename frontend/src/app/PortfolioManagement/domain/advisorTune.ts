export type Asset = "Stocks" | "Mutual Funds" | "Gold" | "Real Estate" | "Debt" | "Liquid";

export type Bucket = { class: Asset; pct: number; range?: [number, number] };

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function normalizeTo100(values: Record<Asset, number>): Record<Asset, number> {
	const sum = (Object.keys(values) as Asset[]).reduce((s, k) => s + (values[k] || 0), 0) || 1;
	const out: Record<Asset, number> = { Stocks: 0, "Mutual Funds": 0, Gold: 0, "Real Estate": 0, Debt: 0, Liquid: 0 } as any;
	(Object.keys(out) as Asset[]).forEach(k => out[k] = (values[k] || 0) * 100 / sum);
	return out;
}

function largestRemainderRound(values: Record<Asset, number>): Record<Asset, number> {
	const order: Asset[] = ["Stocks","Mutual Funds","Gold","Real Estate","Debt","Liquid"];
	const floors: Record<Asset, number> = { Stocks: 0, "Mutual Funds": 0, Gold: 0, "Real Estate": 0, Debt: 0, Liquid: 0 } as any;
	const remainders: Array<{ k: Asset; r: number }> = [];
	let total = 0;
	for (const k of order) {
		const v = Math.max(0, Math.min(100, values[k] || 0));
		const f = Math.floor(v);
		floors[k] = f;
		remainders.push({ k, r: v - f });
		total += f;
	}
	let leftover = 100 - total;
	remainders.sort((a,b)=> (b.r - a.r) || (order.indexOf(a.k) - order.indexOf(b.k)));
	for (let i=0; i<remainders.length && leftover>0; i++) { floors[remainders[i].k] += 1; leftover--; }
	return floors;
}

function enforceGuardrails(values: Record<Asset, number>): Record<Asset, number> {
	const v = { ...values };
	// Liquid >= 5
	if (v.Liquid < 5) { const need = 5 - v.Liquid; const take = Math.min(need, v.Debt); v.Debt -= take; v.Liquid += take; }
	// Gold [3,12]
	if (v.Gold < 3) { const need = 3 - v.Gold; const take = Math.min(need, v.Debt); v.Debt -= take; v.Gold += take; }
	if (v.Gold > 12) { const cut = v.Gold - 12; v.Gold -= cut; v.Debt += cut; }
	// RE [0,7]
	if (v["Real Estate"] > 7) { const cut = v["Real Estate"] - 7; v["Real Estate"] -= cut; v.Debt += cut; }
	// Equity cap 60
	let eq = (v.Stocks || 0) + (v["Mutual Funds"] || 0);
	if (eq > 60) {
		const cut = eq - 60; const sFrac = (v.Stocks / eq) || 0; v.Stocks -= cut * sFrac; v["Mutual Funds"] -= cut * (1 - sFrac); v.Debt += cut; eq = 60;
	}
	// Debt cap 70
	if (v.Debt > 70) { const cut = v.Debt - 70; v.Debt -= cut; v.Liquid += cut; }
	return v;
}

export function advisorTune(baseline: { buckets: Bucket[] }, current: { buckets: Bucket[] }, changedClass: Asset, newPct: number): { buckets: Bucket[]; clamped: boolean } {
	const baseMap: Record<Asset, { pct: number; min: number; max: number }> = { Stocks: { pct:0,min:0,max:100 }, "Mutual Funds": { pct:0,min:0,max:100 }, Gold: { pct:0,min:0,max:100 }, "Real Estate": { pct:0,min:0,max:100 }, Debt: { pct:0,min:0,max:100 }, Liquid: { pct:0,min:0,max:100 } } as any;
	for (const b of baseline.buckets) {
		const [min, max] = b.range || [0, 100];
		baseMap[b.class as Asset] = { pct: b.pct, min, max } as any;
	}
	const curMap: Record<Asset, number> = { Stocks: 0, "Mutual Funds": 0, Gold: 0, "Real Estate": 0, Debt: 0, Liquid: 0 } as any;
	for (const b of (current.buckets||[])) curMap[b.class as Asset] = b.pct;

	let clamped = false;
	const tuned: Record<Asset, number> = { ...curMap };
	const base = baseMap[changedClass];
	const within = newPct >= base.min && newPct <= base.max;
	if (within) {
		tuned[changedClass] = (base.pct + newPct) / 2;
	} else {
		clamped = true;
		tuned[changedClass] = clamp(newPct, base.min, base.max);
	}
	// Normalize total by adjusting others proportionally
	const sumBefore = (Object.keys(tuned) as Asset[]).reduce((s,k)=> s + (tuned[k] || 0), 0);
	if (Math.abs(sumBefore - 100) > 1e-6) {
		const delta = 100 - sumBefore;
		// distribute delta across non-changed assets proportional to their size
		const pool = (Object.keys(tuned) as Asset[]).filter(k => k !== changedClass);
		const poolSum = pool.reduce((s,k)=> s + (tuned[k] || 0), 0) || 1;
		for (const k of pool) tuned[k] = tuned[k] + delta * ((tuned[k] || 0) / poolSum);
	}
	let norm = normalizeTo100(tuned);
	norm = enforceGuardrails(norm);
	norm = normalizeTo100(norm);
	const rounded = largestRemainderRound(norm);
	const outBuckets: Bucket[] = (Object.keys(rounded) as Asset[]).map(cls => ({ class: cls, pct: rounded[cls] }));
	// preserve baseline ranges on output so UI keeps showing bands
	const rangeMap: Record<Asset, [number, number]> = { Stocks:[0,100], "Mutual Funds":[0,100], Gold:[0,100], "Real Estate":[0,100], Debt:[0,100], Liquid:[0,100] } as any;
	for (const b of baseline.buckets) if (b.range) rangeMap[b.class as Asset] = b.range;
	for (const b of outBuckets) (b as any).range = rangeMap[b.class];
	return { buckets: outBuckets, clamped };
}