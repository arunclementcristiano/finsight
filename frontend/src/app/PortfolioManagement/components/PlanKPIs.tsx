"use client";
import React from "react";
import { Card, CardContent } from "../../components/Card";
import { Target, Clock } from "lucide-react";

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

    // Portfolio value
    const totalValue = holdings.reduce((sum: number, h: any) => 
      sum + (h.currentValue || (h.units && h.price ? h.units * h.price : 0)), 0
    );

    const totalInvested = holdings.reduce((sum: number, h: any) => 
      sum + (h.investedAmount || (h.units && h.price ? h.units * h.price : 0)), 0
    );

    // Risk-adjusted return expectation (rough estimate)
    const expectedReturn = (equity * 0.12 + defensive * 0.07 + satellite * 0.10) / 100;

    return {
      equity: Math.round(equity),
      defensive: Math.round(defensive),
      satellite: Math.round(satellite),
      totalValue,
      totalInvested,
      expectedReturn
    };
  }, [plan, holdings]);

  return (
    <div className={`${className}`}>
      {/* Clean, Simple Summary Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Expected Return */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-blue-700">Expected Return</div>
                <div className="text-lg font-bold text-blue-800">
                  {(kpis.expectedReturn * 100).toFixed(1)}% p.a.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Horizon */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="text-xs text-green-700">Time Horizon</div>
                <div className="text-lg font-bold text-green-800">
                  {plan.riskLevel === 'Aggressive' ? '7+ years' : 
                   plan.riskLevel === 'Conservative' ? '1-3 years' : '3-7 years'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}