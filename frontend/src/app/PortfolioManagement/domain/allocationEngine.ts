// Allocation Engine for Finsight Portfolio Management
// Implements buildPlan(q) as per P-04 requirements

export type AssetClass = "Stocks" | "Mutual Funds" | "Gold" | "Real Estate" | "Debt" | "Liquid";
export type RiskLevel = "Low" | "Moderate" | "High";

export interface AllocationPlan {
  riskLevel: RiskLevel;
  rationale: string;
  buckets: Array<{
    class: AssetClass;
    pct: number;
    range: [number, number];
    riskCategory: string;
    notes: string;
  }>;
}

import { suggestAllocation, Answers } from "./suggestAllocation";

export function buildPlan(q: Record<string, any>): AllocationPlan {
  // Compute whole-number allocation using the spec-driven engine
  const alloc = suggestAllocation(q as Answers);

  // Risk score for display/ranges
  const mapRA: Record<Answers["riskAppetite"], number> = { Low: 20, Moderate: 50, High: 80 };
  const mapVol: Record<Answers["volatilityComfort"], number> = { Low: 20, Medium: 50, High: 80 } as any;
  const mapDD: Record<Answers["maxDrawdownTolerance"], number> = { "5%": 15, "10%": 35, "20%": 60, "30%+": 85 };
  const mapHor: Record<Answers["horizon"], number> = { "Short (<3 yrs)": 25, "Medium (3–7 yrs)": 55, "Long (>7 yrs)": 80 };
  const mapAge: Record<Answers["ageBand"], number> = { "18–30": 80, "31–45": 65, "46–60": 45, "60+": 25 };
  const mapInc: Record<Answers["incomeVsExpenses"], number> = { Deficit: 25, "Break-even": 50, Surplus: 70 };
  const riskScore = Math.max(0, Math.min(100, Math.round(
    0.30 * mapRA[(q as Answers).riskAppetite] +
    0.15 * mapVol[(q as Answers).volatilityComfort] +
    0.15 * mapDD[(q as Answers).maxDrawdownTolerance] +
    0.15 * mapHor[(q as Answers).horizon] +
    0.15 * mapAge[(q as Answers).ageBand] +
    0.10 * mapInc[(q as Answers).incomeVsExpenses]
  )));
  const riskLevel: RiskLevel = riskScore >= 67 ? "High" : riskScore <= 33 ? "Low" : "Moderate";

  // Per-asset band percentages (relative to baseline)
  function baseBandPctFor(cls: AssetClass): number {
    if (cls === "Stocks" || cls === "Mutual Funds") return 0.08; // Equity ±8%
    if (cls === "Debt") return 0.07; // Debt ±7%
    if (cls === "Liquid") return 0.03; // Liquid ±3%
    if (cls === "Gold" || cls === "Real Estate") return 0.02; // Gold/RE ±2%
    return 0.05;
  }
  function adjustFactorByProfile(cls: AssetClass): number {
    const ans = q as Answers;
    let f = 1.0;
    if (ans.riskAppetite === "Low") f *= 0.85;
    if (ans.riskAppetite === "High") f *= 1.10;
    if (ans.horizon === "Short (<3 yrs)") f *= 0.9;
    if (ans.horizon === "Long (>7 yrs)") f *= 1.1;
    if (ans.ageBand === "46–60") f *= 0.9; else if (ans.ageBand === "60+") f *= 0.8;
    // Slightly tighter for Liquid regardless
    if (cls === "Liquid") f *= 0.9;
    // Keep bands sensible
    return Math.max(0.6, Math.min(1.25, f));
  }

  // Helper functions for display
  function getRiskCategory(cls: AssetClass): string {
    if (cls === "Stocks" || cls === "Mutual Funds") return "Core";
    if (cls === "Gold" || cls === "Real Estate") return "Satellite";
    if (cls === "Debt" || cls === "Liquid") return "Defensive";
    return "Other";
  }
  function getNotes(cls: AssetClass, level: RiskLevel): string {
    if (cls === "Stocks") return level === "High" ? "Growth focus" : "Balanced equity";
    if (cls === "Mutual Funds") return "Diversified exposure";
    if (cls === "Gold") return "Inflation hedge";
    if (cls === "Real Estate") return "Long-term asset";
    if (cls === "Debt") return "Stability & income";
    if (cls === "Liquid") return "Emergency buffer";
    return "";
  }

  const buckets = (Object.keys(alloc) as AssetClass[]).map(cls => {
    const pct = alloc[cls];
    const bandPct = baseBandPctFor(cls) * adjustFactorByProfile(cls);
    const delta = pct * bandPct;
    const min = +(Math.max(0, pct - delta).toFixed(2));
    const max = +(Math.min(100, pct + delta).toFixed(2));
    return {
      class: cls,
      pct,
      range: [min, max] as [number, number],
      riskCategory: getRiskCategory(cls),
      notes: getNotes(cls, riskLevel)
    };
  });

  const toList = (v: any): string => {
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === 'string') return v;
    return "";
  };
  const rationale = `Derived from risk (${riskLevel}), horizon (${q.horizon||""}), emergency fund (${q.emergencyFundMonthsTarget||""} months), expense (${q.bigExpenseTimeline||"None"}), liquidity (${q.liquidityPreference||""}), avoid [${toList((q as any).avoidAssets)}], emphasize [${toList((q as any).emphasizeAssets)}].`;

  return { riskLevel, rationale, buckets };
}