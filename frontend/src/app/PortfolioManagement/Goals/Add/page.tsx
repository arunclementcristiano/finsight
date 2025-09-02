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
		<div className="max-w-full space-y-4 pl-2">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="text-sm text-muted-foreground">Add Goal</div>
				</div>
				<button className="h-9 w-9 rounded-md hover:bg-muted" onClick={()=> window.history.back()}>✕</button>
			</div>
			<div className="rounded-xl border border-border bg-card">
				<div className="p-4 border-b border-border text-sm font-medium">Goal Details</div>
				<div className="p-4 space-y-3">
					<div>
						<div className="text-[11px] text-muted-foreground mb-1">Name</div>
						<Input value={form.name} onChange={e=> setForm({...form, name: e.target.value})} placeholder="e.g., Home Down Payment" />
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<div className="text-[11px] text-muted-foreground mb-1">Target amount (₹)</div>
							<Input type="number" value={form.targetAmount} onChange={e=> setForm({...form, targetAmount: e.target.value})} />
						</div>
						<div>
							<div className="text-[11px] text-muted-foreground mb-1">Target date</div>
							<Input type="date" value={form.targetDate} onChange={e=> setForm({...form, targetDate: e.target.value})} />
						</div>
					</div>
					<div>
						<div className="text-[11px] text-muted-foreground mb-1">Priority</div>
						<select value={form.priority} onChange={e=> setForm({...form, priority: e.target.value as any})} className="w-full rounded-xl border border-border bg-background px-3 py-2">
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
						</select>
					</div>
					<div className="flex items-center justify-between pt-2">
						<Button variant="outline" size="sm" onClick={()=> window.history.back()}>Cancel</Button>
						<Button size="sm" onClick={save}>Save</Button>
					</div>
					{confirm ? <div className="text-xs text-emerald-600">{confirm}</div> : null}
				</div>
			</div>
		</div>
	);
}

