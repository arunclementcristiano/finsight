import type { ExpenseCategory } from "../store";

// Predefined rules (rules-first)
const keywordToCategory: Record<string, ExpenseCategory | string> = {
	// Food
	groceries: "Food",
	grocery: "Food",
	restaurant: "Food",
	dining: "Food",
	lunch: "Food",
	dinner: "Food",
	pizza: "Food",
	breakfast: "Food",
	snacks: "Food",
	coffee: "Food",
	swiggy: "Food",
	zomato: "Food",
	ubereats: "Food",
	// Travel
	travel: "Travel",	transport: "Travel",	taxi: "Travel",	uber: "Travel",	ola: "Travel",	bus: "Travel",
	train: "Travel",	flight: "Travel",	airline: "Travel",	fuel: "Travel",	petrol: "Travel",	gas: "Travel",
	// Entertainment
	entertainment: "Entertainment",	cinema: "Entertainment",	netflix: "Entertainment",	movie: "Entertainment",	movies: "Entertainment",	tv: "Entertainment",
	hotstar: "Entertainment",	sunnxt: "Entertainment",	spotify: "Entertainment",	prime: "Entertainment",
	disney: "Entertainment",	playstation: "Entertainment",	xbox: "Entertainment",
	// Shopping
	shopping: "Shopping",	amazon: "Shopping",	flipkart: "Shopping",	myntra: "Shopping",	apparel: "Shopping",
	clothing: "Shopping",	mall: "Shopping",	electronics: "Shopping",	gadget: "Shopping",
	// Utilities
	utilities: "Utilities",	electricity: "Utilities",	water: "Utilities",	internet: "Utilities",	broadband: "Utilities",
	jio: "Utilities",	airtel: "Utilities",	bsnl: "Utilities",	bill: "Utilities",
	// Healthcare
	health: "Healthcare",	healthcare: "Healthcare",	medicine: "Healthcare",	hospital: "Healthcare",	doctor: "Healthcare",
	pharmacy: "Healthcare",	apollo: "Healthcare",	pharmeasy: "Healthcare",	practo: "Healthcare",
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
		if (hasWord(lower, kw)) return cat as string;
	}
	// Then local memory mapping
	for (const [kw, cat] of Object.entries(memory)) {
		if (hasWord(lower, kw)) return cat;
	}
	return undefined; // AI (Groq) would come after this
}

export { keywordToCategory };