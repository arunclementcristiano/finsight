/**
 * Enhanced 10-Advisor Council Questionnaire
 * Professional-grade risk profiling with sophisticated scoring
 */

export interface QuestionOption {
  value: string;
  label: string;
  helperText?: string;
  riskImpact?: "low" | "medium" | "high";
}

export interface Question {
  key: string;
  category: "demographics" | "financial" | "risk" | "goals" | "context";
  title: string;
  description: string;
  type: "single-select" | "multi-select" | "number" | "boolean";
  options?: QuestionOption[];
  weight: number; // For calculating progress
  required: boolean;
  conditional?: {
    dependsOn: string;
    showWhen: string | string[];
  };
  validationRules?: {
    min?: number;
    max?: number;
    step?: number;
  };
}

export const enhancedQuestions: Question[] = [
  // =================
  // DEMOGRAPHICS & TIME HORIZON (25% weight)
  // =================
  {
    key: "age",
    category: "demographics",
    title: "What's your age?",
    description: "Age helps determine your risk capacity and investment timeline. Younger investors typically have higher risk tolerance due to longer recovery periods.",
    type: "single-select",
    weight: 8,
    required: true,
    options: [
      {
        value: "<25",
        label: "Under 25",
        helperText: "Maximum growth potential with decades to invest",
        riskImpact: "high"
      },
      {
        value: "25-35",
        label: "25 to 35",
        helperText: "Prime wealth-building years with high risk capacity",
        riskImpact: "high"
      },
      {
        value: "35-45",
        label: "35 to 45",
        helperText: "Peak earning phase with strong growth focus",
        riskImpact: "medium"
      },
      {
        value: "45-55",
        label: "45 to 55",
        helperText: "Pre-retirement planning with balanced approach",
        riskImpact: "medium"
      },
      {
        value: "55-65",
        label: "55 to 65",
        helperText: "Near retirement with preservation focus",
        riskImpact: "low"
      },
      {
        value: "65+",
        label: "65 and above",
        helperText: "Retirement phase prioritizing capital preservation",
        riskImpact: "low"
      }
    ]
  },
  {
    key: "investmentHorizon",
    category: "demographics",
    title: "How long can you keep this money invested?",
    description: "Your investment timeline is crucial for determining appropriate risk levels. Longer horizons allow for more aggressive strategies.",
    type: "single-select",
    weight: 8,
    required: true,
    options: [
      {
        value: "<2 years",
        label: "Less than 2 years",
        helperText: "Focus on capital preservation and liquidity",
        riskImpact: "low"
      },
      {
        value: "2-5 years",
        label: "2 to 5 years",
        helperText: "Moderate conservative approach with some growth",
        riskImpact: "low"
      },
      {
        value: "5-10 years",
        label: "5 to 10 years",
        helperText: "Balanced growth with moderate risk tolerance",
        riskImpact: "medium"
      },
      {
        value: "10-20 years",
        label: "10 to 20 years",
        helperText: "Strong growth focus with higher risk tolerance",
        riskImpact: "high"
      },
      {
        value: "20+ years",
        label: "More than 20 years",
        helperText: "Maximum growth potential with highest risk capacity",
        riskImpact: "high"
      }
    ]
  },
  {
    key: "targetRetirementAge",
    category: "demographics",
    title: "At what age do you plan to retire?",
    description: "Your retirement timeline helps us plan appropriate asset allocation shifts over time.",
    type: "single-select",
    weight: 3,
    required: false,
    options: [
      { value: "50-55", label: "50 to 55", helperText: "Early retirement requires aggressive planning" },
      { value: "55-60", label: "55 to 60", helperText: "Moderate early retirement timeline" },
      { value: "60-65", label: "60 to 65", helperText: "Standard retirement planning horizon" },
      { value: "65-70", label: "65 to 70", helperText: "Extended working years allow more growth time" },
      { value: "70+", label: "70 and above", helperText: "Maximum time for wealth accumulation" }
    ]
  },

  // =================
  // FINANCIAL SITUATION (30% weight)
  // =================
  {
    key: "annualIncome",
    category: "financial",
    title: "What's your annual household income?",
    description: "Income level helps determine your ability to take risks and recover from potential losses.",
    type: "single-select",
    weight: 5,
    required: true,
    options: [
      { value: "<50K", label: "Less than ₹5 Lakhs", helperText: "Building financial foundation" },
      { value: "50K-1L", label: "₹5 Lakhs to ₹10 Lakhs", helperText: "Growing income with moderate capacity" },
      { value: "1L-2L", label: "₹10 Lakhs to ₹20 Lakhs", helperText: "Strong earning capacity" },
      { value: "2L-5L", label: "₹20 Lakhs to ₹50 Lakhs", helperText: "High income with substantial capacity" },
      { value: "5L+", label: "More than ₹50 Lakhs", helperText: "Very high income with maximum capacity" }
    ]
  },
  {
    key: "investmentAmount",
    category: "financial",
    title: "How much are you planning to invest initially?",
    description: "Your investment amount helps us understand the scale and importance of this portfolio to your overall finances.",
    type: "number",
    weight: 4,
    required: true,
    validationRules: {
      min: 10000,
      max: 100000000,
      step: 10000
    }
  },
  {
    key: "existingInvestments",
    category: "financial",
    title: "What's the current value of your existing investments?",
    description: "Understanding your existing portfolio helps us assess your overall financial picture and experience.",
    type: "single-select",
    weight: 3,
    required: true,
    options: [
      { value: "<1L", label: "Less than ₹1 Lakh", helperText: "Starting your investment journey" },
      { value: "1L-5L", label: "₹1 Lakh to ₹5 Lakhs", helperText: "Building investment experience" },
      { value: "5L-20L", label: "₹5 Lakhs to ₹20 Lakhs", helperText: "Established investor" },
      { value: "20L+", label: "More than ₹20 Lakhs", helperText: "Experienced investor with substantial portfolio" }
    ]
  },
  {
    key: "emergencyFundMonths",
    category: "financial",
    title: "How many months of expenses do you have saved as emergency fund?",
    description: "Emergency funds are crucial for financial stability. Inadequate emergency funds require more conservative allocations.",
    type: "single-select",
    weight: 6,
    required: true,
    options: [
      {
        value: "0-1",
        label: "0 to 1 month",
        helperText: "Emergency fund should be built before aggressive investing",
        riskImpact: "low"
      },
      {
        value: "2-3",
        label: "2 to 3 months",
        helperText: "Minimum emergency fund, some caution needed",
        riskImpact: "low"
      },
      {
        value: "4-6",
        label: "4 to 6 months",
        helperText: "Adequate emergency fund allows standard allocation",
        riskImpact: "medium"
      },
      {
        value: "7-12",
        label: "7 to 12 months",
        helperText: "Strong emergency buffer enables higher risk tolerance",
        riskImpact: "high"
      },
      {
        value: "12+",
        label: "More than 12 months",
        helperText: "Excellent safety net supports aggressive positioning",
        riskImpact: "high"
      }
    ]
  },
  {
    key: "dependents",
    category: "financial",
    title: "How many people depend on you financially?",
    description: "Financial dependents affect your risk capacity. More dependents typically require more conservative approaches.",
    type: "single-select",
    weight: 4,
    required: true,
    options: [
      { value: "0", label: "No dependents", helperText: "Maximum flexibility in risk-taking" },
      { value: "1-2", label: "1 to 2 dependents", helperText: "Moderate responsibility requiring some caution" },
      { value: "3-4", label: "3 to 4 dependents", helperText: "Significant responsibility suggesting conservative approach" },
      { value: "5+", label: "5 or more dependents", helperText: "High responsibility requiring careful risk management" }
    ]
  },
  {
    key: "monthlyObligations",
    category: "financial",
    title: "What are your total monthly financial obligations (EMIs, rent, etc.)?",
    description: "High monthly obligations reduce your capacity to handle investment volatility and losses.",
    type: "single-select",
    weight: 3,
    required: true,
    options: [
      { value: "<10K", label: "Less than ₹10,000", helperText: "Low obligations allow higher risk tolerance" },
      { value: "10K-25K", label: "₹10,000 to ₹25,000", helperText: "Moderate obligations with balanced approach" },
      { value: "25K-50K", label: "₹25,000 to ₹50,000", helperText: "Higher obligations requiring more stability" },
      { value: "50K+", label: "More than ₹50,000", helperText: "High obligations necessitate conservative approach" }
    ]
  },
  {
    key: "jobStability",
    category: "financial",
    title: "How would you describe your job/income stability?",
    description: "Income stability affects your ability to handle market volatility and continue investing during downturns.",
    type: "single-select",
    weight: 5,
    required: true,
    options: [
      {
        value: "very_stable",
        label: "Very stable (Government job, large corporation)",
        helperText: "Stable income supports higher risk tolerance",
        riskImpact: "high"
      },
      {
        value: "somewhat_stable",
        label: "Somewhat stable (Regular employment, some variability)",
        helperText: "Moderate stability allows balanced approach",
        riskImpact: "medium"
      },
      {
        value: "not_stable",
        label: "Not stable (Freelance, business, variable income)",
        helperText: "Variable income requires conservative positioning",
        riskImpact: "low"
      }
    ]
  },

  // =================
  // RISK TOLERANCE (25% weight)
  // =================
  {
    key: "volatilityComfort",
    category: "risk",
    title: "If your investment dropped 30% in a year, how would you react?",
    description: "This measures your psychological tolerance for investment volatility - a key factor in successful long-term investing.",
    type: "single-select",
    weight: 10,
    required: true,
    options: [
      {
        value: "panic_sell",
        label: "Panic and sell immediately",
        helperText: "Very conservative allocation needed",
        riskImpact: "low"
      },
      {
        value: "very_uncomfortable",
        label: "Feel very uncomfortable but hold",
        helperText: "Conservative allocation with limited equity",
        riskImpact: "low"
      },
      {
        value: "somewhat_concerned",
        label: "Feel somewhat concerned but stay invested",
        helperText: "Moderate allocation with balanced approach",
        riskImpact: "medium"
      },
      {
        value: "stay_calm",
        label: "Stay calm and continue investing",
        helperText: "Higher equity allocation appropriate",
        riskImpact: "high"
      },
      {
        value: "buy_more",
        label: "See it as opportunity to buy more",
        helperText: "Aggressive allocation with maximum equity",
        riskImpact: "high"
      }
    ]
  },
  {
    key: "maxAcceptableLoss",
    category: "risk",
    title: "What's the maximum loss you'd accept in your worst year?",
    description: "Understanding your loss tolerance helps set appropriate risk limits for your portfolio.",
    type: "single-select",
    weight: 6,
    required: true,
    options: [
      {
        value: "5%",
        label: "5% loss maximum",
        helperText: "Very conservative with capital preservation focus",
        riskImpact: "low"
      },
      {
        value: "10%",
        label: "10% loss maximum",
        helperText: "Conservative with some growth potential",
        riskImpact: "low"
      },
      {
        value: "20%",
        label: "20% loss maximum",
        helperText: "Moderate risk tolerance with balanced approach",
        riskImpact: "medium"
      },
      {
        value: "30%",
        label: "30% loss maximum",
        helperText: "Good risk tolerance for higher equity exposure",
        riskImpact: "high"
      },
      {
        value: "40%+",
        label: "40%+ loss acceptable",
        helperText: "High risk tolerance enabling aggressive strategies",
        riskImpact: "high"
      }
    ]
  },
  {
    key: "investmentKnowledge",
    category: "risk",
    title: "How would you rate your investment knowledge?",
    description: "Your investment experience affects the types of assets and strategies appropriate for your portfolio.",
    type: "single-select",
    weight: 4,
    required: true,
    options: [
      {
        value: "beginner",
        label: "Beginner (Limited investment experience)",
        helperText: "Focus on simple, diversified funds",
        riskImpact: "low"
      },
      {
        value: "some_knowledge",
        label: "Some knowledge (Basic understanding of investments)",
        helperText: "Balanced mix of funds and some direct equity",
        riskImpact: "medium"
      },
      {
        value: "experienced",
        label: "Experienced (Good understanding, active investor)",
        helperText: "Can handle more complex strategies and direct equity",
        riskImpact: "high"
      },
      {
        value: "expert",
        label: "Expert (Deep knowledge, sophisticated strategies)",
        helperText: "Suitable for advanced strategies and higher equity allocation",
        riskImpact: "high"
      }
    ]
  },
  {
    key: "previousLosses",
    category: "risk",
    title: "Have you experienced major investment losses before?",
    description: "Past experience with losses helps gauge your practical (vs theoretical) risk tolerance.",
    type: "single-select",
    weight: 3,
    required: true,
    options: [
      {
        value: "never_invested",
        label: "Never invested before",
        helperText: "Starting conservatively is wise",
        riskImpact: "low"
      },
      {
        value: "no_major_losses",
        label: "No major losses experienced",
        helperText: "Untested risk tolerance, moderate approach",
        riskImpact: "medium"
      },
      {
        value: "some_losses_learned",
        label: "Some losses, learned from experience",
        helperText: "Experienced with volatility, can handle higher risk",
        riskImpact: "high"
      },
      {
        value: "major_losses_still_investing",
        label: "Major losses but still investing",
        helperText: "Battle-tested investor with proven risk tolerance",
        riskImpact: "high"
      }
    ]
  },

  // =================
  // GOALS & OBJECTIVES (20% weight)
  // =================
  {
    key: "primaryGoal",
    category: "goals",
    title: "What's your primary investment goal?",
    description: "Your investment objective determines the overall strategy and asset allocation approach.",
    type: "single-select",
    weight: 8,
    required: true,
    options: [
      {
        value: "retirement",
        label: "Retirement planning",
        helperText: "Balanced approach with time-based risk reduction"
      },
      {
        value: "wealth_building",
        label: "Long-term wealth building",
        helperText: "Growth-focused strategy with higher equity"
      },
      {
        value: "income_generation",
        label: "Regular income generation",
        helperText: "Focus on dividend and debt instruments"
      },
      {
        value: "child_education",
        label: "Child's education funding",
        helperText: "Time-bound goal with preservation near target"
      },
      {
        value: "home_purchase",
        label: "Home purchase",
        helperText: "Capital preservation with liquidity focus"
      },
      {
        value: "preservation",
        label: "Capital preservation",
        helperText: "Conservative approach prioritizing safety"
      }
    ]
  },
  {
    key: "expectedReturn",
    category: "goals",
    title: "What annual return do you expect from your investments?",
    description: "Return expectations should align with risk tolerance. Higher expected returns require higher risk acceptance.",
    type: "single-select",
    weight: 4,
    required: true,
    options: [
      { value: "5-8%", label: "5% to 8% per year", helperText: "Conservative expectations, lower risk" },
      { value: "8-12%", label: "8% to 12% per year", helperText: "Moderate expectations, balanced risk" },
      { value: "12-15%", label: "12% to 15% per year", helperText: "Growth expectations, higher risk needed" },
      { value: "15-20%", label: "15% to 20% per year", helperText: "Aggressive expectations, high risk required" },
      { value: "20%+", label: "More than 20% per year", helperText: "Very aggressive expectations, maximum risk" }
    ]
  },
  {
    key: "liquidityNeeds",
    category: "goals",
    title: "How often might you need to withdraw money?",
    description: "Liquidity needs affect asset allocation. Frequent withdrawals require more liquid investments.",
    type: "single-select",
    weight: 4,
    required: true,
    options: [
      { value: "never", label: "Never (long-term investment)", helperText: "Maximum growth potential" },
      { value: "once_year", label: "Once a year or less", helperText: "Minimal impact on allocation" },
      { value: "few_times_year", label: "Few times a year", helperText: "Some liquid allocation needed" },
      { value: "monthly", label: "Monthly withdrawals", helperText: "Significant liquid allocation required" },
      { value: "frequently", label: "Very frequently", helperText: "High liquidity focus needed" }
    ]
  },
  {
    key: "esgPreference",
    category: "goals",
    title: "How important are Environmental, Social & Governance (ESG) factors?",
    description: "ESG preferences can influence fund selection and allocation strategies.",
    type: "single-select",
    weight: 2,
    required: false,
    options: [
      { value: "no_preference", label: "No specific preference", helperText: "Focus purely on returns" },
      { value: "some_esg", label: "Some ESG consideration", helperText: "ESG factors as tie-breaker" },
      { value: "strong_esg", label: "Strong ESG focus", helperText: "ESG-focused funds preferred" },
      { value: "impact_only", label: "Impact investing only", helperText: "Only ESG/impact investments" }
    ]
  },

  // =================
  // ADDITIONAL CONTEXT
  // =================
  {
    key: "withdrawalNext2Years",
    category: "context",
    title: "Do you anticipate any major withdrawals in the next 2 years?",
    description: "Near-term withdrawal needs require more conservative positioning and higher liquidity.",
    type: "boolean",
    weight: 3,
    required: true
  },
  {
    key: "hasInsurance",
    category: "context",
    title: "Do you have adequate life and health insurance coverage?",
    description: "Adequate insurance coverage allows for more aggressive investment strategies.",
    type: "boolean",
    weight: 2,
    required: true
  },
  {
    key: "avoidAssets",
    category: "context",
    title: "Are there any asset classes you want to avoid?",
    description: "Asset preferences help customize your allocation. Avoided assets will be redistributed to other categories.",
    type: "multi-select",
    weight: 1,
    required: false,
    options: [
      { value: "Stocks", label: "Direct Stocks", helperText: "Avoid individual stock picking" },
      { value: "Mutual Funds", label: "Mutual Funds", helperText: "Prefer direct investments" },
      { value: "Gold", label: "Gold", helperText: "No precious metals exposure" },
      { value: "Real Estate", label: "Real Estate", helperText: "Avoid property investments" }
    ]
  }
];

// Helper functions for questionnaire logic
export function getQuestionsByCategory(category: string): Question[] {
  return enhancedQuestions.filter(q => q.category === category);
}

export function getRequiredQuestions(): Question[] {
  return enhancedQuestions.filter(q => q.required);
}

export function calculateProgress(answers: Record<string, any>): number {
  const totalWeight = enhancedQuestions.reduce((sum, q) => sum + q.weight, 0);
  const answeredWeight = enhancedQuestions
    .filter(q => answers[q.key] !== undefined && answers[q.key] !== null && answers[q.key] !== "")
    .reduce((sum, q) => sum + q.weight, 0);
  
  return Math.round((answeredWeight / totalWeight) * 100);
}

export function getNextUnansweredQuestion(answers: Record<string, any>): Question | null {
  return enhancedQuestions.find(q => 
    q.required && 
    (answers[q.key] === undefined || answers[q.key] === null || answers[q.key] === "")
  ) || null;
}

export function validateAnswers(answers: Record<string, any>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  enhancedQuestions.forEach(question => {
    const value = answers[question.key];
    
    // Check required fields
    if (question.required && (value === undefined || value === null || value === "")) {
      errors.push(`${question.title} is required`);
      return;
    }
    
    // Validate number fields
    if (question.type === "number" && question.validationRules && value !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push(`${question.title} must be a valid number`);
      } else {
        if (question.validationRules.min !== undefined && numValue < question.validationRules.min) {
          errors.push(`${question.title} must be at least ${question.validationRules.min.toLocaleString()}`);
        }
        if (question.validationRules.max !== undefined && numValue > question.validationRules.max) {
          errors.push(`${question.title} must be at most ${question.validationRules.max.toLocaleString()}`);
        }
      }
    }
    
    // Validate single-select fields
    if (question.type === "single-select" && question.options && value !== undefined) {
      const validValues = question.options.map(opt => opt.value);
      if (!validValues.includes(value)) {
        errors.push(`${question.title} has an invalid value`);
      }
    }
    
    // Validate multi-select fields
    if (question.type === "multi-select" && question.options && value !== undefined) {
      const validValues = question.options.map(opt => opt.value);
      if (Array.isArray(value)) {
        const invalidValues = value.filter(v => !validValues.includes(v));
        if (invalidValues.length > 0) {
          errors.push(`${question.title} contains invalid values: ${invalidValues.join(", ")}`);
        }
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Category information for UI organization
export const questionCategories = {
  demographics: {
    title: "About You",
    description: "Basic information about your age and investment timeline",
    icon: "👤",
    weight: 25
  },
  financial: {
    title: "Financial Situation", 
    description: "Your current financial position and obligations",
    icon: "💰",
    weight: 30
  },
  risk: {
    title: "Risk Profile",
    description: "Your comfort level with investment volatility and losses",
    icon: "📊",
    weight: 25
  },
  goals: {
    title: "Investment Goals",
    description: "Your objectives and expectations from investing",
    icon: "🎯",
    weight: 20
  },
  context: {
    title: "Additional Context",
    description: "Other factors that influence your investment strategy",
    icon: "⚙️",
    weight: 5
  }
};