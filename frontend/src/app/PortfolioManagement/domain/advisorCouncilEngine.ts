/**
 * 10-Advisor Council Allocation Engine
 * Professional-grade allocation logic with weighted signals and dynamic base calculations
 */

export type AssetClass = "Stocks" | "Mutual Funds" | "Gold" | "Real Estate" | "Debt" | "Liquid";
export type RiskLevel = "Conservative" | "Moderate" | "Aggressive";

export interface CouncilAnswers {
  // Demographics & Time Horizon (25% weight)
  age: "<25" | "25-35" | "35-45" | "45-55" | "55-65" | "65+";
  investmentHorizon: "<2 years" | "2-5 years" | "5-10 years" | "10-20 years" | "20+ years";
  targetRetirementAge: "50-55" | "55-60" | "60-65" | "65-70" | "70+";
  
  // Financial Situation (30% weight)
  annualIncome: "<50K" | "50K-1L" | "1L-2L" | "2L-5L" | "5L+";
  investmentAmount: number; // Actual amount in rupees
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
  avoidAssets?: AssetClass[];
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
  }>;
}

export interface RebalanceAction {
  action: "buy" | "sell";
  asset: AssetClass;
  amount: number;
  reason: string;
}

/**
 * Core Signal Processing Engine
 * Each factor contributes weighted equity/safety signals
 */
class SignalProcessor {
  calculateSignals(answers: CouncilAnswers): Signal[] {
    const signals: Signal[] = [];
    
    // Age Signals (25% weight)
    signals.push(this.getAgeSignal(answers.age));
    
    // Time Horizon (25% weight)
    signals.push(this.getHorizonSignal(answers.investmentHorizon));
    
    // Financial Situation Signals (30% weight)
    signals.push(this.getIncomeStabilitySignal(answers.jobStability));
    signals.push(this.getDependentsSignal(answers.dependents));
    signals.push(this.getEmergencyFundSignal(answers.emergencyFundMonths));
    signals.push(this.getObligationsSignal(answers.monthlyObligations));
    
    // Risk Tolerance Signals (25% weight)
    signals.push(this.getVolatilitySignal(answers.volatilityComfort));
    signals.push(this.getKnowledgeSignal(answers.investmentKnowledge));
    signals.push(this.getLossToleranceSignal(answers.maxAcceptableLoss));
    
    // Goals & Objectives (20% weight)
    signals.push(this.getGoalSignal(answers.primaryGoal));
    signals.push(this.getLiquiditySignal(answers.liquidityNeeds));
    
    // Contextual Signals
    if (answers.withdrawalNext2Years) {
      signals.push({
        factor: "withdrawal_next_2yrs",
        equitySignal: -10,
        safetySignal: +20,
        weight: 0.15,
        explanation: "Near-term withdrawal needs require higher liquid allocation"
      });
    }
    
    if (!answers.hasInsurance) {
      signals.push({
        factor: "no_insurance",
        equitySignal: -10,
        safetySignal: +10,
        weight: 0.10,
        explanation: "Lack of insurance requires more conservative positioning"
      });
    }
    
    return signals;
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
    
    const signal = stabilitySignals[stability as keyof typeof stabilitySignals];
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
    
    const signal = dependentSignals[dependents as keyof typeof dependentSignals];
    return {
      factor: "dependents",
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight: 0.10,
      explanation: signal.explanation
    };
  }
  
  private getEmergencyFundSignal(efMonths: string): Signal {
    const efSignals = {
      "0-1": { equity: -15, safety: +15, explanation: "Insufficient emergency fund requires immediate liquidity focus" },
      "2-3": { equity: -8, safety: +10, explanation: "Low emergency fund suggests increasing liquid reserves" },
      "4-6": { equity: 0, safety: 0, explanation: "Adequate emergency fund allows normal risk allocation" },
      "7-12": { equity: +3, safety: -2, explanation: "Good emergency buffer enables slightly higher risk" },
      "12+": { equity: +5, safety: -5, explanation: "Excellent emergency fund supports increased equity exposure" }
    };
    
    const signal = efSignals[efMonths as keyof typeof efSignals];
    return {
      factor: "emergency_fund",
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight: 0.15,
      explanation: signal.explanation
    };
  }
  
  private getObligationsSignal(obligations: string): Signal {
    const obligationSignals = {
      "<10K": { equity: +3, safety: -2, explanation: "Low obligations allow for higher risk tolerance" },
      "10K-25K": { equity: 0, safety: 0, explanation: "Moderate obligations suggest balanced approach" },
      "25K-50K": { equity: -3, safety: +5, explanation: "High obligations require increased stability" },
      "50K+": { equity: -8, safety: +10, explanation: "Very high obligations necessitate conservative positioning" }
    };
    
    const signal = obligationSignals[obligations as keyof typeof obligationSignals];
    return {
      factor: "monthly_obligations",
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight: 0.10,
      explanation: signal.explanation
    };
  }
  
  private getVolatilitySignal(comfort: string): Signal {
    const volatilitySignals = {
      "panic_sell": { equity: -15, safety: +15, explanation: "Low volatility tolerance requires defensive allocation" },
      "very_uncomfortable": { equity: -8, safety: +10, explanation: "Limited comfort with volatility suggests caution" },
      "somewhat_concerned": { equity: 0, safety: 0, explanation: "Moderate volatility comfort allows balanced approach" },
      "stay_calm": { equity: +8, safety: -5, explanation: "Good volatility tolerance supports higher equity exposure" },
      "buy_more": { equity: +12, safety: -8, explanation: "Excellent volatility tolerance enables aggressive positioning" }
    };
    
    const signal = volatilitySignals[comfort as keyof typeof volatilitySignals];
    return {
      factor: "volatility_comfort",
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight: 0.20,
      explanation: signal.explanation
    };
  }
  
  private getKnowledgeSignal(knowledge: string): Signal {
    const knowledgeSignals = {
      "beginner": { equity: -5, safety: +5, explanation: "Limited experience suggests starting with safer investments" },
      "some_knowledge": { equity: 0, safety: 0, explanation: "Basic knowledge allows for standard allocation approach" },
      "experienced": { equity: +5, safety: -3, explanation: "Good experience enables higher risk positioning" },
      "expert": { equity: +8, safety: -5, explanation: "Expert knowledge supports sophisticated higher-risk strategies" }
    };
    
    const signal = knowledgeSignals[knowledge as keyof typeof knowledgeSignals];
    return {
      factor: "investment_knowledge",
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight: 0.10,
      explanation: signal.explanation
    };
  }
  
  private getLossToleranceSignal(tolerance: string): Signal {
    const toleranceSignals = {
      "5%": { equity: -10, safety: +10, explanation: "Low loss tolerance requires conservative approach" },
      "10%": { equity: -5, safety: +5, explanation: "Limited loss tolerance suggests defensive positioning" },
      "20%": { equity: 0, safety: 0, explanation: "Moderate loss tolerance allows balanced allocation" },
      "30%": { equity: +5, safety: -3, explanation: "Good loss tolerance supports higher equity exposure" },
      "40%+": { equity: +10, safety: -5, explanation: "High loss tolerance enables aggressive growth strategy" }
    };
    
    const signal = toleranceSignals[tolerance as keyof typeof toleranceSignals];
    return {
      factor: "loss_tolerance",
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight: 0.15,
      explanation: signal.explanation
    };
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
    
    const signal = goalSignals[goal as keyof typeof goalSignals];
    return {
      factor: "primary_goal",
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight: 0.15,
      explanation: signal.explanation
    };
  }
  
  private getLiquiditySignal(liquidity: string): Signal {
    const liquiditySignals = {
      "never": { equity: +3, safety: -2, explanation: "No liquidity needs allow for longer-term positioning" },
      "once_year": { equity: 0, safety: 0, explanation: "Minimal liquidity needs allow standard allocation" },
      "few_times_year": { equity: -2, safety: +3, explanation: "Occasional liquidity needs suggest moderate safety buffer" },
      "monthly": { equity: -5, safety: +8, explanation: "Regular liquidity needs require higher safe allocation" },
      "frequently": { equity: -10, safety: +15, explanation: "Frequent liquidity needs prioritize accessible funds" }
    };
    
    const signal = liquiditySignals[liquidity as keyof typeof liquiditySignals];
    return {
      factor: "liquidity_needs",
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight: 0.10,
      explanation: signal.explanation
    };
  }
}

/**
 * Dynamic Base Allocation Calculator
 * Converts weighted signals into base allocation percentages
 */
class AllocationCalculator {
  calculateDynamicBase(signals: Signal[]): { equityBase: number; safetyBase: number; riskScore: number } {
    const neutralEquity = 50; // Starting baseline
    
    // Calculate weighted equity and safety signals
    let totalEquitySignal = 0;
    let totalSafetySignal = 0;
    let totalWeight = 0;
    
    signals.forEach(signal => {
      totalEquitySignal += signal.equitySignal * signal.weight;
      totalSafetySignal += signal.safetySignal * signal.weight;
      totalWeight += signal.weight;
    });
    
    // Normalize by total weight
    const avgEquitySignal = totalEquitySignal / totalWeight;
    const avgSafetySignal = totalSafetySignal / totalWeight;
    
    // Calculate dynamic equity base
    let equityBase = neutralEquity + avgEquitySignal - (avgSafetySignal * 0.5);
    
    // Clamp to realistic bounds
    equityBase = Math.max(10, Math.min(85, equityBase));
    
    const safetyBase = 100 - equityBase;
    
    // Calculate risk score (0-100)
    const riskScore = Math.max(10, Math.min(90, 50 + avgEquitySignal));
    
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
    if (!avoidAssets.length) return allocation;
    
    const adjusted = { ...allocation };
    let redistributeAmount = 0;
    
    // Set avoided assets to 0 and calculate redistribution amount
    avoidAssets.forEach(asset => {
      redistributeAmount += adjusted[asset];
      adjusted[asset] = 0;
    });
    
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
  generate(allocation: Record<AssetClass, number>, signals: Signal[], answers: CouncilAnswers, riskScore: number): string[] {
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
    if (riskScore <= 35) return "Conservative";
    if (riskScore <= 65) return "Moderate";
    return "Aggressive";
  }
  
  private getRiskExplanation(riskLevel: RiskLevel, allocation: Record<AssetClass, number>, answers: CouncilAnswers): string {
    const equityTotal = allocation.Stocks + allocation["Mutual Funds"];
    
    if (riskLevel === "Aggressive") {
      return `Your ${equityTotal}% equity allocation reflects your comfort with volatility and long-term growth focus, supported by your ${answers.volatilityComfort.replace('_', ' ')} approach to market fluctuations.`;
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
    const scenarios = {
      "2008 Financial Crisis": { 
        Stocks: -45, "Mutual Funds": -38, Debt: +2, Gold: +24, "Real Estate": -25, Liquid: 0 
      },
      "2020 Pandemic Shock": { 
        Stocks: -35, "Mutual Funds": -30, Debt: +8, Gold: +18, "Real Estate": -15, Liquid: 0 
      },
      "High Inflation (1970s-style)": { 
        Stocks: -15, "Mutual Funds": -12, Debt: -20, Gold: +45, "Real Estate": +25, Liquid: -8 
      },
      "Interest Rate Spike": { 
        Stocks: -20, "Mutual Funds": -18, Debt: -15, Gold: +5, "Real Estate": -30, Liquid: +2 
      }
    };
    
    const results: Record<string, any> = {};
    const monthlyExpenses = this.estimateMonthlyExpenses(answers);
    const emergencyFundValue = this.getEmergencyFundValue(answers);
    
    Object.entries(scenarios).forEach(([scenario, impacts]) => {
      let portfolioImpact = 0;
      
      Object.entries(allocation).forEach(([asset, percentage]) => {
        const impact = impacts[asset as keyof typeof impacts] || 0;
        portfolioImpact += (percentage / 100) * (impact / 100);
      });
      
      const monthsCovered = (emergencyFundValue + (portfolioImpact * answers.investmentAmount)) / monthlyExpenses;
      
      let recommendation = "Portfolio shows good resilience";
      if (monthsCovered < 3) {
        recommendation = "Consider increasing emergency fund before investing";
      } else if (portfolioImpact < -0.30) {
        recommendation = "Consider reducing equity exposure for this scenario";
      } else if (portfolioImpact < -0.20) {
        recommendation = "Portfolio within acceptable risk parameters";
      }
      
      results[scenario] = {
        portfolioImpact: portfolioImpact * 100, // Convert to percentage
        monthsCovered: Math.max(0, monthsCovered),
        recommendation
      };
    });
    
    return { scenarios: results };
  }
  
  private estimateMonthlyExpenses(answers: CouncilAnswers): number {
    // Rough estimation based on income and obligations
    const incomeMapping = {
      "<50K": 35000,
      "50K-1L": 75000,
      "1L-2L": 150000,
      "2L-5L": 350000,
      "5L+": 750000
    };
    
    const monthlyIncome = incomeMapping[answers.annualIncome] / 12;
    
    // Estimate expenses as 60-80% of income based on dependents
    const expenseRatio = answers.dependents === "0" ? 0.6 : 
                        answers.dependents === "1-2" ? 0.7 : 0.8;
    
    return monthlyIncome * expenseRatio;
  }
  
  private getEmergencyFundValue(answers: CouncilAnswers): number {
    const monthlyExpenses = this.estimateMonthlyExpenses(answers);
    
    const efMapping = {
      "0-1": 0.5,
      "2-3": 2.5,
      "4-6": 5,
      "7-12": 9,
      "12+": 15
    };
    
    return monthlyExpenses * efMapping[answers.emergencyFundMonths];
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
    // Step 1: Process all signals
    const signals = this.signalProcessor.calculateSignals(answers);
    
    // Step 2: Calculate dynamic base allocation
    const { equityBase, safetyBase, riskScore } = this.allocationCalculator.calculateDynamicBase(signals);
    
    // Step 3: Split equity category
    const { stocks, mutualFunds } = this.allocationCalculator.splitEquityCategory(equityBase, answers);
    
    // Step 4: Split safety category
    const { liquid, gold, realEstate, debt } = this.allocationCalculator.splitSafetyCategory(safetyBase, answers);
    
    // Step 5: Create base allocation
    let allocation: Record<AssetClass, number> = {
      "Stocks": stocks,
      "Mutual Funds": mutualFunds,
      "Gold": gold,
      "Real Estate": realEstate,
      "Debt": debt,
      "Liquid": liquid
    };
    
    // Step 6: Apply goal adjustments
    allocation = this.allocationCalculator.applyGoalAdjustments(allocation, answers);
    
    // Step 7: Handle avoided assets
    allocation = this.allocationCalculator.handleAvoidedAssets(allocation, answers.avoidAssets);
    
    // Step 8: Generate rationale
    const rationale = this.rationaleGenerator.generate(allocation, signals, answers, riskScore);
    
    // Step 9: Run stress tests
    const stressTest = this.stressTester.runStressTest(allocation, answers);
    
    // Step 10: Determine risk level
    const riskLevel = riskScore <= 35 ? "Conservative" : riskScore <= 65 ? "Moderate" : "Aggressive";
    
    return {
      allocation,
      riskScore,
      riskLevel,
      signals,
      rationale,
      stressTest
    };
  }
  
  // Utility method to convert old questionnaire format
  convertLegacyAnswers(oldAnswers: any): CouncilAnswers {
    // Implementation to map old format to new CouncilAnswers
    // This ensures backward compatibility during transition
    return {
      age: this.mapAge(oldAnswers.ageBand),
      investmentHorizon: this.mapHorizon(oldAnswers.horizon),
      targetRetirementAge: "60-65", // Default
      annualIncome: "1L-2L", // Default
      investmentAmount: 100000, // Default
      existingInvestments: "<1L", // Default
      emergencyFundMonths: oldAnswers.emergencyFundSixMonths === "Yes" ? "4-6" : "2-3",
      dependents: this.mapDependents(oldAnswers.dependents),
      monthlyObligations: this.mapObligations(oldAnswers.liabilities),
      volatilityComfort: this.mapVolatility(oldAnswers.volatilityComfort),
      maxAcceptableLoss: "20%", // Default
      investmentKnowledge: oldAnswers.investmentKnowledge || "some_knowledge",
      previousLosses: "no_major_losses", // Default
      primaryGoal: "wealth_building", // Default
      expectedReturn: "8-12%", // Default
      liquidityNeeds: "few_times_year", // Default
      esgPreference: "no_preference", // Default
      jobStability: oldAnswers.incomeStability || "somewhat_stable",
      withdrawalNext2Years: false, // Default
      hasInsurance: oldAnswers.adequateInsurance === "Yes"
    };
  }
  
  private mapAge(ageBand: string): CouncilAnswers["age"] {
    if (ageBand === "<30") return "<25";
    if (ageBand === "30–45") return "25-35";
    if (ageBand === "45–60") return "45-55";
    return "55-65";
  }
  
  private mapHorizon(horizon: string): CouncilAnswers["investmentHorizon"] {
    if (horizon?.includes("<3")) return "<2 years";
    if (horizon?.includes("3–7")) return "5-10 years";
    if (horizon?.includes("7+")) return "10-20 years";
    return "5-10 years";
  }
  
  private mapDependents(dependents: string): CouncilAnswers["dependents"] {
    if (dependents === "None") return "0";
    if (dependents === "Few") return "1-2";
    return "3-4";
  }
  
  private mapObligations(liabilities: string): CouncilAnswers["monthlyObligations"] {
    if (liabilities === "None") return "<10K";
    if (liabilities === "Moderate") return "10K-25K";
    return "25K-50K";
  }
  
  private mapVolatility(comfort: string): CouncilAnswers["volatilityComfort"] {
    if (comfort?.includes("Very")) return "stay_calm";
    if (comfort?.includes("Not")) return "very_uncomfortable";
    return "somewhat_concerned";
  }
}