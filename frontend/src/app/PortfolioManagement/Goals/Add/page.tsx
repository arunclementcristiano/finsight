"use client";
import React, { useState } from "react";
import { Input } from "../../../components/Input";
import { Button } from "../../../components/Button";

export default function AddGoalMobilePage() {
	const [form, setForm] = useState({ name: '', targetAmount: '', targetDate: '', priority: 'medium' as const });
	const [confirm, setConfirm] = useState<string | null>(null);

	function save() {
		if (!form.name || !form.targetAmount || !form.targetDate) return;
		try {
			const stored = (()=>{ try { return JSON.parse(localStorage.getItem('investmentGoals')||'[]'); } catch { return []; } })();
			const newGoal = { id: Date.now().toString(), name: form.name, category: 'custom', targetAmount: Number(form.targetAmount)||0, targetDate: form.targetDate, priority: form.priority, currentProgress: 0, isActive: true, createdAt: new Date().toISOString() };
			const updated = [...stored, newGoal];
			localStorage.setItem('investmentGoals', JSON.stringify(updated));
			setConfirm(`Saved ${newGoal.name}`);
			try { window.dispatchEvent(new Event('goals-updated')); } catch {}
			setTimeout(()=>{ window.history.back(); }, 700);
		} catch {}
	}

	return (
		<div className="min-w-0 space-y-5">
			{/* Header */}
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<h1 className="text-sm font-medium text-muted-foreground">Add Goal</h1>
				</div>
				<button aria-label="Close goal form" className="h-11 w-11 rounded-md hover:bg-muted" onClick={()=> window.history.back()}>✕</button>
			</div>
			<div className="rounded-xl border border-border bg-card">
				<div className="p-4 border-b border-border text-sm font-medium">Goal Details</div>
				<div className="p-4 space-y-3">
					<div>
						<label htmlFor="goal-name" className="mb-1 block text-[11px] text-muted-foreground">Name</label>
						<Input id="goal-name" value={form.name} onChange={e=> setForm({...form, name: e.target.value})} placeholder="e.g., Home Down Payment" />
					</div>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div>
							<label htmlFor="goal-target-amount" className="mb-1 block text-[11px] text-muted-foreground">Target amount (₹)</label>
							<Input id="goal-target-amount" type="number" value={form.targetAmount} onChange={e=> setForm({...form, targetAmount: e.target.value})} />
						</div>
						<div>
							<label htmlFor="goal-target-date" className="mb-1 block text-[11px] text-muted-foreground">Target date</label>
							<Input id="goal-target-date" type="date" value={form.targetDate} onChange={e=> setForm({...form, targetDate: e.target.value})} />
						</div>
					</div>
					<div>
						<label htmlFor="goal-priority" className="mb-1 block text-[11px] text-muted-foreground">Priority</label>
						<select id="goal-priority" value={form.priority} onChange={e=> setForm({...form, priority: e.target.value as any})} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2">
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
						</select>
					</div>
					<div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:items-center sm:justify-between">
						<Button className="min-h-11 sm:min-h-0" variant="outline" size="sm" onClick={()=> window.history.back()}>Cancel</Button>
						<Button className="min-h-11 sm:min-h-0" size="sm" onClick={save}>Save</Button>
					</div>
					{confirm ? <div className="text-xs text-emerald-600">{confirm}</div> : null}
				</div>
			</div>
		</div>
	);
}
