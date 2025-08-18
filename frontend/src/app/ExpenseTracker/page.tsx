"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Card, CardContent } from "../components/Card";
import { Button } from "../components/Button";
import { cn } from "../components/utils";

type Role = "user" | "system";

interface ParsedExpense {
  amount: number;
  currency: string;
  category: string;
  date: string;
  raw: string;
}

interface SuggestionResponse {
  amount?: number;
  category: string;
  AIConfidence?: number;
  message: string;
}

interface Message {
  id: string;
  role: Role;
  text: string;
  parsed?: ParsedExpense;
  // Backend suggestion awaiting confirmation
  suggestion?: SuggestionResponse & { rawText: string };
  needsConfirmation?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_EXPENSES_API_BASE || "";

function useUserId(): string {
  const [userId, setUserId] = useState("");
  useEffect(() => {
    let uid = localStorage.getItem("finsightUserId");
    if (!uid) {
      uid = `u-${crypto.randomUUID()}`;
      localStorage.setItem("finsightUserId", uid);
    }
    setUserId(uid);
  }, []);
  return userId;
}

function Bubble({ role, children }: { role: Role; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={cn("w-full flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-3 shadow-sm",
          isUser
            ? "bg-[var(--color-ring)] text-white rounded-br-sm"
            : "bg-card text-[color:var(--color-card-foreground)] border border-border rounded-bl-sm"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function ParsedCard({ parsed }: { parsed: ParsedExpense }) {
  return (
    <div className="mt-3">
      <Card>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Amount</div>
              <div className="font-semibold">
                {parsed.currency}
                {parsed.amount.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Category</div>
              <div className="inline-flex items-center gap-2 font-semibold">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-ring)]" />
                {parsed.category}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Date</div>
              <div className="font-semibold">{parsed.date}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ messages }: { messages: Message[] }) {
  const totals = useMemo(() => {
    const byCategory = new Map<string, number>();
    let weekTotal = 0;
    const now = new Date();
    for (const m of messages) {
      if (!m.parsed) continue;
      const amount = m.parsed.amount;
      const d = new Date(m.parsed.date);
      const diffDays = Math.floor((Number(now) - Number(d)) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) weekTotal += amount;
      byCategory.set(m.parsed.category, (byCategory.get(m.parsed.category) ?? 0) + amount);
    }
    let topCategory = "—";
    let topAmount = 0;
    for (const [cat, amt] of byCategory.entries()) {
      if (amt > topAmount) {
        topAmount = amt;
        topCategory = cat;
      }
    }
    return { weekTotal, topCategory };
  }, [messages]);

  return (
    <Card className="border-dashed">
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-muted-foreground text-sm">This week</div>
            <div className="text-lg font-semibold">₹{totals.weekTotal.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-sm">Top category</div>
            <div className="text-lg font-semibold">{totals.topCategory}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExpenseTrackerPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showSummary, setShowSummary] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const userId = useUserId();

  async function requestSuggestion(rawText: string): Promise<SuggestionResponse> {
    const res = await fetch(`${API_BASE}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, rawText })
    });
    if (!res.ok) throw new Error("Suggestion failed");
    return res.json();
  }

  async function confirmExpense(payload: { amount: number; category: string; rawText: string; date?: string }) {
    const res = await fetch(`${API_BASE}/add`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...payload })
    });
    if (!res.ok) throw new Error("Save failed");
    return res.json();
  }

  async function addMessage(text: string) {
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    try {
      const suggestion = await requestSuggestion(text);
      const systemMessage: Message = {
        id: crypto.randomUUID(),
        role: "system",
        text: suggestion.message,
        suggestion: { ...suggestion, rawText: text },
        needsConfirmation: true,
      };
      setMessages((prev) => [...prev, systemMessage]);
    } catch (e) {
      const failMsg: Message = {
        id: crypto.randomUUID(),
        role: "system",
        text: "Sorry, something went wrong parsing your expense.",
      };
      setMessages((prev) => [...prev, failMsg]);
    } finally {
      queueMicrotask(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  function SuggestionCard({ msg }: { msg: Message }) {
    const [amount, setAmount] = useState<number | "">(msg.suggestion?.amount ?? "");
    const [category, setCategory] = useState<string>(msg.suggestion?.category ?? "Misc");
    const [saving, setSaving] = useState(false);
    const canSave = typeof amount === "number" && isFinite(amount) && category.trim().length > 0;

    return (
      <div className="mt-3">
        <Card>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Amount</div>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                  placeholder="e.g. 500"
                />
              </div>
              <div>
                <div className="text-muted-foreground">Category</div>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                  placeholder="e.g. Groceries"
                />
              </div>
              <div className="flex items-end justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Cancel: mark suggestion as dismissed
                    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, needsConfirmation: false } : m)));
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!canSave || saving}
                  onClick={async () => {
                    if (!canSave || !msg.suggestion) return;
                    try {
                      setSaving(true);
                      const payload = { amount: amount as number, category: category.trim(), rawText: msg.suggestion.rawText };
                      await confirmExpense(payload);
                      // Convert suggestion to a finalized parsed record for local summary
                      const parsed: ParsedExpense = {
                        amount: amount as number,
                        category: category.trim(),
                        currency: "₹",
                        date: new Date().toISOString().slice(0, 10),
                        raw: msg.suggestion.rawText,
                      };
                      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, text: "Saved.", needsConfirmation: false, parsed } : m)));
                    } catch (e) {
                      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, text: "Save failed. Please try again.", needsConfirmation: true } : m)));
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? "Saving..." : "Confirm"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Expense Tracker</h1>
        <Button
          variant="outline"
          size="sm"
          leftIcon={showSummary ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          onClick={() => setShowSummary((v) => !v)}
        >
          {showSummary ? "Hide Summary" : "Show Summary"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {showSummary ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          >
            <Summary messages={messages} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Card>
        <CardContent>
          <div className="h-[60vh] overflow-y-auto pr-1" ref={listRef}>
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  >
                    <Bubble role={m.role}>
                      <div className="whitespace-pre-wrap leading-relaxed text-sm">
                        {m.text}
                        {m.suggestion && m.needsConfirmation ? <SuggestionCard msg={m} /> : null}
                        {m.parsed ? <ParsedCard parsed={m.parsed} /> : null}
                      </div>
                    </Bubble>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="sticky bottom-0 pt-4 bg-gradient-to-t from-background via-background/70 to-transparent">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!input.trim()) return;
                addMessage(input.trim());
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <label htmlFor="expense-input" className="sr-only">
                  Type your expense
                </label>
                <input
                  id="expense-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your expense…"
                  className="block w-full rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm outline-none focus:border-[var(--color-ring)]"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-ring)] text-white shadow hover:opacity-95"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

