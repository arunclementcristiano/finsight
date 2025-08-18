"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, PanelRightClose, PanelRightOpen, Trash2 } from "lucide-react";
import { Card, CardContent } from "../components/Card";
import { Button } from "../components/Button";
import { cn } from "../components/utils";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useChartThemeColors } from "../components/useChartTheme";
ChartJS.register(ArcElement, Tooltip, Legend);

export default function ExpenseTrackerPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showSummary, setShowSummary] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const userId = useUserId();
  const [recent, setRecent] = useState<ExpenseItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [recentPage, setRecentPage] = useState(1);
  const [recentHasMore, setRecentHasMore] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(true);
  const [categorySummary, setCategorySummary] = useState<Record<string, number>>({});
  const chartTheme = useChartThemeColors();

  async function loadCategorySummary() {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/summary/monthly`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) return;
      const data = await res.json();
      setCategorySummary(data.totals || {});
    } catch {}
  }

  useEffect(() => {
    if (userId) {
      loadRecent(true);
      loadCategorySummary();
    }
  }, [userId]);
}