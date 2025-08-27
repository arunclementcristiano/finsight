'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/Card';
import { Button } from '../../components/Button';
import { formatCurrency, formatNumber } from '../../utils/format';

interface Goal {
  id: string;
  name: string;
  category?: string;
  targetAmount: number;
  targetDate: string | Date;
  priority: 'low'|'medium'|'high';
  currentProgress: number;
  isActive: boolean;
  createdAt: string | Date;
}

function useGoals(): Goal[] {
  const [goals, setGoals] = React.useState<Goal[]>([]);
  React.useEffect(()=>{
    try {
      const raw = localStorage.getItem('investmentGoals');
      if (!raw) { setGoals([]); return; }
      const arr = JSON.parse(raw).map((g:any)=> ({
        ...g,
        targetDate: new Date(g.targetDate).toISOString(),
        createdAt: new Date(g.createdAt).toISOString(),
      })) as Goal[];
      setGoals(arr);
    } catch { setGoals([]); }
  }, []);
  return goals;
}

function progressPct(goal: Goal): number {
  const t = Number(goal.targetAmount||0) || 0;
  const p = Number(goal.currentProgress||0) || 0;
  if (t <= 0) return 0;
  return Math.max(0, Math.min(100, +(p*100/t).toFixed(2)));
}

function statusLabel(goal: Goal): string {
  const pct = progressPct(goal);
  const months = Math.round((new Date(goal.targetDate).getTime() - Date.now())/(1000*60*60*24*30.44));
  if (months <= 0) return pct >= 100 ? 'Completed' : 'Past Due';
  if (pct >= 80) return 'Ahead';
  if (pct >= 40) return 'On Track';
  return 'Behind';
}

function sipAdvice(goal: Goal): string {
  const t = Number(goal.targetAmount||0) || 0;
  const p = Number(goal.currentProgress||0) || 0;
  const remain = Math.max(0, t - p);
  const months = Math.max(1, Math.round((new Date(goal.targetDate).getTime() - Date.now())/(1000*60*60*24*30.44)));
  const sip = Math.ceil(remain / months);
  if (remain === 0) return 'You are fully funded.';
  return `Increase SIP by ${formatCurrency(sip)} to stay on track`;
}

export default function GoalsDashboardPage() {
  const goals = useGoals();
  const active = goals.filter(g=> g.isActive);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Goals Dashboard</h1>
          <p className="text-xs text-muted-foreground">Track progress, contributions, gaps, and timeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={()=> window.location.assign('/PortfolioManagement/Plan?goals=open')}>Add / Edit Goals</Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-[11px] text-muted-foreground">Active Goals</div>
            <div className="text-lg font-semibold">{active.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-[11px] text-muted-foreground">Total Target</div>
            <div className="text-lg font-semibold">{formatCurrency(active.reduce((s,g)=> s + (Number(g.targetAmount)||0), 0))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-[11px] text-muted-foreground">Total Progress</div>
            <div className="text-lg font-semibold">{formatCurrency(active.reduce((s,g)=> s + (Number(g.currentProgress)||0), 0))}</div>
          </CardContent>
        </Card>
      </div>

      {/* Goal list with progress + advice */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-base">Goals Overview</CardTitle>
          <CardDescription className="text-xs">Funding progress and advice</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {active.length === 0 ? (
            <div className="text-xs text-muted-foreground">No active goals yet.</div>
          ) : (
            <div className="space-y-2">
              {active.map(g=> {
                const pct = progressPct(g);
                const label = statusLabel(g);
                const advice = sipAdvice(g);
                return (
                  <div key={g.id} className="rounded border border-border p-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{g.name}</div>
                      <div className="text-[11px] text-muted-foreground">Target: {new Date(g.targetDate).toISOString().slice(0,10)}</div>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-[11px] text-muted-foreground">Target</div>
                        <div className="font-medium">{formatCurrency(Number(g.targetAmount)||0)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">Progress</div>
                        <div className="font-medium">{formatCurrency(Number(g.currentProgress)||0)} ({pct}%)</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">Status</div>
                        <div className={`font-medium ${label==='Behind'?'text-rose-600': label==='Ahead'?'text-emerald-600':'text-amber-600'}`}>{label}</div>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded bg-muted overflow-hidden">
                      <div className={`h-1.5 ${label==='Behind'?'bg-rose-500': label==='Ahead'?'bg-emerald-500':'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">{advice}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contributions placeholder */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-base">Instruments Contribution</CardTitle>
          <CardDescription className="text-xs">Breakdown by asset class (placeholder)</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 text-xs text-muted-foreground">
          Coming soon: per-goal pie/stacked bars (class → contribution%), derived from holdings mapping.
        </CardContent>
      </Card>

      {/* Timeline view */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-base">Timeline</CardTitle>
          <CardDescription className="text-xs">Goals by target date</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-xs">
            {[...active].sort((a,b)=> new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()).map(g=> (
              <div key={`timeline-${g.id}`} className="flex items-center justify-between rounded border border-border p-2">
                <div className="font-medium">{g.name}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(g.targetDate).toISOString().slice(0,10)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Impact placeholder */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-base">Impact of Changes</CardTitle>
          <CardDescription className="text-xs">Before / After comparisons (placeholder)</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 text-xs text-muted-foreground">
          Coming soon: compare allocation or risk profile changes on goal outcomes.
        </CardContent>
      </Card>
    </div>
  );
}
