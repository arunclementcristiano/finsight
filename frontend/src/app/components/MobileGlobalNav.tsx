"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Menu, PieChart, ReceiptText, Settings, Target, TrendingUp, X } from "lucide-react";
import { cn } from "./utils";

const primaryItems = [
  { label: "Overview", href: "/PortfolioManagement/Dashboard", icon: LayoutDashboard },
  { label: "Portfolio", href: "/PortfolioManagement/Portfolio/Plan", icon: PieChart },
  { label: "Expenses", href: "/ExpenseTracker", icon: ReceiptText },
];

const moreItems = [
  { label: "Goals", href: "/PortfolioManagement/Goals", icon: Target, description: "Track the milestones that matter" },
  { label: "Insights", href: "/PortfolioManagement/Insights", icon: BarChart3, description: "Understand risk and portfolio drift" },
  { label: "Settings", href: "/PortfolioManagement/Settings", icon: Settings, description: "Tune your financial preferences" },
];

export default function MobileGlobalNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname === "/login") return null;

  function isActive(href: string) {
    if (!pathname) return false;
    if (href.includes("/Portfolio/")) return pathname.startsWith("/PortfolioManagement/Portfolio");
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <header className="mobile-top-header fixed inset-x-0 top-0 z-40 flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between border-b border-border bg-background/90 px-[max(1rem,env(safe-area-inset-left))] pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
        <Link href="/" className="flex items-center gap-2.5" aria-label="FinSight home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#167a5b] text-white">
            <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-semibold tracking-[-0.02em]">FinSight</span>
        </Link>
        <nav className="mobile-landscape-nav hidden items-center gap-1" aria-label="Landscape navigation">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return <Link key={item.href} href={item.href} aria-label={item.label} aria-current={active ? "page" : undefined} className={cn("grid h-10 w-10 place-items-center rounded-xl", active ? "bg-[var(--accent-soft)] text-emerald-700 dark:text-emerald-300" : "text-muted-foreground hover:bg-muted")}><Icon className="h-5 w-5" /></Link>;
          })}
          <button type="button" aria-label="Open more navigation" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted"><Menu className="h-5 w-5" /></button>
        </nav>
        <button type="button" aria-label="Open navigation" onClick={() => setOpen(true)} className="mobile-header-menu grid h-10 w-10 place-items-center rounded-xl border border-border bg-card">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
        <div className="grid grid-cols-4">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium", active ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <button type="button" className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium text-muted-foreground" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="More navigation">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-[#07110d]/55 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-y-auto rounded-t-3xl border border-border bg-card p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div><p className="font-semibold">Explore FinSight</p><p className="text-sm text-muted-foreground">Everything in one place</p></div>
              <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl border border-border p-3.5 hover:bg-muted">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-emerald-700 dark:text-emerald-300"><Icon className="h-5 w-5" /></span>
                    <span><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs text-muted-foreground">{item.description}</span></span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
