"use client";
import React, { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { useApp } from "../../store";
import { Target, Plus, CalendarDays, Shield, AlertCircle } from "lucide-react";

export default function GoalsPage() {
	const { activePortfolioId, getConstraints, setConstraints } = useApp() as any;
	const [addOpen, setAddOpen] = useState(false);
	const [filter, setFilter] = useState<"all"|"0-2"|"3-5"|"6-10"|"10+">("all");
  const c = getConstraints?.(activePortfolioId || "") || {};

	// Placeholder data (to be wired)
	const kpis = useMemo(()=> ({ efMonths: 6, liquidity: { amount: 0, months: 0 }, monthlySip: 0, coveragePct: 0 }), []);
	const goals: Array<any> = [];

	return (
		<div className="max-w-5xl mx-auto space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-lg font-semibold">Goals & Constraints</h1>
					<p className="text-xs text-muted-foreground">Set your goals and liquidity needs. We’ll keep your plan aligned.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button leftIcon={<Plus className="h-4 w-4" />} onClick={()=> setAddOpen(true)}>Add Goal</Button>
					<Button variant="outline" leftIcon={<Target className="h-4 w-4" />} onClick={()=> window.location.href='/PortfolioManagement/Plan'}>Propose Rebalance</Button>
				</div>
			</div>

			<div className="grid grid-cols-4 gap-2">
				<Card>
					<CardContent className="p-3 text-center">
						<div className="text-[11px] text-muted-foreground">EF Coverage</div>
						<div className="text-base font-semibold">{kpis.efMonths} months</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-3 text-center">
						<div className="text-[11px] text-muted-foreground">Near-term Liquidity</div>
						<div className="text-base font-semibold">{kpis.liquidity.amount ? `₹${kpis.liquidity.amount}` : '—'}</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-3 text-center">
						<div className="text-[11px] text-muted-foreground">Monthly SIP</div>
						<div className="text-base font-semibold">{kpis.monthlySip ? `₹${kpis.monthlySip}` : '—'}</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-3 text-center">
						<div className="text-[11px] text-muted-foreground">Goal Coverage</div>
						<div className="text-base font-semibold">{kpis.coveragePct}%</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="py-2">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base">Your Goals</CardTitle>
						<div className="inline-flex items-center gap-2 text-xs">
							<span className={`px-2 py-0.5 rounded border ${filter==='all'?'bg-muted':''}`} onClick={()=> setFilter('all')}>All</span>
							<span className={`px-2 py-0.5 rounded border ${filter==='0-2'?'bg-muted':''}`} onClick={()=> setFilter('0-2')}>0–2y</span>
							<span className={`px-2 py-0.5 rounded border ${filter==='3-5'?'bg-muted':''}`} onClick={()=> setFilter('3-5')}>3–5y</span>
							<span className={`px-2 py-0.5 rounded border ${filter==='6-10'?'bg-muted':''}`} onClick={()=> setFilter('6-10')}>6–10y</span>
							<span className={`px-2 py-0.5 rounded border ${filter==='10+'?'bg-muted':''}`} onClick={()=> setFilter('10+')}>10y+</span>
						</div>
					</div>
				</CardHeader>
				<CardContent className="pt-0">
					{goals.length ? (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							{goals.map((g)=> (
								<div key={g.id} className="rounded-lg border border-border p-3">
									<div className="flex items-center justify-between text-sm">
										<div className="font-medium">{g.name}</div>
										<div className="inline-flex items-center gap-1 text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> {g.targetDate}</div>
									</div>
									<div className="mt-2 h-1.5 rounded bg-muted overflow-hidden"><div className="h-1.5 bg-indigo-500" style={{ width: `${Math.min(100, Math.round(g.coverage||0))}%` }}></div></div>
									<div className="mt-1 text-[11px] text-muted-foreground">{Math.round(g.coverage||0)}% funded · needs ₹{g.shortfall||0}</div>
									<div className="mt-2 text-xs">Target mix preview here…</div>
									<div className="mt-2 flex items-center gap-2">
										<Button variant="outline" size="sm">Edit</Button>
										<Button variant="outline" size="sm">Pause</Button>
										<Button variant="outline" size="sm">Achieved</Button>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-muted-foreground text-sm">No goals yet. Click “Add Goal” to get started.</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="py-2">
					<CardTitle className="text-base">Constraints</CardTitle>
					<CardDescription className="text-xs">Emergency fund and near-term liquidity.</CardDescription>
				</CardHeader>
				<CardContent className="pt-0 text-xs">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
						<div className="rounded-md border border-border p-2">
							<div className="text-[11px] text-muted-foreground">Emergency fund coverage</div>
							<div className="mt-1 flex items-center gap-2">
								<Shield className="h-4 w-4" />
								<input type="number" min={0} max={24} className="w-24 rounded border border-border bg-background px-2 py-1" value={Number(c.efMonths||0)} onChange={e=> setConstraints?.(activePortfolioId||"", { efMonths: Math.max(0, Math.min(24, Math.round(Number(e.target.value)||0))) })} />
								<span className="text-muted-foreground">months</span>
							</div>
						</div>
						<div className="rounded-md border border-border p-2">
							<div className="text-[11px] text-muted-foreground">Near-term liquidity</div>
							<div className="mt-1 flex items-center gap-2">
								<AlertCircle className="h-4 w-4" />
								<input type="number" min={0} className="w-28 rounded border border-border bg-background px-2 py-1" placeholder="₹ amount" value={Number(c.liquidityAmount||0)} onChange={e=> setConstraints?.(activePortfolioId||"", { liquidityAmount: Math.max(0, Math.round(Number(e.target.value)||0)) })} />
								<input type="number" min={0} max={36} className="w-20 rounded border border-border bg-background px-2 py-1" placeholder="months" value={Number(c.liquidityMonths||0)} onChange={e=> setConstraints?.(activePortfolioId||"", { liquidityMonths: Math.max(0, Math.min(36, Math.round(Number(e.target.value)||0))) })} />
							</div>
						</div>
						<div className="rounded-md border border-border p-2">
							<div className="text-[11px] text-muted-foreground">Notes</div>
							<textarea className="mt-1 w-full rounded border border-border bg-background px-2 py-1" rows={2} placeholder="Any special constraints" value={c.notes||""} onChange={e=> setConstraints?.(activePortfolioId||"", { notes: e.target.value })} />
						</div>
					</div>
				</CardContent>
			</Card>

			<Modal open={addOpen} onClose={()=> setAddOpen(false)} title="Add Goal" footer={(
				<>
					<Button variant="outline" onClick={()=> setAddOpen(false)}>Cancel</Button>
					<Button onClick={()=> setAddOpen(false)}>Save</Button>
				</>
			)}>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
					<div className="space-y-2">
						<div>
							<div className="text-[11px] text-muted-foreground">Name</div>
							<input className="w-full rounded border border-border bg-background px-2 py-1" placeholder="e.g., Emergency, House, Education" />
						</div>
						<div>
							<div className="text-[11px] text-muted-foreground">Target amount</div>
							<input className="w-full rounded border border-border bg-background px-2 py-1" placeholder="₹" />
						</div>
						<div>
							<div className="text-[11px] text-muted-foreground">Target date</div>
							<input type="date" className="w-full rounded border border-border bg-background px-2 py-1" />
						</div>
						<div>
							<div className="text-[11px] text-muted-foreground">Priority</div>
							<select className="w-full rounded border border-border bg-background px-2 py-1"><option>Medium</option><option>High</option><option>Low</option></select>
						</div>
					</div>
					<div className="space-y-2">
						<div>
							<div className="text-[11px] text-muted-foreground">Monthly contribution (optional)</div>
							<input className="w-full rounded border border-border bg-background px-2 py-1" placeholder="₹ per month" />
						</div>
						<div>
							<label className="inline-flex items-center gap-2">
								<input type="checkbox" />
								<span>Per‑goal risk override</span>
							</label>
							<select className="mt-1 w-full rounded border border-border bg-background px-2 py-1"><option>Inherit household (default)</option><option>Conservative</option><option>Balanced</option><option>Aggressive</option></select>
						</div>
						<div className="rounded-md border border-dashed p-2 text-muted-foreground">Live preview of target mix will appear here…</div>
					</div>
				</div>
			</Modal>
		</div>
	);
}