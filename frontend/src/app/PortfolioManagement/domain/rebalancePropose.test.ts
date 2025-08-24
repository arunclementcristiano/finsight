import { describe, it, expect } from "vitest";
import { blendGoalTargets, normalizeTo100Ints, applyLiquidFloor } from "./rebalancePropose";

describe('rebalancePropose helpers', () => {
	it('normalizeTo100Ints scales and rounds to integers', () => {
		const out = normalizeTo100Ints({ A: 33.3, B: 33.3, C: 33.3 });
		expect(Object.values(out).reduce((s,v)=> s+v, 0)).toBe(100);
	});

	it('applyLiquidFloor raises Liquid to floor', () => {
		const out = applyLiquidFloor({ Stocks: 60, "Mutual Funds": 20, Liquid: 1, Debt: 19 }, 0, 0);
		expect(out.Liquid).toBeGreaterThanOrEqual(5);
		expect(Object.values(out).reduce((s,v)=> s+v, 0)).toBe(100);
	});

	it('blendGoalTargets returns null for no goals', () => {
		const out = blendGoalTargets([], 'Moderate', { efMonths: 6 });
		expect(out).toBeNull();
	});

	it('blendGoalTargets blends two goals with weights', () => {
		const goals = [
			{ goal: { targetDate: new Date(Date.now() + 365*24*3600*1000).toISOString(), targetAmount: 100000, priority: 'High' } },
			{ goal: { targetDate: new Date(Date.now() + 9*365*24*3600*1000).toISOString(), targetAmount: 50000, priority: 'Low' } },
		];
		const out = blendGoalTargets(goals as any, 'Moderate', { efMonths: 6 })!;
		expect(out).not.toBeNull();
		expect(Object.values(out).reduce((s,v)=> s+v, 0)).toBe(100);
	});
});