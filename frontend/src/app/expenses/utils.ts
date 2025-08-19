import type { ExpenseCategory } from "../store";

const keywordToCategory: Record<string, ExpenseCategory> = {
	lunch: "Food",
	dinner: "Food",
	breakfast: "Food",
	uber: "Travel",
	ride: "Travel",
	fuel: "Fuel",
	petrol: "Fuel",
	medical: "Health",
	medicine: "Health",
	grocery: "Groceries",
	ram: "Bills",
	rent: "Bills",
	bill: "Bills",
};

function escapeRegex(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWord(lower: string, kw: string) {
	const pattern = new RegExp(`\\b${escapeRegex(kw.toLowerCase())}\\b`);
	return pattern.test(lower);
}

export function parseExpenseInput(input: string): { amount?: number; category?: ExpenseCategory | string; note?: string } {
	const text = input.trim();
	if (!text) return {};
	const numMatch = text.match(/(?<!\w)(\d+(?:\.\d+)?)(?!\w)/);
	const amount = numMatch ? parseFloat(numMatch[1]) : undefined;
	const lower = text.toLowerCase();
	let category: ExpenseCategory | string | undefined;
	for (const [kw, cat] of Object.entries(keywordToCategory)) {
		if (hasWord(lower, kw)) { category = cat; break; }
	}
	const note = text.replace(numMatch?.[0] || "", "").trim();
	return { amount, category, note };
}

export function parseMultipleExpenses(input: string): Array<{ raw: string; amount?: number; category?: ExpenseCategory | string; note?: string }> {
	const parts = input.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
	return parts.map(raw => ({ raw, ...parseExpenseInput(raw) }));
}

export function suggestCategory(input: string, memory: Record<string, string>): string | undefined {
	const lower = input.toLowerCase();
	// Rules-first
	for (const [kw, cat] of Object.entries(keywordToCategory)) {
		if (hasWord(lower, kw)) return cat;
	}
	// Then local memory mapping
	for (const [kw, cat] of Object.entries(memory)) {
		if (hasWord(lower, kw)) return cat;
	}
	return undefined; // AI (Groq) would come after this
}