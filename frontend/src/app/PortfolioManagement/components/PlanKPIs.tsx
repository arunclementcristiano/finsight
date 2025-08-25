"use client";
import React from "react";
import { Card, CardContent } from "../../components/Card";

interface PlanKPIsProps {
  plan: any;
  holdings?: any[];
  className?: string;
}

export default function PlanKPIs({ plan, holdings = [], className = "" }: PlanKPIsProps) {
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
      {/* Clean, Simple Summary Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Equity */}
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-xs text-indigo-700 mb-1">Equity</div>
              <div className="text-lg font-bold text-indigo-800">
                {kpis.equity}%
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Defensive */}
        <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-xs text-emerald-700 mb-1">Defensive</div>
              <div className="text-lg font-bold text-emerald-800">
                {kpis.defensive}%
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Satellite */}
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-xs text-amber-700 mb-1">Satellite</div>
              <div className="text-lg font-bold text-amber-800">
                {kpis.satellite}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}