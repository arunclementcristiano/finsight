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

export function parseExpenseInput(input: string): { amount?: number; category?: ExpenseCategory | string; note?: string } {
	const text = input.trim();
	if (!text) return {};
	const numMatch = text.match(/(?<!\w)(\d+(?:\.\d+)?)(?!\w)/);
	const amount = numMatch ? parseFloat(numMatch[1]) : undefined;
	const lower = text.toLowerCase();
	let category: ExpenseCategory | string | undefined;
	for (const [kw, cat] of Object.entries(keywordToCategory)) {
		if (lower.includes(kw)) { category = cat; break; }
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
	for (const [kw, cat] of Object.entries(memory)) {
		if (lower.includes(kw)) return cat;
	}
	for (const [kw, cat] of Object.entries(keywordToCategory)) {
		if (lower.includes(kw)) return cat;
	}
	return undefined;
}