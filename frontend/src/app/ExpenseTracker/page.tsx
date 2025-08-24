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
  const [sortField, setSortField] = useState<"createdAt" | "date" | "amount" | "category">("createdAt");
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
  const [draftBudgets, setDraftBudgets] = useState<Record<string, number>>({});
  const [draftInputs, setDraftInputs] = useState<Record<string, string>>({});
  const [baselineBudgets, setBaselineBudgets] = useState<Record<string, number>>({});
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [overridesByMonth, setOverridesByMonth] = useState<Record<string, Record<string, number>>>({});
  // Insights controls
  const [insightsPreset, setInsightsPreset] = useState<"today"|"week"|"month"|"lastMonth"|"custom">("month");
  const [insightsStart, setInsightsStart] = useState<string>("");
  const [insightsEnd, setInsightsEnd] = useState<string>("");
  const [insightsOverOnly, setInsightsOverOnly] = useState(false);
  // Compare months drawer
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareMonthA, setCompareMonthA] = useState<string>("");
  const [compareMonthB, setCompareMonthB] = useState<string>("");
  const [compareShowAll, setCompareShowAll] = useState(false);
  // Export CSV modal controls
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPreset, setExportPreset] = useState<"all"|"today"|"week"|"month"|"lastMonth"|"custom">("all");
  const [exportStart, setExportStart] = useState<string>("");
  const [exportEnd, setExportEnd] = useState<string>("");

  // Helpers: money + local date handling
  function fmtMoney(v: number) { return privacy ? "•••" : formatCurrency(v); }
  function toLocalDateOnly(dateStr: string) {
    try {
      const s = String(dateStr || "").slice(0, 10);
      const parts = s.split("-");
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        if (isFinite(y) && isFinite(m) && isFinite(d)) return new Date(y, m - 1, d);
      }
      const dt = new Date(dateStr);
      return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    } catch {
      const dt = new Date(dateStr);
      return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    }
  }
  function fmtDateYYYYMMDDLocal(dateStr: string) {
    const d = toLocalDateOnly(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

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
        const fromExpenses = Array.from(new Set(expenses.map((e: Expense)=> String(e.category || "Other"))));
        const union = Array.from(new Set<string>([...(base.categories||[]), ...fromExpenses])).sort((a,b)=> a.localeCompare(b));
        setAllCategories(union);
      } catch {
        const fromExpenses: string[] = Array.from(new Set(expenses.map((e: Expense)=> String(e.category || "Other"))));
        fromExpenses.sort((a, b) => a.localeCompare(b));
        setAllCategories(fromExpenses);
      }
    })();
  }, [expenses]);
  useEffect(() => {
    (async () => {
      try {
        const base = await (await fetch(`/api/categories`)).json();
        const fromExpenses = Array.from(new Set(expenses.map((e: Expense)=> String(e.category || "Other"))));
        const union = Array.from(new Set<string>([...(base.categories||[]), ...fromExpenses])).sort((a,b)=> a.localeCompare(b));
        (useApp.getState() as any);
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
      // Local memory fallback (from previous acknowledgments)
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
      // Auto-save if rules/memory matched
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
      // Missing amount or unknown category
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
      const d = toLocalDateOnly(e.date as any);
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
      const d = toLocalDateOnly(e.date as any);
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
    const cur = overridesByMonth?.[ym]?.[cat];
    if (typeof cur === "number") return Number(cur) || 0;
    // Carry-forward: look at previous month override if present
    const [yStr, mStr] = String(ym).split("-");
    const y = Number(yStr); const m = Number(mStr) - 1;
    if (isFinite(y) && isFinite(m)) {
      const prev = new Date(y, m, 1); prev.setMonth(prev.getMonth() - 1);
      const prevKey = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`;
      const prevOv = overridesByMonth?.[prevKey]?.[cat];
      if (typeof prevOv === 'number') return Number(prevOv) || 0;
    }
    const d = (defaultCategoryBudgets || {})[cat] || 0;
    return Number(d) || 0;
  }

  function getPrevMonthBaseline(ym: string, cat: string): number {
    const [yStr, mStr] = String(ym).split("-");
    const y = Number(yStr); const m = Number(mStr) - 1;
    if (isFinite(y) && isFinite(m)) {
      const prev = new Date(y, m, 1); prev.setMonth(prev.getMonth() - 1);
      const prevKey = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`;
      const prevOv = overridesByMonth?.[prevKey]?.[cat];
      if (typeof prevOv === 'number') return Number(prevOv) || 0;
    }
    const d = (defaultCategoryBudgets || {})[cat] || 0;
    return Number(d) || 0;
  }

  // Initialize draft budgets when opening the modal (effective values per category)
  useEffect(() => {
    if (!showBudgetsModal) return;
    const cats = allCategories.length ? allCategories : Object.keys(defaultCategoryBudgets||{});
    const baseline: Record<string, number> = {};
    const draft: Record<string, number> = {};
    const inputs: Record<string, string> = {};
    for (const cat of cats) {
      const base = getPrevMonthBaseline(currentYm, cat);
      const curOv = overridesByMonth?.[currentYm]?.[cat];
      const init = (typeof curOv === 'number') ? (Number(curOv) || 0) : base;
      baseline[cat] = base;
      draft[cat] = init;
      inputs[cat] = String(init);
    }
    setBaselineBudgets(baseline);
    setDraftBudgets(draft);
    setDraftInputs(inputs);
  }, [showBudgetsModal]);

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
    return map;
  }

  const [monthFilter, setMonthFilter] = useState<string>("");
  const monthlyFiltered = useMemo(() => {
    if (!monthFilter) return monthlySummary;
    return monthlySummary.filter(([m]) => m === monthFilter);
  }, [monthlySummary, monthFilter]);

  const sortedExpenses = useMemo(() => {
    const rows = expenses.slice().filter((e: Expense) => {
      if (preset === "all") return true;
      const d = toLocalDateOnly(e.date as any);
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
        start = customStart ? toLocalDateOnly(customStart) : undefined;
        end = customEnd ? toLocalDateOnly(customEnd) : undefined;
      }
      if (start && d < sod(start)) return false;
      if (end && d >= endExclusive(end)) return false;
      return true;
    });
    rows.sort((a: Expense, b: Expense) => {
      let cmp = 0;
      if (sortField === "createdAt") {
        const aKey = (a as any).createdAt ? new Date((a as any).createdAt as string).getTime() : toLocalDateOnly(a.date as any).getTime();
        const bKey = (b as any).createdAt ? new Date((b as any).createdAt as string).getTime() : toLocalDateOnly(b.date as any).getTime();
        cmp = aKey - bKey;
      } else if (sortField === "date") {
        const aKey = toLocalDateOnly(a.date as any).getTime();
        const bKey = toLocalDateOnly(b.date as any).getTime();
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
      const dt = toLocalDateOnly(e.date as any);
      if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) sum += Number(e.amount) || 0;
    }
    return sum;
  }, [expenses]);

  const monthSpend = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(); const m = now.getMonth();
    let sum = 0;
    for (const e of expenses) {
      const dt = toLocalDateOnly(e.date as any);
      if (dt.getFullYear() === y && dt.getMonth() === m) sum += Number(e.amount) || 0;
    }
    return sum;
  }, [expenses]);

  const totalBudget = useMemo(() => {
    const cats = allCategories.length > 0 ? allCategories : Object.keys(defaultCategoryBudgets || {});
    let sum = 0;
    for (const cat of cats) {
      sum += getMonthlyBudgetFor(currentYm, cat);
    }
    return sum;
  }, [allCategories, defaultCategoryBudgets, overridesByMonth, currentYm]);

  const budgetUsedPct = totalBudget > 0 ? Math.round((monthSpend / totalBudget) * 100) : 0;
  const topCategory = monthlyCategorySpend.arr.length > 0 ? monthlyCategorySpend.arr[0][0] : "—";

  function exportCsvFrom(list: Expense[]) {
    const rows = [["Date","Text","Category","Amount"]].concat(
      list.map(e => [fmtDateYYYYMMDDLocal(e.date as any), e.text, String(e.category || ""), String(e.amount)])
    );
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `expenses-${fmtDateYYYYMMDDLocal(new Date().toISOString())}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function exportCsv() { exportCsvFrom(sortedExpenses); }

  function toggleSort(field: "createdAt" | "date" | "amount" | "category") {
    if (field === sortField) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "category" ? "asc" : "desc");
    }
  }

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
            <Button variant="outline" onClick={()=> setExportOpen(true)}>
              <Download className="h-4 w-4 mr-2"/>
              Export CSV
            </Button>
          </div>
        </div>
        {/* Beautiful Tabs */}
        <div className="px-4 xl:px-6 pb-4">
          <div className="relative bg-muted/30 rounded-2xl p-1">
            <div className="grid grid-cols-2">
              <button 
                onClick={()=> setActiveTab("data")} 
                className={`relative z-10 px-6 py-4 xl:py-3 text-base xl:text-sm font-semibold rounded-xl transition-all duration-300 touch-manipulation ${activeTab === 'data' ? 'bg-card text-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
              >
                📊 Data
              </button>
              <button 
                onClick={()=> setActiveTab("insights")} 
                className={`relative z-10 px-6 py-4 xl:py-3 text-base xl:text-sm font-semibold rounded-xl transition-all duration-300 touch-manipulation ${activeTab === 'insights' ? 'bg-card text-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
              >
                📈 Insights
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Beautiful Mobile-First Main Content */}
      {activeTab === "data" ? (
      <div className="space-y-6 xl:grid xl:grid-cols-3 xl:gap-6 xl:space-y-0 p-4 xl:p-6 flex-1 min-h-0 overflow-auto">
        {/* Recent Expenses (full width on xl span 2) */}
        <Card className="xl:col-span-2 xl:h-full flex flex-col xl:overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Synced with backend</CardDescription>
          </CardHeader>
          <CardContent className="xl:flex-1 xl:min-h-0 flex flex-col pb-0">
            {/* Desktop Filters */}
            <div className="mb-3 hidden xl:flex flex-wrap gap-2 items-center">
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

            {/* Beautiful Mobile Filters & Sorting */}
            <div className="xl:hidden mb-4">
              <Card className="border-0 shadow-md bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="text-xl">🔍</span>
                    Filter & Sort
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Time Range Select */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">📅 Time Range</label>
                    <select 
                      value={preset} 
                      onChange={(e)=> setPreset(e.target.value as any)} 
                      className="w-full h-12 rounded-xl border-2 border-border/50 bg-white/50 dark:bg-black/50 px-4 text-base font-medium focus:border-blue-500 focus:ring-0"
                    >
                      <option value="all">🌐 All Time</option>
                      <option value="today">📅 Today</option>
                      <option value="week">📊 This Week</option>
                      <option value="month">📈 This Month</option>
                      <option value="lastMonth">📉 Last Month</option>
                      <option value="custom">🎯 Custom Range</option>
                    </select>
                  </div>

                  {/* Custom Date Range */}
                  {preset === "custom" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">📊 Custom Date Range</label>
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="date" 
                          value={customStart} 
                          onChange={(e)=> setCustomStart(e.target.value)} 
                          className="w-full h-10 rounded-lg border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-3 text-sm font-medium focus:border-emerald-500 focus:ring-0"
                        />
                        <input 
                          type="date" 
                          value={customEnd} 
                          onChange={(e)=> setCustomEnd(e.target.value)} 
                          className="w-full h-10 rounded-lg border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-3 text-sm font-medium focus:border-emerald-500 focus:ring-0"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sort By */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">🔄 Sort By</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => toggleSort("date")}
                        className={`h-12 rounded-xl border-2 text-sm font-medium touch-manipulation transition-all ${
                          sortField === "date" 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' 
                            : 'border-border bg-background hover:bg-muted'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-base">📅</span>
                          <span>Date</span>
                          {sortField === "date" && (
                            <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => toggleSort("amount")}
                        className={`h-12 rounded-xl border-2 text-sm font-medium touch-manipulation transition-all ${
                          sortField === "amount" 
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300' 
                            : 'border-border bg-background hover:bg-muted'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-base">💰</span>
                          <span>Amount</span>
                          {sortField === "amount" && (
                            <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => toggleSort("category")}
                        className={`h-12 rounded-xl border-2 text-sm font-medium touch-manipulation transition-all ${
                          sortField === "category" 
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300' 
                            : 'border-border bg-background hover:bg-muted'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-base">🏷️</span>
                          <span>Category</span>
                          {sortField === "category" && (
                            <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Desktop Table View */}
            <div className="hidden xl:block flex-1 min-h-0 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-card">
                <tr>
                  <th className="px-3 py-2 border-b">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => toggleSort("date")} className="inline-flex items-center gap-1 cursor-pointer select-none">
                        Date
                        {sortField !== "date" ? <ArrowUpDown className="h-3.5 w-3.5" /> : (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
                      </button>
                      <button type="button" onClick={() => toggleSort("createdAt")} title="Sort by added time" className={`inline-flex items-center gap-1 cursor-pointer select-none text-xs px-1.5 py-0.5 rounded border ${sortField==='createdAt' ? 'border-foreground text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                        Newest
                        {sortField !== "createdAt" ? <ArrowUpDown className="h-3 w-3" /> : (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </div>
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
                {pageRows.map((e: Expense) => (
                  <tr key={e.id} className="border-b align-top">
                    <td className="px-3 py-2">{fmtDateYYYYMMDDLocal(e.date as any)}</td>
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

            {/* Modern Mobile Transaction List (Groww/ET Money Style) */}
            <div className="xl:hidden">
              {pageRows.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {pageRows.map((e: Expense) => {
                    // Category icon mapping (Groww-style colored backgrounds)
                    const getCategoryInfo = (category: string) => {
                      const mapping: Record<string, {icon: string, bg: string, color: string}> = {
                        "Food": {icon: "🍽️", bg: "bg-orange-50 dark:bg-orange-900/20", color: "text-orange-600 dark:text-orange-400"},
                        "Travel": {icon: "✈️", bg: "bg-blue-50 dark:bg-blue-900/20", color: "text-blue-600 dark:text-blue-400"},
                        "Shopping": {icon: "🛍️", bg: "bg-pink-50 dark:bg-pink-900/20", color: "text-pink-600 dark:text-pink-400"},
                        "Utilities": {icon: "⚡", bg: "bg-yellow-50 dark:bg-yellow-900/20", color: "text-yellow-600 dark:text-yellow-400"},
                        "Housing": {icon: "🏠", bg: "bg-green-50 dark:bg-green-900/20", color: "text-green-600 dark:text-green-400"},
                        "Healthcare": {icon: "🩺", bg: "bg-red-50 dark:bg-red-900/20", color: "text-red-600 dark:text-red-400"},
                        "Entertainment": {icon: "🎬", bg: "bg-purple-50 dark:bg-purple-900/20", color: "text-purple-600 dark:text-purple-400"},
                        "Investment": {icon: "📈", bg: "bg-emerald-50 dark:bg-emerald-900/20", color: "text-emerald-600 dark:text-emerald-400"},
                        "Loans": {icon: "💳", bg: "bg-slate-50 dark:bg-slate-900/20", color: "text-slate-600 dark:text-slate-400"},
                        "Insurance": {icon: "🛡️", bg: "bg-indigo-50 dark:bg-indigo-900/20", color: "text-indigo-600 dark:text-indigo-400"},
                        "Grooming": {icon: "💄", bg: "bg-rose-50 dark:bg-rose-900/20", color: "text-rose-600 dark:text-rose-400"},
                        "Subscription": {icon: "📱", bg: "bg-violet-50 dark:bg-violet-900/20", color: "text-violet-600 dark:text-violet-400"},
                        "Education": {icon: "📚", bg: "bg-cyan-50 dark:bg-cyan-900/20", color: "text-cyan-600 dark:text-cyan-400"},
                        "Taxes": {icon: "🧾", bg: "bg-gray-50 dark:bg-gray-900/20", color: "text-gray-600 dark:text-gray-400"},
                        "Gifts": {icon: "🎁", bg: "bg-amber-50 dark:bg-amber-900/20", color: "text-amber-600 dark:text-amber-400"},
                        "Pet Care": {icon: "🐕", bg: "bg-teal-50 dark:bg-teal-900/20", color: "text-teal-600 dark:text-teal-400"},
                        "Other": {icon: "📦", bg: "bg-gray-50 dark:bg-gray-900/20", color: "text-gray-600 dark:text-gray-400"}
                      };
                      return mapping[category] || {icon: "💸", bg: "bg-gray-50 dark:bg-gray-900/20", color: "text-gray-600 dark:text-gray-400"};
                    };
                    
                    const categoryInfo = getCategoryInfo(e.category as string);
                    const amount = e.amount || 0;
                    
                    return (
                      <div key={e.id} className="flex items-center justify-between py-4 px-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        {/* Left section - Icon & Details */}
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className={`w-12 h-12 rounded-full ${categoryInfo.bg} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-xl">{categoryInfo.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {e.text || e.category}
                              </h3>
                              <span className="text-lg font-bold text-gray-900 dark:text-gray-100 ml-2">
                                {privacy ? "•••••" : `₹${amount.toLocaleString('en-IN')}`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                                <span className={`px-2 py-1 rounded-full ${categoryInfo.bg} ${categoryInfo.color} font-medium`}>
                                  {e.category}
                                </span>
                                <span>•</span>
                                <span>{fmtDateYYYYMMDDLocal(e.date as any)}</span>
                              </div>
                              <button
                                onClick={() => handleDelete(e.id)}
                                className="w-6 h-6 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center transition-colors opacity-70 hover:opacity-100"
                                aria-label="Delete expense"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 px-4">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center">
                    <span className="text-3xl">💸</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No transactions yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
                    Start tracking your expenses to see detailed insights and manage your budget effectively
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          {/* Desktop Pagination */}
          <CardFooter className="pt-3 border-t border-border hidden xl:block">
            <div className="w-full flex-none flex items-center justify-between text-sm">
              <div>Page {page} of {totalPages}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={prev} disabled={page === 1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={next} disabled={page === totalPages}>Next</Button>
              </div>
            </div>
          </CardFooter>

          {/* Mobile Pagination */}
          <div className="xl:hidden mt-4">
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={prev} 
                      disabled={page === 1}
                      className="h-10 px-4 touch-manipulation"
                    >
                      ← Prev
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={next} 
                      disabled={page === totalPages}
                      className="h-10 px-4 touch-manipulation"
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Card>

        {/* Beautiful Category Budgets (Mobile Header) */}
        <div className="flex items-center justify-between xl:hidden mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
              <span className="text-xl">💡</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Budget Insights</h2>
              <p className="text-sm text-muted-foreground">{currentYm} overview</p>
            </div>
          </div>
        </div>
        
        {/* Desktop Category Budgets */}
        <Card className="h-full overflow-y-auto hidden xl:block">
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
        
        {/* Beautiful Mobile Budget Cards */}
        <div className="xl:hidden space-y-4">
          {(monthlyCategorySpend.arr).length > 0 ? (
            (monthlyCategorySpend.arr).map(([cat, spent]) => {
              const budget = (defaultCategoryBudgets?.[cat]) || 0;
              const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
              const warn = pct >= 80 && pct < 100;
              const alert = pct >= 100;
              
              // Get category-specific styling
              const getCategoryData = (category: string) => {
                const mapping: Record<string, {emoji: string, color: string}> = {
                  "Food": {emoji: "🍽️", color: "from-orange-500 to-red-600"},
                  "Travel": {emoji: "✈️", color: "from-blue-500 to-cyan-600"},
                  "Shopping": {emoji: "🛍️", color: "from-pink-500 to-purple-600"},
                  "Utilities": {emoji: "⚡", color: "from-yellow-500 to-orange-600"},
                  "Housing": {emoji: "🏠", color: "from-green-500 to-teal-600"},
                  "Healthcare": {emoji: "🩺", color: "from-red-500 to-pink-600"},
                  "Entertainment": {emoji: "🎬", color: "from-purple-500 to-indigo-600"},
                  "Investment": {emoji: "📈", color: "from-emerald-500 to-green-600"},
                  "Loans": {emoji: "💳", color: "from-slate-500 to-gray-600"},
                  "Insurance": {emoji: "🛡️", color: "from-blue-600 to-indigo-700"},
                  "Grooming": {emoji: "💄", color: "from-pink-400 to-rose-500"},
                  "Subscription": {emoji: "📱", color: "from-violet-500 to-purple-600"},
                  "Education": {emoji: "📚", color: "from-indigo-500 to-blue-600"},
                  "Taxes": {emoji: "🧾", color: "from-gray-500 to-slate-600"},
                  "Gifts": {emoji: "🎁", color: "from-rose-500 to-pink-600"},
                  "Pet Care": {emoji: "🐕", color: "from-amber-500 to-yellow-600"},
                  "Other": {emoji: "📦", color: "from-gray-400 to-slate-500"}
                };
                return mapping[category] || {emoji: "💸", color: "from-gray-400 to-slate-500"};
              };
              
              const categoryData = getCategoryData(cat);
              
              return (
                <Card key={cat} className={`relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br ${categoryData.color}`}>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/20 to-white/5 rounded-bl-full"></div>
                  <CardContent className="p-4 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-lg">{categoryData.emoji}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-base">{cat}</h3>
                          <p className="text-white/70 text-sm">
                            {privacy ? "•••" : formatCurrency(spent)} / {budget > 0 ? (privacy ? "•••" : formatCurrency(budget)) : "No budget"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold text-white ${alert ? 'animate-pulse' : ''}`}>
                          {budget > 0 ? `${pct}%` : '—'}
                        </div>
                        {budget > 0 && (
                          <div className="text-xs text-white/70">
                            {alert ? `₹${(spent - budget).toFixed(0)} over` : `₹${(budget - spent).toFixed(0)} left`}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {budget > 0 ? (
                      <div className="space-y-2">
                        <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${alert ? 'bg-red-400' : warn ? 'bg-yellow-400' : 'bg-green-400'}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : editingCat === cat ? (
                      <div className="bg-white/20 rounded-xl p-3 border border-white/30">
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
                          className="w-full h-10 rounded-lg border-0 bg-white/90 px-3 text-gray-900 text-base font-medium text-right placeholder-gray-500"
                          placeholder="Enter budget amount"
                        />
                      </div>
                    ) : (
                      <button 
                        className="w-full mt-2 py-2 px-4 bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl text-white font-medium transition-all duration-200 touch-manipulation"
                        onClick={()=> { setEditingCat(cat); setEditingVal(String(budget || 0)); }}
                      >
                        💡 Set Budget
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
              <CardContent className="p-8 text-center">
                <div className="mb-4">
                  <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3">
                    <span className="text-2xl">💸</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
                  <p className="text-muted-foreground">Start tracking expenses to see budget insights</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      ) : (
      <div className="space-y-6 xl:grid xl:grid-cols-3 xl:gap-6 xl:space-y-0 p-4 xl:p-6 flex-1 overflow-auto">
        {/* Beautiful Mobile Insights Header */}
        <div className="flex items-center justify-between xl:hidden mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-xl">📈</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Smart Insights</h2>
              <p className="text-sm text-muted-foreground">{currentYm} analytics</p>
            </div>
          </div>
        </div>

        {/* Beautiful Mobile KPIs */}
        <Card className="xl:col-span-3 border-0 shadow-lg bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50">
          <CardHeader className="xl:block hidden">
            <CardTitle>Overview</CardTitle>
            <CardDescription>Key metrics for {currentYm}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 xl:p-6">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-4">
              <div className="rounded-2xl border-0 bg-gradient-to-br from-blue-500 to-cyan-600 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="text-lg">📅</span>
                  </div>
                  <div>
                    <div className="text-xs text-white/70 font-medium">Today</div>
                    <div className="text-lg xl:text-xl font-bold">{fmtMoney(todaySpend)}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border-0 bg-gradient-to-br from-emerald-500 to-green-600 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="text-lg">📊</span>
                  </div>
                  <div>
                    <div className="text-xs text-white/70 font-medium">This Month</div>
                    <div className="text-lg xl:text-xl font-bold">{fmtMoney(monthSpend)}</div>
                  </div>
                </div>
              </div>
              <div className={`rounded-2xl border-0 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${totalBudget > 0 ? (budgetUsedPct >= 100 ? 'bg-gradient-to-br from-red-500 to-rose-600' : (budgetUsedPct >= 80 ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-emerald-500 to-green-600')) : 'bg-gradient-to-br from-gray-500 to-slate-600'}`}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="text-lg">{totalBudget > 0 ? (budgetUsedPct >= 100 ? '🚨' : (budgetUsedPct >= 80 ? '⚠️' : '✅')) : '📈'}</span>
                  </div>
                  <div>
                    <div className="text-xs text-white/70 font-medium">Budget Used</div>
                    <div className="text-sm xl:text-base font-bold">
                      {totalBudget > 0 ? `${budgetUsedPct}%` : "—"}
                    </div>
                    {totalBudget > 0 && (
                      <div className="text-xs text-white/80">
                        {privacy ? '•••' : formatCurrency(monthSpend)} / {privacy ? '•••' : formatCurrency(totalBudget)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border-0 bg-gradient-to-br from-purple-500 to-indigo-600 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="text-lg">🏆</span>
                  </div>
                  <div>
                    <div className="text-xs text-white/70 font-medium">Top Category</div>
                    <div className="text-lg xl:text-xl font-bold">{topCategory}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Beautiful Category Share Chart */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base xl:text-lg">
              <span className="text-xl">🥧</span>
              Category Share
            </CardTitle>
            <CardDescription className="text-sm">Distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              // Build category share for current Insights range (local-day aware)
              const now = new Date();
              let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              let end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              if (insightsPreset === "week") { const day = start.getDay() || 7; start.setDate(start.getDate() - (day-1)); end = new Date(start); end.setDate(start.getDate() + 6); }
              else if (insightsPreset === "month") { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth()+1, 0); }
              else if (insightsPreset === "lastMonth") { const s = new Date(now.getFullYear(), now.getMonth()-1, 1); start = s; end = new Date(now.getFullYear(), now.getMonth(), 0); }
              else if (insightsPreset === "custom" && insightsStart && insightsEnd) { start = new Date(insightsStart); end = new Date(insightsEnd); }
              const startSOD = new Date(start.getFullYear(), start.getMonth(), start.getDate());
              const endExclusive = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
              const map = new Map<string, number>();
              for (const e of expenses) {
                const d0 = new Date(e.date as any);
                const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate());
                if (d >= startSOD && d < endExclusive) {
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

        {/* Beautiful Budget vs Actual Chart */}
        <Card className="xl:col-span-2 border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base xl:text-lg">
              <span className="text-xl">📊</span>
              Budget vs Actual
            </CardTitle>
            <CardDescription className="text-sm">Compare spend vs budget for your selected range</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop Controls */}
            <div className="mb-4 hidden xl:flex flex-wrap gap-2 items-center">
              <label className="text-sm text-muted-foreground">Range</label>
              <select value={insightsPreset} onChange={(e)=> setInsightsPreset(e.target.value as any)} className="h-9 rounded-md border border-border px-2 bg-card">
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="lastMonth">Last month</option>
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
              <Button variant="outline" onClick={()=> {
                const now = new Date();
                const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
                const last = new Date(now.getFullYear(), now.getMonth()-1, 1);
                const lastMonth = `${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}`;
                if (!compareMonthA) setCompareMonthA(lastMonth);
                if (!compareMonthB) setCompareMonthB(thisMonth);
                setCompareShowAll(false);
                setCompareOpen(true);
              }}>Compare months</Button>
            </div>

            {/* Beautiful Mobile Controls */}
            <div className="xl:hidden mb-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">📅 Time Range</label>
                <select 
                  value={insightsPreset} 
                  onChange={(e)=> setInsightsPreset(e.target.value as any)} 
                  className="w-full h-12 rounded-xl border-2 border-border/50 bg-white/50 dark:bg-black/50 px-4 text-base font-medium focus:border-emerald-500 focus:ring-0"
                >
                  <option value="today">📅 Today</option>
                  <option value="week">📊 This Week</option>
                  <option value="month">📈 This Month</option>
                  <option value="lastMonth">📉 Last Month</option>
                  <option value="custom">🎯 Custom Range</option>
                </select>
              </div>

              {insightsPreset === "custom" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">📊 Custom Range</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="date" 
                      value={insightsStart} 
                      onChange={e=> setInsightsStart(e.target.value)} 
                      className="w-full h-10 rounded-lg border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-3 text-sm font-medium focus:border-emerald-500 focus:ring-0"
                    />
                    <input 
                      type="date" 
                      value={insightsEnd} 
                      onChange={e=> setInsightsEnd(e.target.value)} 
                      className="w-full h-10 rounded-lg border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-3 text-sm font-medium focus:border-emerald-500 focus:ring-0"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input 
                    type="checkbox" 
                    checked={insightsOverOnly} 
                    onChange={e=> setInsightsOverOnly(e.target.checked)} 
                    className="w-4 h-4 rounded border-border focus:ring-emerald-500"
                  /> 
                  🚨 Over budget only
                </label>
                <Button 
                  variant="outline" 
                  className="h-10 px-4 bg-emerald-500/10 border-emerald-500 text-emerald-700 hover:bg-emerald-500/20 touch-manipulation"
                  onClick={()=> {
                    const now = new Date();
                    const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
                    const last = new Date(now.getFullYear(), now.getMonth()-1, 1);
                    const lastMonth = `${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}`;
                    if (!compareMonthA) setCompareMonthA(lastMonth);
                    if (!compareMonthB) setCompareMonthB(thisMonth);
                    setCompareShowAll(false);
                    setCompareOpen(true);
                  }}
                >
                  📊 Compare
                </Button>
              </div>
            </div>
            {(() => {
              // Compute range (local)
              const now = new Date();
              let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              let end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              if (insightsPreset === "week") { const day = start.getDay() || 7; start.setDate(start.getDate() - (day-1)); end = new Date(start); end.setDate(start.getDate() + 6); }
              else if (insightsPreset === "month") { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth()+1, 0); }
              else if (insightsPreset === "lastMonth") { const s = new Date(now.getFullYear(), now.getMonth()-1, 1); start = s; end = new Date(now.getFullYear(), now.getMonth(), 0); }
              else if (insightsPreset === "custom" && insightsStart && insightsEnd) { start = new Date(insightsStart); end = new Date(insightsEnd); }
              const overlap = (() => {
                const map: Record<string, number> = {};
                const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                while (cur <= last) {
                  const ym = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`;
                  map[ym] = (map[ym] || 0) + 1;
                  cur.setDate(cur.getDate() + 1);
                }
                return map;
              })();
              // Actual spend by category in range (local-day aware)
              const actualMap = new Map<string, number>();
              const startSOD = new Date(start.getFullYear(), start.getMonth(), start.getDate());
              const endExclusive = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
              for (const e of expenses) {
                const d0 = new Date(e.date as any);
                const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate());
                if (d >= startSOD && d < endExclusive) actualMap.set(String(e.category||"Other"), (actualMap.get(String(e.category||"Other"))||0) + Number(e.amount||0));
              }
              // Expected by category (sum across months with overrides)
              const expectedMap = new Map<string, number>();
              for (const [ym, days] of Object.entries(overlap)) {
                const [yStr, mStr] = ym.split("-"); const y = Number(yStr); const m = Number(mStr)-1; const dim = daysInMonth(y, m);
                const monthStart = new Date(y, m, 1); const monthEnd = new Date(y, m+1, 0);
                const isFull = start <= monthStart && end >= monthEnd;
                for (const cat of allCategories) {
                  const mb = getMonthlyBudgetFor(ym, cat);
                  if (mb <= 0) continue;
                  const add = isFull ? mb : (mb / dim) * (days as number);
                  expectedMap.set(cat, (expectedMap.get(cat) || 0) + add);
                }
              }
              // Compose rows for categories with spend
              let rows = Array.from(new Set([...Array.from(actualMap.keys())])).map(cat => {
                const actual = actualMap.get(cat) || 0;
                const expected = expectedMap.get(cat) || 0;
                return { cat, actual, expected, variance: actual - expected };
              });
              // Aggregate unused expected (categories with no spend)
              const unusedExpected = Array.from(expectedMap.entries())
                .filter(([cat, _]) => (actualMap.get(cat) || 0) === 0)
                .reduce((s, [,v]) => s + v, 0);
              if (unusedExpected > 0) {
                rows.push({ cat: 'Unused categories', actual: 0, expected: unusedExpected, variance: -unusedExpected });
              }
              if (insightsOverOnly) rows = rows.filter(r => r.actual > r.expected);
              // Chart data (top 6)
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
                  {/* Totals summary */}
                  {(() => {
                    const totalActual = Array.from(actualMap.values()).reduce((s, v) => s + v, 0);
                    const totalExpected = Array.from(expectedMap.values()).reduce((s, v) => s + v, 0);
                    const maxV = Math.max(totalActual, totalExpected, 1);
                    return (
                      <div className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between mb-2 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-500"></span><span className="text-muted-foreground">Actual</span></div>
                            <div className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-500"></span><span className="text-muted-foreground">Expected</span></div>
                          </div>
                          <div className="text-xs text-muted-foreground">Totals</div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="font-medium text-rose-600">{fmtMoney(totalActual)}</div>
                          <div className="font-medium text-indigo-600">{fmtMoney(totalExpected)}</div>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="h-1.5 rounded bg-rose-500" style={{ width: `${Math.round((totalActual / maxV) * 100)}%` }}></div>
                          <div className="h-1.5 rounded bg-indigo-500" style={{ width: `${Math.round((totalExpected / maxV) * 100)}%` }}></div>
                        </div>
                      </div>
                    );
                  })()}
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
                            <td className={`px-3 py-2 text-right ${r.variance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtMoney(Math.abs(r.variance))}</td>
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

      {compareOpen && (
        <div className="fixed inset-0 z-30 bg-black/30" onClick={()=> setCompareOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border shadow-xl p-4 overflow-auto" onClick={e=> e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Compare months</div>
              <button onClick={()=> setCompareOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5"/></button>
            </div>
            <div className="flex items-center gap-3 mb-3 flex-nowrap overflow-x-auto">
              <div className="text-sm text-muted-foreground">Month A</div>
              <input type="month" value={compareMonthA} onChange={e=> setCompareMonthA(e.target.value)} className="h-9 w-40 rounded-md border border-border px-2 bg-card" />
              <div className="text-sm text-muted-foreground ml-2">Month B</div>
              <input type="month" value={compareMonthB} onChange={e=> setCompareMonthB(e.target.value)} className="h-9 w-40 rounded-md border border-border px-2 bg-card" />
            </div>
            {(() => {
              if (compareMonthA && compareMonthB && compareMonthA === compareMonthB) {
                return <div className="text-sm text-rose-600">Pick two different months to compare.</div>;
              }
              function totalByMonth(ym: string) {
                const map = new Map<string, number>();
                if (!ym) return map;
                for (const e of expenses) {
                  const d = toLocalDateOnly(e.date as any);
                  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                  if (key === ym) map.set(String(e.category||'Other'), (map.get(String(e.category||'Other'))||0) + Number(e.amount||0));
                }
                return map;
              }
              const aMap = totalByMonth(compareMonthA);
              const bMap = totalByMonth(compareMonthB);
              const totalA = Array.from(aMap.values()).reduce((s,v)=> s+v, 0);
              const totalB = Array.from(bMap.values()).reduce((s,v)=> s+v, 0);
              const diff = totalB - totalA;
              const rel = totalA > 0 ? Math.round((diff/totalA)*100) : (totalB>0 ? 100 : 0);
              function fmtMonth(ym: string) { if (!ym) return ""; const [y,m]=ym.split('-'); const d=new Date(Number(y), Number(m)-1, 1); return d.toLocaleString(undefined,{month:'short', year:'numeric'}); }
              let rows = Array.from(new Set([ ...Array.from(aMap.keys()), ...Array.from(bMap.keys()) ])).map(cat => {
                const a = aMap.get(cat) || 0;
                const b = bMap.get(cat) || 0;
                const d = b - a;
                const dp = a > 0 ? (d / a) * 100 : (b > 0 ? 100 : 0);
                return { cat, a, b, d, dp };
              }).sort((x,y)=> Math.abs(y.d) - Math.abs(x.d));
              const shown = compareShowAll ? rows : rows.slice(0,10);
              return (
                <>
                  <div className="rounded-lg border border-border p-3 mb-3">
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-500"></span><span className="text-muted-foreground">{fmtMonth(compareMonthA) || 'Month A'}</span></div>
                        <div className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500"></span><span className="text-muted-foreground">{fmtMonth(compareMonthB) || 'Month B'}</span></div>
                      </div>
                      <div className="text-xs text-muted-foreground">Totals</div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="font-medium text-sky-600">{fmtMoney(totalA)}</div>
                      <div className="font-medium text-emerald-600">{fmtMoney(totalB)}</div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 rounded bg-sky-500" style={{ width: `${totalA > 0 || totalB > 0 ? Math.round((totalA/Math.max(totalA,totalB||1))*100) : 0}%` }}></div>
                      <div className="h-1.5 rounded bg-emerald-500" style={{ width: `${totalA > 0 || totalB > 0 ? Math.round((totalB/Math.max(totalA,totalB||1))*100) : 0}%` }}></div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-card">
                        <tr>
                          <th className="px-3 py-2 border-b text-left">Category</th>
                          <th className="px-3 py-2 border-b text-right">{compareMonthA || 'Month A'}</th>
                          <th className="px-3 py-2 border-b text-right">{compareMonthB || 'Month B'}</th>
                          <th className="px-3 py-2 border-b text-right">Diff</th>
                          <th className="px-3 py-2 border-b text-left">Viz</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map(r => (
                          <tr key={r.cat} className="border-b">
                            <td className="px-3 py-2">{r.cat}</td>
                            <td className="px-3 py-2 text-right">{fmtMoney(r.a)}</td>
                            <td className="px-3 py-2 text-right">{fmtMoney(r.b)}</td>
                            <td className={`px-3 py-2 text-right ${r.d > 0 ? 'text-rose-600' : (r.d < 0 ? 'text-emerald-600' : '')}`}>{fmtMoney(Math.abs(r.d))}</td>
                            <td className="px-3 py-2">
                              {(() => { const scale = Math.max(1, ...shown.map(x=> Math.max(x.a, x.b))); return (
                                <div className="w-40">
                                  <div className="h-1.5 rounded bg-sky-500" style={{ width: `${Math.round((r.a/scale)*100)}%` }}></div>
                                  <div className="h-1.5 rounded bg-emerald-500 mt-1" style={{ width: `${Math.round((r.b/scale)*100)}%` }}></div>
                                </div>
                              ); })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 10 && (
                    <div className="mt-3 flex justify-end">
                      <Button variant="outline" size="sm" onClick={()=> setCompareShowAll(v=> !v)}>{compareShowAll ? 'Show top 10' : 'Show all'}</Button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
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
              {(() => {
                const cats = allCategories.length ? allCategories : Object.keys(defaultCategoryBudgets||{});
                const totalThis = cats.reduce((s,c)=> {
                  const str = draftInputs[c];
                  const n = Number(str);
                  const v = Number.isFinite(n) ? n : (baselineBudgets[c] || 0);
                  return s + v;
                }, 0);
                return (
                <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border p-3"><div className="text-muted-foreground">Total {currentYm} budget</div><div className="font-medium">{fmtMoney(totalThis)}</div></div>
                  <div className="rounded-lg border border-border p-3"><div className="text-muted-foreground">Categories</div><div className="font-medium">{cats.length}</div></div>
                </div>
              ) })()}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...allCategories].sort((a,b)=>{
                  const ordered = [
                    "Food",
                    "Travel",
                    "Shopping",
                    "Utilities",
                    "Housing",
                    "Healthcare",
                    "Entertainment",
                    "Investment",
                    "Loans",
                    "Insurance",
                    "Grooming",
                    "Subscription",
                    "Education",
                    "Taxes",
                    "Gifts",
                    "Pet Care",
                    "Other",
                  ];
                  const order: Record<string, number> = Object.fromEntries(ordered.map((k,i)=> [k, i+1]));
                  const wa = order[a] ?? 999;
                  const wb = order[b] ?? 999;
                  if (wa !== wb) return wa - wb;
                  return a.localeCompare(b);
                }).map(cat => {
                  const n = Number(draftInputs[cat]);
                  const valueToShow = Number.isFinite(n) ? n : (baselineBudgets[cat] || 0);
                  const hasCur = overridesByMonth?.[currentYm]?.[cat] !== undefined;
                  const isOverride = Number.isFinite(n) ? (n !== (baselineBudgets[cat] || 0)) : false;
                  return (
                  <div key={cat} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="text-sm font-semibold flex items-center justify-between"><span>{cat}</span>{(hasCur ? true : isOverride) ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-400/30">Overridden</span> : null}</div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">Budget</div>
                      <input
                        type="number"
                        step="0.01"
                        value={String(draftInputs[cat] ?? '')}
                        onChange={(e)=> {
                          const num = Number(e.target.value);
                          setDraftInputs(prev=> ({...prev, [cat]: e.target.value}));
                          if (Number.isFinite(num)) setDraftBudgets(prev=> ({...prev, [cat]: num}));
                        }}
                        className="h-9 w-28 rounded-md border border-border px-2 bg-background text-right"
                      />
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
              <Button variant="outline" onClick={()=> setShowBudgetsModal(false)}>Cancel</Button>
              <Button onClick={async ()=> {
                const baseMonth = {} as Record<string, number>;
                Object.entries(draftBudgets).forEach(([cat, val]) => {
                  const base = baselineBudgets[cat] || 0;
                  const v = Number(val) || 0;
                  if (v !== base) baseMonth[cat] = v;
                });
                const nextOverrides = { ...(overridesByMonth || {}), [currentYm]: baseMonth };
                const nextDefaults = { ...(defaultCategoryBudgets || {}), ...tempDefaultBudgets };
                try { await fetch(`/api/budgets`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "demo", defaultBudgets: nextDefaults, overrides: nextOverrides }) }); } catch {}
                (useApp.getState() as any).setDefaultCategoryBudgets(nextDefaults);
                setOverridesByMonth(nextOverrides);
                setTempDefaultBudgets({}); setTempOverrideBudgets({}); setDraftBudgets({}); setBaselineBudgets({}); setDraftInputs({});
                setShowBudgetsModal(false);
              }}>Save</Button>
            </div>
          </div>
        </div>
      )}
      {/* Export CSV Modal */}
      {exportOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 flex items-center justify-center p-4" onClick={()=> setExportOpen(false)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-card text-foreground shadow-xl" onClick={e=> e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="font-semibold">Export CSV</div>
              <button className="text-muted-foreground hover:text-foreground" onClick={()=> setExportOpen(false)}><X className="h-5 w-5"/></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm text-muted-foreground">Choose a date range to export. Uses local time boundaries.</div>
              <div className="flex flex-wrap gap-2 items-center">
                <label className="text-sm text-muted-foreground">Range</label>
                <select value={exportPreset} onChange={(e)=> setExportPreset(e.target.value as any)} className="h-9 rounded-md border border-border px-2 bg-card">
                  <option value="all">All</option>
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                  <option value="lastMonth">Last month</option>
                  <option value="custom">Custom</option>
                </select>
                {exportPreset === 'custom' && (
                  <>
                    <input type="date" value={exportStart} onChange={(e)=> setExportStart(e.target.value)} className="h-9 rounded-md border border-border px-2 bg-card" />
                    <span className="text-sm text-muted-foreground">to</span>
                    <input type="date" value={exportEnd} onChange={(e)=> setExportEnd(e.target.value)} className="h-9 rounded-md border border-border px-2 bg-card" />
                  </>
                )}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
              <Button variant="outline" onClick={()=> setExportOpen(false)}>Cancel</Button>
              <Button onClick={()=>{
                const sod = (dt: Date) => { const x = new Date(dt); x.setHours(0,0,0,0); return x; };
                const startOfWeek = (dt: Date) => { const x = sod(dt); const day = x.getDay(); const diff = (day === 0 ? 6 : day - 1); x.setDate(x.getDate() - diff); return x; };
                const endExclusive = (dt: Date) => { const x = sod(dt); x.setDate(x.getDate() + 1); return x; };
                let start: Date | undefined; let end: Date | undefined;
                const now = new Date();
                if (exportPreset === 'today') { start = sod(now); end = start; }
                else if (exportPreset === 'week') { start = startOfWeek(now); end = new Date(start); end.setDate(start.getDate() + 6); }
                else if (exportPreset === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth()+1, 0); }
                else if (exportPreset === 'lastMonth') { const s = new Date(now.getFullYear(), now.getMonth()-1, 1); start = s; end = new Date(now.getFullYear(), now.getMonth(), 0); }
                else if (exportPreset === 'custom') { start = exportStart ? new Date(exportStart) : undefined; end = exportEnd ? new Date(exportEnd) : undefined; }
                const startS = start ? sod(start) : undefined;
                const endE = end ? endExclusive(end) : undefined;
                const filtered = expenses.filter((e: Expense) => {
                  const d0 = new Date(e.date as any);
                  const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate());
                  if (startS && d < startS) return false;
                  if (endE && d >= endE) return false;
                  return true;
                });
                exportCsvFrom(filtered);
                setExportOpen(false);
              }}>Export</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
