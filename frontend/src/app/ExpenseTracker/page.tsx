"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useApp, type Expense } from "../store";
import { parseExpenseInput, suggestCategory } from "./utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/Card";
import { Button } from "../components/Button";
import { Doughnut, Bar } from "react-chartjs-2";
import { Progress } from "../components/Progress";
import { formatCurrency } from "../utils/format";
import { X, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff, Download, Settings2 } from "lucide-react";
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const API_BASE = process.env.NEXT_PUBLIC_EXPENSES_API || "/api/expenses";

export default function ExpenseTrackerPage() {
  const { expenses, setExpenses, addExpense, deleteExpense, categoryMemory, rememberCategory, categoryBudgets, setCategoryBudget, defaultCategoryBudgets, setDefaultCategoryBudgets } = useApp() as any;
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
  const [privacy, setPrivacy] = useState(false);
  const [activeTab, setActiveTab] = useState<"data" | "insights">("data");
  const [showBudgetsModal, setShowBudgetsModal] = useState(false);
  const [tempDefaultBudgets, setTempDefaultBudgets] = useState<Record<string, number>>({});
  const [tempOverrideBudgets, setTempOverrideBudgets] = useState<Record<string, number>>({});
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [overridesByMonth, setOverridesByMonth] = useState<Record<string, Record<string, number>>>({});
  // Insights controls
  const [insightsPreset, setInsightsPreset] = useState<"today"|"week"|"month"|"custom">("month");
  const [insightsStart, setInsightsStart] = useState<string>("");
  const [insightsEnd, setInsightsEnd] = useState<string>("");
  const [insightsOverOnly, setInsightsOverOnly] = useState(false);

  async function fetchList() {
    try {
      const res = await fetch(`${API_BASE}/list`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo", limit: 1000, page: 1 }) });
      const data = await res.json();
      if (Array.isArray(data.items)) {
        const mapped: Expense[] = data.items.map((it: any) => ({ id: it.expenseId || uuidv4(), text: it.rawText, amount: Number(it.amount || 0), category: it.category, date: it.date || new Date().toISOString(), createdAt: it.createdAt, note: it.rawText }));
        setExpenses(mapped.sort((a,b)=> (a.date < b.date ? 1 : -1)));
      }
    } catch {}
  }

  useEffect(() => { fetchList(); }, []);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/budgets?userId=demo`);
        const data = await res.json();
        if (data) {
          const def = Object.fromEntries(Object.entries(data.defaultBudgets || {}).map(([k,v]: any) => [k, Number(v) || 0]));
          (useApp.getState() as any).setDefaultCategoryBudgets(def);
          setOverridesByMonth(data.overrides || {});
        }
      } catch {}
    })();
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const base = await (await fetch(`/api/categories`)).json();
        const fromExpenses = Array.from(new Set(expenses.map(e=> String(e.category || "Other"))));
        const union = Array.from(new Set<string>([...(base.categories||[]), ...fromExpenses])).sort((a,b)=> a.localeCompare(b));
        setAllCategories(union);
      } catch {
        const fromExpenses = Array.from(new Set(expenses.map(e=> String(e.category || "Other")))).sort((a,b)=> a.localeCompare(b));
        setAllCategories(fromExpenses);
      }
    })();
  }, [expenses]);
  useEffect(() => {
    (async () => {
      try {
        const base = await (await fetch(`/api/categories`)).json();
        const fromExpenses = Array.from(new Set(expenses.map(e=> String(e.category || "Other"))));
        const union = Array.from(new Set<string>([...(base.categories||[]), ...fromExpenses])).sort((a,b)=> a.localeCompare(b));
        (useApp.getState() as any); // no-op access to keep ts happy in this context
        // use local state setter if present
      } catch {}
    })();
  }, [expenses]);

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
          addExpense({ id: saved.expenseId || uuidv4(), text: rawText, amount: parsed.amount, category: parsed.category as string, date: (dateOpen ? selectedDate : new Date().toISOString().slice(0,10)), createdAt: new Date().toISOString(), note: rawText });
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
          addExpense({ id: saved.expenseId || uuidv4(), text: rawText, amount: parsed.amount, category: memCat, date: (dateOpen ? selectedDate : new Date().toISOString().slice(0,10)), createdAt: new Date().toISOString(), note: rawText });
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
          addExpense({ id: saved.expenseId || uuidv4(), text: rawText, amount: data.amount, category: data.category, date: (dateOpen ? selectedDate : new Date().toISOString().slice(0,10)), createdAt: new Date().toISOString(), note: rawText });
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
        addExpense({ id: data.expenseId || uuidv4(), text: ai.raw, amount: amountFinal, category: categoryFinal, date: (dateOpen ? selectedDate : new Date().toISOString().slice(0,10)), createdAt: new Date().toISOString(), note: ai.raw });
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

  // Budgets: current month key (YYYY-MM)
  const currentYm = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}`;
  }, []);

  // Spend by category for current month
  const monthlyCategorySpend = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const d = new Date(e.date);
      const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}`;
      if (ym === currentYm) {
        const key = String(e.category || "Other");
        map.set(key, (map.get(key) || 0) + (Number(e.amount) || 0));
      }
    }
    const arr = Array.from(map.entries()).sort((a,b)=> b[1]-a[1]);
    return { arr, map };
  }, [expenses, currentYm]);

  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState<string>("");
  function saveBudget(cat: string) {
    const amt = Math.max(0, Number(editingVal) || 0);
    const nextDef = { ...(defaultCategoryBudgets || {}), [cat]: amt };
    setDefaultCategoryBudgets(nextDef);
    setEditingCat(null);
    setEditingVal("");
    fetch(`/api/budgets`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo", defaultBudgets: nextDef, overrides: overridesByMonth }) }).catch(()=>{});
  }

  function getMonthlyBudgetFor(ym: string, cat: string): number {
    const o = overridesByMonth?.[ym]?.[cat];
    if (typeof o === "number") return o;
    const d = (defaultCategoryBudgets || {})[cat] || 0;
    return Number(d) || 0;
  }

  function daysInMonth(y: number, mZeroBased: number) { return new Date(y, mZeroBased + 1, 0).getDate(); }
  function prorationForRange(startISO: string, endISO: string) {
    const start = new Date(startISO); const end = new Date(endISO);
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const map: Record<string, number> = {};
    let cur = new Date(s);
    while (cur <= e) {
      const y = cur.getFullYear(); const m = cur.getMonth();
      const ym = `${y}-${String(m+1).padStart(2,"0")}`;
      map[ym] = (map[ym] || 0) + 1;
      cur.setDate(cur.getDate() + 1);
    }
    return map; // ym -> overlapDays
  }

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
  }, [expenses, sortField, sortDir, preset, customStart, customEnd]);

  const totalPages = Math.max(1, Math.ceil(sortedExpenses.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const pageRows = sortedExpenses.slice(startIdx, startIdx + pageSize);

  // KPI metrics
  const todaySpend = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(); const m = now.getMonth(); const d = now.getDate();
    let sum = 0;
    for (const e of expenses) {
      const dt = new Date(e.date);
      if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) sum += Number(e.amount) || 0;
    }
    return sum;
  }, [expenses]);

  const monthSpend = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(); const m = now.getMonth();
    let sum = 0;
    for (const e of expenses) {
      const dt = new Date(e.date);
      if (dt.getFullYear() === y && dt.getMonth() === m) sum += Number(e.amount) || 0;
    }
    return sum;
  }, [expenses]);

  const totalBudget = useMemo(() => {
    const budgets = defaultCategoryBudgets || {};
    return Object.values(budgets).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  }, [defaultCategoryBudgets]);

  const budgetUsedPct = totalBudget > 0 ? Math.round((monthSpend / totalBudget) * 100) : 0;
  const topCategory = monthlyCategorySpend.arr.length > 0 ? monthlyCategorySpend.arr[0][0] : "—";

  // Helpers
  function fmtMoney(v: number) { return privacy ? "•••" : formatCurrency(v); }
  function exportCsv() {
    const rows = [["Date","Text","Category","Amount"]].concat(
      sortedExpenses.map(e => [new Date(e.date).toISOString().slice(0,10), e.text, String(e.category || ""), String(e.amount)])
    );
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `expenses-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

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
    <div className="flex flex-col h-[calc(100vh-5rem)] overflow-hidden">
      {/* Sticky Command Bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-4 p-4">
          {/* Chat input */}
          <div>
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
          </div>
          {/* Actions */}
          <div className="flex items-start justify-end gap-2">
            <Button variant="outline" onClick={()=> setShowBudgetsModal(true)}>
              <Settings2 className="h-4 w-4 mr-2"/>
              Set Budgets
            </Button>
            <Button variant="outline" onClick={()=> setPrivacy(p=>!p)}>
              {privacy ? <EyeOff className="h-4 w-4 mr-2"/> : <Eye className="h-4 w-4 mr-2"/>}
              {privacy ? "Unmask" : "Privacy"}
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2"/>
              Export CSV
            </Button>
          </div>
        </div>
        {/* Tabs */}
        <div className="px-4 pb-3">
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button onClick={()=> setActiveTab("data")} className={`px-4 py-2 text-sm ${activeTab==='data' ? 'bg-card text-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>Data</button>
            <button onClick={()=> setActiveTab("insights")} className={`px-4 py-2 text-sm ${activeTab==='insights' ? 'bg-card text-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>Insights</button>
          </div>
        </div>
      </div>

      {/* Main panels */}
      {activeTab === "data" ? (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-4 flex-1 min-h-0 overflow-auto">
        {/* Recent Expenses (full width on xl span 2) */}
        <Card className="xl:col-span-2 h-full flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Synced with backend</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 flex flex-col pb-0">
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
            <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border">
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
                    <td className="px-3 py-2 text-right">{privacy ? "•••" : e.amount.toFixed(2)}</td>
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
          </CardContent>
          <CardFooter className="pt-3 border-t border-border">
            <div className="w-full flex-none flex items-center justify-between text-sm">
              <div>Page {page} of {totalPages}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={prev} disabled={page === 1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={next} disabled={page === totalPages}>Next</Button>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Budgets in Data tab */}
        <Card className="h-full overflow-y-auto">
          <CardHeader>
            <CardTitle>Category Budgets</CardTitle>
            <CardDescription>{currentYm} budgets and usage</CardDescription>
          </CardHeader>
          <CardContent>
            {(monthlyCategorySpend.arr).length > 0 ? (
              <div className="space-y-3">
                {(monthlyCategorySpend.arr).map(([cat, spent]) => {
                  const budget = (defaultCategoryBudgets?.[cat]) || 0;
                  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                  const warn = pct >= 80 && pct < 100;
                  const alert = pct >= 100;
                  const barClass = alert ? "bg-rose-500" : warn ? "bg-amber-500" : undefined;
                  return (
                    <div key={cat} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="font-medium">{cat}</div>
                        <div className="text-muted-foreground">
                          {privacy ? "•••" : formatCurrency(spent)}
                          <span className="mx-1">/</span>
                          {budget > 0 ? (
                            <span className="font-medium">{privacy ? "•••" : formatCurrency(budget)}</span>
                          ) : editingCat === cat ? (
                            <input
                              autoFocus
                              type="number"
                              step="0.01"
                              value={editingVal}
                              onChange={(e)=> setEditingVal(e.target.value)}
                              onBlur={()=> saveBudget(cat)}
                              onKeyDown={(e)=> {
                                if (e.key === "Enter") saveBudget(cat);
                                else if (e.key === "Escape") { setEditingCat(null); setEditingVal(""); }
                              }}
                              className="h-7 w-28 ml-1 rounded-md border border-border px-2 bg-card text-right"
                            />
                          ) : (
                            <button className="ml-1 underline decoration-dotted hover:opacity-80" onClick={()=> { setEditingCat(cat); setEditingVal(String(budget || 0)); }}>
                              {budget > 0 ? (privacy ? "•••" : formatCurrency(budget)) : "Set budget"}
                            </button>
                          )}
                        </div>
                      </div>
                      <Progress value={Math.min(100, pct)} barClassName={barClass} className="mt-2" />
                      {budget > 0 && (
                        <div className={`mt-1 text-xs ${alert ? "text-rose-600" : warn ? "text-amber-600" : "text-muted-foreground"}`}>
                          {alert ? `${privacy ? '•••' : formatCurrency(spent - budget)} over` : `${privacy ? '•••' : formatCurrency(budget - spent)} left`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>
      ) : (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-4 flex-1 overflow-auto">
        {/* KPIs */}
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Key metrics for {currentYm}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">Today</div>
                <div className="text-lg font-semibold">{fmtMoney(todaySpend)}</div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">This Month</div>
                <div className="text-lg font-semibold">{fmtMoney(monthSpend)}</div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">Budget Used</div>
                <div className={`text-lg font-semibold ${totalBudget > 0 ? (budgetUsedPct >= 100 ? 'text-rose-600' : (budgetUsedPct >= 80 ? 'text-amber-600' : 'text-emerald-600')) : ''}`}>
                  {totalBudget > 0 ? `${privacy ? '•••' : formatCurrency(monthSpend)} / ${privacy ? '•••' : formatCurrency(totalBudget)} (${budgetUsedPct}%)` : "—"}
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">Top Category</div>
                <div className="text-lg font-semibold">{topCategory}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Donut */}
        <Card>
          <CardHeader>
            <CardTitle>Category Share</CardTitle>
            <CardDescription>Distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              // Build category share for current Insights range
              const now = new Date();
              let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              let end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              if (insightsPreset === "week") { const day = start.getDay() || 7; start.setDate(start.getDate() - (day-1)); end = new Date(start); end.setDate(start.getDate() + 6); }
              else if (insightsPreset === "month") { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth()+1, 0); }
              else if (insightsPreset === "custom" && insightsStart && insightsEnd) { start = new Date(insightsStart); end = new Date(insightsEnd); }
              const map = new Map<string, number>();
              for (const e of expenses) {
                const d = new Date(e.date);
                if (d >= start && d <= end) {
                  const k = String(e.category || "Other");
                  map.set(k, (map.get(k) || 0) + Number(e.amount||0));
                }
              }
              const entries = Array.from(map.entries()).sort((a,b)=> b[1]-a[1]);
              if (entries.length === 0) return <div className="text-muted-foreground text-sm">No data yet</div>;
              return (
                <div className="mx-auto max-w-xs">
                  <Doughnut data={{ labels: entries.map(([c])=>c), datasets: [{ data: entries.map(([,v])=>v), backgroundColor: ["#6366f1", "#10b981", "#f59e42", "#fbbf24", "#3b82f6", "#ef4444", "#a3e635"] }] }} options={{ plugins: { legend: { position: "bottom" as const } }, cutout: "70%" }} />
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Monthly */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Insights</CardTitle>
            <CardDescription>Actual vs Expected (prorated by day)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex flex-wrap gap-2 items-center">
              <label className="text-sm text-muted-foreground">Range</label>
              <select value={insightsPreset} onChange={(e)=> setInsightsPreset(e.target.value as any)} className="h-9 rounded-md border border-border px-2 bg-card">
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="custom">Custom</option>
              </select>
              {insightsPreset === "custom" && (
                <>
                  <input type="date" value={insightsStart} onChange={e=> setInsightsStart(e.target.value)} className="h-9 rounded-md border border-border px-2 bg-card" />
                  <span className="text-sm text-muted-foreground">to</span>
                  <input type="date" value={insightsEnd} onChange={e=> setInsightsEnd(e.target.value)} className="h-9 rounded-md border border-border px-2 bg-card" />
                </>
              )}
              <label className="ml-auto inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={insightsOverOnly} onChange={e=> setInsightsOverOnly(e.target.checked)} /> Over budget only</label>
            </div>
            {(() => {
              // Compute range
              const now = new Date();
              let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              let end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              if (insightsPreset === "week") { const day = start.getDay() || 7; start.setDate(start.getDate() - (day-1)); end = new Date(start); end.setDate(start.getDate() + 6); }
              else if (insightsPreset === "month") { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth()+1, 0); }
              else if (insightsPreset === "custom" && insightsStart && insightsEnd) { start = new Date(insightsStart); end = new Date(insightsEnd); }
              const startISO = start.toISOString().slice(0,10); const endISO = end.toISOString().slice(0,10);
              const overlap = prorationForRange(startISO, endISO); // ym -> overlapDays
              // Actual spend by category in range
              const actualMap = new Map<string, number>();
              for (const e of expenses) {
                const d = new Date(e.date);
                if (d >= start && d <= end) actualMap.set(String(e.category||"Other"), (actualMap.get(String(e.category||"Other"))||0) + Number(e.amount||0));
              }
              // Expected by category (sum across months with overrides)
              const expectedMap = new Map<string, number>();
              for (const [ym, days] of Object.entries(overlap)) {
                const [yStr, mStr] = ym.split("-"); const y = Number(yStr); const m = Number(mStr)-1; const dim = daysInMonth(y, m);
                for (const cat of allCategories) {
                  const mb = getMonthlyBudgetFor(ym, cat);
                  if (mb <= 0) continue;
                  const add = (mb / dim) * (days as number);
                  expectedMap.set(cat, (expectedMap.get(cat) || 0) + add);
                }
              }
              // Compose rows
              let rows = Array.from(new Set([...Array.from(actualMap.keys()), ...Array.from(expectedMap.keys())])).map(cat => {
                const actual = actualMap.get(cat) || 0;
                const expected = expectedMap.get(cat) || 0;
                return { cat, actual, expected, variance: actual - expected };
              });
              if (insightsOverOnly) rows = rows.filter(r => r.actual > r.expected);
              // Simple chart data (top 6)
              const top = rows.sort((a,b)=> (b.actual - b.expected) - (a.actual - a.expected)).slice(0,6);
              const chart = {
                labels: top.map(r=> r.cat),
                datasets: [
                  { label: "Actual", data: top.map(r=> r.actual), backgroundColor: "rgba(239,68,68,0.6)" },
                  { label: "Expected", data: top.map(r=> r.expected), backgroundColor: "rgba(99,102,241,0.5)" }
                ]
              };
              return (
                <div className="space-y-4">
                  <div className="h-56">
                    <Bar data={chart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" as const } }, scales: { y: { beginAtZero: true } } }} />
                  </div>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-card">
                        <tr>
                          <th className="px-3 py-2 border-b text-left">Category</th>
                          <th className="px-3 py-2 border-b text-right">Actual</th>
                          <th className="px-3 py-2 border-b text-right">Expected</th>
                          <th className="px-3 py-2 border-b text-right">Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(r => (
                          <tr key={r.cat} className={`border-b`}>
                            <td className="px-3 py-2">{r.cat}</td>
                            <td className="px-3 py-2 text-right">{fmtMoney(r.actual)}</td>
                            <td className="px-3 py-2 text-right">{fmtMoney(r.expected)}</td>
                            <td className={`px-3 py-2 text-right ${r.variance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtMoney(r.variance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs text-muted-foreground">Budgets are monthly; expected is prorated to your selected dates. Monthly overrides are applied when set.</div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
      )}

      {/* Budgets Modal */}
      {showBudgetsModal && (
        <div className="fixed inset-0 z-20 bg-black/30 flex items-center justify-center p-4" onClick={()=> setShowBudgetsModal(false)}>
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card text-foreground shadow-xl" onClick={e=> e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="font-semibold">Set Budgets</div>
              <button className="text-muted-foreground hover:text-foreground" onClick={()=> setShowBudgetsModal(false)}><X className="h-5 w-5"/></button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="text-sm text-muted-foreground mb-3">Set default budgets (apply to all months) and optionally override for this month ({currentYm}). Leave blank to keep unchanged.</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allCategories.map(cat => (
                  <div key={cat} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="text-sm font-semibold">{cat}</div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">Default</div>
                      <input type="number" step="0.01" placeholder={String(defaultCategoryBudgets?.[cat] || 0)} onChange={(e)=> setTempDefaultBudgets(prev=> ({...prev, [cat]: Number(e.target.value) || 0}))} className="h-9 w-28 rounded-md border border-border px-2 bg-background text-right" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">This month</div>
                      <input type="number" step="0.01" placeholder={String((overridesByMonth?.[currentYm]?.[cat] || 0))} onChange={(e)=> setTempOverrideBudgets(prev=> ({...prev, [cat]: Number(e.target.value) || 0}))} className="h-9 w-28 rounded-md border border-border px-2 bg-background text-right" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
              <Button variant="outline" onClick={()=> setShowBudgetsModal(false)}>Cancel</Button>
              <Button onClick={async ()=> {
                const nextDefaults = { ...(defaultCategoryBudgets || {}), ...tempDefaultBudgets };
                const nextOverrides = { ...(overridesByMonth || {}), [currentYm]: { ...(overridesByMonth?.[currentYm] || {}), ...tempOverrideBudgets } };
                try { await fetch(`/api/budgets`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo", defaultBudgets: nextDefaults, overrides: nextOverrides }) }); } catch {}
                (useApp.getState() as any).setDefaultCategoryBudgets(nextDefaults);
                setOverridesByMonth(nextOverrides);
                setTempDefaultBudgets({}); setTempOverrideBudgets({});
                setShowBudgetsModal(false);
              }}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}