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
	// Find the first number (supports 250 or 250.50)
	const numMatch = text.match(/(?<!\w)(\d+(?:\.\d+)?)(?!\w)/);
	const amount = numMatch ? parseFloat(numMatch[1]) : undefined;
	// Infer category from keywords
	const lower = text.toLowerCase();
	let category: ExpenseCategory | string | undefined;
	for (const [kw, cat] of Object.entries(keywordToCategory)) {
		if (lower.includes(kw)) { category = cat; break; }
	}
	// Note is everything except the amount token
	const note = text.replace(numMatch?.[0] || "", "").trim();
	return { amount, category, note };
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