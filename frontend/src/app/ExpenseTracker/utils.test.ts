import { describe, expect, it } from "vitest";
import { parseExpenseInput, parseMultipleExpenses, suggestCategory } from "./utils";

describe("expense input utilities", () => {
  it("extracts an amount and category from natural input", () => {
    expect(parseExpenseInput("Lunch at restaurant 250")).toMatchObject({ amount: 250, category: "Food" });
  });

  it("parses multiple expenses separated by commas or lines", () => {
    const result = parseMultipleExpenses("Uber 450, electricity bill 1200\nNetflix 499");
    expect(result).toHaveLength(3);
    expect(result.map(item => item.category)).toEqual(["Travel", "Utilities", "Subscription"]);
  });

  it("uses remembered categories after built-in rules", () => {
    expect(suggestCategory("Farmers market 300", { "farmers market": "Groceries" })).toBe("Groceries");
    expect(suggestCategory("Uber 300", { uber: "Other" })).toBe("Travel");
  });
});
