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

  const getRiskColor = (level: string) => {
    switch (level) {
      case "Conservative": return "from-green-50 to-emerald-50 border-green-200";
      case "Moderate": return "from-yellow-50 to-amber-50 border-yellow-200";
      case "Aggressive": return "from-red-50 to-rose-50 border-red-200";
      default: return "from-gray-50 to-slate-50 border-gray-200";
    }
  };

  const getRiskTextColor = (level: string) => {
    switch (level) {
      case "Conservative": return "text-green-800";
      case "Moderate": return "text-yellow-800";
      case "Aggressive": return "text-red-800";
      default: return "text-gray-800";
    }
  };

  return (
    <div className={`${className}`}>
      {/* Clean, Simple Summary Row */}
      <div className="grid grid-cols-4 gap-3">
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

        {/* Risk Profile */}
        <Card className={`bg-gradient-to-r ${getRiskColor(plan?.riskLevel || "")}`}>
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Risk Profile</div>
              <div className={`text-lg font-bold ${getRiskTextColor(plan?.riskLevel || "")}`}>
                {plan?.riskLevel || "—"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}