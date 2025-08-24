// Enhanced Allocation Engine for Finsight Portfolio Management
// Implements sophisticated 10-Advisor Council logic with weighted signals

export type AssetClass = "Stocks" | "Mutual Funds" | "Gold" | "Real Estate" | "Debt" | "Liquid";
export type RiskLevel = "Conservative" | "Moderate" | "Aggressive";

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
  explain?: {
    perAsset: Record<string, Array<{ driver: string; effectPct: number }>>;
    topDrivers: Array<{ driver: string; effectPct: number }>;
  };
  // Enhanced fields for new engine
  riskScore?: number;
  signals?: Array<{
    factor: string;
    equitySignal: number;
    safetySignal: number;
    weight: number;
    explanation: string;
  }>;
  stressTest?: {
    scenarios: Record<string, {
      portfolioImpact: number;
      monthsCovered: number;
      recommendation: string;
    }>;
  };
}

// Import both old and new engines for transition
import { suggestAllocation, Answers, getLastDrivers } from "./suggestAllocation";
import { AdvisorCouncilEngine, CouncilAnswers, AllocationResult } from "./advisorCouncilEngine";

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
    const v = String(q.financialGoal || "");
    if (!v) return "Wealth growth" as any;
    if (v === "House purchase" || v === "Education") return "Major purchase" as any;
    if (v === "Retirement" || v === "Wealth growth" || v === "Capital preservation" || v === "Income generation") return v as any;
    if (v === "Mixed") return horizon === "Long (>7 yrs)" ? "Wealth growth" : "Capital preservation" as any;
    return "Wealth growth" as any;
  })();
  const emergencySix = String(q.emergencyFundSixMonths || "Yes").toLowerCase() === "yes";
  const insuranceOk = String(q.insuranceCoverage || "Yes").toLowerCase() === "yes";

  // Derived fields
  const liquidityPreference: Answers["liquidityPreference"] = emergencySix ? "High" : "Medium";
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

  // Canonicalize asset names for avoid/emphasize (handles inputs like 'RealEstate')
  const canonicalize = (s: any): any => {
    const v = String(s || "").toLowerCase().replace(/[\s_-]/g, "");
    if (v === "stocks" || v === "stock") return "Stocks";
    if (v === "mutualfunds" || v === "mutualfund") return "Mutual Funds";
    if (v === "gold") return "Gold";
    if (v === "realestate" || v === "realty" || v === "re") return "Real Estate";
    return null;
  };
  const avoidAssetsRaw = Array.isArray(q.avoidAssets) ? q.avoidAssets : (typeof q.avoidAssets === 'string' ? [q.avoidAssets] : []);
  const avoidAssets = avoidAssetsRaw.map(canonicalize).filter(Boolean) as any;
  const emphasizeRaw = Array.isArray(q.emphasizeAssets) ? q.emphasizeAssets : [];
  const emphasizeAssets = emphasizeRaw.map(canonicalize).filter(Boolean) as any;

  // Build normalized answer object
  const ans: Answers = {
    horizon,
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

  // De-risk if insurance coverage is missing: shift ~4% from equity to safety
  try {
    const hasInsurance = String(q?.insuranceCoverage || "Yes").toLowerCase() === "yes";
    if (!hasInsurance) {
      const eq = (alloc as any).Stocks + (alloc as any)["Mutual Funds"];
      const reduce = Math.min(4, Math.max(0, eq));
      const sFrac = eq > 0 ? ((alloc as any).Stocks / eq) : 0.5;
      (alloc as any).Stocks = Math.max(0, (alloc as any).Stocks - reduce * sFrac);
      (alloc as any)["Mutual Funds"] = Math.max(0, (alloc as any)["Mutual Funds"] - reduce * (1 - sFrac));
      (alloc as any).Debt = Math.min(100, (alloc as any).Debt + 3);
      (alloc as any).Liquid = Math.min(100, (alloc as any).Liquid + 1);
    }
  } catch {}

  // Household Real Estate sleeve: if household RE% is high, reduce investable equity and add to Debt
  try {
    const hhRe = Math.max(0, Math.min(100, Number((q as any)?.householdRealEstatePct)||0));
    if (hhRe >= 30) {
      let cut = hhRe >= 50 ? 5 : (hhRe >= 40 ? 3 : 2);
      const eq = (alloc as any).Stocks + (alloc as any)["Mutual Funds"];
      const sFrac = eq > 0 ? ((alloc as any).Stocks / eq) : 0.5;
      const apply = Math.min(cut, eq);
      (alloc as any).Stocks = Math.max(0, (alloc as any).Stocks - apply * sFrac);
      (alloc as any)["Mutual Funds"] = Math.max(0, (alloc as any)["Mutual Funds"] - apply * (1 - sFrac));
      (alloc as any).Debt = Math.min(100, (alloc as any).Debt + apply);
    }
  } catch {}

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

  // Per-asset corridors with profile modifiers
  function baseBandPctFor(cls: AssetClass): number {
    if (cls === "Stocks" || cls === "Mutual Funds") return 0.10; // Equity ±10%
    if (cls === "Debt") return 0.07; // Debt ±7%
    if (cls === "Liquid") return 0.03; // Liquid ±3%
    if (cls === "Gold" || cls === "Real Estate") return 0.025; // Gold/RE ±2.5%
    return 0.06;
  }
  function adjustFactorByProfile(cls: AssetClass): number {
    let f = 1.0;
    // Risk appetite
    if (riskLevel === "Low") f *= 0.8; else if (riskLevel === "High") f *= 1.2;
    // Horizon
    if ((q as Answers).horizon === "Long (>7 yrs)") f *= 1.1; else if ((q as Answers).horizon === "Short (<3 yrs)") f *= 0.8;
    // Age
    if ((q as Answers).ageBand === "60+") f *= 0.8;
    // Keep liquid slightly tighter
    if (cls === "Liquid") f *= 0.9;
    return Math.max(0.6, Math.min(1.2, f));
  }
  function minWidthFor(cls: AssetClass): number {
    if (cls === "Stocks" || cls === "Mutual Funds") return 0.05;
    if (cls === "Debt") return 0.04;
    if (cls === "Liquid") return 0.02;
    if (cls === "Gold" || cls === "Real Estate") return 0.02;
    return 0.03;
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
    const band = Math.max(minWidthFor(cls), baseBandPctFor(cls) * adjustFactorByProfile(cls));
    const delta = pct * band;
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

  // Structured explainability (lightweight)
  const explainPer: Record<string, Array<{ driver: string; effectPct: number }>> = {};
  const push = (k: string, d: string, e: number)=> { if (!explainPer[k]) explainPer[k] = []; if (Number.isFinite(e) && e !== 0) explainPer[k].push({ driver: d, effectPct: Math.round(e) }); };
  // Example drivers (illustrative from ans)
  try {
    const eqNow = (alloc as any).Stocks + (alloc as any)["Mutual Funds"]; const baseEq = 55; push('Stocks', 'Risk profile composite', eqNow - baseEq); push('Mutual Funds', 'Risk profile composite', 0);
    if ((q as any).horizon === 'Short (<3 yrs)') { push('Debt', 'Short horizon safety', +5); push('Liquid', 'Short horizon liquidity', +5); }
    if ((q as any).liabilities === 'High') { push('Debt', 'High liabilities safety', +3); }
    if ((q as any).avoidAssets && ((q as any).avoidAssets||[]).includes('Gold')) { push('Gold', 'Avoided asset', -((alloc as any).Gold||0)); }
    // Ingest internal engine drivers
    const internal = getLastDrivers();
    for (const d of internal) {
      const t = String(d.to||'');
      const tgt = t.includes('Debt') ? 'Debt' : t.includes('Gold') ? 'Gold' : t.includes('Liquid') ? 'Liquid' : t.includes('Stocks') ? 'Stocks' : 'Mutual Funds';
      const val = Number(d.effectPct);
      if (Number.isFinite(val)) push(tgt, String(d.factor||'engine'), val);
    }
  } catch {}
  const topDrivers = Object.values(explainPer).flat().sort((a,b)=> Math.abs(b.effectPct) - Math.abs(a.effectPct)).slice(0, 5);

  const toList = (v: any): string => {
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === 'string') return v;
    return "";
  };
  const rationale = `Derived from risk (${riskLevel}), horizon (${q.horizon||""}), EF6m=${q.emergencyFundSixMonths||""}, liabilities (${q.liabilities||"None"}), dependents (${q.dependents||"None"}), HHRE=${(q as any)?.householdRealEstatePct||0}%, avoid [${toList((q as any).avoidAssets)}].`;

  return { riskLevel, rationale, buckets, explain: { perAsset: explainPer, topDrivers } };
}