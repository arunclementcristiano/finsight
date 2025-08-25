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
      case "Conservative": return "from-emerald-50 to-green-50 border-emerald-100";
      case "Moderate": return "from-amber-50 to-yellow-50 border-amber-100";
      case "Aggressive": return "from-rose-50 to-red-50 border-rose-100";
      default: return "from-slate-50 to-gray-50 border-slate-100";
    }
  };

  const getRiskTextColor = (level: string) => {
    switch (level) {
      case "Conservative": return "text-emerald-700";
      case "Moderate": return "text-amber-700";
      case "Aggressive": return "text-rose-700";
      default: return "text-slate-700";
    }
  };

  return (
    <div className={`${className}`}>
      {/* Enhanced KPI Dashboard */}
      <div className="grid grid-cols-4 gap-4">
        {/* Equity */}
        <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-100 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-xs font-medium text-blue-600 mb-2 tracking-wide uppercase">Equity</div>
              <div className="text-2xl font-bold text-blue-800 mb-1">
                {kpis.equity}%
              </div>
              <div className="text-xs text-blue-500 opacity-75">Growth Focus</div>
            </div>
          </CardContent>
        </Card>

        {/* Defensive */}
        <Card className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-emerald-100 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-xs font-medium text-emerald-600 mb-2 tracking-wide uppercase">Defensive</div>
              <div className="text-2xl font-bold text-emerald-800 mb-1">
                {kpis.defensive}%
              </div>
              <div className="text-xs text-emerald-500 opacity-75">Stability</div>
            </div>
          </CardContent>
        </Card>

        {/* Satellite */}
        <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-100 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-xs font-medium text-amber-600 mb-2 tracking-wide uppercase">Satellite</div>
              <div className="text-2xl font-bold text-amber-800 mb-1">
                {kpis.satellite}%
              </div>
              <div className="text-xs text-amber-500 opacity-75">Diversification</div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Profile */}
        <Card className={`bg-gradient-to-br ${getRiskColor(plan?.riskLevel || "")} shadow-sm hover:shadow-md transition-all duration-200`}>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-xs font-medium text-gray-600 mb-2 tracking-wide uppercase">Risk Profile</div>
              <div className={`text-2xl font-bold ${getRiskTextColor(plan?.riskLevel || "")} mb-1`}>
                {plan?.riskLevel || "—"}
              </div>
              <div className="text-xs text-gray-500 opacity-75">Tolerance Level</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}