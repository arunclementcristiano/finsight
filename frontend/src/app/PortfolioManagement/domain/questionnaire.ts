interface Question {
  key: string;
  text: string;
  options?: string[];
  type?: "text" | "number";
  helperText?: string;
  maxSelect?: number;
  optional?: boolean;
}

export const questions: Question[] = [
  // Demographics & Time Horizon (25% weight)
  {
    key: "age",
    text: "What is your age?",
    options: ["<25", "25-35", "35-45", "45-55", "55-65", "65+"],
    helperText: "Age helps determine risk capacity and equity ceiling."
  },
  {
    key: "investmentHorizon",
    text: "How long can your money stay invested?",
    options: ["<2 years", "2-5 years", "5-10 years", "10-20 years", "20+ years"],
    helperText: "Longer horizons allow higher equity; shorter horizons favor defensive assets."
  },
  {
    key: "targetRetirementAge",
    text: "What is your target retirement age?",
    options: ["50-55", "55-60", "60-65", "65-70", "70+"],
    helperText: "Helps determine long-term investment strategy."
  },
  
  // Financial Situation (30% weight)
  {
    key: "annualIncome",
    text: "What is your annual income?",
    options: ["<50K", "50K-1L", "1L-2L", "2L-5L", "5L+"],
    helperText: "Income level affects risk capacity and investment amount."
  },
  {
    key: "investmentAmount",
    text: "How much are you planning to invest? (in rupees)",
    type: "number",
    helperText: "Enter the actual amount you plan to invest."
  },
  {
    key: "existingInvestments",
    text: "What is the value of your existing investments?",
    options: ["<1L", "1L-5L", "5L-20L", "20L+"],
    helperText: "Current portfolio size helps determine allocation strategy."
  },
  {
    key: "emergencyFundMonths",
    text: "How many months of emergency fund do you have?",
    options: ["0-1", "2-3", "4-6", "7-12", "12+"],
    helperText: "If less than 6 months, we'll prioritize liquid assets."
  },
  {
    key: "dependents",
    text: "How many dependents do you have?",
    options: ["0", "1-2", "3-4", "5+"],
    helperText: "More dependents generally require more safety allocation."
  },
  {
    key: "monthlyObligations",
    text: "What are your monthly financial obligations?",
    options: ["<10K", "10K-25K", "25K-50K", "50K+"],
    helperText: "Higher obligations reduce equity capacity."
  },
  
  // Geographic Context
  {
    key: "city",
    text: "Which city do you live in?",
    options: [
      "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad",
      "Gurgaon", "Noida", "Thane", "Navi Mumbai", "Ghaziabad", "Faridabad",
      "Indore", "Bhopal", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Vadodara", "Surat",
      "Varanasi", "Prayagraj", "Gorakhpur", "Bareilly", "Moradabad", "Saharanpur",
      "Other"
    ],
    helperText: "City helps determine relative income positioning and cost of living context."
  },
  
  // Risk Tolerance (25% weight)
  {
    key: "volatilityComfort",
    text: "How do you react to market volatility?",
    options: ["panic_sell", "very_uncomfortable", "somewhat_concerned", "stay_calm", "buy_more"],
    helperText: "Helps set your psychological risk tolerance."
  },
  {
    key: "maxAcceptableLoss",
    text: "What's the maximum loss you can accept?",
    options: ["5%", "10%", "20%", "30%", "40%+"],
    helperText: "Your risk capacity for portfolio declines."
  },
  {
    key: "investmentKnowledge",
    text: "What is your investment knowledge level?",
    options: ["beginner", "some_knowledge", "experienced", "expert"],
    helperText: "Your familiarity with investments."
  },
  {
    key: "previousLosses",
    text: "What's your experience with investment losses?",
    options: ["never_invested", "no_major_losses", "some_losses_learned", "major_losses_still_investing"],
    helperText: "Past experience helps determine risk tolerance."
  },
  
  // Goals & Objectives (20% weight)
  {
    key: "primaryGoal",
    text: "What is your primary investment goal?",
    options: ["retirement", "wealth_building", "income_generation", "child_education", "home_purchase", "preservation"],
    helperText: "Your main objective guides asset allocation."
  },
  {
    key: "expectedReturn",
    text: "What return do you expect from your investments?",
    options: ["5-8%", "8-12%", "12-15%", "15-20%", "20%+"],
    helperText: "Expected returns influence risk allocation."
  },
  {
    key: "liquidityNeeds",
    text: "How often do you need to access your investments?",
    options: ["never", "once_year", "few_times_year", "monthly", "frequently"],
    helperText: "Liquidity needs affect asset selection."
  },
  {
    key: "esgPreference",
    text: "Do you have ESG (Environmental, Social, Governance) preferences?",
    options: ["no_preference", "some_esg", "strong_esg", "impact_only"],
    helperText: "ESG preferences guide investment selection."
  },
  
  // Additional Context
  {
    key: "jobStability",
    text: "How stable is your job?",
    options: ["very_stable", "somewhat_stable", "not_stable"],
    helperText: "Job stability affects risk capacity."
  },
  {
    key: "withdrawalNext2Years",
    text: "Do you plan to withdraw from investments in the next 2 years?",
    options: ["Yes", "No"],
    helperText: "Near-term withdrawals require more liquid assets."
  },
  {
    key: "hasInsurance",
    text: "Do you have adequate health & life insurance?",
    options: ["Yes", "No"],
    helperText: "Insurance coverage affects risk allocation."
  },
  {
    key: "avoidAssets",
    text: "Are there any assets you want to avoid? (Optional)",
    options: ["Stocks", "Mutual Funds", "Gold", "Real Estate", "Debt", "Liquid"],
    helperText: "We will set avoided assets to 0% (safety sleeves remain).",
    maxSelect: 6,
    optional: true
  },
];