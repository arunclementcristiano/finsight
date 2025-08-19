"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useApp, type Expense } from "../store";
import { parseExpenseInput, suggestCategory } from "./utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/Card";
import { Button } from "../components/Button";
import { Doughnut, Bar } from "react-chartjs-2";
import { X, Calendar, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const API_BASE = process.env.NEXT_PUBLIC_EXPENSES_API || "/api/expenses";

export default function ExpenseTrackerPage() {
  const { expenses, setExpenses, addExpense, deleteExpense, categoryMemory, rememberCategory } = useApp() as any;
  const [input, setInput] = useState("");
  const [ai, setAi] = useState<{ amount?: number; category?: string; options?: string[]; AIConfidence?: number; raw?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sortField, setSortField] = useState<"date" | "amount" | "category">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [preset, setPreset] = useState<"all" | "today" | "week" | "month" | "lastMonth" | "custom">("all");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const amountRef = useRef<HTMLInputElement>(null);
  const customRef = useRef<HTMLInputElement>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  async function fetchList() {
    try {
      const res = await fetch(`${API_BASE}/list`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo" }) });
      const data = await res.json();
      if (Array.isArray(data.items)) {
        const mapped: Expense[] = data.items.map((it: any) => ({ id: it.expenseId || uuidv4(), text: it.rawText, amount: Number(it.amount || 0), category: it.category, date: it.date || new Date().toISOString(), createdAt: it.createdAt, note: it.rawText }));
        setExpenses(mapped.sort((a,b)=> (a.date < b.date ? 1 : -1)));
      }
    } catch {}
  }

  useEffect(() => { fetchList(); }, []);

  async function handleDelete(expenseId: string) {
    try {
      await fetch(`${API_BASE}/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expenseId }) });
      deleteExpense(expenseId);
    } catch {}
  }

  function resetDatePicker() {
    const d = new Date();
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    setDateOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rawText = input.trim();
    if (!rawText) return;
    setAi(null);
    try {
      // Instant local rules path for zero-lag UX
      const parsed = parseExpenseInput(rawText);
      if (parsed.category && typeof parsed.amount === "number") {
        const put = await fetch(`${API_BASE}/add`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo", rawText, category: parsed.category, amount: parsed.amount, date: dateOpen ? selectedDate : undefined }) });
        const saved = await put.json();
        if (saved && saved.ok) {
          addExpense({ id: saved.expenseId || uuidv4(), text: rawText, amount: parsed.amount, category: parsed.category as string, date: new Date().toISOString(), note: rawText });
          setInput("");
          inputRef.current?.focus();
          resetDatePicker();
          return;
        }
      }
      // Local memory fallback (from previous acknowledgments) to avoid re-asking in dev/local
      const memCat = suggestCategory(rawText, categoryMemory as any);
      if (!parsed.category && memCat && typeof parsed.amount === "number") {
        const put = await fetch(`${API_BASE}/add`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo", rawText, category: memCat, amount: parsed.amount, date: dateOpen ? selectedDate : undefined }) });
        const saved = await put.json();
        if (saved && saved.ok) {
          addExpense({ id: saved.expenseId || uuidv4(), text: rawText, amount: parsed.amount, category: memCat, date: new Date().toISOString(), note: rawText });
          setInput("");
          inputRef.current?.focus();
          resetDatePicker();
          return;
        }
      }
      const res = await fetch(`${API_BASE}/add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo", rawText }) });
      const data = await res.json();
      // If AI was used (AIConfidence present), require acknowledgment
      if (data && ("AIConfidence" in data) && data.AIConfidence !== undefined) {
        setAi({ amount: data.amount, category: data.category, options: data.options, AIConfidence: data.AIConfidence, raw: rawText });
        setSelectedCategory(data.category || "Other");
        return;
      }
      // If rules/memory matched and we have amount/category, auto-save without acknowledge
      if (data && data.category && typeof data.amount === "number" && isFinite(data.amount)) {
        const put = await fetch(`${API_BASE}/add`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo", rawText, category: data.category, amount: data.amount, date: dateOpen ? selectedDate : undefined }) });
        const saved = await put.json();
        if (saved && saved.ok) {
          addExpense({ id: saved.expenseId || uuidv4(), text: rawText, amount: data.amount, category: data.category, date: new Date().toISOString(), note: rawText });
          setInput("");
          inputRef.current?.focus();
          resetDatePicker();
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
      const res = await fetch(`${API_BASE}/add`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo", rawText: ai.raw, category: categoryFinal, amount: amountFinal, date: dateOpen ? selectedDate : undefined }) });
      const data = await res.json();
      if (data.ok) {
        addExpense({ id: data.expenseId || uuidv4(), text: ai.raw, amount: amountFinal, category: categoryFinal, date: new Date().toISOString(), note: ai.raw });
        setAi(null);
        setInput("");
        inputRef.current?.focus();
        resetDatePicker();
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
      const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}`;
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

  const sortedExpenses = useMemo(() => {
    const rows = expenses.slice().filter(e => {
      if (preset === "all") return true;
      const d = new Date(e.date);
      const sod = (dt: Date) => { const x = new Date(dt); x.setHours(0,0,0,0); return x; };
      const startOfWeek = (dt: Date) => { const x = sod(dt); const day = x.getDay(); const diff = (day === 0 ? 6 : day - 1); x.setDate(x.getDate() - diff); return x; };
      const endExclusive = (dt: Date) => { const x = sod(dt); x.setDate(x.getDate() + 1); return x; };
      let start: Date | undefined; let end: Date | undefined;
      const now = new Date();
      if (preset === "today") { start = sod(now); end = start; }
      else if (preset === "week") { start = startOfWeek(now); end = new Date(start); end.setDate(start.getDate() + 6); }
      else if (preset === "month") { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0); }
      else if (preset === "lastMonth") { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); start = s; end = new Date(now.getFullYear(), now.getMonth(), 0); }
      else if (preset === "custom") {
        start = customStart ? new Date(customStart) : undefined;
        end = customEnd ? new Date(customEnd) : undefined;
      }
      if (start && d < sod(start)) return false;
      if (end && d >= endExclusive(end)) return false;
      return true;
    });
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") {
        const aKey = (a as any).createdAt ? new Date((a as any).createdAt as string).getTime() : new Date(a.date).getTime();
        const bKey = (b as any).createdAt ? new Date((b as any).createdAt as string).getTime() : new Date(b.date).getTime();
        cmp = aKey - bKey;
      } else if (sortField === "amount") {
        cmp = a.amount - b.amount;
      } else {
        cmp = String(a.category || "").toLowerCase().localeCompare(String(b.category || "").toLowerCase());
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [expenses, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedExpenses.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const pageRows = sortedExpenses.slice(startIdx, startIdx + pageSize);

  function toggleSort(field: "date" | "amount" | "category") {
    if (field === sortField) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "category" ? "asc" : "desc");
    }
  }

  // Reset pagination when filters change
  useEffect(() => { setPage(1); }, [preset, customStart, customEnd, sortField, sortDir]);
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
            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
              <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} className="flex-1 h-11 rounded-xl border border-border px-3 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]" placeholder="e.g., Lunch 250 at restaurant"/>
              <button type="button" aria-label="Set date" title="Set date" onClick={()=> setDateOpen(o=>!o)} className={`h-11 w-11 inline-flex items-center justify-center rounded-xl border ${dateOpen ? 'border-emerald-400 text-emerald-600' : 'border-border text-muted-foreground'} bg-card hover:bg-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]`}>
                <Calendar className="h-4 w-4" />
              </button>
              {dateOpen && (
                <input type="date" value={selectedDate} onChange={(e)=> setSelectedDate(e.target.value)} className="h-11 rounded-xl border border-border px-3 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]" />
              )}
              <Button type="submit">Add Expense</Button>
            </form>
            {ai && (
              <div className="mt-3 rounded-xl border border-border p-3 text-sm space-y-2">
                <div>Suggested: <span className="font-semibold">{ai.category}</span> {ai.AIConfidence ? `(conf ${Math.round((ai.AIConfidence||0)*100)}%)` : ""}</div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input ref={amountRef} type="number" step="0.01" defaultValue={ai.amount ?? 0} className="h-9 w-28 rounded-md border border-border px-2 bg-card text-right"/>
                  <select value={selectedCategory || ai.category || "Other"} onChange={(e)=> setSelectedCategory(e.target.value)} className="h-9 rounded-md border border-border px-2 bg-card">
                    {Array.from(new Set<string>((((ai as any).options as string[] | undefined) || []).concat(ai.category || []).filter(Boolean))).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input ref={customRef} type="text" placeholder="Custom category (optional)" className="h-9 rounded-md border border-border px-2 bg-card"/>
                  <Button onClick={()=>{
                    const custom = (customRef.current?.value || "").trim();
                    const chosen = custom || (selectedCategory || ai.category || "Other");
                    confirm(chosen, amountRef.current?.value);
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
            <div className="mb-3 flex flex-wrap gap-2 items-center">
              <label className="text-sm text-muted-foreground">Range</label>
              <select value={preset} onChange={(e)=> setPreset(e.target.value as any)} className="h-9 rounded-md border border-border px-2 bg-card">
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="lastMonth">Last month</option>
                <option value="custom">Custom</option>
              </select>
              {preset === "custom" && (
                <>
                  <input type="date" value={customStart} onChange={(e)=> setCustomStart(e.target.value)} className="h-9 rounded-md border border-border px-2 bg-card" />
                  <span className="text-sm text-muted-foreground">to</span>
                  <input type="date" value={customEnd} onChange={(e)=> setCustomEnd(e.target.value)} className="h-9 rounded-md border border-border px-2 bg-card" />
                </>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-card">
                <tr>
                  <th className="px-3 py-2 border-b">
                    <button type="button" onClick={() => toggleSort("date")} className="inline-flex items-center gap-1 cursor-pointer select-none">
                      Date
                      {sortField !== "date" ? <ArrowUpDown className="h-3.5 w-3.5" /> : (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
                    </button>
                  </th>
                  <th className="px-3 py-2 border-b">Text</th>
                  <th className="px-3 py-2 border-b">
                    <button type="button" onClick={() => toggleSort("category")} className="inline-flex items-center gap-1 cursor-pointer select-none">
                      Category
                      {sortField !== "category" ? <ArrowUpDown className="h-3.5 w-3.5" /> : (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
                    </button>
                  </th>
                  <th className="px-3 py-2 border-b text-right">
                    <button type="button" onClick={() => toggleSort("amount")} className="inline-flex items-center gap-1 cursor-pointer select-none">
                      Amount
                      {sortField !== "amount" ? <ArrowUpDown className="h-3.5 w-3.5" /> : (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
                    </button>
                  </th>
                  <th className="px-3 py-2 border-b text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(e => (
                  <tr key={e.id} className="border-b align-top">
                    <td className="px-3 py-2">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{e.text}</td>
                    <td className="px-3 py-2">{e.category as string}</td>
                    <td className="px-3 py-2 text-right">{e.amount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        aria-label="Delete"
                        title="Delete"
                        onClick={() => handleDelete(e.id)}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-transparent text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:border-rose-200 dark:hover:border-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
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