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
  const [dateOpen, setDateOpen] = useState(false);
  
  // Insights controls
  const [insightsPreset, setInsightsPreset] = useState<"today"|"week"|"month"|"lastMonth"|"custom">("month");
  const [insightsStart, setInsightsStart] = useState<string>("");
  const [insightsEnd, setInsightsEnd] = useState<string>("");
  const [insightsOverOnly, setInsightsOverOnly] = useState(false);
  
  // Compare months functionality  
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareMonthA, setCompareMonthA] = useState<string>("");
  const [compareMonthB, setCompareMonthB] = useState<string>("");
  const [compareShowAll, setCompareShowAll] = useState(false);
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
  function toLocalDateOnly(dateStr: string) {
    try {
      const dt = new Date(dateStr);
      return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    } catch {
      return new Date();
    }
  }

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

function getMonthlyBudgetFor(ym: string, cat: string): number {
  const d = (defaultCategoryBudgets || {})[cat] || 0;
  return Number(d) || 0;
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
    <>
      {/* Mobile View (< 768px) */}
      <div className="block md:hidden min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
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
          <div className="space-y-6">
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Total Spent This Month */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs font-medium opacity-90">This Month</p>
                    <p className="text-xl font-bold mt-1">
                      {privacy ? "•••••" : `₹${monthSpend.toLocaleString('en-IN')}`}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-lg">💰</span>
                  </div>
                </div>
              </div>

              {/* Budget Usage */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-xs font-medium opacity-90">Budget Used</p>
                    <p className="text-xl font-bold mt-1">
                      {privacy ? "•••" : `${budgetUsedPct}%`}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-lg">📊</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Category & Transaction Count */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-xs font-medium opacity-90">Top Category</p>
                    <p className="text-lg font-bold mt-1 truncate">
                      {topCategory === "—" ? "None" : topCategory}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-lg">🏆</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-xs font-medium opacity-90">Transactions</p>
                                      <p className="text-xl font-bold mt-1">
                    {sortedExpenses.length}
                  </p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-lg">📝</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Spending by Category Chart */}
            {monthlyCategorySpend.arr.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="text-xl mr-2">🍰</span>
                  Category Breakdown
                </h3>
                <div className="relative h-64 flex items-center justify-center">
                  <Doughnut
                    data={{
                      labels: monthlyCategorySpend.arr.map(([cat]) => cat),
                      datasets: [{
                        data: monthlyCategorySpend.arr.map(([_, spent]) => spent),
                        backgroundColor: [
                          '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', 
                          '#EF4444', '#06B6D4', '#84CC16', '#F97316',
                          '#EC4899', '#6366F1', '#14B8A6', '#F59E0B'
                        ],
                        borderWidth: 0,
                        hoverOffset: 8
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                          cornerRadius: 8,
                          callbacks: {
                            label: function(context) {
                              const percentage = ((context.parsed / monthSpend) * 100).toFixed(1);
                              return ` ${context.label}: ₹${context.parsed.toLocaleString('en-IN')} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
                
                {/* Category Legend */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {monthlyCategorySpend.arr.slice(0, 6).map(([cat, spent], index) => {
                    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-cyan-500'];
                    const percentage = ((spent / monthSpend) * 100).toFixed(1);
                    return (
                      <div key={cat} className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${colors[index] || 'bg-gray-500'}`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{cat}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {privacy ? "•••" : `₹${spent.toLocaleString('en-IN')}`} ({percentage}%)
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Spending Trends */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="text-xl mr-2">📈</span>
                Spending Insights
              </h3>
              
              <div className="space-y-4">
                {/* Average Transaction */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400">📊</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Average Transaction</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Per expense</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {privacy ? "•••" : sortedExpenses.length > 0 ? `₹${Math.round(monthSpend / sortedExpenses.length).toLocaleString('en-IN')}` : "₹0"}
                  </p>
                </div>

                {/* Daily Average */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <span className="text-green-600 dark:text-green-400">📅</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Daily Average</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">This month</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {privacy ? "•••" : `₹${Math.round(monthSpend / new Date().getDate()).toLocaleString('en-IN')}`}
                  </p>
                </div>

                {/* Most Expensive */}
                {sortedExpenses.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 dark:text-purple-400">💎</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Highest Expense</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Single transaction</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {privacy ? "•••" : `₹${Math.max(...sortedExpenses.map(e => e.amount)).toLocaleString('en-IN')}`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Budget Health */}
            {totalBudget > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="text-xl mr-2">🎯</span>
                  Budget Health
                </h3>
                
                <div className="space-y-4">
                  {/* Overall Progress */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Overall Budget</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {privacy ? "•••" : `${budgetUsedPct}%`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-2">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          budgetUsedPct >= 100 ? 'bg-red-500' : 
                          budgetUsedPct >= 80 ? 'bg-amber-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, budgetUsedPct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{privacy ? "•••" : `₹${monthSpend.toLocaleString('en-IN')} spent`}</span>
                      <span>{privacy ? "•••" : `₹${totalBudget.toLocaleString('en-IN')} total`}</span>
                    </div>
                  </div>

                  {/* Budget Status */}
                  <div className={`p-4 rounded-xl border ${
                    budgetUsedPct >= 100 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30' :
                    budgetUsedPct >= 80 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30' :
                    'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        budgetUsedPct >= 100 ? 'bg-red-100 dark:bg-red-900/30' :
                        budgetUsedPct >= 80 ? 'bg-amber-100 dark:bg-amber-900/30' :
                        'bg-green-100 dark:bg-green-900/30'
                      }`}>
                        <span className="text-lg">
                          {budgetUsedPct >= 100 ? '🚨' : budgetUsedPct >= 80 ? '⚠️' : '✅'}
                        </span>
                      </div>
                      <div>
                        <p className={`font-medium ${
                          budgetUsedPct >= 100 ? 'text-red-700 dark:text-red-400' :
                          budgetUsedPct >= 80 ? 'text-amber-700 dark:text-amber-400' :
                          'text-green-700 dark:text-green-400'
                        }`}>
                          {budgetUsedPct >= 100 ? 'Over Budget!' :
                           budgetUsedPct >= 80 ? 'Approaching Limit' :
                           'On Track'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {budgetUsedPct >= 100 ? 
                            `Exceeded by ${privacy ? '•••' : `₹${(monthSpend - totalBudget).toLocaleString('en-IN')}`}` :
                            `${privacy ? '•••' : `₹${(totalBudget - monthSpend).toLocaleString('en-IN')}`} remaining`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State for New Users */}
            {sortedExpenses.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Data Yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Add some expenses to see beautiful insights!</p>
                <button 
                  onClick={() => setActiveTab("data")} 
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  Start Adding Expenses
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

      {/* Desktop/Web View (≥ 768px) - Original Layout */}
      <div className="hidden md:flex flex-col h-[calc(100vh-5rem)] overflow-hidden">
        {/* Sticky Command Bar */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-4 p-4">
            {/* Chat input */}
            <div>
              <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                <input 
                  ref={inputRef} 
                  value={input} 
                  onChange={e=>setInput(e.target.value)} 
                  className="flex-1 h-11 rounded-xl border border-border px-3 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]" 
                  placeholder="e.g., Lunch 250 at restaurant"
                />
                <button 
                  type="button" 
                  aria-label="Set date" 
                  title="Set date" 
                  onClick={()=> setDateOpen(o=>!o)} 
                  className={`h-11 w-11 inline-flex items-center justify-center rounded-xl border ${dateOpen ? 'border-emerald-400 text-emerald-600' : 'border-border text-muted-foreground'} bg-card hover:bg-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]`}
                >
                  <Calendar className="h-4 w-4" />
                </button>
                {dateOpen && (
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e)=> setSelectedDate(e.target.value)} 
                    className="h-11 rounded-xl border border-border px-3 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]" 
                  />
                )}
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add Expense"}
                </Button>
              </form>
            </div>
            
            {/* Actions */}
            <div className="flex items-start justify-end gap-2">
              <Button variant="outline" onClick={()=> setShowBudgetsModal(true)}>
                <Settings2 className="h-4 w-4 mr-2"/>
                Budgets
              </Button>
              <Button variant="outline" onClick={()=> setPrivacy(!privacy)}>
                {privacy ? <EyeOff className="h-4 w-4 mr-2"/> : <Eye className="h-4 w-4 mr-2"/>}
                {privacy ? "Show" : "Hide"}
              </Button>
              <Button variant="outline" onClick={()=> exportCsvFrom(sortedExpenses)}>
                <Download className="h-4 w-4 mr-2"/>
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="px-4 pb-3 border-b border-border">
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button 
              onClick={()=> setActiveTab("data")} 
              className={`px-4 py-2 text-sm ${activeTab==='data' ? 'bg-card text-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            >
              Data
            </button>
            <button 
              onClick={()=> setActiveTab("insights")} 
              className={`px-4 py-2 text-sm ${activeTab==='insights' ? 'bg-card text-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            >
              Insights
            </button>
          </div>
        </div>

        {/* Desktop Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === "data" ? (
            <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4 p-4 h-full">
              {/* Data Table */}
              <Card className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Expense Tracker</CardTitle>
                    <CardDescription>
                      {pageRows.length} of {sortedExpenses.length} expenses
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      value={preset} 
                      onChange={(e)=> setPreset(e.target.value as any)} 
                      className="h-9 rounded-md border border-border px-2 bg-card"
                    >
                      <option value="all">All time</option>
                      <option value="today">Today</option>
                      <option value="week">This week</option>
                      <option value="month">This month</option>
                      <option value="lastMonth">Last month</option>
                      <option value="custom">Custom</option>
                    </select>
                    {preset === "custom" && (
                      <>
                        <input 
                          type="date" 
                          value={customStart} 
                          onChange={e=> setCustomStart(e.target.value)} 
                          className="h-9 rounded-md border border-border px-2 bg-card" 
                        />
                        <span className="text-sm text-muted-foreground">to</span>
                        <input 
                          type="date" 
                          value={customEnd} 
                          onChange={e=> setCustomEnd(e.target.value)} 
                          className="h-9 rounded-md border border-border px-2 bg-card" 
                        />
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {pageRows.length > 0 ? (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-card">
                        <tr>
                          <th className="px-3 py-2 border-b text-left">
                            <button 
                              className="flex items-center gap-1 hover:opacity-80" 
                              onClick={()=> {
                                setSortField("date");
                                setSortDir(sortField === "date" && sortDir === "desc" ? "asc" : "desc");
                              }}
                            >
                              Date
                              {sortField === "date" && (sortDir === "desc" ? <ArrowDown className="h-3 w-3"/> : <ArrowUp className="h-3 w-3"/>)}
                            </button>
                          </th>
                          <th className="px-3 py-2 border-b text-left">
                            <button 
                              className="flex items-center gap-1 hover:opacity-80" 
                              onClick={()=> {
                                setSortField("category");
                                setSortDir(sortField === "category" && sortDir === "desc" ? "asc" : "desc");
                              }}
                            >
                              Category
                              {sortField === "category" && (sortDir === "desc" ? <ArrowDown className="h-3 w-3"/> : <ArrowUp className="h-3 w-3"/>)}
                            </button>
                          </th>
                          <th className="px-3 py-2 border-b text-left">Description</th>
                          <th className="px-3 py-2 border-b text-right">
                            <button 
                              className="flex items-center gap-1 hover:opacity-80" 
                              onClick={()=> {
                                setSortField("amount");
                                setSortDir(sortField === "amount" && sortDir === "desc" ? "asc" : "desc");
                              }}
                            >
                              Amount
                              {sortField === "amount" && (sortDir === "desc" ? <ArrowDown className="h-3 w-3"/> : <ArrowUp className="h-3 w-3"/>)}
                            </button>
                          </th>
                          <th className="px-3 py-2 border-b text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map(expense => (
                          <tr key={expense.id} className="hover:bg-muted/50">
                            <td className="px-3 py-2 border-b text-sm">
                              {fmtDateYYYYMMDDLocal(expense.date as any)}
                            </td>
                            <td className="px-3 py-2 border-b text-sm">
                              <span className="px-2 py-1 bg-muted rounded-md text-xs">
                                {expense.category || "Other"}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-b text-sm">
                              {expense.text}
                            </td>
                            <td className="px-3 py-2 border-b text-sm text-right font-medium">
                              {privacy ? "•••••" : `₹${expense.amount.toLocaleString('en-IN')}`}
                            </td>
                            <td className="px-3 py-2 border-b text-center">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={()=> deleteExpense(expense.id)}
                                className="h-7 w-7 p-0"
                              >
                                <X className="h-3 w-3"/>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No expenses found for the selected period.</p>
                    <p className="text-sm mt-1">Add your first expense above!</p>
                  </div>
                )}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={prev} disabled={page <= 1}>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" onClick={next} disabled={page >= totalPages}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sidebar */}
              <div className="space-y-4">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">This month</span>
                    <span className="font-medium">
                      {privacy ? "•••••" : `₹${monthSpend.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Today</span>
                    <span className="font-medium">
                      {privacy ? "•••••" : `₹${todaySpend.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget used</span>
                    <span className="font-medium">
                      {privacy ? "•••" : `${budgetUsedPct}%`}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Top Categories */}
              {categorySummary.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {categorySummary.slice(0, 5).map(([cat, spent]) => {
                        const pct = monthSpend > 0 ? Math.round((spent / monthSpend) * 100) : 0;
                        return (
                          <div key={cat} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{cat}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {privacy ? "•••" : `₹${spent.toLocaleString('en-IN')}`}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({pct}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Budget Overview */}
              {monthlyCategorySpend.arr.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Budget Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {monthlyCategorySpend.arr.slice(0, 3).map(([cat, spent]) => {
                      const budget = (defaultCategoryBudgets?.[cat]) || 0;
                      const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                      return (
                        <div key={cat} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{cat}</span>
                            <span className="font-medium">
                              {privacy ? "•••" : `₹${spent.toLocaleString('en-IN')}`}
                              {budget > 0 && (
                                <span className="text-muted-foreground ml-1">
                                  / {privacy ? "•••" : `₹${budget.toLocaleString('en-IN')}`}
                                </span>
                              )}
                            </span>
                          </div>
                          {budget > 0 && (
                            <Progress 
                              value={Math.min(100, pct)} 
                              className="h-2"
                              barClassName={pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-green-500"}
                            />
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Category Budgets with Warnings */}
              {monthlyCategorySpend.arr.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Category Budgets</CardTitle>
                    <CardDescription>{currentYm} budgets and usage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {monthlyCategorySpend.arr.map(([cat, spent]) => {
                        const budget = (defaultCategoryBudgets?.[cat]) || 0;
                        const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                        const warn = pct >= 80 && pct < 100;
                        const alert = pct >= 100;
                        
                        return (
                          <div key={cat} className="rounded-lg border border-border p-3">
                            <div className="flex items-center justify-between text-sm">
                              <div className="font-medium flex items-center gap-2">
                                {cat}
                                {alert && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">OVER BUDGET</span>}
                                {warn && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">WARNING</span>}
                              </div>
                              <div className="text-muted-foreground">
                                {privacy ? "•••" : `₹${spent.toLocaleString('en-IN')}`}
                                <span className="mx-1">/</span>
                                {budget > 0 ? (
                                  <span className="font-medium">{privacy ? "•••" : `₹${budget.toLocaleString('en-IN')}`}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No budget set</span>
                                )}
                              </div>
                            </div>
                            {budget > 0 && (
                              <Progress 
                                value={Math.min(100, pct)} 
                                className="mt-2 h-2"
                                barClassName={alert ? "bg-red-500" : warn ? "bg-amber-500" : "bg-green-500"}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            </div>
          ) : (
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-4">
              {/* Category Share */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Share</CardTitle>
                  <CardDescription>Spending distribution for selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyCategorySpend.arr.length > 0 ? (
                    <div className="mx-auto max-w-xs">
                      <Doughnut 
                        data={{
                          labels: monthlyCategorySpend.arr.map(([cat]) => cat),
                          datasets: [{
                            data: monthlyCategorySpend.arr.map(([_, spent]) => spent),
                            backgroundColor: [
                              "#6366f1", "#10b981", "#f59e42", "#fbbf24", 
                              "#3b82f6", "#ef4444", "#a3e635", "#f97316",
                              "#ec4899", "#8b5cf6", "#06b6d4", "#84cc16"
                            ]
                          }]
                        }} 
                        options={{
                          plugins: { 
                            legend: { position: "bottom" as const } 
                          }, 
                          cutout: "70%" 
                        }} 
                      />
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm text-center py-8">
                      No data yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Budget Analysis */}
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Budget Analysis</CardTitle>
                  <CardDescription>Compare spending vs budgets for this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Overall Budget Progress */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Overall Budget</span>
                        <span className="text-lg font-bold">
                          {privacy ? "•••" : `${budgetUsedPct}%`}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(100, budgetUsedPct)} 
                        className="h-3"
                        barClassName={
                          budgetUsedPct >= 100 ? "bg-red-500" : 
                          budgetUsedPct >= 80 ? "bg-amber-500" : "bg-green-500"
                        }
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-2">
                        <span>{privacy ? "•••" : `₹${monthSpend.toLocaleString('en-IN')} spent`}</span>
                        <span>{privacy ? "•••" : `₹${totalBudget.toLocaleString('en-IN')} total`}</span>
                      </div>
                    </div>

                    {/* Category Budget Details */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Category Breakdown</h4>
                      {monthlyCategorySpend.arr.map(([cat, spent]) => {
                        const budget = (defaultCategoryBudgets?.[cat]) || 0;
                        const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                        const isOver = pct >= 100;
                        const isWarning = pct >= 80 && pct < 100;
                        
                        return (
                          <div key={cat} className="border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{cat}</span>
                                {isOver && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Over Budget</span>}
                                {isWarning && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Warning</span>}
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  {privacy ? "•••" : `₹${spent.toLocaleString('en-IN')}`}
                                </div>
                                {budget > 0 && (
                                  <div className="text-sm text-muted-foreground">
                                    of {privacy ? "•••" : `₹${budget.toLocaleString('en-IN')}`} ({pct}%)
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {budget > 0 && (
                              <div className="space-y-2">
                                <Progress 
                                  value={Math.min(100, pct)} 
                                  className="h-2"
                                  barClassName={
                                    isOver ? "bg-red-500" : 
                                    isWarning ? "bg-amber-500" : "bg-green-500"
                                  }
                                />
                                <div className="text-sm">
                                  {isOver ? (
                                    <span className="text-red-600">
                                      Over by {privacy ? "•••" : `₹${(spent - budget).toLocaleString('en-IN')}`}
                                    </span>
                                  ) : (
                                    <span className="text-green-600">
                                      {privacy ? "•••" : `₹${(budget - spent).toLocaleString('en-IN')}`} remaining
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {privacy ? "•••" : sortedExpenses.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Transactions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {privacy ? "•••" : sortedExpenses.length > 0 ? `₹${Math.round(monthSpend / sortedExpenses.length).toLocaleString('en-IN')}` : "₹0"}
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Transaction</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {privacy ? "•••" : monthlyCategorySpend.arr.length > 0 ? monthlyCategorySpend.arr[0][0] : "None"}
                        </div>
                        <div className="text-sm text-muted-foreground">Top Category</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Budgets Modal */}
      {showBudgetsModal && (
        <div className="fixed inset-0 z-30 bg-black/30 flex items-center justify-center p-4" onClick={()=> setShowBudgetsModal(false)}>
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card text-foreground shadow-xl" onClick={e=> e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="font-semibold">Set Budgets</div>
              <button 
                className="text-muted-foreground hover:text-foreground" 
                onClick={()=> setShowBudgetsModal(false)}
              >
                <X className="h-5 w-5"/>
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allCategories.map(cat => {
                  const current = defaultCategoryBudgets?.[cat] || 0;
                  return (
                    <div key={cat} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="text-sm font-semibold">{cat}</div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">Budget</div>
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={current}
                          onChange={(e)=> {
                            const val = Number(e.target.value) || 0;
                            setDefaultCategoryBudgets(prev => ({...prev, [cat]: val}));
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
              <Button variant="outline" onClick={()=> setShowBudgetsModal(false)}>
                Cancel
              </Button>
              <Button onClick={()=> setShowBudgetsModal(false)}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
