"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useApp, type Expense } from "../store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/Card";
import { Button } from "../components/Button";

const API_BASE = process.env.NEXT_PUBLIC_EXPENSES_API || "/api/expenses";

export default function ExpenseTrackerPage() {
  const { expenses, setExpenses, addExpense } = useApp();
  const [input, setInput] = useState("");
  const [ai, setAi] = useState<{ amount?: number; category?: string; options?: string[]; AIConfidence?: number; raw?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function fetchList() {
    try {
      const res = await fetch(`${API_BASE}/list`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo" }) });
      const data = await res.json();
      if (Array.isArray(data.items)) {
        const mapped: Expense[] = data.items.map((it: any) => ({ id: it.expenseId || uuidv4(), text: it.rawText, amount: Number(it.amount || 0), category: it.category, date: it.date || new Date().toISOString(), note: it.rawText }));
        setExpenses(mapped.sort((a,b)=> (a.date < b.date ? 1 : -1)));
      }
    } catch {}
  }

  useEffect(() => { fetchList(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rawText = input.trim();
    if (!rawText) return;
    setAi(null);
    try {
      const res = await fetch(`${API_BASE}/add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo", rawText }) });
      const data = await res.json();
      setAi({ amount: data.amount, category: data.category, options: data.options, AIConfidence: data.AIConfidence, raw: rawText });
    } catch {}
  }

  async function confirm(category?: string, amountStr?: string) {
    if (!ai?.raw) return;
    const categoryFinal = category || ai.category || "Other";
    const amountFinal = Number(amountStr || ai.amount || 0);
    if (!categoryFinal || !isFinite(amountFinal)) return;
    try {
      const res = await fetch(`${API_BASE}/add`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo", rawText: ai.raw, category: categoryFinal, amount: amountFinal }) });
      const data = await res.json();
      if (data.ok) {
        addExpense({ id: data.expenseId || uuidv4(), text: ai.raw, amount: amountFinal, category: categoryFinal, date: new Date().toISOString(), note: ai.raw });
        setAi(null);
        setInput("");
        inputRef.current?.focus();
      }
    } catch {}
  }

  const categorySummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) map.set(e.category as string, (map.get(e.category as string) || 0) + e.amount);
    return Array.from(map.entries()).sort((a,b)=> b[1]-a[1]);
  }, [expenses]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Expense Chat</CardTitle>
            <CardDescription>We will use rules → memory → AI with confirm.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} className="flex-1 h-11 rounded-xl border border-border px-3 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]" placeholder="e.g., Lunch 250 at restaurant"/>
              <Button type="submit">Parse</Button>
            </form>
            {ai && (
              <div className="mt-3 rounded-xl border border-border p-3 text-sm space-y-2">
                <div>Suggested: <span className="font-semibold">{ai.category}</span> {ai.AIConfidence ? `(conf ${Math.round((ai.AIConfidence||0)*100)}%)` : ""}</div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="number" step="0.01" defaultValue={ai.amount ?? 0} className="h-9 w-28 rounded-md border border-border px-2 bg-card text-right"/>
                  <select defaultValue={ai.category || "Other"} className="h-9 rounded-md border border-border px-2 bg-card">
                    {["Food","Travel","Entertainment","Shopping","Utilities","Healthcare","Other"].map(c => (<option key={c} value={c}>{c}</option>))}
                  </select>
                  <Button onClick={(e)=>{
                    const wrap = (e.currentTarget.parentElement as HTMLElement);
                    const num = wrap.querySelector("input") as HTMLInputElement;
                    const sel = wrap.querySelector("select") as HTMLSelectElement;
                    confirm(sel.value, num.value);
                  }}>Confirm</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Synced with backend</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-left border rounded-xl overflow-hidden border-border text-sm">
              <thead className="bg-card">
                <tr>
                  <th className="px-3 py-2 border-b">Date</th>
                  <th className="px-3 py-2 border-b">Text</th>
                  <th className="px-3 py-2 border-b">Category</th>
                  <th className="px-3 py-2 border-b text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} className="border-b align-top">
                    <td className="px-3 py-2">{new Date(e.date).toLocaleString()}</td>
                    <td className="px-3 py-2">{e.text}</td>
                    <td className="px-3 py-2">{e.category as string}</td>
                    <td className="px-3 py-2 text-right">{e.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Category Summary</CardTitle>
            <CardDescription>Totals by category</CardDescription>
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
      </div>
    </div>
  );
}
