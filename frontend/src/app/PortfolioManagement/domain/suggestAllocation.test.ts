import { describe, it, expect } from 'vitest';
import { suggestAllocation, Answers } from './suggestAllocation';

function baseAnswers(overrides: Partial<Answers> = {}): Answers {
  return {
    horizon: "Medium (3–7 yrs)",
    emergencyFundMonthsTarget: "6",
    liquidityPreference: "Medium",
    incomeVsExpenses: "Surplus",
    ageBand: "31–45",
    riskAppetite: "Moderate",
    volatilityComfort: "Medium",
    maxDrawdownTolerance: "20%",
    investmentKnowledge: "Intermediate",
    avoidAssets: [],
    emphasizeAssets: [],
    ...overrides,
  };
}

function sumAll(a: Record<string, number>) {
  return a.Stocks + a["Mutual Funds"] + a.Gold + a["Real Estate"] + a.Debt + a.Liquid;
}

describe('suggestAllocation', () => {
  it('rounds to 100 always', () => {
    const out = suggestAllocation(baseAnswers());
    expect(sumAll(out)).toBe(100);
  });

  it('horizon short nudges toward debt', () => {
    const a = suggestAllocation(baseAnswers({ horizon: "Short (<3 yrs)" }));
    const b = suggestAllocation(baseAnswers({ horizon: "Long (>7 yrs)" }));
    expect(a.Debt).toBeGreaterThanOrEqual(b.Debt);
  });

  it('drawdown 5% caps equity to <=30', () => {
    const out = suggestAllocation(baseAnswers({ maxDrawdownTolerance: "5%", riskAppetite: "High", volatilityComfort: "High" }));
    expect(out.Stocks + out["Mutual Funds"]).toBeLessThanOrEqual(30);
  });

  it('liquid floor increases with months', () => {
    const a3 = suggestAllocation(baseAnswers({ emergencyFundMonthsTarget: "3" }));
    const a12 = suggestAllocation(baseAnswers({ emergencyFundMonthsTarget: "12" }));
    expect(a12.Liquid).toBeGreaterThanOrEqual(a3.Liquid);
  });

  it('avoid gold sets gold to 0 and redistributes', () => {
    const out = suggestAllocation(baseAnswers({ avoidAssets: ["Gold"] }));
    expect(out.Gold).toBe(0);
    expect(sumAll(out)).toBe(100);
  });

  it('emphasize two assets increases them within bounds', () => {
    const out = suggestAllocation(baseAnswers({ emphasizeAssets: ["Stocks", "Gold"] }));
    expect(out.Stocks).toBeGreaterThan(0);
    expect(out.Gold).toBeGreaterThan(0);
    expect(sumAll(out)).toBe(100);
  });

  it('knowledge split: beginner has more in Mutual Funds than advanced', () => {
    const beg = suggestAllocation(baseAnswers({ investmentKnowledge: "Beginner" }));
    const adv = suggestAllocation(baseAnswers({ investmentKnowledge: "Advanced" }));
    expect(beg["Mutual Funds"]).toBeGreaterThan(adv["Mutual Funds"]);
  });
});

