export const questions = [
  {
    key: "ageBand",
    text: "Age (Because younger = higher equity capacity)",
    options: ["<30", "30–45", "45–60", "60+"],
    helperText: "Age helps determine risk capacity and equity ceiling."
  },
  {
    key: "horizon",
    text: "Investment Horizon (How long can the money stay invested)",
    options: ["<3 years", "3–7 years", "7+ years"],
    helperText: "Longer horizons allow higher equity; shorter horizons favor defensive assets."
  },
  {
    key: "incomeStability",
    text: "Monthly Savings / Income Stability (Ability to absorb risks)",
    options: ["Very stable", "Somewhat stable", "Not stable"],
    helperText: "Less stable income calls for more conservative allocation."
  },
  {
    key: "liabilities",
    text: "Existing Liabilities (Loans/EMIs)",
    options: ["None", "Moderate", "Heavy"],
    helperText: "Higher liabilities reduce equity capacity."
  },
  {
    key: "dependents",
    text: "Dependents (Family responsibilities)",
    options: ["None", "Few", "Many"],
    helperText: "More dependents generally require more safety allocation."
  },
  {
    key: "volatilityComfort",
    text: "Comfort with Volatility (Psychological tolerance)",
    options: ["Very comfortable", "Somewhat", "Not at all"],
    helperText: "Helps set your risk tolerance."
  },
  {
    key: "investmentKnowledge",
    text: "Investment Knowledge",
    options: ["Beginner", "Intermediate", "Experienced"],
    helperText: "Your familiarity with investments.",
  },
  {
    key: "emergencyFundSixMonths",
    text: "Emergency Fund: Do you already have at least 6 months saved?",
    options: ["Yes", "No"],
    helperText: "If no, we raise Liquid until a six-month buffer is built."
  },
  {
    key: "insuranceCoverage",
    text: "Insurance Coverage: Do you have health & life insurance?",
    options: ["Yes", "No"],
    helperText: "If no, we reduce risky allocation and flag coverage gap."
  },
  {
    key: "taxPreference",
    text: "Tax Preference",
    options: ["Tax efficiency", "Max return"],
    helperText: "Guides product selection within buckets."
  },
  {
    key: "avoidAssets",
    text: "Ethical/Custom Constraints (Optional) — assets to avoid",
    options: ["Stocks", "Mutual Funds", "Gold", "Real Estate"],
    helperText: "We will set avoided assets to 0% (safety sleeves remain).",
    maxSelect: 4,
    optional: true
  },
];