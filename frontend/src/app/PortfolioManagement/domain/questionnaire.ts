export const questions = [
  {
    key: "horizon",
    text: "What is your investment time horizon?",
    options: ["Short (<3 yrs)", "Medium (3–7 yrs)", "Long (>7 yrs)"]
  },
  {
    key: "riskAppetite",
    text: "What is your risk appetite?",
    options: ["Low", "Moderate", "High"]
  },
  {
    key: "incomeVsExpenses",
    text: "How would you describe your income vs expenses?",
    options: ["Surplus", "Break-even", "Deficit"]
  },
  {
    key: "investmentKnowledge",
    text: "What is your investment knowledge level?",
    options: ["Beginner", "Intermediate", "Advanced"]
  },
  {
    key: "volatilityComfort",
    text: "How comfortable are you with market volatility?",
    options: ["Low", "Medium", "High"]
  },
  {
    key: "preferredAssets",
    text: "Which assets do you prefer?",
    options: ["Stocks", "Mutual Funds", "Gold", "Real Estate", "Debt"],
    helperText: "Pick the asset classes you genuinely want to hold. You can skip to keep broad diversification.",
    maxSelect: 4
  },
  {
    key: "liquidityPreference",
    text: "What is your liquidity preference?",
    options: ["High", "Medium", "Low"],
    helperText: "Higher liquidity means a larger cash/buffer allocation."
  },
  // Additional high-signal questions
  { key: "ageBand", text: "What is your age band?", options: ["18–30", "31–45", "46–60", "60+"], helperText: "Helps calibrate risk capacity." },
  { key: "incomeStability", text: "How stable is your primary income?", options: ["Stable", "Variable", "Uncertain"], helperText: "Impacts defensive vs equity tilt." },
  { key: "maxDrawdownTolerance", text: "What max portfolio drawdown can you tolerate?", options: ["5%", "10%", "20%", "30%+"], helperText: "Controls risk and range widths." },
  { key: "bigExpenseTimeline", text: "Any big planned expense?", options: ["None", "<12 months", "12–36 months", ">36 months"], helperText: "Near-term expenses increase cash/short-term debt." },
  { key: "realEstateExposure", text: "Your current Real Estate exposure?", options: ["None", "Own home only", "Investment property", "Both"], helperText: "Avoids over-concentration in Real Estate." },
  { key: "intlEquityPreference", text: "Do you prefer international equity exposure?", options: ["No", "Some", "High"], helperText: "For future enhancement of equity split." },
  { key: "rebalancingComfort", text: "Rebalancing style you prefer?", options: ["Tight", "Normal", "Loose"], helperText: "Controls how wide the allowed bands are." },
  { key: "sipRegularity", text: "How regular/large are your SIPs?", options: ["Low", "Medium", "High"], helperText: "Higher SIPs allow a slightly leaner cash buffer." },
  { key: "emergencyFundMonthsTarget", text: "Emergency fund target (months of expenses)?", options: ["3", "6", "9", "12"], helperText: "Sets a minimum Liquid allocation." }
];