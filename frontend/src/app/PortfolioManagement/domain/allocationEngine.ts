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

export function buildPlan(q: Record<string, any>): AllocationPlan {
  // 1) Convert answers to continuous signals [0..1]
  const map = (val: any, table: Record<string, number>, fallback = 0.5) => table[val as string] ?? fallback;
  const risk = map(q.riskAppetite, { Low: 0, Moderate: 0.5, High: 1 });
  const vol = map(q.volatilityComfort, { Low: 0, Medium: 0.5, High: 1 });
  const knowledge = map(q.investmentKnowledge, { Beginner: 0, Intermediate: 0.5, Advanced: 1 });
  const horizon = map(q.horizon, { "Short (<3 yrs)": 0, "Medium (3–7 yrs)": 0.5, "Long (>7 yrs)": 1 });
  const income = map(q.incomeVsExpenses, { Deficit: 0, "Break-even": 0.5, Surplus: 1 });
  const liquidityPref = map(q.liquidityPreference, { Low: 0, Medium: 0.5, High: 1 });

  // 2) Risk tolerance & capacity
  const riskTolerance = Math.max(0, Math.min(1, 0.35 * risk + 0.25 * vol + 0.2 * horizon + 0.1 * knowledge + 0.1 * income));
  const riskLevel: RiskLevel = riskTolerance >= 0.67 ? "High" : riskTolerance <= 0.33 ? "Low" : "Moderate";

  // 3) Top-down targets for Liquid, Satellite, Equity, Debt (continuous)
  let liquidTarget = Math.min(0.2, Math.max(0.05, 0.05 + 0.10 * liquidityPref));
  let satelliteTarget = 0.05;
  const prefs: AssetClass[] = (q.preferredAssets || []) as AssetClass[];
  const prefersGold = prefs.includes("Gold");
  const prefersRE = prefs.includes("Real Estate");
  if (prefersGold) satelliteTarget += 0.04;
  if (prefersRE) satelliteTarget += 0.04;
  satelliteTarget = Math.min(0.2, Math.max(0.05, satelliteTarget));

  // Equity driven by tolerance (up) and liquidity need (down)
  let equityTarget = 0.25 + 0.55 * riskTolerance + 0.15 * horizon - 0.15 * liquidityPref;
  equityTarget = Math.max(0.2, Math.min(0.8, equityTarget));

  // Defensive remainder: Debt + Liquid
  let defensive = 1 - equityTarget - satelliteTarget;
  if (defensive < liquidTarget) {
    // pull a bit from equity to satisfy liquidity floor
    const shortfall = liquidTarget - defensive;
    equityTarget = Math.max(0.2, equityTarget - shortfall);
    defensive = 1 - equityTarget - satelliteTarget;
  }
  const debtTarget = Math.max(0.05, defensive - liquidTarget);

  // 4) Split categories
  // Equity -> Stocks vs Mutual Funds (knowledge tilts to Stocks)
  const stocksShare = Math.max(0.2, Math.min(0.8, 0.4 + 0.4 * knowledge));
  let stocks = equityTarget * stocksShare;
  let mutualFunds = equityTarget - stocks;

  // Satellite -> Gold vs Real Estate
  const goldShare = prefersGold && prefersRE ? 0.5 : prefersGold ? 0.7 : prefersRE ? 0.3 : 0.6;
  let gold = satelliteTarget * goldShare;
  let realEstate = satelliteTarget - gold;

  // 5) Soft preference weighting (do not drop classes; down-weight non-preferred for core/satellite)
  const softFactor = 0.85;
  const weightMap: Record<AssetClass, number> = {
    Stocks: stocks,
    "Mutual Funds": mutualFunds,
    Gold: gold,
    "Real Estate": realEstate,
    Debt: debtTarget,
    Liquid: liquidTarget,
  };
  (Object.keys(weightMap) as AssetClass[]).forEach(cls => {
    const isCoreOrSat = cls === "Stocks" || cls === "Mutual Funds" || cls === "Gold" || cls === "Real Estate";
    if (isCoreOrSat && !prefs.includes(cls)) {
      weightMap[cls] = weightMap[cls] * softFactor;
    }
  });

  // Normalize to 100%
  const sumW = (Object.values(weightMap).reduce((a, b) => a + b, 0)) || 1;
  const finalMix: Record<AssetClass, number> = {
    Stocks: +(weightMap.Stocks * 100 / sumW).toFixed(2),
    "Mutual Funds": +(weightMap["Mutual Funds"] * 100 / sumW).toFixed(2),
    Gold: +(weightMap.Gold * 100 / sumW).toFixed(2),
    "Real Estate": +(weightMap["Real Estate"] * 100 / sumW).toFixed(2),
    Debt: +(weightMap.Debt * 100 / sumW).toFixed(2),
    Liquid: +(weightMap.Liquid * 100 / sumW).toFixed(2),
  };

  // 6) Ranges scale with tolerance: wider for equities when tolerant; tighter for defensive
  function bandFor(cls: AssetClass): number {
    if (cls === "Stocks" || cls === "Mutual Funds") return 4 + 6 * riskTolerance; // 4%..10%
    if (cls === "Gold" || cls === "Real Estate") return 3 + 4 * riskTolerance; // 3%..7%
    return 2 + 2 * (1 - riskTolerance); // Defensive 2%..4%
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

  const buckets = (Object.keys(finalMix) as AssetClass[]).map(cls => {
    const pct = finalMix[cls];
    const band = bandFor(cls);
    const min = +(Math.max(0, pct - band).toFixed(2));
    const max = +(Math.min(100, pct + band).toFixed(2));
    return {
      class: cls,
      pct,
      range: [min, max] as [number, number],
      riskCategory: getRiskCategory(cls),
      notes: getNotes(cls, riskLevel)
    };
  });

  const rationale = `Derived from your tolerance (${riskLevel}), horizon (${q.horizon||""}), liquidity (${q.liquidityPreference||""}), and preferences (${(q.preferredAssets||[]).join(", ")||"diversified"}).`;

  return { riskLevel, rationale, buckets };
}
