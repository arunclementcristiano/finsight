"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { useApp } from "../../store";
import { CalendarDays, Shield, AlertCircle, Trash2 } from "lucide-react";

export default function GoalsInlineModal({ open, onClose, onChanged }: { open: boolean; onClose: ()=>void; onChanged?: ()=>void }) {
	const { activePortfolioId, getConstraints, setConstraints } = useApp() as any;
	const c = getConstraints?.(activePortfolioId || "") || {};
	const [goals, setGoals] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [gName, setGName] = useState("");
	const [gAmount, setGAmount] = useState<number | string>("");
	const [gDate, setGDate] = useState("");
	const [gPriority, setGPriority] = useState("Medium");
	const [gStatus, setGStatus] = useState("Active");

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
	useEffect(()=>{ if (open) loadGoals(); }, [open, activePortfolioId]);

	async function saveGoal() {
		try {
			if (!activePortfolioId) { setError('Select a portfolio first'); return; }
			if (!gName.trim() || !gDate) { setError('Please enter name and target date'); return; }
			setLoading(true); setError(null);
			const id = crypto.randomUUID();
			const body = { portfolioId: activePortfolioId, goal: { id, name: gName.trim(), targetAmount: Math.max(0, Number(gAmount)||0), targetDate: gDate, priority: gPriority, status: gStatus } };
			console.log('Saving goal', body);
			const res = await fetch('/api/portfolio/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
			console.log('Save response', res.status);
			if (!res.ok) throw new Error('Failed to save');
			setGName(""); setGAmount(""); setGDate(""); setGPriority("Medium"); setGStatus("Active");
			await loadGoals();
			onChanged?.();
		} catch (e:any) { setError(String(e?.message||e)); } finally { setLoading(false); }
	}

	async function deleteGoal(id: string) {
		if (!activePortfolioId) return;
		await fetch(`/api/portfolio/goals?portfolioId=${activePortfolioId}&goalId=${id}`, { method: 'DELETE' });
		await loadGoals();
		onChanged?.();
	}

	async function updateGoalStatus(id: string, status: string) {
		const g = goals.find(x=> x.id === id);
		if (!g) return;
		const body = { portfolioId: activePortfolioId, goal: { ...g, status } };
		await fetch('/api/portfolio/goals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		await loadGoals();
		onChanged?.();
	}

	const kpis = useMemo(()=> ({ efMonths: Number(c.efMonths||0), liquidity: { amount: Number(c.liquidityAmount||0), months: Number(c.liquidityMonths||0) } }), [c]);

	if (!open) return null;
	return (
		<div className="fixed inset-0 z-50">
			<div className="absolute inset-0 bg-black/40" onClick={onClose} />
			<div className="absolute right-0 top-0 h-full w-full max-w-[540px] bg-card border-l border-border shadow-xl flex flex-col">
				<div className="px-4 py-3 border-b border-border flex items-center justify-between">
					<div className="text-sm font-semibold">Goals & Constraints</div>
					<div className="inline-flex items-center gap-2"><Button variant="outline" onClick={onClose}>Close</Button></div>
				</div>
				<div className="p-4 overflow-auto">
					<div className="space-y-3 text-xs">
						<div className="grid grid-cols-3 gap-2">
							<div className="rounded-md border border-border p-2 text-center"><div className="text-[11px] text-muted-foreground">EF</div><div className="font-semibold">{kpis.efMonths} mo</div></div>
							<div className="rounded-md border border-border p-2 text-center"><div className="text-[11px] text-muted-foreground">Liquidity need</div><div className="font-semibold">{kpis.liquidity.amount?`₹${kpis.liquidity.amount}`:'—'}</div></div>
							<div className="rounded-md border border-border p-2 text-center"><div className="text-[11px] text-muted-foreground">Goals</div><div className="font-semibold">{goals.length}</div></div>
						</div>

						<div className="rounded-md border border-border p-2">
							<div className="mb-1 font-medium">Add Goal</div>
							<div className="grid grid-cols-1 md:grid-cols-5 gap-2">
								<input className="rounded border border-border bg-background px-2 py-1" placeholder="Name" value={gName} onChange={e=> setGName(e.target.value)} />
								<input className="rounded border border-border bg-background px-2 py-1" placeholder="₹ amount" value={gAmount} onChange={e=> setGAmount(e.target.value)} />
								<input type="date" className="rounded border border-border bg-background px-2 py-1" value={gDate} onChange={e=> setGDate(e.target.value)} />
								<select className="rounded border border-border bg-background px-2 py-1" value={gPriority} onChange={e=> setGPriority(e.target.value)}><option>Medium</option><option>High</option><option>Low</option></select>
								<select className="rounded border border-border bg-background px-2 py-1" value={gStatus} onChange={e=> setGStatus(e.target.value)}><option>Active</option><option>Paused</option><option>Done</option></select>
							</div>
							<div className="mt-2"><Button size="sm" onClick={saveGoal} disabled={loading}>Save goal</Button></div>
							{error ? <div className="mt-1 text-[11px] text-rose-600">{error}</div> : null}
						</div>

						<div className="rounded-md border border-border p-2 mt-3">
							<div className="mb-1 font-medium">Your Goals</div>
							{goals.length ? (
								<div className="space-y-2">
									{goals.map((g)=> (
										<div key={g.id} className="rounded-md border border-border p-2">
											<div className="flex items-center justify-between">
												<div className="font-medium flex items-center gap-2">
													<CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
													<span>{g.name}</span>
												</div>
												<div className="text-muted-foreground">₹{g.targetAmount||0} · {g.targetDate}</div>
											</div>
											<div className="mt-2 flex items-center justify-between">
												<div className="inline-flex items-center gap-2">
													<select className="rounded border border-border bg-background px-2 py-1" value={g.status||'Active'} onChange={e=> updateGoalStatus(g.id, e.target.value)}>
														<option>Active</option>
														<option>Paused</option>
														<option>Done</option>
													</select>
													<span className="text-[11px] text-muted-foreground">Priority {g.priority||'Medium'}</span>
												</div>
												<Button variant="outline" size="sm" onClick={()=> deleteGoal(g.id)} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>Delete</Button>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="text-muted-foreground">No goals yet.</div>
							)}
						</div>

						<div className="rounded-md border border-border p-2 mt-3">
							<div className="mb-1 font-medium">Constraints</div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
								<div className="rounded-md border border-border p-2">
									<div className="text-[11px] text-muted-foreground">Emergency fund coverage</div>
									<div className="mt-1 flex items-center gap-2"><Shield className="h-4 w-4" /><input type="number" min={0} max={24} className="w-20 rounded border border-border bg-background px-2 py-1" value={Number(c.efMonths||0)} onChange={e=> setConstraints?.(activePortfolioId||"", { efMonths: Math.max(0, Math.min(24, Math.round(Number(e.target.value)||0))) })} /><span>months</span></div>
								</div>
								<div className="rounded-md border border-border p-2">
									<div className="text-[11px] text-muted-foreground">Near-term liquidity</div>
									<div className="mt-1 flex items-center gap-2"><AlertCircle className="h-4 w-4" /><input type="number" min={0} className="w-24 rounded border border-border bg-background px-2 py-1" placeholder="₹ amount" value={Number(c.liquidityAmount||0)} onChange={e=> setConstraints?.(activePortfolioId||"", { liquidityAmount: Math.max(0, Math.round(Number(e.target.value)||0)) })} /><input type="number" min={0} max={36} className="w-20 rounded border border-border bg-background px-2 py-1" placeholder="months" value={Number(c.liquidityMonths||0)} onChange={e=> setConstraints?.(activePortfolioId||"", { liquidityMonths: Math.max(0, Math.min(36, Math.round(Number(e.target.value)||0))) })} /></div>
								</div>
								<div className="rounded-md border border-border p-2">
									<div className="text-[11px] text-muted-foreground">Notes</div>
									<textarea className="mt-1 w-full rounded border border-border bg-background px-2 py-1" rows={2} placeholder="Any special constraints" value={c.notes||""} onChange={e=> setConstraints?.(activePortfolioId||"", { notes: e.target.value })} />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}