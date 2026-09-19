"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  BarChart3,
  CircleHelp,
  LayoutDashboard,
  Moon,
  PieChart,
  ReceiptText,
  Settings,
  Sun,
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "./utils";

export interface NavItem {
  name: string;
  href: string;
}

interface NavbarProps {
  items: NavItem[];
  appName?: string;
  userInitials?: string;
}

const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  Overview: LayoutDashboard,
  Portfolio: PieChart,
  Goals: Target,
  Expenses: ReceiptText,
  Insights: BarChart3,
  Settings,
};

export default function Navbar({ items, appName = "FinSight", userInitials = "FS" }: NavbarProps) {
  const pathname = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = (resolvedTheme || theme) === "dark";
  const navItems = useMemo(() => items ?? [], [items]);

  if (pathname === "/login") return null;

  function isActive(href: string) {
    if (!pathname) return false;
    if (href.includes("/Portfolio/")) return pathname.startsWith("/PortfolioManagement/Portfolio");
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-[#10251d] text-white md:flex">
      <div className="flex h-20 items-center border-b border-white/10 px-6">
        <Link href="/" className="group flex items-center gap-3" aria-label="FinSight home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-[#10251d] shadow-[0_8px_24px_rgba(52,211,153,0.2)]">
            <TrendingUp className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span>
            <span className="block text-[17px] font-semibold tracking-[-0.02em]">{appName}</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-200/70">Money, made clear</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-6" aria-label="Main navigation">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">Workspace</p>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = icons[item.name] || CircleHelp;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active ? "bg-white text-[#10251d] shadow-sm" : "text-white/65 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className={cn("h-[18px] w-[18px]", active ? "text-emerald-700" : "text-white/55")} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4">
        <button
          type="button"
          onClick={() => mounted && setTheme(isDark ? "light" : "dark")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/65 hover:bg-white/10 hover:text-white"
        >
          {mounted && isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          {mounted && isDark ? "Light appearance" : "Dark appearance"}
        </button>
        <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-300 text-xs font-bold text-[#10251d]">{userInitials}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Your workspace</p>
            <p className="truncate text-xs text-white/70">Personal finance</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
