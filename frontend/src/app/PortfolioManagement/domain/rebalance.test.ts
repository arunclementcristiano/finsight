import { describe, expect, it } from "vitest";
import type { AllocationPlan } from "./allocationEngine";
import { computeRebalance } from "./rebalance";

const plan = {
  buckets: [
    { class: "Stocks", pct: 60 },
    { class: "Debt", pct: 40 },
  ],
} as AllocationPlan;

describe("computeRebalance", () => {
  it("returns no action when allocation is within tolerance", () => {
    const result = computeRebalance([
      { id: "1", name: "Equity", instrumentClass: "Stocks", currentValue: 600 },
      { id: "2", name: "Bonds", instrumentClass: "Debt", currentValue: 400 },
    ], plan, 5);
    expect(result.items).toEqual([]);
    expect(result.totalCurrentValue).toBe(1000);
  });

  it("suggests both sides of an allocation drift", () => {
    const result = computeRebalance([
      { id: "1", name: "Equity", instrumentClass: "Stocks", currentValue: 800 },
      { id: "2", name: "Bonds", instrumentClass: "Debt", currentValue: 200 },
    ], plan, 5);
    expect(result.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ class: "Stocks", action: "Reduce", amount: 200 }),
      expect.objectContaining({ class: "Debt", action: "Increase", amount: 200 }),
    ]));
  });
});
