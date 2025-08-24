import { describe, it, expect } from "vitest";
import { normalizeAnswersForEngine, stableAnswersSig, pruneQuestionnaire } from "./answersUtil";

describe('answersUtil normalization', () => {
	it('maps age and horizon', () => {
		const out = normalizeAnswersForEngine({ ageBand: '<30', horizon: '3–7 years' });
		expect(out.ageBand).toBe('18–30');
		expect(out.horizon).toBe('Medium (3–7 yrs)');
	});
	it('maps stability/liabilities/dependents', () => {
		const out = normalizeAnswersForEngine({ incomeStability: 'Very stable', liabilities: 'Heavy', dependents: 'Many' });
		expect(out.incomeStability).toBe('Stable');
		expect(out.liabilities).toBe('High');
		expect(out.dependents).toBe('3+');
	});
	it('maps volatility/knowledge', () => {
		const out = normalizeAnswersForEngine({ volatilityComfort: 'Not at all', investmentKnowledge: 'Experienced' });
		expect(out.volatilityComfort).toBe('Low');
		expect(out.investmentKnowledge).toBe('Advanced');
	});
	it('coerces arrays', () => {
		const out = normalizeAnswersForEngine({ avoidAssets: 'Gold', emphasizeAssets: 'Stocks' });
		expect(out.avoidAssets).toEqual(['Gold']);
		expect(out.emphasizeAssets).toEqual(['Stocks']);
	});
	it('stableAnswersSig sorts keys and prunes', () => {
		const sig1 = stableAnswersSig({ horizon: '3–7 years', ageBand: '<30', emphasizeAssets: ['Gold'] });
		const sig2 = stableAnswersSig({ emphasizeAssets: ['Gold'], ageBand: '<30', horizon: '3–7 years' });
		expect(sig1).toBe(sig2);
		const p = pruneQuestionnaire({ foo: 1, ageBand: '<30', avoidAssets: 'Gold' });
		expect(p.ageBand).toBe('<30');
		expect(p.avoidAssets).toEqual(['Gold']);
	});
});