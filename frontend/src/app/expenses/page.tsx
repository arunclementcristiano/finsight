"use client";
import React, { useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useApp, type Expense, type ExpenseCategory } from "../store";
import { parseExpenseInput, parseMultipleExpenses, suggestCategory } from "./utils";
import { Button } from "../components/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/Card";

async function groqSuggestCategoryStub(text: string): Promise<{ category?: string; confidence?: number }> {
	// Placeholder: returns undefined to keep UI path. Replace with Groq API call.
	return { category: undefined, confidence: 0 };
}

export default function ExpensesPage() {
	const { expenses, addExpense, updateExpense, deleteExpense, categoryMemory, rememberCategory, expenseReminderDaily, setExpenseReminderDaily } = useApp();
	const [input, setInput] = useState("");
	const [pending, setPending] = useState<Expense | null>(null);
	const [pendingSuggest, setPendingSuggest] = useState<{ text: string; amount?: number; aiCategory?: string; confidence?: number } | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingAmount, setEditingAmount] = useState<string>("");
	const [editingCategory, setEditingCategory] = useState<string>("");
	const inputRef = useRef<HTMLInputElement>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const entries = parseMultipleExpenses(input);
		let addedAny = false;
		for (const entry of entries) {
			const ruleOrMemCat = suggestCategory(entry.raw, categoryMemory);
			const amount = entry.amount;
			const note = entry.note || entry.raw;
			if (amount && ruleOrMemCat) {
				const exp: Expense = { id: uuidv4(), text: entry.raw, amount, category: ruleOrMemCat, date: new Date().toISOString(), note };
				addExpense(exp);
				addedAny = true;
			} else if (entries.length === 1) {
				// Try AI
				const ai = await groqSuggestCategoryStub(entry.raw);
				if (ai.category && amount) {
					setPendingSuggest({ text: entry.raw, amount, aiCategory: ai.category, confidence: ai.confidence });
				} else {
					const fallback: Expense = { id: uuidv4(), text: entry.raw, amount: amount || 0, category: "", date: new Date().toISOString(), note };
					setPending(fallback);
				}
				return;
			}
		}
		if (addedAny) {
			setInput("");
			inputRef.current?.focus();
		}
	}

	function confirmPending(amount?: number, category?: string) {
		if (!pending) return;
		const final: Expense = { ...pending, amount: amount ?? pending.amount, category: category ?? pending.category };
		addExpense(final);
		if (category) {
			const keyword = (pending.text || "").split(" ")[0] || category;
			rememberCategory(keyword.toLowerCase(), category);
		}
		setPending(null);
		setInput("");
		inputRef.current?.focus();
	}

	function acceptAISuggestion() {
		if (!pendingSuggest) return;
		const { text, amount, aiCategory } = pendingSuggest;
		if (!amount || !aiCategory) return;
		const exp: Expense = { id: uuidv4(), text, amount, category: aiCategory, date: new Date().toISOString(), note: text };
		addExpense(exp);
		rememberCategory(text.split(" ")[0].toLowerCase(), aiCategory);
		setPendingSuggest(null);
		setInput("");
		inputRef.current?.focus();
	}

	function rejectAISuggestion() {
		// fallback to manual selection
		if (!pendingSuggest) return;
		const fallback: Expense = { id: uuidv4(), text: pendingSuggest.text, amount: pendingSuggest.amount || 0, category: "", date: new Date().toISOString(), note: pendingSuggest.text };
		setPendingSuggest(null);
		setPending(fallback);
	}

	function startEdit(e: Expense) {
		setEditingId(e.id);
		setEditingAmount(e.amount.toString());
		setEditingCategory(e.category.toString());
	}
	function saveEdit(id: string) {
		const amt = parseFloat(editingAmount);
		if (!Number.isFinite(amt)) return;
		updateExpense(id, { amount: amt, category: editingCategory });
		setEditingId(null);
	}
	function confirmDelete(id: string) {
		if (confirm("Delete this expense?")) deleteExpense(id);
	}

	const monthlySummary = useMemo(() => {
		const map = new Map<string, number>();
		for (const e of expenses) {
			const month = e.date.slice(0, 7);
			map.set(month, (map.get(month) || 0) + e.amount);
		}
		return Array.from(map.entries()).sort((a, b) => a[0] < b[0] ? 1 : -1);
	}, [expenses]);

	const categorySummary = useMemo(() => {
		const map = new Map<string, number>();
		for (const e of expenses) {
			map.set(e.category, (map.get(e.category) || 0) + e.amount);
		}
		return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
	}, [expenses]);

	return (
		<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
			<div className="xl:col-span-2 space-y-4">
				<Card>
					<CardHeader>
						<CardTitle>Log Expense (Chat)</CardTitle>
						<CardDescription>Type like "Lunch 250, Uber 120". We'll apply rules first, then your saved mappings, then AI if needed.</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="flex gap-2">
							<input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 h-11 rounded-xl border border-border px-3 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]" placeholder="e.g., Lunch 250, Uber 120" />
							<Button type="submit">Add</Button>
						</form>
						{pendingSuggest ? (
							<div className="mt-3 rounded-xl border border-border p-3 text-sm">
								<p className="mb-2">AI suggests category <span className="font-semibold">{pendingSuggest.aiCategory}</span> {pendingSuggest.confidence ? `(confidence ${Math.round((pendingSuggest.confidence||0)*100)}%)` : ""}. Accept?</p>
								<div className="flex gap-2">
									<Button onClick={acceptAISuggestion}>Accept</Button>
									<Button variant="outline" onClick={rejectAISuggestion}>Change</Button>
								</div>
							</div>
						) : null}
						{pending ? (
							<div className="mt-3 rounded-xl border border-border p-3 text-sm">
								<p className="text-muted-foreground mb-2">Missing info. Please confirm:</p>
								<div className="flex flex-wrap gap-2 items-center">
									{pending.amount ? <span className="rounded-md bg-muted px-2 py-1">Amount: {pending.amount}</span> : (
										<input type="number" step="0.01" placeholder="Amount" className="h-9 rounded-md border border-border px-2 bg-card" onBlur={(e) => confirmPending(parseFloat(e.target.value) || undefined, undefined)} />
									)}
									{pending.category ? <span className="rounded-md bg-muted px-2 py-1">Category: {pending.category}</span> : (
										<select defaultValue="" className="h-9 rounded-md border border-border px-2 bg-card" onChange={(e) => confirmPending(undefined, e.target.value)}>
											<option value="" disabled>Pick category</option>
											{["Food","Travel","Bills","Shopping","Entertainment","Health","Groceries","Fuel","Utilities","Healthcare","Other"].map(c => (<option key={c} value={c}>{c}</option>))}
										</select>
									)}
									<Button variant="outline" onClick={() => setPending(null)}>Cancel</Button>
								</div>
							</div>
						) : null}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Recent Expenses</CardTitle>
						<CardDescription>Edit or delete entries</CardDescription>
					</CardHeader>
					<CardContent>
						<table className="w-full text-left border rounded-xl overflow-hidden border-border text-sm">
							<thead className="bg-card">
								<tr>
									<th className="px-3 py-2 border-b">When</th>
									<th className="px-3 py-2 border-b">Text</th>
									<th className="px-3 py-2 border-b">Category</th>
									<th className="px-3 py-2 border-b text-right">Amount</th>
									<th className="px-3 py-2 border-b">Actions</th>
								</tr>
							</thead>
							<tbody>
								{expenses.map(e => (
									<tr key={e.id} className="border-b align-top">
										<td className="px-3 py-2">{new Date(e.date).toLocaleString()}</td>
										<td className="px-3 py-2">{e.text}</td>
										<td className="px-3 py-2">
											{editingId === e.id ? (
												<select value={editingCategory} onChange={(ev) => setEditingCategory(ev.target.value)} className="h-9 rounded-md border border-border px-2 bg-card">
													{["Food","Travel","Bills","Shopping","Entertainment","Health","Groceries","Fuel","Utilities","Healthcare","Other"].map(c => (<option key={c} value={c}>{c}</option>))}
												</select>
											) : e.category}
										</td>
										<td className="px-3 py-2 text-right">
											{editingId === e.id ? (
												<input type="number" step="0.01" value={editingAmount} onChange={(ev) => setEditingAmount(ev.target.value)} className="h-9 w-24 rounded-md border border-border px-2 bg-card text-right" />
											) : e.amount.toFixed(2)}
										</td>
										<td className="px-3 py-2">
											{editingId === e.id ? (
												<div className="flex gap-2">
													<Button size="sm" onClick={() => saveEdit(e.id)}>Save</Button>
													<Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
												</div>
											) : (
												<div className="flex gap-2">
													<Button size="sm" variant="outline" onClick={() => startEdit(e)}>Edit</Button>
													<Button size="sm" variant="outline" onClick={() => confirmDelete(e.id)}>Delete</Button>
												</div>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</CardContent>
				</Card>
			</div>

			<div className="space-y-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<div>
							<CardTitle>Category Summary</CardTitle>
							<CardDescription>Totals by category</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm text-muted-foreground">Daily reminder</label>
							<button onClick={() => setExpenseReminderDaily(!expenseReminderDaily)} className={`h-6 w-10 rounded-full transition-colors ${expenseReminderDaily ? 'bg-emerald-500' : 'bg-muted'}`}>
								<span className={`block h-5 w-5 rounded-full bg-card transition-transform translate-x-${expenseReminderDaily ? '5' : '0.5'}`}></span>
							</button>
						</div>
					</CardHeader>
					<CardContent>
						<ul className="space-y-2 text-sm">
							{categorySummary.map(([cat, amt]) => (
								<li key={cat} className="flex items-center justify-between">
									<span>{cat}</span>
									<span className="font-semibold">{amt.toFixed(2)}</span>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Monthly Summary</CardTitle>
						<CardDescription>Totals by month</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="space-y-2 text-sm">
							{monthlySummary.map(([month, amt]) => (
								<li key={month} className="flex items-center justify-between">
									<span>{month}</span>
									<span className="font-semibold">{amt.toFixed(2)}</span>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

