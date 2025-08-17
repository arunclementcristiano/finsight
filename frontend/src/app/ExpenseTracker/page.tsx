"use client";
import React, { useMemo, useRef, useState } from "react";
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

interface Message {
  id: string;
  role: Role;
  text: string;
  parsed?: ParsedExpense;
}

function parseExpense(input: string): ParsedExpense | undefined {
  const lower = input.toLowerCase();
  const currencyMatch = input.match(/[₹$€£]/)?.[0] ?? "₹";
  const amountMatch = input.match(/([0-9]+(?:\.[0-9]{1,2})?)/);
  if (!amountMatch) return undefined;
  const amount = Number(amountMatch[1]);

  const categories = [
    "groceries",
    "food",
    "rent",
    "shopping",
    "travel",
    "transport",
    "entertainment",
    "utilities",
    "health",
  ];
  const category = categories.find((c) => lower.includes(c)) ?? "misc";

  const iso = input.match(/(\d{4}-\d{2}-\d{2})/);
  let date = new Date();
  if (iso) {
    date = new Date(iso[1]);
  } else if (lower.includes("yesterday")) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    date = d;
  }
  const dateStr = date.toISOString().slice(0, 10);

  return {
    amount,
    currency: currencyMatch,
    category: category.charAt(0).toUpperCase() + category.slice(1),
    date: dateStr,
    raw: input,
  };
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

  function addMessage(text: string) {
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text };
    const parsed = parseExpense(text);
    const systemText = parsed
      ? `Added ${parsed.currency}${parsed.amount} to ${parsed.category} on ${parsed.date}.`
      : `Sorry, I couldn't parse that. Try like: "Spent ₹500 on groceries yesterday".`;
    const systemMessage: Message = {
      id: crypto.randomUUID(),
      role: "system",
      text: systemText,
      parsed: parsed ?? undefined,
    };
    setMessages((prev) => [...prev, userMessage, systemMessage]);
    setInput("");
    queueMicrotask(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
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

