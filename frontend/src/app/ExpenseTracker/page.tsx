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
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());
  const [expandedBudgets, setExpandedBudgets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Mobile App Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white sticky top-0 z-20 shadow-lg">
        <div className="px-4 py-6 pb-8">
          {/* App Title */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">💰 Expenses</h1>
              <p className="text-blue-100 text-sm opacity-90">Track your spending</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={()=> setPrivacy(!privacy)}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                {privacy ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
              <button 
                onClick={()=> setShowBudgetsModal(true)}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <Settings2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mobile Quick Add */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input 
                ref={inputRef} 
                value={input} 
                onChange={e=>setInput(e.target.value)} 
                className="w-full h-14 px-4 pr-14 rounded-2xl bg-white/95 backdrop-blur-sm text-gray-900 placeholder-gray-500 text-base font-medium border-0 focus:ring-4 focus:ring-white/30 shadow-lg"
                placeholder="Coffee 150 or Lunch 320..."
              />
              <button 
                type="button" 
                onClick={()=> setDateOpen(!dateOpen)} 
                className={`absolute right-2 top-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  dateOpen ? 'bg-blue-500 text-white' : 'bg-white/50 text-gray-600 hover:bg-white/80'
                }`}
              >
                <Calendar className="h-5 w-5" />
              </button>
            </div>
            
            {dateOpen && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e)=> setSelectedDate(e.target.value)} 
                  className="w-full h-12 px-4 rounded-xl bg-white/95 backdrop-blur-sm text-gray-900 border-0 focus:ring-4 focus:ring-white/30"
                />
              </div>
            )}
            
            <button 
              type="submit"
              disabled={loading || !input.trim()}
              className="w-full h-14 bg-white text-blue-600 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? "✨ Adding..." : "➕ Add Expense"}
            </button>
          </form>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-2xl p-1">
          <button
            onClick={() => setActiveTab("data")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "data" 
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-md transform scale-105' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            📊 Transactions
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "insights" 
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-md transform scale-105' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            📈 Analytics
          </button>
        </div>
      </div>
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
        {/* Tabs */}
        <div className="px-4 pb-3">
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button onClick={()=> setActiveTab("data")} className={`px-4 py-2 text-sm ${activeTab==='data' ? 'bg-card text-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>Data</button>
            <button onClick={()=> setActiveTab("insights")} className={`px-4 py-2 text-sm ${activeTab==='insights' ? 'bg-card text-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>Insights</button>
          </div>
        </div>
      </div>

      {/* Mobile Main Content */}
      <div className="px-4 py-4 space-y-6">
        {activeTab === "data" ? (
          <>
            {/* Mobile Filters */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              <select
                value={preset}
                onChange={e => setPreset(e.target.value as any)}
                className="flex-shrink-0 h-10 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="custom">Custom</option>
              </select>
              
              {preset === "custom" && (
                <>
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="flex-shrink-0 h-10 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="flex-shrink-0 h-10 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm"
                  />
                </>
              )}
            </div>

            {/* Mobile Expense List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Transactions</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {pageRows.length} of {sortedExpenses.length} expenses
                </p>
              </div>
              
              {/* Mobile Transaction Cards */}
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {pageRows.length > 0 ? (
                  pageRows.map(expense => {
                    const isExpanded = expandedExpenses.has(expense.id);
                    const amount = expense.amount || 0;
                    
                    // Category icons and colors
                    const getCategoryData = (category: string) => {
                      const data: Record<string, {icon: string, color: string}> = {
                        "Food": {icon: "🍽️", color: "bg-orange-100 text-orange-600"},
                        "Travel": {icon: "✈️", color: "bg-blue-100 text-blue-600"},
                        "Shopping": {icon: "🛍️", color: "bg-pink-100 text-pink-600"},
                        "Utilities": {icon: "⚡", color: "bg-yellow-100 text-yellow-600"},
                        "Housing": {icon: "🏠", color: "bg-green-100 text-green-600"},
                        "Healthcare": {icon: "🩺", color: "bg-red-100 text-red-600"},
                        "Entertainment": {icon: "🎬", color: "bg-purple-100 text-purple-600"},
                        "Investment": {icon: "📈", color: "bg-emerald-100 text-emerald-600"},
                        "Other": {icon: "💸", color: "bg-gray-100 text-gray-600"}
                      };
                      return data[category] || data["Other"];
                    };
                    
                    const categoryData = getCategoryData(expense.category as string);
                    const formatDate = (dateStr: string) => {
                      const date = new Date(dateStr);
                      const today = new Date();
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      
                      if (date.toDateString() === today.toDateString()) return "Today";
                      if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
                      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
                    };
                    
                    return (
                      <div key={expense.id} className="p-4">
                        <div 
                          className="flex items-center space-x-3 active:bg-gray-50 dark:active:bg-gray-700 rounded-xl p-2 -m-2 transition-colors"
                          onClick={() => {
                            const newExpanded = new Set(expandedExpenses);
                            if (isExpanded) {
                              newExpanded.delete(expense.id);
                            } else {
                              newExpanded.add(expense.id);
                            }
                            setExpandedExpenses(newExpanded);
                          }}
                        >
                          {/* Category Icon */}
                          <div className={`w-12 h-12 rounded-2xl ${categoryData.color} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-xl">{categoryData.icon}</span>
                          </div>
                          
                          {/* Transaction Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-gray-900 dark:text-white truncate text-base">
                                {expense.text || expense.category}
                              </h3>
                              <span className="font-bold text-lg text-gray-900 dark:text-white ml-3">
                                {privacy ? "•••••" : `₹${amount.toLocaleString('en-IN')}`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {expense.category} • {formatDate(expense.date as string)}
                              </span>
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                {isExpanded ? 'Tap to close' : 'Tap for details'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 block">Category</span>
                                <span className="font-medium text-gray-900 dark:text-white">{expense.category}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 block">Amount</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {privacy ? "•••••" : `₹${amount.toLocaleString('en-IN')}`}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 block">Date</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {fmtDateYYYYMMDDLocal(expense.date)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 block">Added</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {formatDate(expense.createdAt || expense.date as string)}
                                </span>
                              </div>
                            </div>
                            
                            {expense.text && (
                              <div className="mb-4">
                                <span className="text-gray-500 dark:text-gray-400 text-sm block mb-1">Description</span>
                                <p className="font-medium text-gray-900 dark:text-white">{expense.text}</p>
                              </div>
                            )}
                            
                            <div className="flex justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(expense.id);
                                }}
                                className="px-4 py-2 bg-red-500 text-white rounded-xl font-medium text-sm hover:bg-red-600 active:scale-95 transition-all"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-3xl">💸</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No expenses found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Add your first expense using the form above</p>
                  </div>
                )}
              </div>

              {/* Mobile Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={prev}
                        disabled={page === 1}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                      >
                        ← Prev
                      </button>
                      <button
                        onClick={next}
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Budget Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Category Budgets</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentYm} spending overview
                </p>
              </div>
              
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {monthlyCategorySpend.arr.length > 0 ? (
                  monthlyCategorySpend.arr.map(([cat, spent]) => {
                    const budget = (defaultCategoryBudgets?.[cat]) || 0;
                    const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                    const isExpanded = expandedBudgets.has(cat);
                    const warn = pct >= 80 && pct < 100;
                    const alert = pct >= 100;
                    
                    // Category styling
                    const getCategoryData = (category: string) => {
                      const data: Record<string, {icon: string, color: string}> = {
                        "Food": {icon: "🍽️", color: "bg-orange-100 text-orange-600"},
                        "Travel": {icon: "✈️", color: "bg-blue-100 text-blue-600"},
                        "Shopping": {icon: "🛍️", color: "bg-pink-100 text-pink-600"},
                        "Utilities": {icon: "⚡", color: "bg-yellow-100 text-yellow-600"},
                        "Housing": {icon: "🏠", color: "bg-green-100 text-green-600"},
                        "Healthcare": {icon: "🩺", color: "bg-red-100 text-red-600"},
                        "Entertainment": {icon: "🎬", color: "bg-purple-100 text-purple-600"},
                        "Investment": {icon: "📈", color: "bg-emerald-100 text-emerald-600"},
                        "Other": {icon: "💸", color: "bg-gray-100 text-gray-600"}
                      };
                      return data[category] || data["Other"];
                    };
                    
                    const categoryData = getCategoryData(cat);
                    
                    return (
                      <div key={cat} className="p-4">
                        <div 
                          className="flex items-center space-x-3 active:bg-gray-50 dark:active:bg-gray-700 rounded-xl p-2 -m-2 transition-colors"
                          onClick={() => {
                            const newExpanded = new Set(expandedBudgets);
                            if (isExpanded) {
                              newExpanded.delete(cat);
                            } else {
                              newExpanded.add(cat);
                            }
                            setExpandedBudgets(newExpanded);
                          }}
                        >
                          {/* Category Icon */}
                          <div className={`w-12 h-12 rounded-2xl ${categoryData.color} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-xl">{categoryData.icon}</span>
                          </div>
                          
                          {/* Budget Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-gray-900 dark:text-white text-base">{cat}</h3>
                              <span className={`font-bold text-sm px-2 py-1 rounded-full ${
                                alert ? 'bg-red-100 text-red-600' : 
                                warn ? 'bg-amber-100 text-amber-600' : 
                                'bg-green-100 text-green-600'
                              }`}>
                                {budget > 0 ? `${pct}%` : 'No budget'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {privacy ? "•••" : `₹${spent.toLocaleString('en-IN')}`} spent
                              </span>
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                {isExpanded ? 'Tap to close' : 'Tap for details'}
                              </span>
                            </div>
                            
                            {/* Progress Bar */}
                            {budget > 0 && (
                              <div className="mt-2">
                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      alert ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Expanded Budget Details */}
                        {isExpanded && (
                          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 block">Spent</span>
                                <span className="font-bold text-lg text-gray-900 dark:text-white">
                                  {privacy ? "•••••" : `₹${spent.toLocaleString('en-IN')}`}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 block">Budget</span>
                                <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                                  {budget > 0 ? (privacy ? "•••••" : `₹${budget.toLocaleString('en-IN')}`) : "Not Set"}
                                </span>
                              </div>
                            </div>
                            
                            {budget > 0 && (
                              <div className="mb-4">
                                <span className="text-gray-500 dark:text-gray-400 text-sm block mb-2">Progress</span>
                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                                  <div 
                                    className={`h-3 rounded-full transition-all duration-500 ${
                                      alert ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  <span>₹0</span>
                                  <span>{privacy ? "•••" : `₹${budget.toLocaleString('en-IN')}`}</span>
                                </div>
                              </div>
                            )}
                            
                            <div className="mb-4">
                              <span className="text-gray-500 dark:text-gray-400 text-sm block mb-1">Status</span>
                              <p className={`font-medium ${
                                alert ? 'text-red-600' : warn ? 'text-amber-600' : 'text-green-600'
                              }`}>
                                {!budget ? "No budget set for this category" : 
                                 alert ? `Over budget by ${privacy ? '•••' : `₹${(spent - budget).toLocaleString('en-IN')}`}` :
                                 warn ? `Approaching limit - ${privacy ? '•••' : `₹${(budget - spent).toLocaleString('en-IN')}`} remaining` :
                                 `On track - ${privacy ? '•••' : `₹${(budget - spent).toLocaleString('en-IN')}`} remaining`
                                }
                              </p>
                            </div>
                            
                            <div className="flex justify-end">
                              {editingCat === cat ? (
                                <div className="flex items-center space-x-2">
                                  <input
                                    autoFocus
                                    type="number"
                                    step="0.01"
                                    value={editingVal}
                                    onChange={e => setEditingVal(e.target.value)}
                                    onBlur={() => saveBudget(cat)}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") saveBudget(cat);
                                      else if (e.key === "Escape") { setEditingCat(null); setEditingVal(""); }
                                    }}
                                    className="w-24 h-8 px-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-right text-sm"
                                    placeholder="Budget"
                                  />
                                  <button
                                    onClick={() => saveBudget(cat)}
                                    className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-xl font-medium hover:bg-green-600 active:scale-95 transition-all"
                                  >
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setEditingCat(cat);
                                    setEditingVal(String(budget || 0));
                                  }}
                                  className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium text-sm hover:bg-blue-600 active:scale-95 transition-all"
                                >
                                  {budget > 0 ? '✏️ Edit Budget' : '💰 Set Budget'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-3xl">💰</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No spending data</h3>
                    <p className="text-gray-500 dark:text-gray-400">Add some expenses to see budget insights</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-3xl">📈</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Analytics Coming Soon</h2>
            <p className="text-gray-500 dark:text-gray-400">Advanced insights and charts will be available here</p>
          </div>
        )}
      </div>
    </div>
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

        {/* Monthly */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Actual vs Expected (prorated by day)</CardTitle>
            <CardDescription>Compare spend vs budget for your selected range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex flex-wrap gap-2 items-center">
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
