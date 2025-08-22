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

function normalizeAnswers(q: Record<string, any>): Answers {
  // Helpers
  const ageBand = (() => {
    const v = String(q.ageBand || "").trim();
    if (v === "<30") return "18–30";
    if (v === "30–45") return "31–45";
    if (v === "45–60") return "46–60";
    if (v === "60+") return "60+";
    // fallback to closest
    return "31–45";
  })();
  const horizon = (() => {
    const v = String(q.horizon || "");
    if (v.startsWith("<3")) return "Short (<3 yrs)";
    if (v.startsWith("3–7")) return "Medium (3–7 yrs)";
    if (v.startsWith("7+")) return "Long (>7 yrs)";
    return "Medium (3–7 yrs)";
  })();
  const volatilityComfort = (() => {
    const v = String(q.volatilityComfort || "").toLowerCase();
    if (v.includes("very")) return "High";
    if (v.includes("not")) return "Low";
    return "Medium";
  })();
  const investmentKnowledge = (() => {
    const v = String(q.investmentKnowledge || "Intermediate");
    if (v === "Experienced") return "Advanced";
    if (v === "Beginner" || v === "Intermediate" || v === "Advanced") return v as any;
    return "Intermediate" as any;
  })();
  const incomeStability = (() => {
    const v = String(q.incomeStability || "").toLowerCase();
    if (v.includes("very")) return "Stable";
    if (v.includes("not")) return "Unstable";
    return "Variable";
  })();
  const dependents = (() => {
    const v = String(q.dependents || "None");
    if (v === "None") return "None";
    if (v === "Few") return "1";
    if (v === "Many") return "3+";
    return "None";
  })();
  const liabilities = (() => {
    const v = String(q.liabilities || "None");
    if (v === "Heavy") return "High";
    if (v === "Moderate" || v === "High" || v === "Low" || v === "None") return v as any;
    return "None" as any;
  })();
  const financialGoal = (() => {
    const v = String(q.financialGoal || "Wealth growth");
    if (v === "House purchase" || v === "Education") return "Major purchase" as any;
    if (v === "Retirement" || v === "Wealth growth" || v === "Capital preservation" || v === "Income generation") return v as any;
    if (v === "Mixed") return horizon === "Long (>7 yrs)" ? "Wealth growth" : "Capital preservation" as any;
    return "Wealth growth" as any;
  })();
  const withdrawYes = String(q.withdrawNext2Yrs || "No").toLowerCase() === "yes";
  const emergencySix = String(q.emergencyFundSixMonths || "Yes").toLowerCase() === "yes";
  const insuranceOk = String(q.insuranceCoverage || "Yes").toLowerCase() === "yes";

  // Derived legacy fields
  const bigExpenseTimeline: Answers["bigExpenseTimeline"] = withdrawYes ? "12–36 months" : "None";
  const liquidityPreference: Answers["liquidityPreference"] = withdrawYes ? "High" : "Medium";
  const emergencyFundMonthsTarget: Answers["emergencyFundMonthsTarget"] = emergencySix ? "6" : "9";
  const incomeVsExpenses: Answers["incomeVsExpenses"] = (incomeStability === "Stable") ? "Surplus" : (incomeStability === "Variable" ? "Break-even" : "Deficit");

  // Risk appetite and drawdown from tolerance signals
  const riskAppetite: Answers["riskAppetite"] = (() => {
    const young = ageBand === "18–30" || ageBand === "31–45";
    const long = horizon === "Long (>7 yrs)";
    const capacityHigh = young && long && liabilities === "None" && dependents === "None" && incomeStability !== "Unstable";
    if (volatilityComfort === "High" && capacityHigh) return "High";
    const capacityLow = ageBand === "60+" || incomeStability === "Unstable" || liabilities === "High" || dependents === "3+";
    if (volatilityComfort === "Low" || capacityLow) return "Low";
    return "Moderate";
  })();
  const maxDrawdownTolerance: Answers["maxDrawdownTolerance"] = ((): any => {
    if (volatilityComfort === "High") return "20%";
    if (volatilityComfort === "Medium") return "10%";
    return "5%";
  })();

  const avoidAssets = Array.isArray(q.avoidAssets) ? q.avoidAssets : [];
  const emphasizeAssets: Answers["emphasizeAssets"] = Array.isArray(q.emphasizeAssets) ? q.emphasizeAssets : [];

  // Build normalized answer object
  const ans: Answers = {
    horizon,
    bigExpenseTimeline,
    emergencyFundMonthsTarget,
    liquidityPreference,
    incomeVsExpenses,
    ageBand,
    riskAppetite,
    volatilityComfort,
    maxDrawdownTolerance,
    investmentKnowledge,
    incomeStability,
    dependents: dependents as any,
    liabilities: liabilities as any,
    financialGoal: financialGoal as any,
    avoidAssets: avoidAssets as any,
    emphasizeAssets,
  };

  // Insurance impact: handled inside engine nudges via new fields
  // Tax/geo preferences: used at product layer, not top-level mix.
  return ans;
}

export function buildPlan(q: Record<string, any>): AllocationPlan {
  // Normalize UI answers into engine enums
  const ans = normalizeAnswers(q);
  // Compute whole-number allocation using the spec-driven engine
  const alloc = suggestAllocation(ans);

  // Risk score for display/ranges
  const mapRA: Record<Answers["riskAppetite"], number> = { Low: 20, Moderate: 50, High: 80 };
  const mapVol: Record<Answers["volatilityComfort"], number> = { Low: 20, Medium: 50, High: 80 } as any;
  const mapDD: Record<Answers["maxDrawdownTolerance"], number> = { "5%": 15, "10%": 35, "20%": 60, "30%+": 85 };
  const mapHor: Record<Answers["horizon"], number> = { "Short (<3 yrs)": 25, "Medium (3–7 yrs)": 55, "Long (>7 yrs)": 80 };
  const mapAge: Record<Answers["ageBand"], number> = { "18–30": 80, "31–45": 65, "46–60": 45, "60+": 25 };
  const mapInc: Record<Answers["incomeVsExpenses"], number> = { Deficit: 25, "Break-even": 50, Surplus: 70 };
  const riskScore = Math.max(0, Math.min(100, Math.round(
    0.30 * mapRA[ans.riskAppetite] +
    0.15 * mapVol[ans.volatilityComfort] +
    0.15 * mapDD[ans.maxDrawdownTolerance] +
    0.15 * mapHor[ans.horizon] +
    0.15 * mapAge[ans.ageBand] +
    0.10 * mapInc[ans.incomeVsExpenses]
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
    const a = ans;
    let f = 1.0;
    if (a.riskAppetite === "Low") f *= 0.85;
    if (a.riskAppetite === "High") f *= 1.10;
    if (a.horizon === "Short (<3 yrs)") f *= 0.9;
    if (a.horizon === "Long (>7 yrs)") f *= 1.1;
    if (a.ageBand === "46–60") f *= 0.9; else if (a.ageBand === "60+") f *= 0.8;
    if (cls === "Liquid") f *= 0.9;
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
  const rationale = `Derived from risk (${riskLevel}), horizon (${q.horizon||""}), EF6m=${q.emergencyFundSixMonths||""}, withdraw2y=${q.withdrawNext2Yrs||""}, liabilities (${q.liabilities||"None"}), dependents (${q.dependents||"None"}), avoid [${toList((q as any).avoidAssets)}].`;

  return { riskLevel, rationale, buckets };
}