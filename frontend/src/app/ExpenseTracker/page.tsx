"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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

// Types
interface ExpenseFormData {
  amount: number;
  category: string;
  text: string;
  date: string;
}

interface FilterState {
  preset: "all" | "today" | "week" | "month" | "lastMonth" | "custom";
  customStart: string;
  customEnd: string;
  selectedCategory: string;
}

interface SortState {
  field: "createdAt" | "date" | "amount" | "category";
  direction: "asc" | "desc";
}

// Custom Hook for Expense Data
const useExpenseData = () => {
  const { expenses, setExpenses, addExpense, deleteExpense } = useApp() as any;
  
  const fetchList = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/list`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ userId: "demo", limit: 1000, page: 1 }) 
      });
      const data = await res.json();
      if (Array.isArray(data.items)) {
        const mapped: Expense[] = data.items.map((it: any) => ({ 
          id: it.expenseId || uuidv4(), 
          text: it.rawText, 
          amount: Number(it.amount || 0), 
          category: it.category, 
          date: it.date || new Date().toISOString(), 
          createdAt: it.createdAt, 
          note: it.rawText 
        }));
        setExpenses(mapped.sort((a,b) => (a.date < b.date ? 1 : -1)));
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    }
  }, [setExpenses]);

  const handleDelete = useCallback(async (expenseId: string) => {
    try {
      await fetch(`${API_BASE}/delete`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ expenseId }) 
      });
      deleteExpense(expenseId);
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  }, [deleteExpense]);

  return { expenses, fetchList, handleDelete, addExpense };
};


// Utility Functions
const toLocalDateOnly = (dateStr: string): Date => {
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
};

const fmtDateYYYYMMDDLocal = (dateStr: string): string => {
  const d = toLocalDateOnly(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// Filter and Sort Logic
const filterExpenses = (expenses: Expense[], filters: FilterState): Expense[] => {
  return expenses.filter((expense) => {
    if (filters.selectedCategory && expense.category !== filters.selectedCategory) {
      return false;
    }

    if (filters.preset === "all") return true;

    const expenseDate = toLocalDateOnly(expense.date as any);
    const now = new Date();
    const startOfDay = (dt: Date) => { const x = new Date(dt); x.setHours(0,0,0,0); return x; };
    const startOfWeek = (dt: Date) => { 
      const x = startOfDay(dt); 
      const day = x.getDay(); 
      const diff = (day === 0 ? 6 : day - 1); 
      x.setDate(x.getDate() - diff); 
      return x; 
    };

    let start: Date | undefined;
    let end: Date | undefined;

    switch (filters.preset) {
      case "today":
        start = startOfDay(now);
        end = start;
        break;
      case "week":
        start = startOfWeek(now);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "custom":
        start = filters.customStart ? toLocalDateOnly(filters.customStart) : undefined;
        end = filters.customEnd ? toLocalDateOnly(filters.customEnd) : undefined;
        break;
    }

    if (start && expenseDate < startOfDay(start)) return false;
    if (end) {
      const endExclusive = new Date(end);
      endExclusive.setDate(end.getDate() + 1);
      if (expenseDate >= endExclusive) return false;
    }

    return true;
  });
};

const sortExpenses = (expenses: Expense[], sort: SortState): Expense[] => {
  return [...expenses].sort((a, b) => {
    let comparison = 0;

    switch (sort.field) {
      case "createdAt":
        const aKey = (a as any).createdAt ? new Date((a as any).createdAt as string).getTime() : toLocalDateOnly(a.date as any).getTime();
        const bKey = (b as any).createdAt ? new Date((b as any).createdAt as string).getTime() : toLocalDateOnly(b.date as any).getTime();
        comparison = aKey - bKey;
        break;
      case "date":
        const aDate = toLocalDateOnly(a.date as any).getTime();
        const bDate = toLocalDateOnly(b.date as any).getTime();
        comparison = aDate - bDate;
        break;
      case "amount":
        comparison = a.amount - b.amount;
        break;
      case "category":
        comparison = String(a.category || "").toLowerCase().localeCompare(String(b.category || "").toLowerCase());
        break;
    }

    return sort.direction === "asc" ? comparison : -comparison;
  });
};


// Main Component
export default function ExpenseTrackerPage() {
  // State
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<"data" | "insights">("data");
  const [privacy, setPrivacy] = useState(false);
  const [ai, setAi] = useState<{ amount?: number; category?: string; options?: string[]; AIConfidence?: number; raw?: string } | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    preset: "all",
    customStart: "",
    customEnd: "",
    selectedCategory: "",
  });

  // Sort state
  const [sort, setSort] = useState<SortState>({
    field: "createdAt",
    direction: "desc",
  });

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const customRef = useRef<HTMLInputElement>(null);

  // Custom Hooks
  const { expenses, fetchList, handleDelete, addExpense } = useExpenseData();

  // Computed Values
  const filteredExpenses = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);
  const sortedExpenses = useMemo(() => sortExpenses(filteredExpenses, sort), [filteredExpenses, sort]);
  const totalPages = Math.ceil(sortedExpenses.length / pageSize);
  const paginatedExpenses = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedExpenses.slice(startIndex, startIndex + pageSize);
  }, [sortedExpenses, page, pageSize]);

  // Effects
  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  // Event Handlers
  const handleTabSwitch = useCallback((tab: "data" | "insights") => {
    setActiveTab(tab);
  }, []);

  const handleTogglePrivacy = useCallback(() => {
    setPrivacy(prev => !prev);
  }, []);

  const handleFilterChange = useCallback((updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSortToggle = useCallback((field: SortState['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const rawText = input.trim();
    if (!rawText) return;
    setAi(null);

    try {
      const parsed = parseExpenseInput(rawText);
      if (parsed.category && typeof parsed.amount === "number") {
        const put = await fetch(`${API_BASE}/add`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "demo",
            rawText,
            category: parsed.category,
            amount: parsed.amount,
            date: dateOpen ? selectedDate : undefined
          })
        });
        const saved = await put.json();
        if (saved?.ok) {
          addExpense({
            id: saved.expenseId || uuidv4(),
            text: rawText,
            amount: parsed.amount,
            category: parsed.category as string,
            date: dateOpen ? selectedDate : new Date().toISOString().slice(0,10),
            createdAt: new Date().toISOString(),
            note: rawText
          });
          setInput("");
          inputRef.current?.focus();
          setDateOpen(false);
        }
      }
    } catch (error) {
      console.error('Failed to submit expense:', error);
    }
  }, [input, dateOpen, selectedDate, addExpense]);

  // Format money with privacy
  const formatMoney = useCallback((value: number) => {
    return privacy ? "•••" : formatCurrency(value);
  }, [privacy]);

  // Style helper functions
  const getTabButtonClasses = useCallback((isActive: boolean) => {
    const baseClasses = "relative z-10 px-6 py-4 xl:py-3 text-base xl:text-sm font-semibold rounded-xl transition-all duration-300 touch-manipulation";
    const conditionalClasses = isActive 
      ? 'bg-white dark:bg-card text-foreground shadow-lg' 
      : 'text-muted-foreground hover:text-foreground';
    return `${baseClasses} ${conditionalClasses}`;
  }, []);

  const getPrivacyButtonClasses = useCallback(() => {
    const baseClasses = "h-16 xl:h-12 rounded-2xl xl:rounded-xl border transition-all duration-200 touch-manipulation flex flex-col xl:flex-row items-center justify-center xl:px-4 gap-1 xl:gap-2 group";
    const conditionalClasses = privacy 
      ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border-amber-200 dark:border-amber-800 hover:shadow-lg' 
      : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800 hover:shadow-lg';
    return `${baseClasses} ${conditionalClasses}`;
  }, [privacy]);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-background via-background/95 to-background backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 border-b border-border/50">
        <div className="space-y-6 xl:grid xl:grid-cols-[1.5fr_1fr] xl:gap-6 xl:space-y-0 p-4 xl:p-6">
          
          {/* Expense Form */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                <span className="text-white text-lg">💰</span>
              </div>
              <div>
                <h1 className="text-xl font-bold xl:hidden">Expense Tracker</h1>
                <p className="text-sm text-muted-foreground xl:hidden">Track your spending effortlessly</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3 xl:space-y-0 xl:flex xl:gap-3 xl:items-start">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                  <span className="text-xl">💸</span>
                </div>
                <input 
                  ref={inputRef} 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  className="w-full h-14 xl:h-12 pl-12 pr-4 rounded-2xl xl:rounded-xl border-2 border-border/50 bg-card/50 backdrop-blur text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base xl:text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md" 
                  placeholder="Coffee ₹120 at Starbucks..."
                />
              </div>
              
              <div className="flex gap-3 xl:gap-2">
                <button 
                  type="button" 
                  aria-label="Set date" 
                  onClick={() => setDateOpen(prev => !prev)} 
                  className={`h-14 w-14 xl:h-12 xl:w-12 rounded-2xl xl:rounded-xl border-2 transition-all duration-200 touch-manipulation shadow-sm hover:shadow-md ${
                    dateOpen 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950' 
                      : 'border-border/50 bg-card/50 text-muted-foreground hover:bg-muted'
                  } backdrop-blur flex items-center justify-center`}
                >
                  <Calendar className="h-6 w-6 xl:h-5 xl:w-5" />
                </button>
                
                <Button 
                  type="submit" 
                  className="h-14 xl:h-12 px-8 xl:px-6 rounded-2xl xl:rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 border-0 shadow-lg hover:shadow-xl transition-all duration-200 text-white font-semibold"
                >
                  <span className="xl:hidden">💰 Add Expense</span>
                  <span className="hidden xl:inline">Add</span>
                </Button>
              </div>
            </form>

            {dateOpen && (
              <div className="xl:hidden animate-in slide-in-from-top-2 duration-200">
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  className="w-full h-12 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950 px-4 text-base font-medium"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 xl:flex xl:items-start xl:justify-end xl:gap-3">
            <button 
              onClick={() => alert('Settings clicked')}
              className="h-16 xl:h-12 rounded-2xl xl:rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-200 touch-manipulation flex flex-col xl:flex-row items-center justify-center xl:px-4 gap-1 xl:gap-2 group"
            >
              <Settings2 className="h-5 w-5 xl:h-4 xl:w-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform"/>
              <span className="text-xs xl:text-sm font-medium text-purple-700 dark:text-purple-300">Budgets</span>
            </button>
            
            <button 
              onClick={handleTogglePrivacy}
              className={getPrivacyButtonClasses()}
            >
              {privacy ? (
                <EyeOff className="h-5 w-5 xl:h-4 xl:w-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform"/>
              ) : (
                <Eye className="h-5 w-5 xl:h-4 xl:w-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"/>
              )}
              <span className={`text-xs xl:text-sm font-medium ${privacy ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'}`}>
                {privacy ? "Show" : "Hide"}
              </span>
            </button>
            
            <button 
              onClick={() => alert('Export clicked')}
              className="h-16 xl:h-12 rounded-2xl xl:rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-200 touch-manipulation flex flex-col xl:flex-row items-center justify-center xl:px-4 gap-1 xl:gap-2 group"
            >
              <Download className="h-5 w-5 xl:h-4 xl:w-4 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform"/>
              <span className="text-xs xl:text-sm font-medium text-green-700 dark:text-green-300">Export</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 xl:px-6 pb-4">
          <div className="relative bg-muted/30 rounded-2xl p-1">
            <div className="grid grid-cols-2">
              <button 
                onClick={() => handleTabSwitch("data")} 
                className={getTabButtonClasses(activeTab === 'data')}
              >
                <span className="flex items-center justify-center gap-2">
                  📊 <span>Data</span>
                </span>
              </button>
              <button 
                onClick={() => handleTabSwitch("insights")} 
                className={getTabButtonClasses(activeTab === 'insights')}
              >
                <span className="flex items-center justify-center gap-2">
                  📈 <span>Insights</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-auto p-4 xl:p-6">
        {activeTab === "data" ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Recent Expenses</h2>
            
            {/* Simple Expense List */}
            <div className="space-y-3">
              {paginatedExpenses.length > 0 ? (
                paginatedExpenses.map((expense) => (
                  <Card key={expense.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{expense.text}</h3>
                        <p className="text-sm text-muted-foreground">{expense.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatMoney(expense.amount)}</p>
                        <p className="text-sm text-muted-foreground">{fmtDateYYYYMMDDLocal(expense.date as string)}</p>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No expenses found</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Expense Insights</h2>
            <div className="text-center py-12">
              <p className="text-muted-foreground">Insights coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
