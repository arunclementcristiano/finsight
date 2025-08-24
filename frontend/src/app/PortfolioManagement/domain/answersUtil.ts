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

export function normalizeAnswersForEngine(q: Record<string, any> = {}): Record<string, any> {
	const out: Record<string, any> = {};
	// Age band mapping
	const age = String(q.ageBand||"");
	out.ageBand = age === "<30" ? "18–30" : age === "30–45" ? "31–45" : age === "45–60" ? "46–60" : "60+";
	// Horizon mapping
	const hor = String(q.horizon||"");
	if (hor.startsWith("<3")) out.horizon = "Short (<3 yrs)"; else if (hor.startsWith("3–7")) out.horizon = "Medium (3–7 yrs)"; else out.horizon = "Long (>7 yrs)";
	// Income stability
	const inc = String(q.incomeStability||"").toLowerCase();
	out.incomeStability = inc.includes("very") ? "Stable" : inc.includes("not") ? "Unstable" : "Variable";
	// Liabilities
	const liab = String(q.liabilities||"");
	out.liabilities = liab === "Heavy" ? "High" : (liab === "Moderate" || liab === "High" || liab === "Low" || liab === "None") ? liab : "None";
	// Dependents
	const dep = String(q.dependents||"None");
	out.dependents = dep === "Few" ? "1" : dep === "Many" ? "3+" : dep;
	// Volatility comfort
	const vol = String(q.volatilityComfort||"").toLowerCase();
	out.volatilityComfort = vol.includes("very") ? "High" : vol.includes("not") ? "Low" : "Medium";
	// Financial goal
	const fg = String(q.financialGoal||"Wealth growth");
	if (fg === "House purchase" || fg === "Education") out.financialGoal = "Major purchase"; else if (["Retirement","Wealth growth","Capital preservation","Income generation"].includes(fg)) out.financialGoal = fg; else out.financialGoal = "Wealth growth";
	// Knowledge
	const know = String(q.investmentKnowledge||"Intermediate");
	out.investmentKnowledge = (know === "Experienced") ? "Advanced" : (["Beginner","Intermediate","Advanced"].includes(know) ? know : "Intermediate");
	// Binary flags
	out.emergencyFundSixMonths = String(q.emergencyFundSixMonths||"Yes");
	out.insuranceCoverage = String(q.insuranceCoverage||"Yes");
	// Arrays
	const avoid = (q as any).avoidAssets;
	out.avoidAssets = Array.isArray(avoid) ? avoid : (typeof avoid === 'string' && avoid ? [avoid] : []);
	const emph = (q as any).emphasizeAssets;
	out.emphasizeAssets = Array.isArray(emph) ? emph : (typeof emph === 'string' && emph ? [emph] : []);
	return out;
}