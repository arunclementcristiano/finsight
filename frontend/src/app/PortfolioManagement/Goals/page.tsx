"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Button } from "../../components/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { useApp } from "../../store";
import { Target, Plus, CalendarDays, Shield, AlertCircle, Trash2 } from "lucide-react";

export default function GoalsPage() {
	const { activePortfolioId, getConstraints, setConstraints } = useApp() as any;
	const [addOpen, setAddOpen] = useState(false);
	const [filter, setFilter] = useState<"all"|"0-2"|"3-5"|"6-10"|"10+">("all");
	const c = getConstraints?.(activePortfolioId || "") || {};

	const [goals, setGoals] = useState<any[]>([]);
	const [gName, setGName] = useState("");
	const [gCategory, setGCategory] = useState("wealth_building");
	const [gAmount, setGAmount] = useState(0);
	const [gDate, setGDate] = useState("");
	const [gPriority, setGPriority] = useState("medium");
	const [gProgress, setGProgress] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Goal categories for allocation engine compatibility
	const goalCategories = [
		{ value: "retirement", label: "Retirement" },
		{ value: "home_purchase", label: "Home Purchase" },
		{ value: "child_education", label: "Child Education" },
		{ value: "emergency_fund", label: "Emergency Fund" },
		{ value: "wealth_building", label: "Wealth Building" },
		{ value: "custom", label: "Other Goal" }
	];

	async function loadGoals() {
		if (!activePortfolioId) return;
		try {
			const res = await fetch(`/api/portfolio/goals?portfolioId=${activePortfolioId}`);
			const data = await res.json();
			setGoals((data?.goals||[]).map((it:any)=> ({ id: (it.goal?.id)|| (it.sk||'').split('#').pop(), ...it.goal })));
		} catch (e:any) {
			setError(String(e?.message||e));
		}
	}

	useEffect(()=>{ loadGoals(); }, [activePortfolioId]);

	async function saveGoal() {
		try {
			if (!activePortfolioId) { console.warn('No active portfolio selected'); setError('Select a portfolio first'); return; }
			if (!gName.trim() || !gDate) { setError('Please enter name and target date'); return; }
			setLoading(true); setError(null);
			const id = crypto.randomUUID();
			const body = { 
				portfolioId: activePortfolioId, 
				goal: { 
					id, 
					name: gName.trim(), 
					category: gCategory,
					targetAmount: Math.max(0, Number(gAmount)||0), 
					targetDate: gDate, 
					priority: gPriority,
					currentProgress: Math.max(0, Number(gProgress)||0),
					isActive: true,
					createdAt: new Date().toISOString()
				} 
			};
			console.log('Saving goal', body);
			const res = await fetch('/api/portfolio/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
			console.log('Save response', res.status);
			if (!res.ok) throw new Error('Failed to save');
			setAddOpen(false); 
			setGName(""); 
			setGCategory("wealth_building");
			setGAmount(0); 
			setGDate(""); 
			setGPriority("medium");
			setGProgress(0);
			await loadGoals();
		} catch (e:any) {
			console.error('Save goal error', e);
			setError(String(e?.message||e));
		} finally { setLoading(false); }
	}

	async function deleteGoal(id: string) {
		if (!activePortfolioId) return;
		await fetch(`/api/portfolio/goals?portfolioId=${activePortfolioId}&goalId=${id}`, { method: 'DELETE' });
		await loadGoals();
	}

	const kpis = useMemo(()=> ({ efMonths: Number(c.efMonths||0), liquidity: { amount: Number(c.liquidityAmount||0), months: Number(c.liquidityMonths||0) }, monthlySip: 0, coveragePct: 0 }), [c]);

	return (
		<div className="max-w-5xl mx-auto space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-lg font-semibold">Investment Goals</h1>
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
						<div className="text-base font-semibold">—</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-3 text-center">
						<div className="text-[11px] text-muted-foreground">Goal Coverage</div>
						<div className="text-base font-semibold">—</div>
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
							{goals.map((g)=> {
								const progressPct = g.targetAmount > 0 ? Math.min(100, ((g.currentProgress || 0) / g.targetAmount) * 100) : 0;
								const monthsToTarget = Math.round((new Date(g.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30.44));
								const timelineDesc = monthsToTarget <= 12 ? "urgent" : monthsToTarget <= 36 ? "medium-term" : "long-term";
								const categoryLabel = goalCategories.find(cat => cat.value === g.category)?.label || g.category;
								
								return (
									<div key={g.id} className="rounded-lg border border-border p-3">
										<div className="flex items-center justify-between text-sm">
											<div className="font-medium">{g.name}</div>
											<div className="inline-flex items-center gap-1 text-muted-foreground">
												<CalendarDays className="h-3.5 w-3.5" /> 
												{g.targetDate}
											</div>
										</div>
										<div className="mt-1 text-[11px] text-muted-foreground">
											{categoryLabel} • ₹{(g.targetAmount/100000).toFixed(1)}L • {g.priority} priority • {timelineDesc}
										</div>
										<div className="mt-2 h-1.5 rounded bg-muted overflow-hidden">
											<div className="h-1.5 bg-indigo-500" style={{ width: `${progressPct}%` }}></div>
										</div>
										<div className="mt-1 text-[10px] text-muted-foreground">
											Progress: ₹{((g.currentProgress || 0)/100000).toFixed(1)}L / ₹{(g.targetAmount/100000).toFixed(1)}L ({progressPct.toFixed(0)}%)
										</div>
										<div className="mt-2 flex items-center gap-2">
											<Button variant="outline" size="sm" onClick={()=> deleteGoal(g.id)} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>Delete</Button>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="text-muted-foreground text-sm">No goals yet. Click “Add Goal” to get started.</div>
					)}
				</CardContent>
			</Card>


			<Modal open={addOpen} onClose={()=> setAddOpen(false)} title="Add Goal" footer={(
				<>
					<Button variant="outline" onClick={()=> setAddOpen(false)}>Cancel</Button>
					<Button onClick={saveGoal} disabled={loading}>Save</Button>
				</>
			)}>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
					<div className="space-y-2">
						<div>
							<div className="text-[11px] text-muted-foreground">Name</div>
							<input className="w-full rounded border border-border bg-background px-2 py-1" placeholder="e.g., Dream Home, Child Education" value={gName} onChange={e=> setGName(e.target.value)} />
						</div>
						<div>
							<div className="text-[11px] text-muted-foreground">Category</div>
							<select className="w-full rounded border border-border bg-background px-2 py-1" value={gCategory} onChange={e=> setGCategory(e.target.value)}>
								{goalCategories.map(cat => (
									<option key={cat.value} value={cat.value}>{cat.label}</option>
								))}
							</select>
						</div>
						<div>
							<div className="text-[11px] text-muted-foreground">Target amount (₹)</div>
							<input type="number" className="w-full rounded border border-border bg-background px-2 py-1" placeholder="e.g., 5000000" value={gAmount} onChange={e=> setGAmount(Math.max(0, Number(e.target.value)||0))} />
						</div>
						<div>
							<div className="text-[11px] text-muted-foreground">Target date</div>
							<input type="date" className="w-full rounded border border-border bg-background px-2 py-1" value={gDate} onChange={e=> setGDate(e.target.value)} />
						</div>
					</div>
					<div className="space-y-2">
						<div>
							<div className="text-[11px] text-muted-foreground">Priority</div>
							<select className="w-full rounded border border-border bg-background px-2 py-1" value={gPriority} onChange={e=> setGPriority(e.target.value)}>
								<option value="high">High</option>
								<option value="medium">Medium</option>
								<option value="low">Low</option>
							</select>
						</div>
						<div>
							<div className="text-[11px] text-muted-foreground">Current progress (₹)</div>
							<input type="number" className="w-full rounded border border-border bg-background px-2 py-1" placeholder="0" value={gProgress} onChange={e=> setGProgress(Math.max(0, Number(e.target.value)||0))} />
						</div>
						<div className="rounded-md border border-dashed p-2 text-muted-foreground">
							<div className="text-[10px] mb-1">Timeline Impact:</div>
							{gDate && (
								<div className="text-[10px]">
									{(() => {
										const months = Math.round((new Date(gDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30.44));
										const desc = months <= 12 ? "Urgent (Conservative)" : months <= 36 ? "Medium-term (Balanced)" : "Long-term (Aggressive)";
										return desc;
									})()}
								</div>
							)}
						</div>
					</div>
				</div>
				{error ? <div className="mt-2 text-[11px] text-rose-600">{error}</div> : null}
			</Modal>
		</div>
	);
}