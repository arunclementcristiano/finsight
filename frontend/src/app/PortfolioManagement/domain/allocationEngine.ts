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
  // 1. Map riskScore → RiskLevel
  let score = 0;
  if (q.riskAppetite === "High") score += 2;
  if (q.volatilityComfort === "High") score += 2;
  if (q.investmentKnowledge === "Advanced") score += 1;
  if (q.horizon === "Long (>7 yrs)") score += 1;
  if (q.riskAppetite === "Low") score -= 2;
  if (q.volatilityComfort === "Low") score -= 2;
  if (q.investmentKnowledge === "Beginner") score -= 1;
  if (q.horizon === "Short (<3 yrs)") score -= 1;

  let riskLevel: RiskLevel = "Moderate";
  if (score >= 3) riskLevel = "High";
  else if (score <= -2) riskLevel = "Low";

  // 2. Base mix per risk
  const baseMix: Record<AssetClass, number> = {
    "Stocks": riskLevel === "High" ? 50 : riskLevel === "Low" ? 20 : 35,
    "Mutual Funds": riskLevel === "High" ? 20 : riskLevel === "Low" ? 25 : 25,
    "Gold": 10,
    "Real Estate": 10,
    "Debt": riskLevel === "High" ? 5 : riskLevel === "Low" ? 30 : 20,
    "Liquid": 5,
  };

  // 3. Prune to user's selected interests
  const selected: AssetClass[] = q.preferredAssets || [];
  let prunedMix: Partial<Record<AssetClass, number>> = {};
  let total = 0;
  (Object.keys(baseMix) as AssetClass[]).forEach(cls => {
    if (selected.includes(cls)) {
      prunedMix[cls] = baseMix[cls];
      total += baseMix[cls];
    }
  });

  // 4. Liquid cash overlay (+3% if dips ≥ some, min 5% overall)
  if (q.volatilityComfort === "High" || q.buyTheDip === "yes" || q.buyTheDip === "some") {
    prunedMix["Liquid"] = (prunedMix["Liquid"] || 0) + 3;
    total += 3;
  }
  if (!prunedMix["Liquid"] || prunedMix["Liquid"] < 5) {
    total += 5 - (prunedMix["Liquid"] || 0);
    prunedMix["Liquid"] = 5;
  }

  // 5. Normalize to exactly 100.00
  let normMix: Partial<Record<AssetClass, number>> = {};
  let normTotal = Object.values(prunedMix).reduce((a, b) => a + b, 0);
  (Object.keys(prunedMix) as AssetClass[]).forEach(cls => {
    normMix[cls] = +(prunedMix[cls]! * 100 / normTotal).toFixed(2);
  });

  // 6. Rationale and per-class ranges
  let rationale = `Based on your risk profile (${riskLevel}), selected assets, and liquidity preference.`;
  // Dynamic range logic based on risk level and asset class
  function getRange(cls: AssetClass, pct: number, riskLevel: RiskLevel): [number, number] {
    let band = 5; // default
    if (riskLevel === "High") {
      if (cls === "Stocks" || cls === "Mutual Funds") band = 10;
      else if (cls === "Gold" || cls === "Real Estate") band = 7;
      else if (cls === "Debt" || cls === "Liquid") band = 4;
    } else if (riskLevel === "Low") {
      if (cls === "Stocks" || cls === "Mutual Funds") band = 4;
      else if (cls === "Gold" || cls === "Real Estate") band = 3;
      else if (cls === "Debt" || cls === "Liquid") band = 2;
    } else {
      if (cls === "Stocks" || cls === "Mutual Funds") band = 7;
      else if (cls === "Gold" || cls === "Real Estate") band = 5;
      else if (cls === "Debt" || cls === "Liquid") band = 3;
    }
    return [
      +(Math.max(0, pct - band).toFixed(2)),
      +(Math.min(100, pct + band).toFixed(2))
    ];
  }

  // Helper functions for new columns
  function getRiskCategory(cls: AssetClass): string {
    if (cls === "Stocks" || cls === "Mutual Funds") return "Core";
    if (cls === "Gold" || cls === "Real Estate") return "Satellite";
    if (cls === "Debt" || cls === "Liquid") return "Defensive";
    return "Other";
  }
  function getNotes(cls: AssetClass, riskLevel: RiskLevel): string {
    if (cls === "Stocks") return riskLevel === "High" ? "Growth focus" : "Balanced equity";
    if (cls === "Mutual Funds") return "Diversified exposure";
    if (cls === "Gold") return "Inflation hedge";
    if (cls === "Real Estate") return "Long-term asset";
    if (cls === "Debt") return "Stability & income";
    if (cls === "Liquid") return "Emergency buffer";
    return "";
  }
  // Realistic min/max logic
  function getMinMax(cls: AssetClass, pct: number, riskLevel: RiskLevel): [number, number] {
    let min = pct, max = pct;
    if (riskLevel === "High") {
      if (cls === "Stocks" || cls === "Mutual Funds") { min = +(pct - 2).toFixed(2); max = +(pct + 5).toFixed(2); }
      else if (cls === "Gold" || cls === "Real Estate") { min = +(pct - 1).toFixed(2); max = +(pct + 3).toFixed(2); }
      else { min = +(pct - 1).toFixed(2); max = +(pct + 2).toFixed(2); }
    } else if (riskLevel === "Low") {
      if (cls === "Stocks" || cls === "Mutual Funds") { min = +(pct - 1).toFixed(2); max = +(pct + 2).toFixed(2); }
      else if (cls === "Gold" || cls === "Real Estate") { min = +(pct - 0.5).toFixed(2); max = +(pct + 1).toFixed(2); }
      else { min = +(pct - 0.5).toFixed(2); max = +(pct + 1).toFixed(2); }
    } else {
      if (cls === "Stocks" || cls === "Mutual Funds") { min = +(pct - 1.5).toFixed(2); max = +(pct + 3).toFixed(2); }
      else if (cls === "Gold" || cls === "Real Estate") { min = +(pct - 0.75).toFixed(2); max = +(pct + 1.5).toFixed(2); }
      else { min = +(pct - 0.75).toFixed(2); max = +(pct + 1.5).toFixed(2); }
    }
    min = Math.max(0, min); max = Math.min(100, max);
    return [min, max];
  }

  let buckets = (Object.keys(normMix) as AssetClass[]).map(cls => {
    const pct = normMix[cls]!;
    const min = Math.max(0, pct - 2);
    const max = Math.min(100, pct + 5);
    return {
      class: cls,
      pct,
      range: [+(min.toFixed(2)), +(max.toFixed(2))] as [number, number],
      riskCategory: getRiskCategory(cls),
      notes: getNotes(cls, riskLevel)
    };
  });

  return {
    riskLevel,
    rationale,
    buckets,
  };
}
