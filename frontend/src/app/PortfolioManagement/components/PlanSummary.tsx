"use client";
import React, { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { useApp } from "../../store";
import { computeRebalance } from "../domain/rebalance";

Chart.register(ArcElement, Tooltip, Legend);

export default function PlanSummary({ plan }: { plan: any }) {
  const { holdings, driftTolerancePct } = useApp();

  const donutData = useMemo(() => {
    if (!plan) return null;
    return {
      labels: plan.buckets.map((b: any) => b.class),
      datasets: [
        {
          data: plan.buckets.map((b: any) => b.pct),
          backgroundColor: ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#f97316", "#06b6d4"],
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    };
  }, [plan]);

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Target Allocation</CardTitle>
          <CardDescription>Your plan’s target mix</CardDescription>
        </CardHeader>
        <CardContent>
          {plan && donutData ? (
            <div className="mx-auto h-64 max-w-sm"><Doughnut data={donutData} options={{ plugins: { legend: { position: "bottom" as const, labels: { font: { size: 12 } } } }, cutout: "70%" }} /></div>
          ) : (
            <div className="text-muted-foreground">No plan yet.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allocation Details</CardTitle>
        </CardHeader>
        <CardContent>
          {plan ? (
            <div className="rounded-xl border border-border overflow-auto max-h-80">
              <table className="w-full text-left text-sm">
                <thead className="bg-card sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 text-muted-foreground">Asset Class</th>
                    <th className="py-3 px-4 text-muted-foreground text-right">Allocation</th>
                    <th className="py-3 px-4 text-muted-foreground text-right">Comfort Zone</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.buckets.map((b: any) => (
                    <tr key={b.class} className="border-t border-border/50">
                      <td className="py-3 px-4 font-medium">{b.class}</td>
                      <td className="py-3 px-4 text-right">{b.pct}%</td>
                      <td className="py-3 px-4 text-right">{b.range?.[0]}% – {b.range?.[1]}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-muted-foreground">Create a plan to see details.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rebalancing Suggestions</CardTitle>
          <CardDescription>Based on drift tolerance of {driftTolerancePct}%</CardDescription>
        </CardHeader>
        <CardContent>
          {plan && rebalance.items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rebalance.items.map((item) => (
                <Card key={item.class}><CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">{item.class}</div>
                      <div className="text-lg font-semibold">{item.action} {item.amount.toFixed(2)}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{item.actualPct}% → {item.targetPct}%</div>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">{!plan ? "No plan yet." : "All good! No rebalancing needed."}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

