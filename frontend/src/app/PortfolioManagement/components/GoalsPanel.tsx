'use client';

import React, { useState, useEffect } from 'react';
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";

interface Goal {
  id: string;
  name: string;
  category: string;
  targetAmount: number;
  targetDate: Date;
  priority: "high" | "medium" | "low";
  currentProgress: number;
  isActive: boolean;
  createdAt: Date;
}

interface GoalsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalsUpdated: (goals: Goal[]) => void;
  baselinePlan?: any;
  previewPlan?: any | null;
  onDraftGoalChanged?: (g: any | null) => void;
}

const COMMON_GOAL_NAMES = [
  "Retirement Fund",
  "Home Down Payment", 
  "Child Education",
  "Emergency Fund",
  "Wealth Building",
  "Vacation Fund",
];

export default function GoalsPanel({ isOpen, onClose, onGoalsUpdated, baselinePlan, previewPlan, onDraftGoalChanged }: GoalsPanelProps) {
  const [form, setForm] = useState({ name: '', targetAmount: '', targetDate: '', priority: 'medium' as const });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; impact?: string } | null>(null);

  useEffect(()=>{
    if (!isOpen) return;
    setConfirm(null);
  }, [isOpen]);

  // Emit draft to parent so it can compute preview allocation live
  useEffect(()=>{
    if (!onDraftGoalChanged) return;
    if (!form.name || !form.targetAmount || !form.targetDate) { onDraftGoalChanged(null); return; }
    onDraftGoalChanged({
      id: 'draft',
      name: form.name,
      category: 'custom',
      targetAmount: Number(form.targetAmount)||0,
      targetDate: form.targetDate,
      priority: form.priority,
      isActive: true,
      createdAt: new Date(),
      currentProgress: 0,
    });
  }, [form, onDraftGoalChanged]);

  const save = async () => {
    if (!form.name || !form.targetAmount || !form.targetDate) return;
    setSaving(true);
    try {
      const stored = (()=>{ try { return JSON.parse(localStorage.getItem('investmentGoals')||'[]'); } catch { return []; } })();
      const newGoal: Goal = {
        id: Date.now().toString(),
        name: form.name,
        category: 'custom',
        targetAmount: Number(form.targetAmount)||0,
        targetDate: new Date(form.targetDate),
        priority: form.priority,
        currentProgress: 0,
        isActive: true,
        createdAt: new Date(),
      };
      const updated = [...stored, newGoal];
      localStorage.setItem('investmentGoals', JSON.stringify(updated));
      onGoalsUpdated(updated);
      // Compute simple impact text from baseline vs preview
      let impact = '';
      try {
        const before: Record<string, number> = (baselinePlan?.buckets||[]).reduce((m:any,b:any)=> (m[b.class]=b.pct,m), {});
        const after: Record<string, number> = (previewPlan?.buckets||[]).reduce((m:any,b:any)=> (m[b.class]=b.pct,m), {});
        const classes = Object.keys(after||{});
        const deltas = classes.map(c=> ({ c, d: Math.round((after[c]||0) - (before[c]||0)) })).filter(x=> x.d !== 0).sort((a,b)=> Math.abs(b.d)-Math.abs(a.d)).slice(0,2);
        if (deltas.length) {
          const parts = deltas.map(x=> `${x.c} ${x.d>0?'+':''}${x.d}%`);
          impact = `Impact: ${parts.join(', ')}`;
        }
      } catch {}
      setConfirm({ title: `🎯 ${newGoal.name} added — Target ₹${newGoal.targetAmount.toLocaleString()} by ${newGoal.targetDate.toISOString().slice(0,10)} (${newGoal.priority[0].toUpperCase()+newGoal.priority.slice(1)} Priority).`, impact });
      setForm({ name: '', targetAmount: '', targetDate: '', priority: 'medium' });
      onDraftGoalChanged?.(null);
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/20 dark:bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 z-[61] h-full w-full md:w-[460px] border-l border-border bg-card text-foreground shadow-2xl">
        <div className="flex h-full">
          {/* Left preview panel (hidden on small screens) */}
          <div className="hidden md:flex w-1/2 border-r border-border bg-background/50">
            <div className="p-4 w-full">
              <div className="text-xs text-muted-foreground mb-2">Live preview</div>
              {previewPlan && previewPlan.buckets ? (
                <div className="space-y-1 text-xs">
                  {previewPlan.buckets.map((b:any)=> (
                    <div key={b.class} className="flex items-center justify-between"><span>{b.class}</span><span>{Math.round(b.pct)}%</span></div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Fill the form to preview impact.</div>
              )}
            </div>
          </div>
          {/* Right form/content */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0">
              <h2 className="text-base font-semibold">Investment Goals</h2>
              <button onClick={onClose} className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!confirm ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <h3 className="text-sm font-medium mb-3">Quick Add / Edit</h3>
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Goal Type</div>
                        <select
                          value={form.name}
                          onChange={(e) => setForm({...form, name: e.target.value})}
                          className="w-full rounded border border-border bg-background px-2 py-2"
                        >
                          <option value="">Choose goal type</option>
                          {COMMON_GOAL_NAMES.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                          <option value="custom">Custom Goal</option>
                        </select>
                      </div>
                      {form.name === 'custom' && (
                        <div>
                          <div className="text-[11px] text-muted-foreground mb-1">Custom Name</div>
                          <Input placeholder="Enter custom goal name" value={form.name === 'custom' ? '' : form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
                        </div>
                      )}
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Target amount (₹)</div>
                        <Input type="number" placeholder="0" value={form.targetAmount} onChange={(e) => setForm({...form, targetAmount: e.target.value})} />
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Target date</div>
                        <Input type="date" value={form.targetDate} onChange={(e) => setForm({...form, targetDate: e.target.value})} />
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Priority</div>
                        <select
                          value={form.priority}
                          onChange={(e) => setForm({...form, priority: e.target.value as any})}
                          className="w-full rounded border border-border bg-background px-2 py-2"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Button onClick={save} disabled={saving}>Save</Button>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" onClick={()=> setForm({ name:'', targetAmount:'', targetDate:'', priority:'medium' })}>Reset</Button>
                          <Button variant="outline" onClick={()=> { window.location.assign('/PortfolioManagement/Goals'); }}>View All Goals & Insights →</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-sm font-medium mb-1">{confirm.title}</div>
                  {confirm.impact ? <div className="text-xs text-muted-foreground mb-2">{confirm.impact}</div> : null}
                  <div className="flex items-center gap-2">
                    <Button onClick={()=> { setConfirm(null); setForm({ name:'', targetAmount:'', targetDate:'', priority:'medium' }); }}>+ Add Another Goal</Button>
                    <Button variant="outline" onClick={()=> { window.location.assign('/PortfolioManagement/Goals'); }}>View All Goals & Insights →</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
