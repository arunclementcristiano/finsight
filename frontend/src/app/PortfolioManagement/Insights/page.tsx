"use client";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { useApp } from "../../store";
import { computeRebalance } from "../domain/rebalance";
import { Button } from "../../components/Button";

export default function InsightsPage() {
  const { holdings, plan, driftTolerancePct, profile } = useApp();
  const currency = profile.currency || "INR";
  const result = useMemo(() => plan ? computeRebalance(holdings, plan, driftTolerancePct) : { items: [], totalCurrentValue: 0 }, [holdings, plan, driftTolerancePct]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Top Drift Items</CardTitle>
          <CardDescription>Quick actions to rebalance</CardDescription>
        </CardHeader>
        <CardContent>
          {plan && result.items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.items.map(item => (
                <Card key={item.class}>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">{item.class}</div>
                        <div className="text-lg font-semibold">{item.action} {currency} {item.amount.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">Actual {item.actualPct}% vs Target {item.targetPct}%</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">{item.action}</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border p-6 text-center">
              <div className="text-lg font-semibold mb-1">All good!</div>
              <div className="text-muted-foreground text-sm">Your portfolio is within the drift tolerance.</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

