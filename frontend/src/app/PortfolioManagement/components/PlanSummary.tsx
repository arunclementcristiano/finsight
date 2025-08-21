"use client";
import React, { useMemo } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { useApp } from "../../store";
import { computeRebalance } from "../domain/rebalance";

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

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

  function valueOfHolding(h: any): number {
    if (typeof h.currentValue === "number") return h.currentValue;
    if (typeof h.units === "number" && typeof h.price === "number") return h.units * h.price;
    if (typeof h.investedAmount === "number") return h.investedAmount;
    return 0;
  }

  const targetVsActual = useMemo(() => {
    if (!plan) return null as any;
    const classToValue = new Map<string, number>();
    for (const h of holdings) {
      const v = valueOfHolding(h);
      classToValue.set(h.instrumentClass, (classToValue.get(h.instrumentClass) || 0) + v);
    }
    const total = Array.from(classToValue.values()).reduce((a, b) => a + b, 0) || 1;
    const labels: string[] = plan.buckets.map((b: any) => b.class);
    const target = plan.buckets.map((b: any) => b.pct);
    const actual = labels.map((lbl: string) => +(((classToValue.get(lbl) || 0) / total) * 100).toFixed(2));
    return {
      data: {
        labels,
        datasets: [
          { label: "Target %", data: target, backgroundColor: "rgba(99,102,241,0.5)" },
          { label: "Actual %", data: actual, backgroundColor: "rgba(16,185,129,0.5)" },
        ],
      },
      options: {
        plugins: { legend: { position: "bottom" as const, labels: { font: { size: 11 } } } },
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, max: 100, ticks: { stepSize: 20, font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } },
      },
    };
  }, [plan, holdings]);

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
          <CardTitle className="text-base">Allocation Overview</CardTitle>
          <CardDescription className="text-xs">Target mix and details</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {plan && donutData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              <div className="mx-auto h-52 w-full max-w-xs"><Doughnut data={donutData} options={{ plugins: { legend: { position: "bottom" as const, labels: { font: { size: 11 } } } }, cutout: "70%" }} /></div>
              <div className="rounded-xl border border-border overflow-auto max-h-56">
                <table className="w-full text-left text-xs">
                  <thead className="bg-card sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-3 text-muted-foreground">Asset Class</th>
                      <th className="py-2 px-3 text-muted-foreground text-right">Allocation</th>
                      <th className="py-2 px-3 text-muted-foreground text-right">Comfort Zone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.buckets.map((b: any) => (
                      <tr key={b.class} className="border-t border-border/50">
                        <td className="py-2 px-3 font-medium">{b.class}</td>
                        <td className="py-2 px-3 text-right">{b.pct}%</td>
                        <td className="py-2 px-3 text-right">{b.range?.[0]}% – {b.range?.[1]}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">No plan yet.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-base">Target vs Actual</CardTitle>
          <CardDescription className="text-xs">Compact comparison</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {plan && targetVsActual ? (
            <div className="h-48">
              <Bar data={targetVsActual.data} options={targetVsActual.options as any} />
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">No data yet.</div>
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
            <div className="text-muted-foreground text-sm">{!plan ? "No plan yet." : "All good! No rebalancing needed."}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

