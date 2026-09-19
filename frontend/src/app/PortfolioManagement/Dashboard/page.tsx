"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Doughnut } from "react-chartjs-2";
import { ArcElement, Chart, Legend, Tooltip } from "chart.js";
import { ArrowRight, ArrowUpRight, CircleDollarSign, Landmark, Plus, ReceiptText, ShieldCheck, Sparkles, Target, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/Card";
import { useApp } from "../../store";
import { formatCurrency, formatNumber } from "../../utils/format";
import { computeRebalance } from "../domain/rebalance";

Chart.register(ArcElement, Tooltip, Legend);
const palette = ["#167a5b", "#67b99a", "#d9a441", "#617bca", "#c96f4a", "#8b6fb0", "#7e9188"];

export default function DashboardPage() {
  const { holdings, plan, driftTolerancePct, profile, expenses } = useApp();
  const currency = profile.currency || "INR";
  const summary = useMemo(() => {
    const invested = holdings.reduce((sum, item) => sum + (item.investedAmount || (item.units && item.price ? item.units * item.price : 0)), 0);
    const current = holdings.reduce((sum, item) => sum + (item.currentValue || (item.units && item.price ? item.units * item.price : 0)), 0);
    const pnl = current - invested;
    return { invested, current, pnl, pnlPct: invested > 0 ? (pnl / invested) * 100 : 0 };
  }, [holdings]);
  const monthSpend = useMemo(() => {
    const now = new Date();
    return expenses.reduce((total, item) => {
      const date = new Date(item.date);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() ? total + item.amount : total;
    }, 0);
  }, [expenses]);
  const allocation = useMemo(() => plan ? ({ labels: plan.buckets.map((bucket) => bucket.class), datasets: [{ data: plan.buckets.map((bucket) => bucket.pct), backgroundColor: palette, borderColor: "transparent", hoverOffset: 4 }] }) : null, [plan]);
  const rebalance = useMemo(() => plan ? computeRebalance(holdings, plan, driftTolerancePct) : { items: [], totalCurrentValue: 0 }, [holdings, plan, driftTolerancePct]);
  const firstName = profile.name?.trim().split(/\s+/)[0];
  const isNewWorkspace = holdings.length === 0 && !plan;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-[#10251d] px-6 py-7 text-white shadow-[0_20px_55px_rgba(16,37,29,0.18)] sm:px-8 sm:py-9">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[48px] border-emerald-300/10" />
        <div className="absolute bottom-0 right-24 h-28 w-28 rounded-full bg-emerald-300/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-100"><Sparkles className="h-3.5 w-3.5" /> Financial command center</div>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{firstName ? `${firstName}, your money at a glance.` : "Your money, all in one place."}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/60 sm:text-base">Follow your investments, spending, and goals with one clear view of what needs attention next.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/ExpenseTracker" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/15"><ReceiptText className="h-4 w-4" /> Add expense</Link>
            <Link href="/PortfolioManagement/Portfolio/Holdings?add=1" className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-[#10251d] hover:bg-emerald-200"><Plus className="h-4 w-4" /> Add holding</Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Financial summary">
        <MetricCard label="Portfolio value" value={formatCurrency(summary.current, currency)} detail={`${holdings.length} holding${holdings.length === 1 ? "" : "s"}`} icon={WalletCards} tone="green" />
        <MetricCard label="Total invested" value={formatCurrency(summary.invested, currency)} detail="Capital deployed" icon={Landmark} tone="blue" />
        <MetricCard label="Overall return" value={`${summary.pnl >= 0 ? "+" : ""}${formatCurrency(summary.pnl, currency)}`} detail={`${summary.pnl >= 0 ? "+" : ""}${formatNumber(summary.pnlPct, 2)}% all time`} icon={summary.pnl >= 0 ? TrendingUp : TrendingDown} tone={summary.pnl >= 0 ? "green" : "rose"} />
        <MetricCard label="Spent this month" value={formatCurrency(monthSpend, currency)} detail={`${expenses.length} recorded expense${expenses.length === 1 ? "" : "s"}`} icon={CircleDollarSign} tone="amber" />
      </section>

      {isNewWorkspace && (
        <Card className="overflow-hidden border-emerald-200/70 bg-[#edf7f2] dark:border-emerald-900 dark:bg-[#183127]">
          <CardContent className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white"><ShieldCheck className="h-6 w-6" /></span><div><p className="text-lg font-semibold tracking-tight">Build your financial baseline</p><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Answer a short risk questionnaire and FinSight will create a starting allocation you can review and adjust.</p></div></div>
            <Link href="/PortfolioManagement/Onboarding" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#167a5b] px-5 text-sm font-semibold text-white hover:bg-[#116348]">Create my plan <ArrowRight className="h-4 w-4" /></Link>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>Allocation plan</CardTitle><CardDescription>Your target mix across asset classes</CardDescription></div><Link href="/PortfolioManagement/Portfolio/Plan" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">View plan <ArrowUpRight className="h-3.5 w-3.5" /></Link></CardHeader>
          <CardContent>
            {plan && allocation ? (
              <div className="grid items-center gap-6 md:grid-cols-[240px_1fr]">
                <div className="mx-auto h-56 w-56"><Doughnut data={allocation} options={{ cutout: "74%", plugins: { legend: { display: false } } }} /></div>
                <div className="space-y-3">{plan.buckets.map((bucket, index) => <div key={bucket.class} className="flex items-center justify-between rounded-xl bg-muted/60 px-3.5 py-3"><span className="flex items-center gap-2.5 text-sm font-medium"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />{bucket.class}</span><span className="text-sm font-semibold">{bucket.pct}%</span></div>)}</div>
              </div>
            ) : <EmptyPanel icon={Target} title="No allocation plan yet" description="Complete onboarding to turn your goals and risk preference into a practical investment mix." href="/PortfolioManagement/Onboarding" action="Start onboarding" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>What needs attention</CardTitle><CardDescription>Prioritized actions from your current setup</CardDescription></CardHeader>
          <CardContent>
            {plan && rebalance.items.length > 0 ? <div className="space-y-3">{rebalance.items.slice(0, 5).map((item) => <div key={item.class} className="flex items-center justify-between gap-4 rounded-xl border border-border p-3.5"><div><p className="text-sm font-semibold">{item.class}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.actualPct}% current · {item.targetPct}% target</p></div><div className="text-right"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{item.action}</p><p className="text-sm font-semibold">{formatCurrency(item.amount, currency)}</p></div></div>)}</div>
              : holdings.length > 0 && plan ? <div className="flex min-h-56 flex-col items-center justify-center text-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><ShieldCheck className="h-6 w-6" /></span><p className="mt-4 font-semibold">Everything looks balanced</p><p className="mt-1 max-w-xs text-sm text-muted-foreground">Your allocation is within the {driftTolerancePct}% tolerance.</p></div>
              : holdings.length > 0 ? <EmptyPanel icon={Target} title="Create your allocation plan" description="Set a target mix to unlock drift monitoring and rebalancing suggestions." href="/PortfolioManagement/Onboarding" action="Start onboarding" />
              : <EmptyPanel icon={WalletCards} title="Add your first holding" description="Bring your investments together to see performance and rebalancing guidance." href="/PortfolioManagement/Portfolio/Holdings?add=1" action="Add holding" />}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

const tones = {
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

function MetricCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: React.ComponentType<{ className?: string }>; tone: keyof typeof tones }) {
  return <Card><CardContent className="p-5 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 truncate text-xl font-semibold tracking-[-0.025em]">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span></div></CardContent></Card>;
}

function EmptyPanel({ icon: Icon, title, description, href, action }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; href: string; action: string }) {
  return <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/35 p-6 text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-card text-emerald-700 shadow-sm dark:text-emerald-300"><Icon className="h-6 w-6" /></span><p className="mt-4 font-semibold">{title}</p><p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p><Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">{action}<ArrowRight className="h-4 w-4" /></Link></div>;
}
