"use client";
import React, { useMemo } from "react";
import { useApp } from "../../../store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/Card";
import { formatNumber } from "../../../utils/format";
import { computeRebalance } from "../../domain/rebalance";
import { useChartThemeColors } from "../../../components/useChartTheme";

export default function PortfolioInsightsPage() {
	const { plan, holdings, questionnaire, profile, driftTolerancePct } = useApp() as any;
	const theme = useChartThemeColors();

	const totals = useMemo(() => {
		let invested = 0, current = 0;
		for (const h of holdings) {
			const inv = typeof h.investedAmount === 'number' ? h.investedAmount : (typeof h.units === 'number' && typeof h.price === 'number' ? h.units * h.price : 0);
			const cur = typeof h.currentValue === 'number' ? h.currentValue : inv;
			invested += inv; current += cur;
		}
		const pnl = current - invested;
		const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
		return { invested, current, pnl, pnlPct };
	}, [holdings]);

	const bucketActuals = useMemo(() => {
		const byClass: Record<string, number> = {};
		let total = 0;
		for (const h of holdings) {
			const inv = typeof h.investedAmount === 'number' ? h.investedAmount : (typeof h.units === 'number' && typeof h.price === 'number' ? h.units * h.price : 0);
			const cur = typeof h.currentValue === 'number' ? h.currentValue : inv;
			byClass[h.instrumentClass] = (byClass[h.instrumentClass] || 0) + cur;
			total += cur;
		}
		const pct: Record<string, number> = {};
		for (const k of Object.keys(byClass)) pct[k] = total > 0 ? (byClass[k] / total) * 100 : 0;
		return pct;
	}, [holdings]);

	const drift = useMemo(() => {
		if (!plan) return [] as Array<{ className: string; target: number; actual: number; delta: number }>;
		return (plan.buckets as Array<{ class: string; pct: number }>).map((b) => {
			const actual = bucketActuals[b.class] || 0;
			return { className: b.class, target: b.pct, actual, delta: actual - b.pct };
		}).sort((a,b)=> Math.abs(b.delta) - Math.abs(a.delta));
	}, [plan, bucketActuals]);

	const rebalance = useMemo(()=> plan ? computeRebalance(holdings, plan, driftTolerancePct) : { items: [], totalCurrentValue: 0 }, [holdings, plan, driftTolerancePct]);

	const goals = useMemo(() => {
		try { const raw = localStorage.getItem('investmentGoals'); return raw ? JSON.parse(raw) : []; } catch { return []; }
	}, []);

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-lg font-semibold">Portfolio Insights</h1>
				<p className="text-xs text-muted-foreground">Plan vs actual, goal coverage, and drift highlights</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
				<Card>
					<CardHeader className="py-2"><CardTitle className="text-base">Summary</CardTitle><CardDescription className="text-xs">PnL and allocation</CardDescription></CardHeader>
					<CardContent className="pt-0 text-sm">
						<div>Invested: {formatNumber(totals.invested, 2)}</div>
						<div>Current: {formatNumber(totals.current, 2)}</div>
						<div>P/L: {formatNumber(totals.pnlPct, 2)}%</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="py-2"><CardTitle className="text-base">Top Drifts</CardTitle><CardDescription className="text-xs">Largest variances</CardDescription></CardHeader>
					<CardContent className="pt-0 text-sm">
						{plan ? (
							<ul className="space-y-1">
								{drift.slice(0,3).map(d => (
									<li key={d.className} className="flex justify-between">
										<span>{d.className}</span>
										<span>{formatNumber(d.actual,1)}% vs {formatNumber(d.target,1)}% ({d.delta>0?'+':''}{formatNumber(d.delta,1)}%)</span>
									</li>
								))}
							</ul>
						) : (
							<div className="text-foreground/80">No plan yet. Complete the questionnaire.</div>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="py-2"><CardTitle className="text-base">Goals Snapshot</CardTitle><CardDescription className="text-xs">Number and next dates</CardDescription></CardHeader>
					<CardContent className="pt-0 text-sm">
						<div className="flex items-center justify-between">
							<div>Total goals: {goals.length}</div>
							<a href="/PortfolioManagement/Goals" className="text-xs underline">Manage</a>
						</div>
						<div className="mt-2 space-y-2">
							{goals.slice(0,3).map((g:any)=> (
								<div key={g.id} className="rounded border border-border p-2">
									<div className="flex items-center justify-between text-xs">
										<div className="font-medium">{g.name}</div>
										<div className="text-muted-foreground">{(g.targetDate||'').toString().slice(0,10)}</div>
									</div>
									<div className="text-[11px] text-muted-foreground">Target ₹{(g.targetAmount||0).toLocaleString()}</div>
								</div>
							))}
							{goals.length === 0 ? <div className="text-xs text-muted-foreground">No goals yet.</div> : null}
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="py-2"><CardTitle className="text-base">Plan vs Actual by Asset Class</CardTitle><CardDescription className="text-xs">Compares your current portfolio against target</CardDescription></CardHeader>
				<CardContent className="pt-0">
					<table className="w-full text-left text-sm border rounded-xl overflow-hidden border-border">
						<thead className="bg-card">
							<tr>
								<th className="px-3 py-2 border-b">Class</th>
								<th className="px-3 py-2 border-b text-right">Target %</th>
								<th className="px-3 py-2 border-b text-right">Actual %</th>
								<th className="px-3 py-2 border-b text-right">Delta</th>
							</tr>
						</thead>
						<tbody>
							{plan ? (plan.buckets as Array<{ class: string; pct: number }>).map((b) => {
								const actual = bucketActuals[b.class] || 0;
								const delta = actual - b.pct;
								return (
									<tr key={b.class} className="border-b">
										<td className="px-3 py-2">{b.class}</td>
										<td className="px-3 py-2 text-right">{formatNumber(b.pct,1)}%</td>
										<td className="px-3 py-2 text-right">{formatNumber(actual,1)}%</td>
										<td className={`px-3 py-2 text-right ${delta>0?'text-amber-600':'text-emerald-600'}`}>{delta>0?'+':''}{formatNumber(delta,1)}%</td>
									</tr>
								);
							}) : (
							<tr><td className="px-3 py-2" colSpan={4}>No plan available.</td></tr>
							)}
						</tbody>
					</table>
				</CardContent>
			</Card>

			{/* Signals visual */}
			{plan?.signals?.length ? (
				<Card>
					<CardHeader className="py-2"><CardTitle className="text-base">Signal Analysis</CardTitle><CardDescription className="text-xs">Weighted factor impacts</CardDescription></CardHeader>
					<CardContent className="pt-0 space-y-2">
						{plan.signals
							.sort((a:any,b:any)=> Math.abs(b.equitySignal*b.weight) - Math.abs(a.equitySignal*a.weight))
							.slice(0,6)
							.map((s:any, idx:number)=>{
								const impact = s.equitySignal * s.weight;
								const width = Math.min(100, Math.round(Math.abs(impact) * 10));
								return (
									<div key={idx} className="text-xs">
										<div className="flex items-center justify-between mb-1">
											<div className="font-medium capitalize">{String(s.factor||'').replace(/_/g,' ')}</div>
											<div className={impact>=0?"text-green-600":"text-rose-600"}>{impact>=0?'+':''}{Math.round(impact)}</div>
										</div>
										<div className="h-2 w-full rounded bg-muted overflow-hidden">
											<div className={`h-2 ${impact>=0?"bg-green-500":"bg-rose-500"}`} style={{ width: `${Math.max(6, width)}%` }}></div>
										</div>
										<div className="text-[11px] text-muted-foreground mt-1">{s.explanation}</div>
									</div>
								);
							})}
					</CardContent>
				</Card>
			) : null}

			{/* Stress test scenarios visual */}
			{plan?.stressTest?.scenarios ? (
				<Card>
					<CardHeader className="py-2"><CardTitle className="text-base">Stress Test</CardTitle><CardDescription className="text-xs">Scenario impacts and coverage</CardDescription></CardHeader>
					<CardContent className="pt-0 grid grid-cols-1 md:grid-cols-3 gap-2">
						{Object.entries(plan.stressTest.scenarios).slice(0,3).map(([name, res]: any)=> (
							<div key={name} className="rounded border border-border p-2 text-xs">
								<div className="flex items-center justify-between mb-1">
									<div className="font-medium">{name}</div>
									<div className={res.portfolioImpact>=0?"text-green-600":"text-rose-600"}>{res.portfolioImpact>=0?'+':''}{Number(res.portfolioImpact).toFixed(1)}%</div>
								</div>
								<div className="h-2 w-full rounded bg-muted overflow-hidden mb-1">
									<div className={`h-2 ${res.portfolioImpact>=0?"bg-green-500":"bg-rose-500"}`} style={{ width: `${Math.min(100, Math.max(6, Math.abs(Math.round(res.portfolioImpact))))}%` }}></div>
								</div>
								<div className="text-[11px] text-muted-foreground">Coverage ≈ {Number(res.monthsCovered||0).toFixed(1)} months</div>
								{res.historicalDrop ? <div className="text-[11px] text-muted-foreground">Historical: {res.historicalDrop}</div> : null}
								{res.evidence ? <div className="text-[11px] text-muted-foreground">Evidence: {res.evidence}</div> : null}
							</div>
						))}
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader className="py-2"><CardTitle className="text-base">Rebalancing Suggestions</CardTitle><CardDescription className="text-xs">Based on drift tolerance of {driftTolerancePct}%</CardDescription></CardHeader>
				<CardContent className="pt-0">
					{plan && rebalance.items.length > 0 ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
							{rebalance.items.map((item:any) => (
								<div key={item.class} className="rounded-lg border border-border p-2">
									<div className="flex items-center justify-between text-sm">
										<div className="font-medium">{item.class}</div>
										<div className="text-muted-foreground">{item.actualPct}% → {item.targetPct}%</div>
									</div>
									<div className="mt-1 flex items-center gap-2">
										<div className="h-2 rounded bg-muted w-full overflow-hidden">
											<div className={`h-2 ${item.action === 'Increase' ? 'bg-indigo-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.max(5, Math.round((item.amount / Math.max(1, rebalance.totalCurrentValue)) * 100)))}%` }}></div>
										</div>
										<div className={`text-xs ${item.action === 'Increase' ? 'text-indigo-600' : 'text-rose-600'}`}> {item.action} {item.amount.toFixed(0)}</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-muted-foreground text-sm">{!plan ? 'No plan yet.' : 'All good! No rebalancing needed.'}</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

