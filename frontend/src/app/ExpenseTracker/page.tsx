"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useApp, type Expense } from "../store";
import { parseExpenseInput, suggestCategory } from "./utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/Card";
import { Button } from "../components/Button";
import { Doughnut, Bar } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const API_BASE = process.env.NEXT_PUBLIC_EXPENSES_API || "/api/expenses";

export default function ExpenseTrackerPage() {
  const { expenses, setExpenses, addExpense, categoryMemory } = useApp();
  const [input, setInput] = useState("");
  const [ai, setAi] = useState<{ amount?: number; category?: string; options?: string[]; AIConfidence?: number; raw?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

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
      // Instant local rules path for zero-lag UX
      const parsed = parseExpenseInput(rawText);
      if (parsed.category && typeof parsed.amount === "number") {
        const put = await fetch(`${API_BASE}/add`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo", rawText, category: parsed.category, amount: parsed.amount }) });
        const saved = await put.json();
        if (saved && saved.ok) {
          addExpense({ id: saved.expenseId || uuidv4(), text: rawText, amount: parsed.amount, category: parsed.category as string, date: new Date().toISOString(), note: rawText });
          setInput("");
          inputRef.current?.focus();
          return;
        }
      }
      const res = await fetch(`${API_BASE}/add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo", rawText }) });
      const data = await res.json();
      // If AI was used (AIConfidence present), require acknowledgment
      if (data && ("AIConfidence" in data) && data.AIConfidence !== undefined) {
        setAi({ amount: data.amount, category: data.category, options: data.options, AIConfidence: data.AIConfidence, raw: rawText });
        return;
      }
      // If rules/memory matched and we have amount/category, auto-save without acknowledge
      if (data && data.category && typeof data.amount === "number" && isFinite(data.amount)) {
        const put = await fetch(`${API_BASE}/add`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo", rawText, category: data.category, amount: data.amount }) });
        const saved = await put.json();
        if (saved && saved.ok) {
          addExpense({ id: saved.expenseId || uuidv4(), text: rawText, amount: data.amount, category: data.category, date: new Date().toISOString(), note: rawText });
          setInput("");
          inputRef.current?.focus();
          return;
        }
      }
      // Missing amount or problematic parse: ask user to confirm amount/category
      setAi({ amount: data?.amount, category: data?.category, options: data?.options, AIConfidence: data?.AIConfidence, raw: rawText });
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

  const monthlySummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const d = new Date(e.date);
      const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      map.set(ym, (map.get(ym) || 0) + e.amount);
    }
    const arr = Array.from(map.entries()).sort((a,b)=> a[0] < b[0] ? -1 : 1);
    return arr;
  }, [expenses]);

  const [monthFilter, setMonthFilter] = useState<string>("");
  const monthlyFiltered = useMemo(() => {
    if (!monthFilter) return monthlySummary;
    return monthlySummary.filter(([m]) => m === monthFilter);
  }, [monthlySummary, monthFilter]);

  const totalPages = Math.max(1, Math.ceil(expenses.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const pageRows = expenses.slice(startIdx, startIdx + pageSize);
  function prev() { setPage(p => Math.max(1, p - 1)); }
  function next() { setPage(p => Math.min(totalPages, p + 1)); }

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
              <Button type="submit">Add Expense</Button>
            </form>
            {ai && (
              <div className="mt-3 rounded-xl border border-border p-3 text-sm space-y-2">
                <div>Suggested: <span className="font-semibold">{ai.category}</span> {ai.AIConfidence ? `(conf ${Math.round((ai.AIConfidence||0)*100)}%)` : ""}</div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="number" step="0.01" defaultValue={ai.amount ?? 0} className="h-9 w-28 rounded-md border border-border px-2 bg-card text-right"/>
                  <select defaultValue={ai.category || "Other"} className="h-9 rounded-md border border-border px-2 bg-card">
                    {Array.from(new Set([
                      ai.category as any,
                      ...(((ai as any).options as string[] | undefined) || []),
                      "Food","Travel","Entertainment","Shopping","Utilities","Healthcare","Housing","Education","Insurance","Investment","Loans","Donations","Grooming","Personal","Subscription","Taxes","Gifts","Pet Care","Other"
                    ].filter(Boolean))).map((c: any) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                  <input type="text" placeholder="Custom category" className="h-9 rounded-md border border-border px-2 bg-card"/>
                  <Button onClick={(e)=>{
                    const wrap = (e.currentTarget.parentElement as HTMLElement);
                    const num = wrap.querySelector("input") as HTMLInputElement;
                    const inputs = wrap.querySelectorAll("input");
                    const amtInput = inputs[0] as HTMLInputElement;
                    const customInput = inputs[1] as HTMLInputElement;
                    const sel = wrap.querySelector("select") as HTMLSelectElement;
                    const chosen = (customInput.value || sel.value);
                    confirm(chosen, amtInput.value);
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
            <div className="max-h-96 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-card">
                <tr>
                  <th className="px-3 py-2 border-b">Date</th>
                  <th className="px-3 py-2 border-b">Text</th>
                  <th className="px-3 py-2 border-b">Category</th>
                  <th className="px-3 py-2 border-b text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(e => (
                  <tr key={e.id} className="border-b align-top">
                    <td className="px-3 py-2">{new Date(e.date).toLocaleString()}</td>
                    <td className="px-3 py-2">{e.text}</td>
                    <td className="px-3 py-2">{e.category as string}</td>
                    <td className="px-3 py-2 text-right">{e.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {expenses.length > pageSize && (
              <div className="flex items-center justify-between mt-3 text-sm">
                <div>Page {page} of {totalPages}</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={prev} disabled={page === 1}>Prev</Button>
                  <Button variant="outline" size="sm" onClick={next} disabled={page === totalPages}>Next</Button>
                </div>
              </div>
            )}
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
            {categorySummary.length > 0 ? (
              <div className="mx-auto max-w-xs">
                <Doughnut data={{ labels: categorySummary.map(([c])=>c), datasets: [{ data: categorySummary.map(([,v])=>v), backgroundColor: ["#6366f1", "#10b981", "#f59e42", "#fbbf24", "#3b82f6", "#ef4444", "#a3e635"] }] }} options={{ plugins: { legend: { position: "bottom" as const } }, cutout: "70%" }} />
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
            <CardDescription>Totals per month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              <select value={monthFilter} onChange={(e)=> setMonthFilter(e.target.value)} className="h-9 rounded-md border border-border px-2 bg-card">
                <option value="">All months</option>
                {monthlySummary.map(([m]) => (<option key={m} value={m}>{m}</option>))}
              </select>
            </div>
            {monthlyFiltered.length > 0 ? (
              <div className="h-56">
                <Bar data={{ labels: monthlyFiltered.map(([m])=>m), datasets: [{ label: "Total", data: monthlyFiltered.map(([,v])=>v), backgroundColor: "rgba(99,102,241,0.5)" }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
