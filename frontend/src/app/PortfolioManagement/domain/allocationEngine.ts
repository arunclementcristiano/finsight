// Enhanced Allocation Engine for Finsight Portfolio Management
// Implements sophisticated 10-Advisor Council logic with weighted signals

import { AdvisorCouncilEngine } from './advisorCouncilEngine';

export type AssetClass = "Stocks" | "Mutual Funds" | "Gold" | "Real Estate" | "Debt" | "Liquid";
export type RiskLevel = "Conservative" | "Moderate" | "Aggressive";

export interface AllocationPlan {
  equity: number;
  defensive: number;
  satellite: number;
  riskProfile: string;
  rationale: string[];
  // Extended fields for Dashboard compatibility with dynamic ranges
  buckets: Array<{
    class: AssetClass;
    pct: number;
    range: {
      min: number;
      max: number;
      range: number;
      base: number;
      multiplier: number;
      cap: number;
      explanation: string;
    };
    riskCategory: string;
    notes: string;
  }>;
  riskLevel: RiskLevel;
  riskScore?: number;
  // Advanced engine data
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

export interface QuestionnaireAnswers {
  // Demographics & Time Horizon (25% weight)
  age: "<25" | "25-35" | "35-45" | "45-55" | "55-65" | "65+";
  investmentHorizon: "<2 years" | "2-5 years" | "5-10 years" | "10-20 years" | "20+ years";
  targetRetirementAge: "50-55" | "55-60" | "60-65" | "65-70" | "70+";
  
  // Financial Situation (30% weight)
  annualIncome: "<50K" | "50K-1L" | "1L-2L" | "2L-5L" | "5L+";
  investmentAmount: number;
  existingInvestments: "<1L" | "1L-5L" | "5L-20L" | "20L+";
  emergencyFundMonths: "0-1" | "2-3" | "4-6" | "7-12" | "12+";
  dependents: "0" | "1-2" | "3-4" | "5+";
  monthlyObligations: "<10K" | "10K-25K" | "25K-50K" | "50K+";
  
  // Risk Tolerance (25% weight)
  volatilityComfort: "panic_sell" | "very_uncomfortable" | "somewhat_concerned" | "stay_calm" | "buy_more";
  maxAcceptableLoss: "5%" | "10%" | "20%" | "30%" | "40%+";
  investmentKnowledge: "beginner" | "some_knowledge" | "experienced" | "expert";
  previousLosses: "never_invested" | "no_major_losses" | "some_losses_learned" | "major_losses_still_investing";
  
  // Goals & Objectives (20% weight)
  primaryGoal: "retirement" | "wealth_building" | "income_generation" | "child_education" | "home_purchase" | "preservation";
  expectedReturn: "5-8%" | "8-12%" | "12-15%" | "15-20%" | "20%+";
  liquidityNeeds: "never" | "once_year" | "few_times_year" | "monthly" | "frequently";
  esgPreference: "no_preference" | "some_esg" | "strong_esg" | "impact_only";
  
  // Additional Context
  jobStability: "very_stable" | "somewhat_stable" | "not_stable";
  withdrawalNext2Years: boolean;
  hasInsurance: boolean;
  avoidAssets?: string[];
}

// Helper functions for dynamic range calculation
const getBaseRange = (asset: AssetClass): number => {
  const baseRanges = {
    "Stocks": 0.05,        // ±5% base range
    "Mutual Funds": 0.04,  // ±4% base range
    "Debt": 0.03,          // ±3% base range
    "Liquid": 0.02,        // ±2% base range
    "Gold": 0.03,          // ±3% base range
    "Real Estate": 0.03    // ±3% base range
  };
  return baseRanges[asset] || 0.03;
};

const getAssetCap = (asset: AssetClass): number => {
  const caps = {
    "Stocks": 2.5,        // Most volatile, widest ranges
    "Mutual Funds": 2.2,  // High volatility
    "Debt": 1.5,          // Low volatility, tight ranges
    "Liquid": 1.3,        // Very stable
    "Gold": 1.8,          // Moderate volatility
    "Real Estate": 1.6    // Low-medium volatility
  };
  return caps[asset] || 2.0; // Default fallback
};

const getAssetBounds = (asset: AssetClass, riskLevel: RiskLevel) => {
  const bounds = {
    "Stocks": {
      min: riskLevel === "Conservative" ? 5 : riskLevel === "Aggressive" ? 15 : 10,
      max: riskLevel === "Conservative" ? 45 : riskLevel === "Aggressive" ? 75 : 60
    },
    "Mutual Funds": {
      min: riskLevel === "Conservative" ? 10 : riskLevel === "Aggressive" ? 20 : 15,
      max: riskLevel === "Conservative" ? 50 : riskLevel === "Aggressive" ? 70 : 60
    },
    "Debt": {
      min: riskLevel === "Conservative" ? 25 : riskLevel === "Aggressive" ? 15 : 20,
      max: riskLevel === "Conservative" ? 60 : riskLevel === "Aggressive" ? 40 : 50
    },
    "Liquid": {
      min: riskLevel === "Conservative" ? 8 : riskLevel === "Aggressive" ? 5 : 6,
      max: riskLevel === "Conservative" ? 25 : riskLevel === "Aggressive" ? 15 : 20
    },
    "Gold": {
      min: 2, // Never below 2%
      max: riskLevel === "Conservative" ? 15 : riskLevel === "Aggressive" ? 25 : 20
    },
    "Real Estate": {
      min: 2, // Never below 2%
      max: riskLevel === "Conservative" ? 20 : riskLevel === "Aggressive" ? 30 : 25
    }
  };
  
  return bounds[asset];
};

const getComprehensiveContextMultiplier = (context: any) => {
  let multiplier = 1.0;
  
  // Existing factors (capped)
  if (context.investmentHorizon === "<2 years") multiplier *= 0.8;
  if (context.age === "65+") multiplier *= 0.85;
  if (context.emergencyFundMonths === "0-1") multiplier *= 0.8;
  
  // New factors
  if (context.dependents === "5+") multiplier *= 0.9; // More dependents = tighter ranges
  if (context.dependents === "0") multiplier *= 1.1;  // No dependents = slightly wider
  
  if (!context.hasInsurance) multiplier *= 0.85; // No insurance = tighter ranges
  if (context.withdrawalNext2Years) multiplier *= 0.8; // Near-term withdrawals = tighter
  
  if (context.jobStability === "not_stable") multiplier *= 0.9; // Unstable job = tighter
  if (context.jobStability === "very_stable") multiplier *= 1.05; // Stable job = slightly wider
  
  // Apply progressive caps
  multiplier = Math.max(0.5, Math.min(1.5, multiplier)); // Never go below 50% or above 150%
  
  return multiplier;
};

const getContextSummary = (context: any): string => {
  const factors = [];
  
  if (context.investmentHorizon === "<2 years") factors.push("Short horizon");
  if (context.age === "65+") factors.push("Senior");
  if (context.emergencyFundMonths === "0-1") factors.push("Low EF");
  if (context.dependents === "5+") factors.push("Many dependents");
  if (!context.hasInsurance) factors.push("No insurance");
  
  return factors.length > 0 ? factors.join(", ") : "Standard";
};

const getSmartDynamicRange = (
  asset: AssetClass,
  currentAllocation: number,
  riskLevel: RiskLevel,
  context: any
) => {
  const baseRange = getBaseRange(asset);
  const contextMultiplier = getComprehensiveContextMultiplier(context);

  const bounds = getAssetBounds(asset, riskLevel);
  const assetCap = getAssetCap(asset); // asset-specific instead of flat 2.0

  // Range with asset-specific cap
  const calculatedRange = Math.min(baseRange * contextMultiplier, baseRange * assetCap);

  // Delta with floor (at least 2%)
  const delta = Math.max(currentAllocation * calculatedRange, 0.02);

  const min = Math.max(bounds.min, currentAllocation - delta);
  const max = Math.min(bounds.max, currentAllocation + delta);

  return {
    min,
    max,
    range: calculatedRange,
    base: baseRange,
    multiplier: contextMultiplier,
    cap: assetCap,
    explanation: `±${(calculatedRange * 100).toFixed(1)}% | Bounds: ${bounds.min}–${bounds.max}% | Context: ${getContextSummary(context)}`
  };
};

export function buildPlan(answers: QuestionnaireAnswers): AllocationPlan {
  console.log("🚀 Building allocation plan with new engine format:", answers);
  
  // Convert avoidAssets from string[] to AssetClass[]
  const convertedAnswers = {
    ...answers,
    withdrawalNext2Years: typeof answers.withdrawalNext2Years === 'boolean' ? answers.withdrawalNext2Years : answers.withdrawalNext2Years === 'Yes',
    hasInsurance: typeof answers.hasInsurance === 'boolean' ? answers.hasInsurance : answers.hasInsurance === 'Yes',
    avoidAssets: (() => {
      if (!answers.avoidAssets) return [];
      if (Array.isArray(answers.avoidAssets)) {
        return answers.avoidAssets.map(asset => asset as AssetClass);
      }
      // Handle single string case
      if (typeof answers.avoidAssets === 'string') {
        return [answers.avoidAssets as AssetClass];
      }
      return [];
    })()
  };
  
  // Use the new AdvisorCouncilEngine directly
  const advisorEngine = new AdvisorCouncilEngine();
  const result = advisorEngine.generateRecommendation(convertedAnswers);
  
  // Convert the result to our standard format
  const plan: AllocationPlan = {
    equity: result.allocation.Stocks + result.allocation["Mutual Funds"],
    defensive: result.allocation.Debt + result.allocation.Liquid,
    satellite: result.allocation.Gold + result.allocation["Real Estate"],
    riskProfile: result.riskLevel,
    rationale: result.rationale,
    // Extended fields for Dashboard compatibility with dynamic ranges
    buckets: [
      {
        class: "Stocks",
        pct: result.allocation.Stocks,
        range: getSmartDynamicRange("Stocks", result.allocation.Stocks, result.riskLevel, convertedAnswers),
        riskCategory: "Core",
        notes: "Growth focus"
      },
      {
        class: "Mutual Funds",
        pct: result.allocation["Mutual Funds"],
        range: getSmartDynamicRange("Mutual Funds", result.allocation["Mutual Funds"], result.riskLevel, convertedAnswers),
        riskCategory: "Core",
        notes: "Diversified exposure"
      },
      {
        class: "Debt",
        pct: result.allocation.Debt,
        range: getSmartDynamicRange("Debt", result.allocation.Debt, result.riskLevel, convertedAnswers),
        riskCategory: "Defensive",
        notes: "Stability & income"
      },
      {
        class: "Liquid",
        pct: result.allocation.Liquid,
        range: getSmartDynamicRange("Liquid", result.allocation.Liquid, result.riskLevel, convertedAnswers),
        riskCategory: "Defensive",
        notes: "Emergency buffer"
      },
      {
        class: "Gold",
        pct: result.allocation.Gold,
        range: getSmartDynamicRange("Gold", result.allocation.Gold, result.riskLevel, convertedAnswers),
        riskCategory: "Satellite",
        notes: "Inflation hedge"
      },
      {
        class: "Real Estate",
        pct: result.allocation["Real Estate"],
        range: getSmartDynamicRange("Real Estate", result.allocation["Real Estate"], result.riskLevel, convertedAnswers),
        riskCategory: "Satellite",
        notes: "Long-term asset"
      }
    ],
    riskLevel: result.riskLevel,
    riskScore: result.riskScore,
    // Advanced engine data
    signals: result.signals,
    stressTest: result.stressTest
  };
  
  console.log("✅ Generated plan:", plan);
  return plan;
}