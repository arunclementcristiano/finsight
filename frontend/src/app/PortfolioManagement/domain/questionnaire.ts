export const questions = [
  {
    key: "horizon",
    text: "What is your investment time horizon?",
    options: ["Short (<3 yrs)", "Medium (3–7 yrs)", "Long (>7 yrs)"],
    helperText: "Longer horizons can support more equity exposure; shorter horizons favor defensive assets."
  },
  {
    key: "bigExpenseTimeline",
    text: "Any big planned expense?",
    options: ["None", "<12 months", "12–36 months", ">36 months"],
    helperText: "Near-term expenses increase the recommended Liquid/short-duration allocation."
  },
  {
    key: "emergencyFundMonthsTarget",
    text: "Emergency fund target (months of expenses)?",
    options: ["3", "6", "9", "12"],
    helperText: "Sets a minimum Liquid allocation as your safety buffer."
  },
  {
    key: "liquidityPreference",
    text: "What is your liquidity preference?",
    options: ["High", "Medium", "Low"],
    helperText: "Higher liquidity preference means a larger cash/buffer allocation."
  },
  {
    key: "incomeVsExpenses",
    text: "How would you describe your income vs expenses?",
    options: ["Surplus", "Break-even", "Deficit"],
    helperText: "A consistent surplus can support growth assets; deficits call for more defensive mix."
  },
  {
    key: "ageBand",
    text: "What is your age band?",
    options: ["18–30", "31–45", "46–60", "60+"],
    helperText: "Used as a proxy for risk capacity alongside horizon."
  },
  {
    key: "riskAppetite",
    text: "What is your risk appetite?",
    options: ["Low", "Moderate", "High"],
    helperText: "Your comfort with risk influences the core equity/defensive split."
  },
  {
    key: "volatilityComfort",
    text: "How comfortable are you with market volatility?",
    options: ["Low", "Medium", "High"],
    helperText: "Higher comfort tolerates larger swings and allows wider rebalancing ranges."
  },
  {
    key: "maxDrawdownTolerance",
    text: "What max portfolio drawdown can you tolerate?",
    options: ["5%", "10%", "20%", "30%+"],
    helperText: "Helps calibrate risk and the width of the target ranges."
  },
  {
    key: "investmentKnowledge",
    text: "What is your investment knowledge level?",
    options: ["Beginner", "Intermediate", "Advanced"],
    helperText: "More knowledge tilts equity towards direct Stocks versus Mutual Funds."
  },
  {
    key: "preferredAssets",
    text: "Which assets do you prefer?",
    options: ["Stocks", "Mutual Funds", "Gold", "Real Estate", "Debt"],
    helperText: "Pick the asset classes you genuinely want to hold. Leaving this broad keeps diversification.",
    maxSelect: 4
  },
  
];