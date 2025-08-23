export const ALLOWED_QUESTION_KEYS = [
	"ageBand",
	"horizon",
	"incomeStability",
	"liabilities",
	"dependents",
	"volatilityComfort",
	"financialGoal",
	"investmentKnowledge",
	"withdrawNext2Yrs",
	"emergencyFundSixMonths",
	"insuranceCoverage",
	"taxPreference",
	"avoidAssets",
] as const;

export function pruneQuestionnaire(q: Record<string, any> = {}): Record<string, any> {
	const out: Record<string, any> = {};
	for (const k of ALLOWED_QUESTION_KEYS as ReadonlyArray<string>) {
		if (Object.prototype.hasOwnProperty.call(q, k)) {
			if (k === 'avoidAssets') {
				const v = (q as any)[k];
				out[k] = Array.isArray(v) ? v : (typeof v === 'string' && v ? [v] : []);
			} else {
				out[k] = (q as any)[k];
			}
		}
	}
	return out;
}

export function stableAnswersSig(q: Record<string, any> = {}): string {
	const p = pruneQuestionnaire(q);
	const sorted: Record<string, any> = {};
	const keys = (ALLOWED_QUESTION_KEYS as ReadonlyArray<string>).slice().sort();
	for (const k of keys) {
		if (Object.prototype.hasOwnProperty.call(p, k)) sorted[k] = p[k];
	}
	return JSON.stringify({ q: sorted });
}