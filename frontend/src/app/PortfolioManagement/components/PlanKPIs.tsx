"use client";
import React from "react";
import { Card, CardContent } from "../../components/Card";
import { 
  TrendingUp, 
  Shield, 
  Globe2, 
  Target, 
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Zap
} from "lucide-react";
import RiskProfile from "./RiskProfile";

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

    // Diversification score (simple metric based on allocation spread)
    const diversificationScore = Math.min(100, 
      (buckets.length * 15) + (satellite > 5 ? 20 : 0) + (defensive > 20 ? 15 : 0)
    );

    // Risk-adjusted return expectation (rough estimate)
    const expectedReturn = equity * 0.12 + defensive * 0.07 + satellite * 0.10;

    return {
      equity: Math.round(equity),
      defensive: Math.round(defensive),
      satellite: Math.round(satellite),
      totalValue,
      totalInvested,
      diversificationScore: Math.round(diversificationScore),
      expectedReturn: expectedReturn / 100 // Convert to decimal
    };
  }, [plan, holdings]);

  const getHealthStatus = () => {
    const { equity, defensive, satellite } = kpis;
    
    // Good allocation balance
    if (equity >= 30 && equity <= 70 && defensive >= 20 && satellite >= 5) {
      return { status: "healthy", color: "text-green-600", bgColor: "bg-green-50", icon: CheckCircle2 };
    }
    
    // High risk
    if (equity > 80) {
      return { status: "high-risk", color: "text-amber-600", bgColor: "bg-amber-50", icon: AlertTriangle };
    }
    
    // Too conservative
    if (equity < 20) {
      return { status: "conservative", color: "text-blue-600", bgColor: "bg-blue-50", icon: Shield };
    }
    
    return { status: "balanced", color: "text-green-600", bgColor: "bg-green-50", icon: CheckCircle2 };
  };

  const health = getHealthStatus();
  const HealthIcon = health.icon;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Equity Allocation */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  Equity
                </div>
                <div className="text-2xl font-bold text-indigo-600">{kpis.equity}%</div>
                <div className="text-xs text-gray-500">Growth focused</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, kpis.equity)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Defensive Allocation */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Shield className="w-4 h-4" />
                  Defensive
                </div>
                <div className="text-2xl font-bold text-green-600">{kpis.defensive}%</div>
                <div className="text-xs text-gray-500">Stability & safety</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, kpis.defensive)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Satellite Allocation */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Globe2 className="w-4 h-4" />
                  Satellite
                </div>
                <div className="text-2xl font-bold text-amber-600">{kpis.satellite}%</div>
                <div className="text-xs text-gray-500">Diversification</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Globe2 className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, kpis.satellite)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Health */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Activity className="w-4 h-4" />
                  Health
                </div>
                <div className={`text-2xl font-bold ${health.color} capitalize`}>
                  {health.status.replace('-', ' ')}
                </div>
                <div className="text-xs text-gray-500">Portfolio balance</div>
              </div>
              <div className={`w-12 h-12 rounded-full ${health.bgColor} flex items-center justify-center`}>
                <HealthIcon className={`w-6 h-6 ${health.color}`} />
              </div>
            </div>
            <div className={`mt-3 px-2 py-1 rounded-full text-xs ${health.bgColor} ${health.color} text-center`}>
              Well balanced allocation
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Profile */}
        <RiskProfile 
          riskLevel={plan.riskLevel} 
          riskScore={plan.riskScore}
          className="lg:col-span-1"
        />

        {/* Expected Return */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Expected Return</div>
                <div className="text-xl font-bold text-blue-600">
                  {(kpis.expectedReturn * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">Annual (estimated)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diversification Score */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600">Diversification</div>
                <div className="text-xl font-bold text-purple-600">
                  {kpis.diversificationScore}/100
                </div>
                <div className="text-xs text-gray-500">Portfolio spread</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Value (if holdings exist) */}
      {holdings.length > 0 && kpis.totalValue > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-green-700">Current Value</div>
                  <div className="text-2xl font-bold text-green-800">
                    ₹{kpis.totalValue.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600">
                    P/L: ₹{(kpis.totalValue - kpis.totalInvested).toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-blue-700">Time Horizon</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {plan.riskLevel === 'Aggressive' ? 'Long-term' : 
                     plan.riskLevel === 'Conservative' ? 'Short-term' : 'Medium-term'}
                  </div>
                  <div className="text-xs text-blue-600">
                    {plan.riskLevel === 'Aggressive' ? '7+ years' : 
                     plan.riskLevel === 'Conservative' ? '1-3 years' : '3-7 years'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}