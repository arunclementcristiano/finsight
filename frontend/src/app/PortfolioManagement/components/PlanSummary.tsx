"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { useApp } from "../../store";
import { computeRebalance } from "../domain/rebalance";
import { LineChart, Layers, Banknote, Coins, Home, Droplet } from "lucide-react";

export default function PlanSummary({ plan, onChangeBucketPct }: { plan: any; onChangeBucketPct?: (index: number, newPct: number) => void }) {
  const { holdings, driftTolerancePct } = useApp();
  const [wideRange, setWideRange] = useState(false);

  const kpis = useMemo(() => {
    if (!plan) return { equity: 0, defensive: 0, satellite: 0 };
    const byClass = new Map<string, number>();
    for (const b of plan.buckets) byClass.set(b.class, (byClass.get(b.class) || 0) + b.pct);
    const equity = (byClass.get("Stocks") || 0) + (byClass.get("Mutual Funds") || 0);
    const defensive = (byClass.get("Debt") || 0) + (byClass.get("Liquid") || 0);
    const satellite = (byClass.get("Gold") || 0) + (byClass.get("Real Estate") || 0);
    return { equity, defensive, satellite };
  }, [plan]);

  const rebalance = useMemo(() => (plan ? computeRebalance(holdings, plan, driftTolerancePct) : { items: [], totalCurrentValue: 0 }), [holdings, plan, driftTolerancePct]);

  function displayRange(range?: [number, number]) {
    if (!range) return "—";
    let [min, max] = range;
    if (wideRange) {
      const widenBy = 2; // widen by 2% on each side for a softer comfort zone
      min = Math.max(0, Math.floor(min - widenBy));
      max = Math.min(100, Math.ceil(max + widenBy));
    }
    return `${min}% – ${max}%`;
  }

  return (
    <div className="space-y-3">
      {/* Compact KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border p-2 text-center">
          <div className="text-[11px] text-muted-foreground">Equity</div>
          <div className="text-base font-semibold text-indigo-600">{kpis.equity.toFixed(0)}%</div>
        </div>
        <div className="rounded-lg border border-border p-2 text-center">
          <div className="text-[11px] text-muted-foreground">Defensive</div>
          <div className="text-base font-semibold text-emerald-600">{kpis.defensive.toFixed(0)}%</div>
        </div>
        <div className="rounded-lg border border-border p-2 text-center">
          <div className="text-[11px] text-muted-foreground">Satellite</div>
          <div className="text-base font-semibold text-amber-600">{kpis.satellite.toFixed(0)}%</div>
        </div>
      </div>
      <Card>
        <CardHeader className="py-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Allocation</CardTitle>
              <CardDescription className="text-xs">Target mix and details</CardDescription>
            </div>
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              <button onClick={()=> setWideRange(false)} className={`px-2 py-1 text-[11px] ${!wideRange ? 'bg-card text-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>Normal</button>
              <button onClick={()=> setWideRange(true)} className={`px-2 py-1 text-[11px] ${wideRange ? 'bg-card text-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>Wide</button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {plan ? (
            <div className="rounded-xl border border-border overflow-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-card sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3 text-muted-foreground">Asset Class</th>
                    <th className="py-2 px-3 text-muted-foreground text-right">Allocation</th>
                    <th className="py-2 px-3 text-muted-foreground text-right">Comfort Zone</th>
                    <th className="py-2 px-3 text-muted-foreground">Role</th>
                    <th className="py-2 px-3 text-muted-foreground">Remarks</th>
                    <th className="py-2 px-3 text-muted-foreground">Adjust</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.buckets.map((b: any, idx: number) => (
                    <tr key={b.class} className="border-t border-border/50">
                      <td className="py-2 px-3 font-medium"><span className="inline-flex items-center">{(() => { const common = "h-4 w-4 mr-2"; if (b.class === "Stocks") return <LineChart className={common} />; if (b.class === "Mutual Funds") return <Layers className={common} />; if (b.class === "Debt") return <Banknote className={common} />; if (b.class === "Gold") return <Coins className={common} />; if (b.class === "Real Estate") return <Home className={common} />; if (b.class === "Liquid") return <Droplet className={common} />; return <LineChart className={common} />; })()}{b.class}</span></td>
                      <td className="py-2 px-3 text-right">{b.pct}%</td>
                      <td className="py-2 px-3 text-right">{displayRange(b.range)}</td>
                      <td className="py-2 px-3">{b.riskCategory || (b.class === 'Stocks' || b.class === 'Mutual Funds' ? 'Core' : (b.class === 'Gold' || b.class === 'Real Estate' ? 'Satellite' : (b.class === 'Debt' || b.class === 'Liquid' ? 'Defensive' : '')))}</td>
                      <td className="py-2 px-3">{b.notes || (b.class === 'Stocks' ? 'Growth focus' : b.class === 'Mutual Funds' ? 'Diversified equity' : b.class === 'Debt' ? 'Stability & income' : b.class === 'Liquid' ? 'Emergency buffer' : b.class === 'Gold' ? 'Inflation hedge' : b.class === 'Real Estate' ? 'Long-term asset' : '')}</td>
                      <td className="py-2 px-3">
                        <input type="range" min={0} max={100} value={b.pct} onChange={(e)=>{
                          const v = Math.max(0, Math.min(100, Number(e.target.value)||0));
                          if (onChangeBucketPct) onChangeBucketPct(idx, v);
                        }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">No plan yet.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-base">Rebalancing Suggestions</CardTitle>
          <CardDescription className="text-xs">Based on drift tolerance of {driftTolerancePct}%</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {plan && rebalance.items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {rebalance.items.map((item) => (
                <div key={item.class} className="rounded-lg border border-border p-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium">{item.class}</div>
                    <div className="text-muted-foreground">{item.actualPct}% → {item.targetPct}%</div>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-2 rounded bg-muted w-full overflow-hidden">
                      <div className={`h-2 ${item.action === 'Increase' ? 'bg-indigo-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.max(5, Math.round((item.amount / Math.max(1, rebalance.totalCurrentValue)) * 100)))}%` }}></div>
                    </div>
                    <div className={`text-xs ${item.action === 'Increase' ? 'text-indigo-600' : 'text-rose-600'}`}>{item.action} {item.amount.toFixed(0)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">{!plan ? "No plan yet." : "All good! No rebalancing needed."}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}