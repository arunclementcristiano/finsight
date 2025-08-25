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
  // Extended fields for Dashboard compatibility
  buckets: Array<{
    class: AssetClass;
    pct: number;
    range: [number, number];
    riskCategory: string;
    notes: string;
  }>;
  riskLevel: RiskLevel;
  riskScore?: number;
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
    // Extended fields for Dashboard compatibility
    buckets: [
      {
        class: "Stocks",
        pct: result.allocation.Stocks,
        range: [Math.max(0, result.allocation.Stocks - 5), Math.min(100, result.allocation.Stocks + 5)],
        riskCategory: "Core",
        notes: "Growth focus"
      },
      {
        class: "Mutual Funds",
        pct: result.allocation["Mutual Funds"],
        range: [Math.max(0, result.allocation["Mutual Funds"] - 5), Math.min(100, result.allocation["Mutual Funds"] + 5)],
        riskCategory: "Core",
        notes: "Diversified exposure"
      },
      {
        class: "Debt",
        pct: result.allocation.Debt,
        range: [Math.max(0, result.allocation.Debt - 3), Math.min(100, result.allocation.Debt + 3)],
        riskCategory: "Defensive",
        notes: "Stability & income"
      },
      {
        class: "Liquid",
        pct: result.allocation.Liquid,
        range: [Math.max(0, result.allocation.Liquid - 2), Math.min(100, result.allocation.Liquid + 2)],
        riskCategory: "Defensive",
        notes: "Emergency buffer"
      },
      {
        class: "Gold",
        pct: result.allocation.Gold,
        range: [Math.max(0, result.allocation.Gold - 2), Math.min(100, result.allocation.Gold + 2)],
        riskCategory: "Satellite",
        notes: "Inflation hedge"
      },
      {
        class: "Real Estate",
        pct: result.allocation["Real Estate"],
        range: [Math.max(0, result.allocation["Real Estate"] - 2), Math.min(100, result.allocation["Real Estate"] + 2)],
        riskCategory: "Satellite",
        notes: "Long-term asset"
      }
    ],
    riskLevel: result.riskLevel,
    riskScore: result.riskScore
  };
  
  console.log("✅ Generated plan:", plan);
  return plan;
}