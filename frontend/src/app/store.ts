"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AllocationPlan, AssetClass } from "./PortfolioManagement/domain/allocationEngine";

export interface UserProfile {
	name?: string;
	currency?: string;
}

export interface Holding {
	id: string;
	instrumentClass: AssetClass;
	name: string;
	symbol?: string;
	units?: number;
	price?: number;
	investedAmount?: number;
	currentValue?: number;
}

export type ExpenseCategory = "Food" | "Travel" | "Bills" | "Shopping" | "Entertainment" | "Health" | "Groceries" | "Fuel" | "Utilities" | "Healthcare" | "Other";

export interface Expense {
	id: string;
	text: string; // original input or description
	amount: number;
	category: ExpenseCategory | string;
	date: string; // ISO string
	createdAt?: string; // ISO timestamp, used for sorting, not shown
	note?: string;
}

interface AppState {
	profile: UserProfile;
	questionnaire: Record<string, any>;
	plan: AllocationPlan | null;
	holdings: Holding[];
	driftTolerancePct: number;
	emergencyMonths: number;

	expenses: Expense[];
	categoryMemory: Record<string, ExpenseCategory | string>; // keyword -> category
	expenseReminderDaily: boolean;

	setProfile: (profile: Partial<UserProfile>) => void;
	setQuestionAnswer: (key: string, value: any) => void;
	setQuestionnaire: (q: Record<string, any>) => void;
	setPlan: (plan: AllocationPlan | null) => void;
	addHolding: (h: Holding) => void;
	updateHolding: (id: string, updates: Partial<Holding>) => void;
	deleteHolding: (id: string) => void;
	setDriftTolerancePct: (v: number) => void;
	setEmergencyMonths: (v: number) => void;
	reset: () => void;

	addExpense: (e: Expense) => void;
	setExpenses: (e: Expense[]) => void;
	updateExpense: (id: string, updates: Partial<Expense>) => void;
	deleteExpense: (id: string) => void;
	rememberCategory: (keyword: string, category: ExpenseCategory | string) => void;
	setExpenseReminderDaily: (enabled: boolean) => void;
}

export const useApp = create<AppState>()(
	persist(
		(set, get) => ({
			profile: { name: "", currency: "INR" },
			questionnaire: { preferredAssets: [] },
			plan: null,
			holdings: [],
			driftTolerancePct: 5,
			emergencyMonths: 6,

			expenses: [],
			categoryMemory: {},
			expenseReminderDaily: false,

			setProfile: (profile) => set(state => ({ profile: { ...state.profile, ...profile } })),
			setQuestionAnswer: (key, value) => set(state => ({ questionnaire: { ...state.questionnaire, [key]: value } })),
			setQuestionnaire: (q) => set(() => ({ questionnaire: { ...q } })),
			setPlan: (plan) => set(() => ({ plan })),
			addHolding: (h) => set(state => ({ holdings: [...state.holdings, h] })),
			updateHolding: (id, updates) => set(state => ({ holdings: state.holdings.map(h => (h.id === id ? { ...h, ...updates } : h)) })),
			deleteHolding: (id) => set(state => ({ holdings: state.holdings.filter(h => h.id !== id) })),
			setDriftTolerancePct: (v) => set(() => ({ driftTolerancePct: Math.min(10, Math.max(3, Math.round(v))) })),
			setEmergencyMonths: (v) => set(() => ({ emergencyMonths: Math.min(12, Math.max(3, Math.round(v))) })),
			reset: () => set(() => ({ profile: { name: "", currency: "INR" }, questionnaire: { preferredAssets: [] }, plan: null, holdings: [], driftTolerancePct: 5, emergencyMonths: 6, expenses: [], categoryMemory: {}, expenseReminderDaily: false })),

			addExpense: (e) => set(state => ({ expenses: [e, ...state.expenses] })),
			setExpenses: (e) => set(() => ({ expenses: [...e] })),
			updateExpense: (id, updates) => set(state => ({ expenses: state.expenses.map(ex => (ex.id === id ? { ...ex, ...updates } : ex)) })),
			deleteExpense: (id) => set(state => ({ expenses: state.expenses.filter(ex => ex.id !== id) })),
			rememberCategory: (keyword, category) => set(state => ({ categoryMemory: { ...state.categoryMemory, [keyword.toLowerCase()]: category } })),
			setExpenseReminderDaily: (enabled) => set(() => ({ expenseReminderDaily: !!enabled })),
		}),
		{
			name: "finsight-v1",
			storage: createJSONStorage(() => localStorage),
		}
	)
);