/**
 * 10-Advisor Council Allocation Engine
 * Professional-grade allocation logic with weighted signals and dynamic base calculations
 */

export type AssetClass = "Stocks" | "Mutual Funds" | "Gold" | "Real Estate" | "Debt" | "Liquid";
export type RiskLevel = "Conservative" | "Moderate" | "Aggressive";

interface RiskRange {
  min: number;
  max: number;
  description: string;
  context: string;
}

const RISK_LEVELS: Record<RiskLevel, RiskRange> = {
  Conservative: {
    min: 0,
    max: 39,
    description: "Low risk appetite with focus on stability",
    context: "Suitable for short-term needs and capital protection"
  },
  Moderate: {
    min: 40,
    max: 69,
    description: "Balanced growth with some volatility tolerance",
    context: "Suitable for medium-term investors"
  },
  Aggressive: {
    min: 70,
    max: 100,
    description: "High growth focus with 15–20% volatility tolerance",
    context: "Suitable for long-term investors comfortable with swings"
  }
};

const getConsistentRiskProfile = (score: number) => {
  const level = Object.entries(RISK_LEVELS).find(
    ([, range]) => score >= range.min && score <= range.max
  );
  
  if (!level) {
    // Handle edge cases (score < 0 or > 100) - default to Moderate
    return {
      level: "Moderate" as RiskLevel,
      score: Math.max(0, Math.min(100, score)),
      ...RISK_LEVELS.Moderate
    };
  }
  
  return { level: level[0] as RiskLevel, score, ...level[1] };
};

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
interface ConsistencyRule {
  condition: (a: CouncilAnswers) => boolean;
  message: string;
  severity: "critical" | "warning";
  category: "risk-reward" | "timeline" | "financial-foundation" | "behavioral";
  suggestedAction: string;
  advisorNote?: string; // Additional context for advisors
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
  riskScore: number;
  riskLevel: RiskLevel;
  // Rich risk profile information
  riskProfile: {
    level: RiskLevel;
    score: number;
    min: number;
    max: number;
    description: string;
    context: string;
  };
  // Behavioral consistency validation
  behavioralWarnings?: Array<{
    severity: "warning" | "critical";
    message: string;
    category: "risk-reward" | "timeline" | "financial-foundation" | "behavioral";
    suggestedAction: string;
    advisorNote?: string;
  }>;
  consistencyScore?: number; // 0-100, how consistent the answers are
  signals: Signal[];
  rationale: string[];
  stressTest: StressTestResult;
  rebalanceActions?: RebalanceAction[];
}

export interface StressTestResult {
  scenarios: Record<string, {
    portfolioImpact: number;
    monthsCovered: number;
    recommendation: string;
    // Enhanced with historical context
    historicalDrop?: string;
    evidence?: string;
    recovery?: string;
    comparison?: string; // "Your portfolio: -25% vs Historical: -38%"
    sectorImpacts?: Record<string, number>; // For demonetization-like sector-specific events
  }>;
}

export interface RebalanceAction {
  action: "buy" | "sell";
  asset: AssetClass;
  amount: number;
  reason: string;
}

/**
 * Enhanced Stress Test Scenarios with Historical Evidence
 * Real market events with specific drop percentages and recovery timelines
 */
interface StressTestScenario {
  drop: Record<string, string>;
  evidence: string;
  recovery: string;
}

const stressTestScenarios: Record<string, StressTestScenario> = {
  "2008 Financial Crisis": { 
    drop: { "S&P500": "-37%", "NIFTY": "-52%" },
    evidence: "2008–2009 global financial crisis",
    recovery: "3–4 years"
  },
  "COVID Crash": {
    drop: { "NIFTY": "-38%" },
    evidence: "March 2020 pandemic shock",
    recovery: "6–9 months"
  },
  "Dotcom Bust": {
    drop: { "NASDAQ": "-78%" },
    evidence: "2000–2002 tech bubble burst",
    recovery: "15 years for NASDAQ"
  },
  "2016 Demonetization": {
    drop: { "NIFTY": "-15%", "Real Estate": "-35%", "Gold": "-20%" },
    evidence: "November 2016 currency ban, cash crunch",
    recovery: "6–8 months"
  }
};

const consistencyRules: ConsistencyRule[] = [
  {
    condition: (a: CouncilAnswers) => a.investmentHorizon === "<2 years" && a.primaryGoal === "wealth_building",
    message: "Short horizon with long-term wealth building goal",
    severity: "warning",
    category: "timeline",
    suggestedAction: "Discuss timeline alignment or goal adjustment",
    advisorNote: "Consider if client understands wealth building timelines"
  },
  {
    condition: (a: CouncilAnswers) => a.emergencyFundMonths === "0-1" && a.primaryGoal === "retirement",
    message: "No emergency fund but planning for retirement",
    severity: "critical",
    category: "financial-foundation",
    suggestedAction: "Prioritize emergency fund before retirement planning",
    advisorNote: "Financial foundation must come first"
  },
  {
    condition: (a: CouncilAnswers) => a.age === "65+" && a.investmentHorizon === "20+ years",
    message: "Senior age with very long investment horizon",
    severity: "warning",
    category: "timeline",
    suggestedAction: "Verify timeline expectations and health considerations",
    advisorNote: "May indicate unrealistic expectations or family planning"
  },
  {
    condition: (a: CouncilAnswers) => a.liquidityNeeds === "monthly" && a.primaryGoal === "wealth_building",
    message: "Frequent liquidity needs may conflict with long-term wealth building",
    severity: "warning",
    category: "behavioral",
    suggestedAction: "Balance liquidity needs with long-term growth strategy",
    advisorNote: "Consider hybrid approach or goal prioritization"
  }
];

const validateBehavioralConsistency = (answers: CouncilAnswers) => {
  return consistencyRules
    .filter(rule => rule.condition(answers))
    .map(rule => ({
      severity: rule.severity,
      message: rule.message,
      category: rule.category,
      suggestedAction: rule.suggestedAction,
      advisorNote: rule.advisorNote
    }));
};

/**
 * Core Signal Processing Engine
 * Each factor contributes weighted equity/safety signals
 */
class SignalProcessor {
  // Helper method to safely get signal with fallback
  private getSignalSafely(
    signals: Record<string, { equity: number; safety: number; explanation: string }>,
    key: string,
    factor: string,
    weight: number,
    fallback: { equity: number; safety: number; explanation: string }
  ): Signal {
    const signal = signals[key];
    if (!signal) {
      return {
        factor,
        equitySignal: fallback.equity,
        safetySignal: fallback.safety,
        weight,
        explanation: fallback.explanation
      };
    }
    
    return {
      factor,
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight,
      explanation: signal.explanation
    };
  }
  
  calculateSignals(answers: CouncilAnswers): Signal[] {
    console.log("🚀🚀🚀 NEW ENGINE CALCULATE SIGNALS CALLED! 🚀🚀🚀");
    console.log("📋 Input answers:", answers);
    
    const signals: Signal[] = [];
    
    // Calculate dynamic weights based on goal context
    const { ageWeight, horizonWeight, goalWeight } = this.calculateDynamicWeights(answers.primaryGoal);
    console.log("🎯 Dynamic weights calculated:", { ageWeight, horizonWeight, goalWeight });
    
    // Age Signals (DYNAMIC WEIGHT: 25% base, adjusted by goal)
    const ageSignal = this.getAgeSignal(answers.age);
    ageSignal.weight = ageWeight;
    console.log("👴 Age signal with dynamic weight:", ageSignal);
    signals.push(ageSignal);
    
    // Time Horizon (DYNAMIC WEIGHT: 25% base, adjusted by goal)
    const horizonSignal = this.getHorizonSignal(answers.investmentHorizon);
    horizonSignal.weight = horizonWeight;
    console.log("⏰ Horizon signal with dynamic weight:", horizonSignal);
    signals.push(horizonSignal);
    
    // Financial Situation (15% weight)
    signals.push(this.getDependentsSignal(answers.dependents));
    signals.push(this.getEmergencyFundSignal(answers.emergencyFundMonths));
    
    // Risk Tolerance (15% weight) - Knowledge will be applied as multiplier later
    signals.push(this.getVolatilitySignal(answers.volatilityComfort));
    signals.push(this.getLossToleranceSignal(answers.maxAcceptableLoss));
    
    // Goals & Objectives (DYNAMIC WEIGHT: 15% base, adjusted by goal)
    const goalSignal = this.getGoalSignal(answers.primaryGoal);
    goalSignal.weight = goalWeight;
    console.log("🎯 Goal signal with dynamic weight:", goalSignal);
    signals.push(goalSignal);
    
    // Contextual Signals (5% weight)
    if (!answers.hasInsurance) {
      console.log("Adding no_insurance negative signal");
      signals.push({
        factor: "no_insurance",
        equitySignal: -10,
        safetySignal: +10,
        weight: 0.05, // REDISTRIBUTED: 5% weight
        explanation: "Lack of insurance requires more conservative positioning"
      });
    } else {
      console.log("Insurance is adequate, no negative signal added");
    }
    
    console.log("🔍 BEFORE knowledge multiplier - signals:", signals.map(s => ({
      factor: s.factor,
      equitySignal: s.equitySignal,
      safetySignal: s.safetySignal,
      weight: s.weight
    })));
    
    // Apply knowledge multiplier to all signals (not as separate weight)
    this.applyKnowledgeMultiplier(signals, answers.investmentKnowledge);
    
    // Apply goal-specific volatility tolerance adjustments
    this.applyGoalSpecificAdjustments(signals, answers.primaryGoal, answers.investmentHorizon);
    
    // Debug: Log all signals and their impact
    console.log("🔍 DEBUG: All signals generated:", signals.map(s => ({
      factor: s.factor,
      equitySignal: s.equitySignal,
      safetySignal: s.safetySignal,
      weight: s.weight,
      weightedEquity: s.equitySignal * s.weight,
      weightedSafety: s.safetySignal * s.weight
    })));
    
    console.log("🚀🚀🚀 NEW ENGINE CALCULATE SIGNALS COMPLETED! 🚀🚀🚀");
    return signals;
  }

  /**
   * Calculate dynamic weights based on primary goal context
   * Goals modify Age/Horizon weights rather than being independent
   */
  private calculateDynamicWeights(primaryGoal: string): { ageWeight: number; horizonWeight: number; goalWeight: number } {
    const baseWeights = {
      ageWeight: 0.25,      // 25% base (Core Factors: 65%)
      horizonWeight: 0.25,  // 25% base (Core Factors: 65%)
      goalWeight: 0.15      // 15% base (Core Factors: 65%)
    };

    switch (primaryGoal) {
      case "retirement":
        // Retirement: Horizon matters more than age
        return {
          ageWeight: 0.20,      // 25% → 20% (-5%)
          horizonWeight: 0.30,  // 25% → 30% (+5%)
          goalWeight: 0.15      // 15% unchanged
        };
      
      case "child_education":
        // Education: Horizon dominates, age less relevant
        return {
          ageWeight: 0.15,      // 25% → 15% (-10%)
          horizonWeight: 0.35,  // 25% → 35% (+10%)
          goalWeight: 0.15      // 15% unchanged
        };
      
      case "home_purchase":
        // Home purchase: Horizon critical, age less important
        return {
          ageWeight: 0.15,      // 25% → 15% (-10%)
          horizonWeight: 0.35,  // 25% → 35% (+10%)
          goalWeight: 0.15      // 15% unchanged
        };
      
      case "wealth_building":
        // Wealth building: Age and horizon equally important
        return {
          ageWeight: 0.25,      // 25% unchanged
          horizonWeight: 0.25,  // 25% unchanged
          goalWeight: 0.15      // 15% unchanged
        };
      
      case "income_generation":
        // Income: Age matters more (stability), horizon less
        return {
          ageWeight: 0.30,      // 25% → 30% (+5%)
          horizonWeight: 0.20,  // 25% → 20% (-5%)
          goalWeight: 0.15      // 15% unchanged
        };
      
      case "preservation":
        // Preservation: Age critical, horizon less relevant
        return {
          ageWeight: 0.30,      // 25% → 30% (+5%)
          horizonWeight: 0.20,  // 25% → 20% (-5%)
          goalWeight: 0.15      // 15% unchanged
        };
      
      default:
        return baseWeights;
    }
  }

  /**
   * Apply knowledge multiplier to all signals (not as separate weight)
   * Capped to prevent extreme adjustments
   */
  private applyKnowledgeMultiplier(signals: Signal[], knowledge: string): void {
    console.log("🧠🧠🧠 KNOWLEDGE MULTIPLIER APPLIED! 🧠🧠🧠");
    console.log("📚 Knowledge level:", knowledge);
    
    const knowledgeMultipliers = {
      "beginner": 0.8,        // -20% penalty
      "some_knowledge": 0.9,  // -10% penalty
      "experienced": 1.0,     // No change
      "expert": 1.2           // +20% bonus
    };

    const multiplier = knowledgeMultipliers[knowledge as keyof typeof knowledgeMultipliers] || 1.0;
    console.log("🎯 Selected multiplier:", multiplier);
    
    // Apply multiplier to equity and safety signals
    signals.forEach((signal, index) => {
      const originalEquity = signal.equitySignal;
      const originalSafety = signal.safetySignal;
      
      // Cap total adjustment to ±10 absolute percentage points
      const maxAdjustment = 10;
      
      // Apply multiplier with safety cap
      const adjustedEquity = Math.max(-maxAdjustment, Math.min(maxAdjustment, signal.equitySignal * multiplier));
      const adjustedSafety = Math.max(-maxAdjustment, Math.min(maxAdjustment, signal.safetySignal * multiplier));
      
      signal.equitySignal = adjustedEquity;
      signal.safetySignal = adjustedSafety;
      
      // Add knowledge context to explanation
      if (knowledge !== "experienced") {
        const direction = knowledge === "expert" ? "enhanced" : "adjusted";
        signal.explanation += ` (${direction} for ${knowledge} knowledge level)`;
      }
      
      console.log(`📊 Signal ${index + 1} (${signal.factor}):`, {
        original: { equity: originalEquity, safety: originalSafety },
        adjusted: { equity: signal.equitySignal, safety: signal.safetySignal },
        multiplier: multiplier
      });
    });
    
    console.log(`🔍 DEBUG: Applied knowledge multiplier: ${multiplier}x for ${knowledge} level`);
    console.log("🧠🧠🧠 KNOWLEDGE MULTIPLIER COMPLETED! 🧠🧠🧠");
  }
  
  /**
   * Apply goal-specific volatility tolerance adjustments
   * Some goals automatically modify risk tolerance
   */
  private applyGoalSpecificAdjustments(signals: Signal[], primaryGoal: string, investmentHorizon: string): void {
    // Child education: automatically reduce volatility tolerance
    if (primaryGoal === "child_education") {
      const volatilitySignal = signals.find(s => s.factor === "volatility_comfort");
      if (volatilitySignal) {
        // Reduce volatility tolerance by 20% for education goals
        volatilitySignal.equitySignal = Math.max(-15, volatilitySignal.equitySignal * 0.8);
        volatilitySignal.safetySignal = Math.min(15, volatilitySignal.safetySignal * 1.2);
        volatilitySignal.explanation += " (reduced for child education goal)";
        
        console.log("🎓 Applied child education volatility adjustment:", {
          originalEquity: volatilitySignal.equitySignal / 0.8,
          adjustedEquity: volatilitySignal.equitySignal,
          originalSafety: volatilitySignal.safetySignal / 1.2,
          adjustedSafety: volatilitySignal.safetySignal
        });
      }
    }
    
    // Home purchase: increase liquidity preference
    if (primaryGoal === "home_purchase") {
      const liquidityPreference = signals.find(s => s.factor === "emergency_fund");
      if (liquidityPreference) {
        // Increase safety preference for home purchase
        liquidityPreference.safetySignal = Math.min(15, liquidityPreference.safetySignal * 1.3);
        liquidityPreference.explanation += " (enhanced for home purchase goal)";
        
        console.log("🏠 Applied home purchase liquidity adjustment:", {
          originalSafety: liquidityPreference.safetySignal / 1.3,
          adjustedSafety: liquidityPreference.safetySignal
        });
      }
    }
    
    // Retirement: enhance long-term growth signals
    if (primaryGoal === "retirement" && investmentHorizon === "20+ years") {
      const ageSignal = signals.find(s => s.factor === "age");
      if (ageSignal && ageSignal.equitySignal > 0) {
        // Enhance growth signals for long-term retirement
        ageSignal.equitySignal = Math.min(15, ageSignal.equitySignal * 1.1);
        ageSignal.explanation += " (enhanced for long-term retirement)";
        
        console.log("🌅 Applied retirement growth enhancement:", {
          originalEquity: ageSignal.equitySignal / 1.1,
          adjustedEquity: ageSignal.equitySignal
        });
      }
    }
  }
  
  private getAgeSignal(age: string): Signal {
    const ageSignals = {
      "<25": { equity: +15, safety: -8, explanation: "Young age provides maximum risk capacity for long-term growth" },
      "25-35": { equity: +12, safety: -5, explanation: "Prime wealth-building years with high equity tolerance" },
      "35-45": { equity: +8, safety: -2, explanation: "Peak earning years allow significant equity exposure" },
      "45-55": { equity: +3, safety: +3, explanation: "Pre-retirement phase begins gradual shift to stability" },
      "55-65": { equity: -5, safety: +8, explanation: "Approaching retirement requires increased focus on preservation" },
      "65+": { equity: -10, safety: +15, explanation: "Retirement phase prioritizes capital preservation and income" }
    };
    
    const signal = ageSignals[age as keyof typeof ageSignals];
    if (!signal) {
      // Fallback for unknown age values
      return {
        factor: "age",
        equitySignal: +5,
        safetySignal: 0,
        weight: 0.25,
        explanation: "Unknown age, applying moderate growth allocation"
      };
    }
    
    return {
      factor: "age",
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight: 0.25,
      explanation: signal.explanation
    };
  }
  
  private getHorizonSignal(horizon: string): Signal {
    const horizonSignals = {
      "<2 years": { equity: -15, safety: +15, explanation: "Short horizon requires maximum liquidity and capital preservation" },
      "2-5 years": { equity: -5, safety: +5, explanation: "Medium-short horizon favors defensive positioning" },
      "5-10 years": { equity: +5, safety: -2, explanation: "Medium horizon allows moderate equity exposure" },
      "10-20 years": { equity: +10, safety: -5, explanation: "Long horizon enables significant equity allocation" },
      "20+ years": { equity: +15, safety: -8, explanation: "Very long horizon maximizes growth potential through equity" }
    };
    
    const signal = horizonSignals[horizon as keyof typeof horizonSignals];
    if (!signal) {
      // Fallback for unknown horizon values
      return {
        factor: "investment_horizon",
        equitySignal: +5,
        safetySignal: -2,
        weight: 0.25, // Base weight, will be adjusted dynamically
        explanation: "Unknown investment horizon, applying moderate growth allocation"
      };
    }
    
    return {
      factor: "investment_horizon",
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight: 0.25,
      explanation: signal.explanation
    };
  }
  
  private getIncomeStabilitySignal(stability: string): Signal {
    const stabilitySignals = {
      "very_stable": { equity: +8, safety: 0, explanation: "Stable income supports higher risk tolerance" },
      "somewhat_stable": { equity: 0, safety: +5, explanation: "Variable income requires moderate safety buffer" },
      "not_stable": { equity: -10, safety: +10, explanation: "Unstable income necessitates conservative approach" }
    };
    
    console.log("getIncomeStabilitySignal called with:", stability);
    const signal = stabilitySignals[stability as keyof typeof stabilitySignals];
    console.log("Found signal:", signal);
    
    if (!signal) {
      // Fallback for unknown stability values
      console.log("Using fallback for income stability");
      return {
        factor: "income_stability",
        equitySignal: 0,
        safetySignal: +5,
        weight: 0.15,
        explanation: "Unknown income stability, applying moderate safety buffer"
      };
    }
    
    // Additional safety check
    if (!signal.hasOwnProperty('equity') || !signal.hasOwnProperty('safety')) {
      console.log("Signal missing equity/safety properties, using fallback");
      return {
        factor: "income_stability",
        equitySignal: 0,
        safetySignal: +5,
        weight: 0.15,
        explanation: "Malformed income stability signal, applying moderate safety buffer"
      };
    }
    
    return {
      factor: "income_stability",
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight: 0.15,
      explanation: signal.explanation
    };
  }
  
  private getDependentsSignal(dependents: string): Signal {
    const dependentSignals = {
      "0": { equity: 0, safety: 0, explanation: "No dependents allows for neutral risk positioning" },
      "1-2": { equity: -2, safety: +5, explanation: "Few dependents suggest slight increase in safety allocation" },
      "3-4": { equity: -5, safety: +8, explanation: "Multiple dependents require increased financial security" },
      "5+": { equity: -8, safety: +12, explanation: "Many dependents necessitate conservative, stable approach" }
    };
    
    return this.getSignalSafely(
      dependentSignals,
      dependents,
      "dependents",
      0.075, // REDISTRIBUTED: 10% → 7.5%
      { equity: -2, safety: +5, explanation: "Unknown dependents count, applying moderate safety allocation" }
    );
  }
  
  private getEmergencyFundSignal(efMonths: string): Signal {
    const efSignals = {
      "0-1": { equity: -15, safety: +15, explanation: "Insufficient emergency fund requires immediate liquidity focus" },
      "2-3": { equity: -8, safety: +10, explanation: "Low emergency fund suggests increasing liquid reserves" },
      "4-6": { equity: 0, safety: 0, explanation: "Adequate emergency fund allows normal risk allocation" },
      "7-12": { equity: +3, safety: -2, explanation: "Good emergency buffer enables slightly higher risk" },
      "12+": { equity: +5, safety: -5, explanation: "Excellent emergency fund supports increased equity exposure" }
    };
    
    return this.getSignalSafely(
      efSignals,
      efMonths,
      "emergency_fund",
      0.075, // REDISTRIBUTED: 15% → 7.5%
      { equity: 0, safety: 0, explanation: "Unknown emergency fund amount, applying neutral allocation" }
    );
  }
  
  private getObligationsSignal(obligations: string): Signal {
    const obligationSignals = {
      "<5K": { equity: +5, safety: -3, explanation: "Very low obligations allow for maximum risk tolerance" },
      "5K-12K": { equity: +3, safety: -2, explanation: "Low obligations allow for higher risk tolerance" },
      "8K-20K": { equity: +1, safety: -1, explanation: "Moderate-low obligations support growth positioning" },
      "10K-25K": { equity: 0, safety: 0, explanation: "Moderate obligations suggest balanced approach" },
      "15K-30K": { equity: 0, safety: 0, explanation: "Moderate obligations suggest balanced approach" },
      "25K-50K": { equity: -1, safety: +2, explanation: "Moderate-high obligations suggest slight safety buffer" },
      "50K+": { equity: -3, safety: +5, explanation: "High obligations require increased stability" }
    };
    
    return this.getSignalSafely(
      obligationSignals,
      obligations,
      "monthly_obligations",
      0.10,
      { equity: 0, safety: 0, explanation: "Unknown obligation amount, applying neutral allocation" }
    );
  }
  
  private getVolatilitySignal(comfort: string): Signal {
    const volatilitySignals = {
      "panic_sell": { equity: -15, safety: +15, explanation: "Low volatility tolerance requires defensive allocation" },
      "very_uncomfortable": { equity: -8, safety: +10, explanation: "Limited comfort with volatility suggests caution" },
      "somewhat_concerned": { equity: 0, safety: 0, explanation: "Moderate volatility comfort allows balanced approach" },
      "stay_calm": { equity: +8, safety: -5, explanation: "Good volatility tolerance supports higher equity exposure" },
      "buy_more": { equity: +12, safety: -8, explanation: "Excellent volatility tolerance enables aggressive positioning" }
    };
    
    return this.getSignalSafely(
      volatilitySignals,
      comfort,
      "volatility_comfort",
      0.075, // REDISTRIBUTED: 20% → 7.5%
      { equity: 0, safety: 0, explanation: "Unknown volatility comfort, applying balanced allocation" }
    );
  }
  
  private getKnowledgeSignal(knowledge: string): Signal {
    const knowledgeSignals = {
      "beginner": { equity: -5, safety: +5, explanation: "Limited experience suggests starting with safer investments" },
      "some_knowledge": { equity: 0, safety: 0, explanation: "Basic knowledge allows for standard allocation approach" },
      "experienced": { equity: +5, safety: -3, explanation: "Good experience enables higher risk positioning" },
      "expert": { equity: +8, safety: -5, explanation: "Expert knowledge supports sophisticated higher-risk strategies" }
    };
    
    return this.getSignalSafely(
      knowledgeSignals,
      knowledge,
      "investment_knowledge",
      0.10,
      { equity: 0, safety: 0, explanation: "Unknown investment knowledge, applying standard allocation" }
    );
  }
  
  private getLossToleranceSignal(tolerance: string): Signal {
    const toleranceSignals = {
      "5%": { equity: -10, safety: +10, explanation: "Low loss tolerance requires conservative approach" },
      "10%": { equity: -5, safety: +5, explanation: "Limited loss tolerance suggests defensive positioning" },
      "20%": { equity: 0, safety: 0, explanation: "Moderate loss tolerance allows balanced allocation" },
      "30%": { equity: +5, safety: -3, explanation: "Good loss tolerance supports higher equity exposure" },
      "40%+": { equity: +10, safety: -5, explanation: "High loss tolerance enables aggressive growth strategy" }
    };
    
    return this.getSignalSafely(
      toleranceSignals,
      tolerance,
      "loss_tolerance",
      0.075, // REDISTRIBUTED: 15% → 7.5%
      { equity: 0, safety: 0, explanation: "Unknown loss tolerance, applying balanced allocation" }
    );
  }
  
  private getGoalSignal(goal: string): Signal {
    const goalSignals = {
      "retirement": { equity: +5, safety: +3, explanation: "Retirement planning balances growth with stability" },
      "wealth_building": { equity: +10, safety: -5, explanation: "Wealth building prioritizes long-term growth" },
      "income_generation": { equity: -5, safety: +10, explanation: "Income focus requires stable, yield-generating assets" },
      "child_education": { equity: +3, safety: +2, explanation: "Education planning needs balanced growth and preservation" },
      "home_purchase": { equity: -10, safety: +15, explanation: "Home purchase requires capital preservation and liquidity" },
      "preservation": { equity: -8, safety: +12, explanation: "Capital preservation prioritizes safety over growth" }
    };
    
    return this.getSignalSafely(
      goalSignals,
      goal,
      "primary_goal",
      0.15,
      { equity: +5, safety: +3, explanation: "Unknown goal, applying balanced growth approach" }
    );
  }
  
  private getLiquiditySignal(liquidity: string): Signal {
    const liquiditySignals = {
      "never": { equity: +3, safety: -2, explanation: "No liquidity needs allow for longer-term positioning" },
      "once_year": { equity: 0, safety: 0, explanation: "Minimal liquidity needs allow standard allocation" },
      "few_times_year": { equity: -2, safety: +3, explanation: "Occasional liquidity needs suggest moderate safety buffer" },
      "monthly": { equity: -5, safety: +8, explanation: "Regular liquidity needs require higher safe allocation" },
      "frequently": { equity: -10, safety: +15, explanation: "Frequent liquidity needs prioritize accessible funds" }
    };
    
    return this.getSignalSafely(
      liquiditySignals,
      liquidity,
      "liquidity_needs",
      0.10,
      { equity: -2, safety: +3, explanation: "Unknown liquidity needs, applying moderate safety buffer" }
    );
  }

  private getGeographicContextSignal(context: string): Signal {
    const contextSignals = {
      "urban_affluent": { equity: +8, safety: -5, explanation: "Urban affluent areas allow for higher risk tolerance and equity exposure" },
      "urban_standard": { equity: +5, safety: -3, explanation: "Urban standard areas support moderate growth strategies" },
      "suburban": { equity: +2, safety: -1, explanation: "Suburban areas suggest balanced growth and safety approach" },
      "rural_standard": { equity: -2, safety: +3, explanation: "Rural areas may require more conservative positioning" },
      "rural_challenged": { equity: -5, safety: +8, explanation: "Challenged rural areas necessitate conservative safety-first approach" }
    };
    
    return this.getSignalSafely(
      contextSignals,
      context,
      "geographic_context",
      0.10,
      { equity: 0, safety: 0, explanation: "Unknown geographic context, applying neutral allocation" }
    );
  }

  /**
   * Apply smart insurance logic: adjust equity caps and liquid floors instead of flat penalties
   */
  applyInsuranceLogic(allocation: Record<AssetClass, number>, hasInsurance: boolean): Record<AssetClass, number> {
    if (hasInsurance) {
      // Adequate insurance: no adjustments needed
      console.log("✅ Insurance adequate - no allocation adjustments needed");
      return allocation;
    }

    // No insurance: apply smart adjustments
    console.log("⚠️ No insurance - applying smart allocation adjustments");
    
    const adjustedAllocation = { ...allocation };
    
    // Reduce equity exposure (more conservative when vulnerable)
    const equityTotal = allocation.Stocks + allocation["Mutual Funds"];
    const equityReduction = Math.min(equityTotal * 0.1, 10); // Max 10% reduction
    
    if (allocation.Stocks > 0) {
      const stockReduction = (allocation.Stocks / equityTotal) * equityReduction;
      adjustedAllocation.Stocks = Math.max(0, allocation.Stocks - stockReduction);
    }
    
    if (allocation["Mutual Funds"] > 0) {
      const mfReduction = (allocation["Mutual Funds"] / equityTotal) * equityReduction;
      adjustedAllocation["Mutual Funds"] = Math.max(0, allocation["Mutual Funds"] - mfReduction);
    }
    
    // Increase liquid allocation (better emergency preparedness)
    const liquidIncrease = Math.min(10, equityReduction * 0.5); // Up to 10% increase
    adjustedAllocation.Liquid = Math.min(100, allocation.Liquid + liquidIncrease);
    
    // Increase debt allocation (stability)
    const debtIncrease = Math.min(5, equityReduction * 0.3); // Up to 5% increase
    adjustedAllocation.Debt = Math.min(100, allocation.Debt + debtIncrease);
    
    // Normalize to ensure total = 100%
    const total = Object.values(adjustedAllocation).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 100) > 0.1) {
      const normalizationFactor = 100 / total;
      Object.keys(adjustedAllocation).forEach(key => {
        adjustedAllocation[key as AssetClass] = adjustedAllocation[key as AssetClass] * normalizationFactor;
      });
    }
    
    console.log("🔧 Insurance adjustments applied:", {
      original: allocation,
      adjusted: adjustedAllocation,
      changes: {
        equityReduction: equityReduction.toFixed(1) + "%",
        liquidIncrease: liquidIncrease.toFixed(1) + "%",
        debtIncrease: debtIncrease.toFixed(1) + "%"
      }
    });
    
    return adjustedAllocation;
  }
}

/**
 * Dynamic Base Allocation Calculator
 * Converts weighted signals into base allocation percentages
 */
class AllocationCalculator {
  calculateDynamicBase(signals: Signal[]): { equityBase: number; safetyBase: number; riskScore: number } {
    console.log("🧮🧮🧮 CALCULATING DYNAMIC BASE! 🧮🧮🧮");
    
    const neutralEquity = 50; // Starting baseline
    
    // Calculate weighted equity and safety signals
    let totalEquitySignal = 0;
    let totalSafetySignal = 0;
    let totalWeight = 0;
    
    signals.forEach(signal => {
      const weightedEquity = signal.equitySignal * signal.weight;
      const weightedSafety = signal.safetySignal * signal.weight;
      totalEquitySignal += weightedEquity;
      totalSafetySignal += weightedSafety;
      totalWeight += signal.weight;
      
      console.log(`📊 Signal ${signal.factor}:`, {
        weight: signal.weight,
        equity: signal.equitySignal,
        safety: signal.safetySignal,
        weightedEquity: weightedEquity,
        weightedSafety: weightedSafety
      });
    });
    
    console.log("📈 Totals:", {
      totalEquitySignal,
      totalSafetySignal,
      totalWeight
    });
    
    // Normalize by total weight
    const avgEquitySignal = totalEquitySignal / totalWeight;
    const avgSafetySignal = totalSafetySignal / totalWeight;
    
    console.log("📊 Averages:", {
      avgEquitySignal,
      avgSafetySignal
    });
    
    // Calculate dynamic equity base
    let equityBase = neutralEquity + avgEquitySignal - (avgSafetySignal * 0.5);
    
    // Clamp to realistic bounds
    equityBase = Math.max(10, Math.min(85, equityBase));
    
    const safetyBase = 100 - equityBase;
    
    // FIXED: Calculate risk score considering BOTH equity AND safety signals
    // Higher equity signals = higher risk, higher safety signals = lower risk
    const riskScore = Math.max(10, Math.min(90, 50 + avgEquitySignal - (avgSafetySignal * 0.3)));
    
    console.log("🎯 Final Results:", {
      equityBase: Math.round(equityBase),
      safetyBase: Math.round(safetyBase),
      riskScore: Math.round(riskScore * 100) / 100
    });
    
    return { equityBase, safetyBase, riskScore };
  }
  
  splitEquityCategory(equityBase: number, answers: CouncilAnswers): { stocks: number; mutualFunds: number } {
    // Base split: 60% MF, 40% Stocks (more conservative default)
    let mfRatio = 0.65;
    let stocksRatio = 0.35;
    
    // Adjust based on knowledge and experience
    if (answers.investmentKnowledge === "expert") {
      stocksRatio = 0.50; // More direct equity for experts
      mfRatio = 0.50;
    } else if (answers.investmentKnowledge === "experienced") {
      stocksRatio = 0.40;
      mfRatio = 0.60;
    } else if (answers.investmentKnowledge === "beginner") {
      stocksRatio = 0.25; // Heavy MF bias for beginners
      mfRatio = 0.75;
    }
    
    // Adjust for goal
    if (answers.primaryGoal === "wealth_building" && answers.age !== "65+") {
      stocksRatio += 0.10; // More aggressive for wealth building
      mfRatio -= 0.10;
    }
    
    return {
      stocks: Math.round(equityBase * stocksRatio),
      mutualFunds: Math.round(equityBase * mfRatio)
    };
  }
  
  splitSafetyCategory(safetyBase: number, answers: CouncilAnswers): { liquid: number; gold: number; realEstate: number; debt: number } {
    // Base safety allocation
    let liquidRatio = 0.35;
    let goldRatio = 0.20;
    let realEstateRatio = 0.25;
    let debtRatio = 0.20;
    
    // Adjust based on horizon
    if (answers.investmentHorizon === "<2 years") {
      liquidRatio = 0.60; // Heavy liquid for short horizon
      goldRatio = 0.15;
      realEstateRatio = 0.15;
      debtRatio = 0.10;
    } else if (answers.investmentHorizon === "20+ years") {
      liquidRatio = 0.25; // Less liquid for long horizon
      goldRatio = 0.25;
      realEstateRatio = 0.35; // More RE for long term
      debtRatio = 0.15;
    }
    
    // Adjust for liquidity needs
    if (answers.liquidityNeeds === "frequently" || answers.withdrawalNext2Years) {
      liquidRatio = Math.min(0.70, liquidRatio + 0.20);
      goldRatio *= 0.8;
      realEstateRatio *= 0.8;
      debtRatio *= 0.8;
    }
    
    // Adjust for emergency fund
    if (answers.emergencyFundMonths === "0-1" || answers.emergencyFundMonths === "2-3") {
      liquidRatio = Math.min(0.60, liquidRatio + 0.15);
      goldRatio *= 0.9;
      realEstateRatio *= 0.9;
      debtRatio *= 0.9;
    }
    
    // Normalize ratios
    const totalRatio = liquidRatio + goldRatio + realEstateRatio + debtRatio;
    liquidRatio /= totalRatio;
    goldRatio /= totalRatio;
    realEstateRatio /= totalRatio;
    debtRatio /= totalRatio;
    
    return {
      liquid: Math.round(safetyBase * liquidRatio),
      gold: Math.round(safetyBase * goldRatio),
      realEstate: Math.round(safetyBase * realEstateRatio),
      debt: Math.round(safetyBase * debtRatio)
    };
  }
  
  applyGoalAdjustments(allocation: Record<AssetClass, number>, answers: CouncilAnswers): Record<AssetClass, number> {
    const adjusted = { ...allocation };
    
    // Goal-specific tactical adjustments
    switch (answers.primaryGoal) {
      case "wealth_building":
        // Boost equity, reduce liquid
        adjusted.Stocks = Math.min(45, adjusted.Stocks + 5);
        adjusted["Mutual Funds"] = Math.min(45, adjusted["Mutual Funds"] + 5);
        adjusted.Liquid = Math.max(5, adjusted.Liquid - 10);
        break;
        
      case "home_purchase":
        // Heavy liquid, reduce everything else proportionally
        adjusted.Liquid = Math.min(50, adjusted.Liquid + 15);
        adjusted.Stocks = Math.max(5, adjusted.Stocks - 8);
        adjusted["Mutual Funds"] = Math.max(5, adjusted["Mutual Funds"] - 7);
        break;
        
      case "income_generation":
        // Boost debt and dividend-paying assets
        adjusted.Debt = Math.min(35, adjusted.Debt + 10);
        adjusted["Mutual Funds"] = Math.min(40, adjusted["Mutual Funds"] + 5); // Dividend funds
        adjusted.Stocks = Math.max(5, adjusted.Stocks - 15);
        break;
        
      case "preservation":
        // Ultra-conservative
        adjusted.Debt = Math.min(40, adjusted.Debt + 10);
        adjusted.Gold = Math.min(25, adjusted.Gold + 5);
        adjusted.Stocks = Math.max(5, adjusted.Stocks - 10);
        adjusted["Mutual Funds"] = Math.max(10, adjusted["Mutual Funds"] - 5);
        break;
    }
    
    return this.normalizeAllocation(adjusted);
  }
  
  handleAvoidedAssets(allocation: Record<AssetClass, number>, avoidAssets: AssetClass[] = []): Record<AssetClass, number> {
    console.log("🔍 handleAvoidedAssets called with:", { allocation, avoidAssets });
    
    if (!avoidAssets.length) {
      console.log("⚠️ No avoided assets provided, returning original allocation");
      return allocation;
    }
    
    const adjusted = { ...allocation };
    let redistributeAmount = 0;
    
    // Set avoided assets to 0 and calculate redistribution amount
    avoidAssets.forEach(asset => {
      console.log(`🚫 Setting ${asset} from ${adjusted[asset]}% to 0%`);
      redistributeAmount += adjusted[asset];
      adjusted[asset] = 0;
    });
    
    console.log(`💰 Redistributing ${redistributeAmount}% from avoided assets`);
    
    // Redistribute proportionally to remaining assets
    const remainingAssets = (Object.keys(adjusted) as AssetClass[]).filter(
      asset => !avoidAssets.includes(asset) && adjusted[asset] > 0
    );
    
    if (remainingAssets.length > 0) {
      const totalRemaining = remainingAssets.reduce((sum, asset) => sum + adjusted[asset], 0);
      
      remainingAssets.forEach(asset => {
        const proportion = adjusted[asset] / totalRemaining;
        adjusted[asset] = Math.round(adjusted[asset] + (redistributeAmount * proportion));
      });
    }
    
    return this.normalizeAllocation(adjusted);
  }
  
  private normalizeAllocation(allocation: Record<AssetClass, number>): Record<AssetClass, number> {
    const total = Object.values(allocation).reduce((sum, val) => sum + val, 0);
    
    if (total === 100) return allocation;
    
    // Use largest remainder method for rounding
    const normalized = { ...allocation };
    const factor = 100 / total;
    
    Object.keys(normalized).forEach(key => {
      normalized[key as AssetClass] = allocation[key as AssetClass] * factor;
    });
    
    // Round and handle remainder
    let runningTotal = 0;
    const rounded: Record<AssetClass, number> = {} as any;
    const remainders: Array<{ asset: AssetClass; remainder: number }> = [];
    
    Object.entries(normalized).forEach(([asset, value]) => {
      const floor = Math.floor(value);
      rounded[asset as AssetClass] = floor;
      runningTotal += floor;
      remainders.push({ asset: asset as AssetClass, remainder: value - floor });
    });
    
    // Distribute remaining percentage points
    remainders.sort((a, b) => b.remainder - a.remainder);
    const remaining = 100 - runningTotal;
    
    for (let i = 0; i < remaining; i++) {
      if (remainders[i]) {
        rounded[remainders[i].asset]++;
      }
    }
    
    return rounded;
  }
}

/**
 * Human-Like Rationale Generator
 * Creates advisor-quality explanations for allocation decisions
 */
class RationaleGenerator {
  generate(
    allocation: Record<AssetClass, number>, 
    signals: Signal[], 
    answers: CouncilAnswers, 
    riskScore: number,
    behavioralWarnings?: Array<{
      severity: "warning" | "critical";
      message: string;
      category: string;
      suggestedAction: string;
      advisorNote?: string;
    }>
  ): string[] {
    const rationale: string[] = [];
    
    // Lead with primary driver
    const dominantSignal = signals.reduce((max, signal) => 
      Math.abs(signal.equitySignal * signal.weight) > Math.abs(max.equitySignal * max.weight) ? signal : max
    );
    
    rationale.push(this.getLeadingStatement(dominantSignal, answers));
    
    // Address risk level
    const riskLevel = this.getRiskLevel(riskScore);
    rationale.push(this.getRiskExplanation(riskLevel, allocation, answers));
    
    // Goal alignment
    rationale.push(this.getGoalAlignment(answers.primaryGoal, allocation));
    
    // Address concerns or special circumstances
    const concerns = this.getSpecialCircumstances(signals, answers, allocation);
    if (concerns) rationale.push(concerns);
    
    // Portfolio construction rationale
    rationale.push(this.getConstructionRationale(allocation, answers));
    
    // Add behavioral warnings if any exist
    if (behavioralWarnings && behavioralWarnings.length > 0) {
      const criticalWarnings = behavioralWarnings.filter(w => w.severity === "critical");
      const warnings = behavioralWarnings.filter(w => w.severity === "warning");
      
      if (criticalWarnings.length > 0) {
        rationale.push(`⚠️ Critical Considerations: ${criticalWarnings.map(w => w.message).join("; ")}. ${criticalWarnings[0].suggestedAction}.`);
      }
      
      if (warnings.length > 0) {
        rationale.push(`📝 Additional Considerations: ${warnings.map(w => w.message).join("; ")}. Consider discussing these with your advisor.`);
      }
    }
    
    return rationale;
  }
  
  private getLeadingStatement(dominantSignal: Signal, answers: CouncilAnswers): string {
    if (dominantSignal.factor === "age") {
      const ageAdvice = {
        "<25": "At your young age, you have decades to build wealth through equity markets.",
        "25-35": "You're in prime wealth-building years with excellent capacity for growth investments.",
        "35-45": "Your peak earning phase allows for significant equity exposure while building long-term wealth.",
        "45-55": "As you approach retirement planning, we're balancing growth with gradual stability increases.",
        "55-65": "Nearing retirement, your portfolio emphasizes preservation while maintaining some growth potential.",
        "65+": "In retirement, capital preservation and income generation are your primary priorities."
      };
      return ageAdvice[answers.age as keyof typeof ageAdvice];
    }
    
    if (dominantSignal.factor === "investment_horizon") {
      return dominantSignal.explanation;
    }
    
    if (dominantSignal.factor === "primary_goal") {
      const goalAdvice = {
        "retirement": "Your retirement planning strategy balances long-term growth with progressive risk reduction.",
        "wealth_building": "For wealth building, we're emphasizing growth-oriented assets to maximize long-term returns.",
        "income_generation": "Your income focus requires stable, yield-generating investments for regular cash flow.",
        "home_purchase": "For your home purchase goal, we're prioritizing capital preservation and liquidity.",
        "child_education": "Education planning needs predictable growth while preserving capital as the timeline approaches.",
        "preservation": "Capital preservation takes priority, focusing on stability over aggressive growth."
      };
      return goalAdvice[answers.primaryGoal as keyof typeof goalAdvice];
    }
    
    return dominantSignal.explanation;
  }
  
  private getRiskLevel(riskScore: number): RiskLevel {
    return getConsistentRiskProfile(riskScore).level;
  }
  
  private getRiskExplanation(riskLevel: RiskLevel, allocation: Record<AssetClass, number>, answers: CouncilAnswers): string {
    const equityTotal = allocation.Stocks + allocation["Mutual Funds"];
    
    if (riskLevel === "Aggressive") {
      return `Your ${equityTotal}% equity allocation reflects your comfort with volatility and long-term growth focus, supported by your ${answers.volatilityComfort?.replace('_', ' ') || 'moderate'} approach to market fluctuations.`;
    } else if (riskLevel === "Conservative") {
      return `The conservative ${100 - equityTotal}% allocation to safety assets provides stability aligned with your risk comfort level and circumstances.`;
    } else {
      return `This balanced ${equityTotal}% equity approach provides growth potential while maintaining appropriate safety buffers for your situation.`;
    }
  }
  
  private getGoalAlignment(goal: string, allocation: Record<AssetClass, number>): string {
    const goalExplanations = {
      "retirement": `The ${allocation.Debt + allocation.Gold}% allocation to income-generating and hedge assets supports your retirement timeline.`,
      "wealth_building": `Heavy equity weighting of ${allocation.Stocks + allocation["Mutual Funds"]}% maximizes long-term wealth accumulation potential.`,
      "income_generation": `${allocation.Debt}% in debt instruments provides the steady income stream you're seeking.`,
      "home_purchase": `${allocation.Liquid}% in liquid assets ensures capital availability for your home purchase timeline.`,
      "child_education": `Balanced approach preserves capital while generating growth for education expenses.`,
      "preservation": `${allocation.Debt + allocation.Gold + allocation.Liquid}% in preservation assets protects your capital from market volatility.`
    };
    
    return goalExplanations[goal as keyof typeof goalExplanations] || "This allocation aligns with your stated investment objectives.";
  }
  
  private getSpecialCircumstances(signals: Signal[], answers: CouncilAnswers, allocation: Record<AssetClass, number>): string | null {
    const circumstances: string[] = [];
    
    // Emergency fund concerns
    if (answers.emergencyFundMonths === "0-1" || answers.emergencyFundMonths === "2-3") {
      circumstances.push(`Higher liquid allocation (${allocation.Liquid}%) addresses your emergency fund gap.`);
    }
    
    // High dependents
    if (answers.dependents === "3-4" || answers.dependents === "5+") {
      circumstances.push(`Family responsibilities support the conservative positioning with ${allocation.Debt + allocation.Liquid}% in stable assets.`);
    }
    
    // Near-term withdrawal
    if (answers.withdrawalNext2Years) {
      circumstances.push(`Anticipated withdrawals within 2 years justify the emphasis on liquid and stable investments.`);
    }
    
    // Job instability
    if (answers.jobStability === "not_stable") {
      circumstances.push(`Income volatility supports maintaining higher safety buffers in your allocation.`);
    }
    
    return circumstances.length > 0 ? circumstances.join(" ") : null;
  }
  
  private getConstructionRationale(allocation: Record<AssetClass, number>, answers: CouncilAnswers): string {
    const equityTotal = allocation.Stocks + allocation["Mutual Funds"];
    const components: string[] = [];
    
    if (allocation.Stocks > 0) {
      components.push(`${allocation.Stocks}% direct stocks for growth potential`);
    }
    
    if (allocation["Mutual Funds"] > 0) {
      components.push(`${allocation["Mutual Funds"]}% mutual funds for diversified equity exposure`);
    }
    
    if (allocation.Debt > 0) {
      components.push(`${allocation.Debt}% debt for stable income`);
    }
    
    if (allocation.Gold > 0) {
      components.push(`${allocation.Gold}% gold as inflation hedge`);
    }
    
    if (allocation["Real Estate"] > 0) {
      components.push(`${allocation["Real Estate"]}% real estate for portfolio diversification`);
    }
    
    if (allocation.Liquid > 0) {
      components.push(`${allocation.Liquid}% liquid funds for flexibility and opportunities`);
    }
    
    return `Portfolio construction: ${components.join(", ")}.`;
  }
}

/**
 * Stress Testing Engine
 * Evaluates portfolio resilience under various market scenarios
 */
class StressTester {
  runStressTest(allocation: Record<AssetClass, number>, answers: CouncilAnswers): StressTestResult {
    const results: Record<string, any> = {};
    const monthlyExpenses = this.estimateMonthlyExpenses(answers);
    const emergencyFundValue = this.getEmergencyFundValue(answers);
    
    // Use historical scenarios instead of generic ones
    Object.entries(stressTestScenarios).forEach(([scenarioName, scenario]) => {
      let portfolioImpact = 0;
      const sectorImpacts: Record<string, number> = {};
      
      // Calculate portfolio impact based on allocation and historical drops
      Object.entries(allocation).forEach(([asset, percentage]) => {
        let assetImpact = 0;
        
        // Get the relevant drop percentage for this asset
        if (scenario.drop.NIFTY && (asset === "Stocks" || asset === "Mutual Funds")) {
          assetImpact = parseFloat(scenario.drop.NIFTY.replace('%', ''));
        } else if (scenario.drop["Real Estate"] && asset === "Real Estate") {
          assetImpact = parseFloat(scenario.drop["Real Estate"].replace('%', ''));
        } else if (scenario.drop.Gold && asset === "Gold") {
          assetImpact = parseFloat(scenario.drop.Gold.replace('%', ''));
        } else if (scenario.drop["S&P500"] && asset === "Stocks") {
          assetImpact = parseFloat(scenario.drop["S&P500"].replace('%', ''));
        } else if (scenario.drop["NASDAQ"] && asset === "Mutual Funds") {
          assetImpact = parseFloat(scenario.drop["NASDAQ"].replace('%', ''));
        } else {
          // Default impact for assets not specifically mentioned
          assetImpact = asset === "Debt" ? -5 : asset === "Liquid" ? 0 : -15;
        }
        
        const weightedImpact = (percentage / 100) * (assetImpact / 100);
        portfolioImpact += weightedImpact;
        
        // Store sector-specific impacts for demonetization-like events
        if (Math.abs(assetImpact) > 10) {
          sectorImpacts[asset] = assetImpact;
        }
      });
      
      const monthsCovered = monthlyExpenses > 0 ? 
        (emergencyFundValue + (portfolioImpact * answers.investmentAmount)) / monthlyExpenses : 
        emergencyFundValue > 0 ? 12 : 0;
      
      // Get the most relevant historical drop for comparison
      const historicalDrop = scenario.drop["NIFTY"] || scenario.drop["S&P500"] || scenario.drop["NASDAQ"] || "-20%";
      const portfolioDrop = `${(portfolioImpact * 100).toFixed(1)}%`;
      
      let recommendation = "Portfolio shows good resilience";
      if (monthsCovered < 3) {
        recommendation = "Consider increasing emergency fund before investing";
      } else if (portfolioImpact < -0.30) {
        recommendation = "Consider reducing equity exposure for this scenario";
      } else if (portfolioImpact < -0.20) {
        recommendation = "Portfolio within acceptable risk parameters";
      }
      
      results[scenarioName] = {
        portfolioImpact: portfolioImpact * 100, // Convert to percentage
        monthsCovered: Math.max(0, monthsCovered),
        recommendation,
        // Enhanced with historical context
        historicalDrop: historicalDrop,
        evidence: scenario.evidence,
        recovery: scenario.recovery,
        comparison: `Your portfolio: ${portfolioDrop} vs Historical: ${historicalDrop}`,
        sectorImpacts: Object.keys(sectorImpacts).length > 0 ? sectorImpacts : undefined
      };
    });
    
    return { scenarios: results };
  }
  
  private estimateMonthlyExpenses(answers: CouncilAnswers): number {
    // Rough estimation based on income and obligations
    const incomeMapping: Record<string, number> = {
      "<50K": 35000,
      "50K-1L": 75000,
      "1L-2L": 150000,
      "2L-5L": 350000,
      "5L+": 750000
    };
    
    const monthlyIncome = incomeMapping[answers.annualIncome.absolute as keyof typeof incomeMapping] / 12;
    
    // Estimate expenses as 60-80% of income based on dependents
    const expenseRatio = answers.dependents === "0" ? 0.6 : 
                        answers.dependents === "1-2" ? 0.7 : 0.8;
    
    return monthlyIncome * expenseRatio;
  }
  
  private getEmergencyFundValue(answers: CouncilAnswers): number {
    const monthlyExpenses = this.estimateMonthlyExpenses(answers);
    
    const efMapping: Record<string, number> = {
      "0-1": 0.5,
      "2-3": 2.5,
      "4-6": 5,
      "7-12": 9,
      "12+": 15
    };
    
    return monthlyExpenses * efMapping[answers.emergencyFundMonths as keyof typeof efMapping];
  }
}

/**
 * Main Advisor Council Engine
 * Orchestrates all components to generate professional allocation recommendations
 */
export class AdvisorCouncilEngine {
  private signalProcessor = new SignalProcessor();
  private allocationCalculator = new AllocationCalculator();
  private rationaleGenerator = new RationaleGenerator();
  private stressTester = new StressTester();
  
  generateRecommendation(answers: CouncilAnswers): AllocationResult {
    console.log("🚀 ADVISOR COUNCIL ENGINE GENERATERECOMMENDATION CALLED! 🚀");
    console.log("🏗️ === ADVISOR COUNCIL ENGINE - DETAILED CALCULATION === 🏗️");
    console.log("📋 INPUT ANSWERS:", answers);
    
    // Step 1: Process all signals
    const signals = this.signalProcessor.calculateSignals(answers);
    console.log("📊 STEP 1 - SIGNALS CALCULATED:", {
      totalSignals: signals.length,
      signalBreakdown: signals.map(s => ({
        factor: s.factor,
        equitySignal: s.equitySignal,
        safetySignal: s.safetySignal,
        weight: s.weight,
        weightedEquityEffect: s.equitySignal * s.weight,
        explanation: s.explanation
      }))
    });
    
    // Step 2: Calculate dynamic base allocation
    const { equityBase, safetyBase, riskScore } = this.allocationCalculator.calculateDynamicBase(signals);
    console.log("⚖️ STEP 2 - DYNAMIC BASE ALLOCATION:", {
      equityBase: `${equityBase}%`,
      safetyBase: `${safetyBase}%`,
      riskScore: riskScore,
      totalEquitySignals: signals.reduce((sum, s) => sum + (s.equitySignal * s.weight), 0),
      totalSafetySignals: signals.reduce((sum, s) => sum + (s.safetySignal * s.weight), 0)
    });
    
    // Step 3: Split equity category
    const { stocks, mutualFunds } = this.allocationCalculator.splitEquityCategory(equityBase, answers);
    console.log("📈 STEP 3 - EQUITY SPLIT:", {
      equityBase: `${equityBase}%`,
      stocks: `${stocks}%`,
      mutualFunds: `${mutualFunds}%`,
      splitRatio: `${(stocks/equityBase*100).toFixed(1)}% stocks / ${(mutualFunds/equityBase*100).toFixed(1)}% MF`,
      reasonForSplit: answers.investmentKnowledge
    });
    
    // Step 4: Split safety category
    const { liquid, gold, realEstate, debt } = this.allocationCalculator.splitSafetyCategory(safetyBase, answers);
    console.log("🛡️ STEP 4 - SAFETY SPLIT:", {
      safetyBase: `${safetyBase}%`,
      liquid: `${liquid}%`,
      debt: `${debt}%`,
      gold: `${gold}%`,
      realEstate: `${realEstate}%`,
      splitBreakdown: {
        liquidRatio: `${(liquid/safetyBase*100).toFixed(1)}%`,
        debtRatio: `${(debt/safetyBase*100).toFixed(1)}%`,
        goldRatio: `${(gold/safetyBase*100).toFixed(1)}%`,
        realEstateRatio: `${(realEstate/safetyBase*100).toFixed(1)}%`
      }
    });
    
    // Step 5: Create base allocation
    let allocation: Record<AssetClass, number> = {
      "Stocks": stocks,
      "Mutual Funds": mutualFunds,
      "Gold": gold,
      "Real Estate": realEstate,
      "Debt": debt,
      "Liquid": liquid
    };
    console.log("🔧 STEP 5 - BASE ALLOCATION CREATED:", {
      allocation,
      totals: {
        equity: stocks + mutualFunds,
        safety: liquid + debt + gold + realEstate,
        total: Object.values(allocation).reduce((sum, val) => sum + val, 0)
      }
    });
    
    // Step 6: Apply goal adjustments
    const allocationBeforeGoals = { ...allocation };
    allocation = this.allocationCalculator.applyGoalAdjustments(allocation, answers);
    console.log("🎯 STEP 6 - GOAL ADJUSTMENTS:", {
      primaryGoal: answers.primaryGoal,
      before: allocationBeforeGoals,
      after: allocation,
      changes: Object.keys(allocation).map(key => ({
        asset: key,
        before: allocationBeforeGoals[key as AssetClass],
        after: allocation[key as AssetClass],
        change: allocation[key as AssetClass] - allocationBeforeGoals[key as AssetClass]
      })).filter(change => change.change !== 0)
    });
    
    // Step 7: Handle avoided assets
    console.log("🚫 AVOIDED ASSETS DEBUG:", {
      avoidAssets: answers.avoidAssets,
      allocationBefore: allocation,
    });
    allocation = this.allocationCalculator.handleAvoidedAssets(allocation, answers.avoidAssets);
    console.log("🚫 ALLOCATION AFTER AVOIDING:", allocation);
    
    // Step 8: Apply insurance logic
    allocation = this.signalProcessor.applyInsuranceLogic(allocation, answers.hasInsurance);
    console.log("🛡️ STEP 8 - INSURANCE ADJUSTMENTS:", {
      hasInsurance: answers.hasInsurance,
      originalAllocation: allocationBeforeGoals,
      adjustedAllocation: allocation,
      changes: Object.keys(allocation).map(key => ({
        asset: key,
        before: allocationBeforeGoals[key as AssetClass],
        after: allocation[key as AssetClass],
        change: allocation[key as AssetClass] - allocationBeforeGoals[key as AssetClass]
      })).filter(change => change.change !== 0)
    });
    
    // Step 9: Generate rationale
    const behavioralWarnings = validateBehavioralConsistency(answers);
    const rationale = this.rationaleGenerator.generate(allocation, signals, answers, riskScore, behavioralWarnings);
    console.log("💭 STEP 9 - RATIONALE GENERATED:", {
      rationaleLength: rationale.length,
      rationale: rationale
    });
    
    // Step 10: Run stress tests
    const stressTest = this.stressTester.runStressTest(allocation, answers);
    console.log("🧪 STEP 10 - STRESS TESTS:", {
      scenarios: Object.keys(stressTest.scenarios),
      worstCaseScenario: Object.entries(stressTest.scenarios).sort((a, b) => a[1].portfolioImpact - b[1].portfolioImpact)[0],
      bestCaseScenario: Object.entries(stressTest.scenarios).sort((a, b) => b[1].portfolioImpact - a[1].portfolioImpact)[0],
      averageImpact: Object.values(stressTest.scenarios).reduce((sum, s) => sum + s.portfolioImpact, 0) / Object.keys(stressTest.scenarios).length,
      fullResults: stressTest
    });
    
    // Step 11: Determine risk level with consistent mapping
    const riskProfile = getConsistentRiskProfile(riskScore);
    const riskLevel = riskProfile.level;
    
    // Step 12: Behavioral consistency validation
    const consistencyScore = Math.max(0, 100 - (behavioralWarnings.length * 15)); // Deduct 15 points per warning
    
    console.log("🧠 STEP 12 - BEHAVIORAL VALIDATION:", {
      warningsFound: behavioralWarnings.length,
      consistencyScore: consistencyScore,
      criticalIssues: behavioralWarnings.filter(w => w.severity === "critical").length,
      warnings: behavioralWarnings.filter(w => w.severity === "warning").length,
      fullWarnings: behavioralWarnings
    });
    
    console.log("🎯 STEP 11 - FINAL RESULTS:", {
      riskScore: riskScore,
      riskLevel: riskLevel,
      finalAllocation: allocation,
      allocationSummary: {
        totalEquity: allocation.Stocks + allocation["Mutual Funds"],
        totalSafety: allocation.Liquid + allocation.Debt + allocation.Gold + allocation["Real Estate"],
        satellite: allocation.Gold + allocation["Real Estate"],
        breakdown: {
          equity: `${allocation.Stocks + allocation["Mutual Funds"]}% (${allocation.Stocks}% stocks + ${allocation["Mutual Funds"]}% MF)`,
          defensive: `${allocation.Liquid + allocation.Debt}% (${allocation.Liquid}% liquid + ${allocation.Debt}% debt)`,
          satellite: `${allocation.Gold + allocation["Real Estate"]}% (${allocation.Gold}% gold + ${allocation["Real Estate"]}% real estate)`
        }
      }
    });
    
    console.log("🏁 === ENGINE CALCULATION COMPLETE === 🏁");
    
    return {
      allocation,
      riskScore,
      riskLevel,
      riskProfile,
      behavioralWarnings,
      consistencyScore,
      signals,
      rationale,
      stressTest
    };
  }
  

}