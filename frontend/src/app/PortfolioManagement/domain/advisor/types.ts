/**
 * Core types and interfaces for the Advisor Council Engine
 * Professional-grade allocation logic with weighted signals and dynamic base calculations
 */

export type AssetClass = "Stocks" | "Mutual Funds" | "Gold" | "Real Estate" | "Debt" | "Liquid";
export type RiskLevel = "Conservative" | "Moderate" | "Aggressive";

export interface RiskRange {
  min: number;
  max: number;
  description: string;
  context: string;
}

export interface CouncilAnswers {
  // Demographics & Time Horizon (25% weight)
  age: string;
  investmentHorizon: string;
  
  // Financial Situation (30% weight)
  annualIncome: { absolute: string; relative?: string; context?: string };
  investmentAmount: number; // Actual amount in rupees
  emergencyFundMonths: string;
  dependents: string;
  
  // Risk Tolerance (25% weight)
  volatilityComfort: string;
  maxAcceptableLoss: string;
  investmentKnowledge: string;
  
  // Goals & Objectives (20% weight)
  primaryGoal: string;
  
  // Additional Context
  hasInsurance: boolean;
  avoidAssets?: AssetClass[];
  
  // Inferred values (added by allocation engine)
  monthlyObligations?: string;
  liquidityNeeds?: string;
  jobStability?: string;
  withdrawalNext2Years?: boolean;
  expectedReturn?: string;
  geographicContext?: string;
}

/**
 * Behavioral Consistency Validation System
 * Detects contradictory answers and provides advisor guidance
 */
export interface ConsistencyRule {
  condition: (a: CouncilAnswers) => boolean;
  message: string;
  severity: "critical" | "warning";
  category: "risk-reward" | "timeline" | "financial-foundation" | "behavioral";
}

export interface Signal {
  factor: string;
  equitySignal: number;  // -15 to +15
  safetySignal: number;  // -15 to +15
  weight: number;        // 0 to 1
  explanation: string;
}

export interface AllocationResult {
  allocation: Record<AssetClass, number>;
  riskLevel: RiskLevel;
  riskScore: number;
  rationale: string[];
  signals: Signal[];
  stressTest: StressTestResult;
  metadata: {
    totalEquitySignals: number;
    totalSafetySignals: number;
    finalAllocation: Record<AssetClass, number>;
    allocationSummary: {
      totalEquity: number;
      totalSafety: number;
      satellite: number;
      breakdown: {
        equity: string;
        defensive: string;
        satellite: string;
      };
    };
  };
}

export interface StressTestResult {
  scenarios: Record<string, {
    portfolioImpact: number;
    monthsCovered: number;
    recommendation: string;
  }>;
  worstCase: {
    scenario: string;
    impact: number;
    recommendation: string;
  };
  summary: string;
}

export interface RebalanceAction {
  class: AssetClass;
  action: "buy" | "sell";
  amount: number;
  currentPct: number;
  targetPct: number;
  drift: number;
}

export interface StressTestScenario {
  [key: string]: Record<AssetClass, number>;
}