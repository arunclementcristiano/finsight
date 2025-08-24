import { describe, it, expect } from 'vitest';
import { normalizeAnswersForEngine } from './answersUtil';

describe('normalizeAnswersForEngine', () => {
	it('maps age and horizon correctly', () => {
		const out = normalizeAnswersForEngine({ ageBand: '<30', horizon: '<3 years' });
		expect(out.ageBand).toBe('18–30');
		expect(out.horizon).toBe('Short (<3 yrs)');
		const out2 = normalizeAnswersForEngine({ ageBand: '45–60', horizon: '7+ years' });
		expect(out2.ageBand).toBe('46–60');
		expect(out2.horizon).toBe('Long (>7 yrs)');
	});

	it('maps income stability, liabilities and dependents', () => {
		const out = normalizeAnswersForEngine({ incomeStability: 'Very stable', liabilities: 'Heavy', dependents: 'Few' });
		expect(out.incomeStability).toBe('Stable');
		expect(out.liabilities).toBe('High');
		expect(out.dependents).toBe('1');
		const out2 = normalizeAnswersForEngine({ incomeStability: 'Not stable', liabilities: 'Moderate', dependents: 'Many' });
		expect(out2.incomeStability).toBe('Unstable');
		expect(out2.liabilities).toBe('Moderate');
		expect(out2.dependents).toBe('3+');
	});

	it('maps volatility, knowledge and financial goal', () => {
		const out = normalizeAnswersForEngine({ volatilityComfort: 'Very comfortable', investmentKnowledge: 'Experienced', financialGoal: 'House purchase' });
		expect(out.volatilityComfort).toBe('High');
		expect(out.investmentKnowledge).toBe('Advanced');
		expect(out.financialGoal).toBe('Major purchase');
		const out2 = normalizeAnswersForEngine({ volatilityComfort: 'Not at all', investmentKnowledge: 'Beginner', financialGoal: 'Retirement' });
		expect(out2.volatilityComfort).toBe('Low');
		expect(out2.investmentKnowledge).toBe('Beginner');
		expect(out2.financialGoal).toBe('Retirement');
	});

	it('coerces avoid/emphasize to arrays', () => {
		const out = normalizeAnswersForEngine({ avoidAssets: 'Gold', emphasizeAssets: 'Stocks' });
		expect(Array.isArray(out.avoidAssets)).toBe(true);
		expect(out.avoidAssets).toEqual(['Gold']);
		expect(Array.isArray(out.emphasizeAssets)).toBe(true);
		expect(out.emphasizeAssets).toEqual(['Stocks']);
		const out2 = normalizeAnswersForEngine({ avoidAssets: ['Gold','Real Estate'], emphasizeAssets: ['Mutual Funds'] });
		expect(out2.avoidAssets).toEqual(['Gold','Real Estate']);
		expect(out2.emphasizeAssets).toEqual(['Mutual Funds']);
	});

	it('defaults flags when missing', () => {
		const out = normalizeAnswersForEngine({});
		expect(out.emergencyFundSixMonths).toBeDefined();
		expect(out.insuranceCoverage).toBeDefined();
	});
});