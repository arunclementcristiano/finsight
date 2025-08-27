"use client";
import React, { useMemo } from "react";
import { useApp } from "../../../store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/Card";
import { formatNumber } from "../../../utils/format";

export default function PortfolioInsightsPage() {
	const { plan, holdings, questionnaire, profile } = useApp();

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
		return plan.buckets.map(b => {
			const actual = bucketActuals[b.class] || 0;
			return { className: b.class, target: b.pct, actual, delta: actual - b.pct };
		}).sort((a,b)=> Math.abs(b.delta) - Math.abs(a.delta));
	}, [plan, bucketActuals]);

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
							{plan ? plan.buckets.map(b => {
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
		</div>
	);
}

