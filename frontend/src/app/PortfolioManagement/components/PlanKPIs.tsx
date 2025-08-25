"use client";
import React from "react";
import { Card, CardContent } from "../../components/Card";
import { transformRiskLevel } from "../domain/languageTransform";
import type { DisplayMode } from "../domain/languageTransform";

interface PlanKPIsProps {
  plan: any;
  holdings?: any[];
  className?: string;
  displayMode?: DisplayMode;
}

export default function PlanKPIs({ plan, holdings = [], className = "", displayMode }: PlanKPIsProps) {
  if (!plan) return null;

  // Calculate KPIs
  const kpis = React.useMemo(() => {
    const buckets = plan.buckets || [];
    
    const equity = buckets
      .filter((b: any) => ["Stocks", "Mutual Funds"].includes(b.class))
      .reduce((sum: number, b: any) => sum + (b.pct || 0), 0);
    
    const defensive = buckets
      .filter((b: any) => ["Debt", "Liquid"].includes(b.class))
      .reduce((sum: number, b: any) => sum + (b.pct || 0), 0);
    
    const satellite = buckets
      .filter((b: any) => ["Gold", "Real Estate"].includes(b.class))
      .reduce((sum: number, b: any) => sum + (b.pct || 0), 0);

    return {
      equity: Math.round(equity),
      defensive: Math.round(defensive),
      satellite: Math.round(satellite)
    };
  }, [plan]);

  return (
    <div className={`${className}`}>
      {/* KPI Dashboard - Matching existing design system */}
      <div className="grid grid-cols-4 gap-3">
        {/* Equity */}
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">
            {displayMode === 'advisor' ? 'Equity' : 'Stocks & Funds'}
          </div>
          <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
            {kpis.equity}%
          </div>
          <div className="text-[10px] text-muted-foreground">
            {displayMode === 'advisor' ? 'Growth Focus' : 'For growth'}
          </div>
        </div>

        {/* Defensive */}
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">
            {displayMode === 'advisor' ? 'Defensive' : 'Safe Investments'}
          </div>
          <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            {kpis.defensive}%
          </div>
          <div className="text-[10px] text-muted-foreground">
            {displayMode === 'advisor' ? 'Stability' : 'For safety'}
          </div>
        </div>

        {/* Satellite */}
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">
            {displayMode === 'advisor' ? 'Satellite' : 'Special Investments'}
          </div>
          <div className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-1">
            {kpis.satellite}%
          </div>
          <div className="text-[10px] text-muted-foreground">
            {displayMode === 'advisor' ? 'Diversification' : 'For variety'}
          </div>
        </div>

        {/* Risk Profile */}
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">
            {displayMode === 'advisor' ? 'Risk Profile' : 'Your Style'}
          </div>
          <div className="text-lg font-semibold text-foreground mb-1">
            {displayMode === 'advisor' ? (plan?.riskLevel || "—") : transformRiskLevel(plan?.riskLevel || "", displayMode || 'investor')}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {displayMode === 'advisor' ? 'Tolerance Level' : 'Investment comfort'}
          </div>
        </div>
      </div>
    </div>
  );
}