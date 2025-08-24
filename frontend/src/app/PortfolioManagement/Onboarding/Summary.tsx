"use client";
import React, { useMemo, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
import { useRouter } from "next/navigation";
import { useApp } from "../../store";
import { Progress } from "../../components/Progress";
import { computeRebalance } from "../domain/rebalance";
import { TrendingUp, Shield, Globe2, LineChart, Layers, Banknote, Coins, Home, Droplet, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Button } from "../../components/Button";
import { useChartThemeColors } from "../../components/useChartTheme";
Chart.register(ArcElement, Tooltip, Legend);

interface SummaryProps {
	plan: {
		riskLevel: string;
		buckets: Array<{
			class: string;
			pct: number;
			range: [number, number];
			riskCategory: string;
			notes: string;
		}>;
	};
}

export default function Summary({ plan }: SummaryProps) {
	const router = useRouter();
	const { setPlan, holdings, driftTolerancePct } = useApp();
	const [saved, setSaved] = useState(false);
	const [aiOn, setAiOn] = useState(false);
	const [aiLoading, setAiLoading] = useState(false);
	const [aiRationale, setAiRationale] = useState<string | undefined>(undefined);
	const [aiConfidence, setAiConfidence] = useState<number | undefined>(undefined);
	const [refined, setRefined] = useState<any | null>(null);
	const theme = useChartThemeColors();
	const target = (refined || plan) as any;
	const innerOuterChartData = useMemo(() => {
		const buckets = target?.buckets || plan.buckets;
		const sumBy = (classes: string[]) => buckets.filter((b:any)=>classes.includes(b.class)).reduce((s:number,b:any)=>s+b.pct,0);
		const equitySum = sumBy(["Stocks","Mutual Funds"]);
		const defensiveSum = sumBy(["Debt","Liquid"]);
		const satelliteSum = sumBy(["Gold","Real Estate"]);
		return {
			labels: buckets.map((b:any)=>b.class),
			datasets: [
				// inner ring: high-level
				{ data: [equitySum, defensiveSum, satelliteSum], backgroundColor: ["#6366f1", "#10b981", "#f59e0b"], borderWidth: 2, borderColor: "#fff", weight: 0.6 },
				// outer ring: asset classes
				{ data: buckets.map((b:any)=>b.pct), backgroundColor: ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#f97316", "#06b6d4"], borderWidth: 2, borderColor: "#fff", weight: 1 },
			],
		};
	}, [target, plan]);
	const chartOptions = {
		plugins: { legend: { display: true, position: "bottom" as const, labels: { font: { size: 13 }, color: theme.text } }, tooltip: { callbacks: { label: function(context: any) {
			const label = context.label || "";
			const v = context.parsed;
			const purposeMap: Record<string,string> = { "Stocks":"Growth", "Mutual Funds":"Diversified equity", "Debt":"Steady income", "Liquid":"Emergency buffer", "Gold":"Inflation hedge", "Real Estate":"Long-term asset", "Equity":"Growth", "Defensive":"Stability", "Satellite":"Diversification" };
			return `${label}: ${v}% — ${purposeMap[label]||""}`;
		}} } },
		cutout: "70%",
		responsive: true,
		maintainAspectRatio: false,
	};

	// Derived stats to give quick context
	const kpis = useMemo(() => {
		const byClass = new Map<string, number>();
		for (const b of plan.buckets) byClass.set(b.class, (byClass.get(b.class) || 0) + b.pct);
		const equity = (byClass.get("Stocks") || 0) + (byClass.get("Mutual Funds") || 0);
		const defensive = (byClass.get("Debt") || 0) + (byClass.get("Liquid") || 0);
		const satellite = (byClass.get("Gold") || 0) + (byClass.get("Real Estate") || 0);
		const numClasses = plan.buckets.length;
		return { equity: +equity.toFixed(2), defensive: +defensive.toFixed(2), satellite: +satellite.toFixed(2), numClasses };
	}, [plan]);

	const driftInfo = useMemo(() => {
		try {
			const tgt = (refined || plan) as any;
			return computeRebalance(holdings || [], tgt, driftTolerancePct || 5);
		} catch { return { items: [], totalCurrentValue: 0 }; }
	}, [holdings, driftTolerancePct, refined, plan]);

	function roleColor(role: string) {
		if (role === "Core") return "text-indigo-600 dark:text-indigo-300";
		if (role === "Defensive") return "text-emerald-600 dark:text-emerald-300";
		return "text-amber-600 dark:text-amber-300";
	}

	function classIcon(cls: string) {
		const common = "h-4 w-4 mr-2";
		if (cls === "Stocks") return <LineChart className={common} />;
		if (cls === "Mutual Funds") return <Layers className={common} />;
		if (cls === "Debt") return <Banknote className={common} />;
		if (cls === "Gold") return <Coins className={common} />;
		if (cls === "Real Estate") return <Home className={common} />;
		if (cls === "Liquid") return <Droplet className={common} />;
		return <LineChart className={common} />;
	}

	async function refineWithAI() {
		try {
			setAiLoading(true);
			const q = (useApp.getState() as any).questionnaire || {};
			const res = await fetch("/api/plan/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionnaire: q, baseline: plan }) });
			const data = await res.json();
			if (data?.aiPlan?.buckets) {
				setRefined(data.aiPlan);
				setAiRationale(data.rationale);
				setAiConfidence(data.confidence);
			}
		} finally {
			setAiLoading(false);
		}
	}

	function riskBadgeClass(risk: string) {
		if (risk === "High") return "text-rose-700 dark:text-rose-300 border-rose-300/60";
		if (risk === "Low") return "text-emerald-700 dark:text-emerald-300 border-emerald-300/60";
		return "text-amber-700 dark:text-amber-300 border-amber-300/60";
	}
	return (
		<div className="space-y-3">
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Your Suggested Allocation</CardTitle>
					<CardDescription className="mt-1">Baseline model with optional AI personalization.</CardDescription>
					<div className="mt-2 inline-flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Risk Level:</span>
						<span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${riskBadgeClass(plan.riskLevel)}`}>{plan.riskLevel}</span>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div className="w-full h-52 md:h-44">
							<Doughnut data={innerOuterChartData} options={chartOptions} />
						</div>
						<div className="grid grid-cols-3 gap-3">
							<div className="rounded-xl border border-border p-2 text-center">
								<div className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5"/>Equity</div>
								<div className="text-base font-semibold text-indigo-600 dark:text-indigo-300">{kpis.equity}%</div>
								<div className="text-[11px] text-muted-foreground mt-1">Growth</div>
							</div>
							<div className="rounded-xl border border-border p-2 text-center">
								<div className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground"><Shield className="h-3.5 w-3.5"/>Defensive</div>
								<div className="text-base font-semibold text-emerald-600 dark:text-emerald-300">{kpis.defensive}%</div>
								<div className="text-[11px] text-muted-foreground mt-1">Stability</div>
							</div>
							<div className="rounded-xl border border-border p-2 text-center">
								<div className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground"><Globe2 className="h-3.5 w-3.5"/>Satellite</div>
								<div className="text-base font-semibold text-amber-600 dark:text-amber-300">{kpis.satellite}%</div>
								<div className="text-[11px] text-muted-foreground mt-1">Diversification</div>
							</div>
							<div className="col-span-3 flex items-center justify-between mt-1">
								<div className="inline-flex items-center gap-3">
									<button type="button" onClick={()=> { const v=!aiOn; setAiOn(v); if (v) refineWithAI(); else setRefined(null); }} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiOn?"bg-indigo-600":"bg-muted"}`}>
										<span className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${aiOn?"translate-x-5":"translate-x-1"}`}></span>
									</button>
									<span className="text-sm">AI refinement</span>
									{aiOn ? <span className="ml-2 inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-xs text-indigo-700 dark:text-indigo-300"><Sparkles className="h-3 w-3 mr-1"/>Personalized by AI</span> : <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Baseline Industry Model</span>}
								</div>
								{aiLoading && <span className="text-xs text-muted-foreground">Refining…</span>}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Allocation Details</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="rounded-xl border border-border overflow-auto max-h-80">
						<table className="w-full text-left text-sm">
							<thead className="bg-card sticky top-0 z-10">
								<tr>
									<th className="py-3 px-4 text-muted-foreground">Asset Class</th>
									<th className="py-3 px-4 text-muted-foreground text-right">Allocation</th>
									<th className="py-3 px-4 text-muted-foreground text-right">Comfort Zone</th>
									<th className="py-3 px-4 text-muted-foreground">Role in Portfolio</th>
									<th className="py-3 px-4 text-muted-foreground">Purpose</th>
								</tr>
							</thead>
							<tbody>
								{(refined||plan).buckets.map((b: any) => (
									<tr key={b.class} className="border-t border-border/50">
										<td className="py-3 px-4 font-medium"><span className="inline-flex items-center">{classIcon(b.class)}{b.class}</span></td>
										<td className="py-3 px-4 text-right align-middle">
											<div className="font-semibold text-indigo-600 dark:text-indigo-300">{b.pct}%</div>
											<div className="mt-1"><Progress value={Math.max(0, Math.min(100, ((b.pct - b.range[0]) * 100) / Math.max(1, (b.range[1]-b.range[0]))))} className={b.riskCategory==="Defensive"?"bg-emerald-500":b.riskCategory==="Satellite"?"bg-amber-500":"bg-indigo-500"} /></div>
										</td>
										<td className="py-3 px-4 text-right">{b.range[0]}% – {b.range[1]}%</td>
										<td className="py-3 px-4"><span className={`inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs ${roleColor(b.riskCategory)}`}>{b.riskCategory||"—"}</span></td>
										<td className="py-3 px-4 italic text-muted-foreground">{b.notes}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{aiOn && (aiRationale || aiConfidence !== undefined) && (
						<div className="mt-2 flex items-start justify-between gap-3">
							<div className="text-xs text-muted-foreground inline-flex items-start gap-2"><Sparkles className="h-3 w-3 mt-0.5" />
								<span>{aiRationale || "Refined based on your answers and risk profile."}</span>
							</div>
							<span className="shrink-0 inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px]">{aiConfidence !== undefined ? `${Math.round(aiConfidence*100)}%` : "—"}</span>
						</div>
					)}

					<div className="mt-4 flex flex-wrap gap-3">
						{(driftInfo.items?.length||0) > 0 && (
							<Button onClick={()=>router.push("/PortfolioManagement/Dashboard")}>
								📌 Rebalance Now
							</Button>
						)}
						<Button variant="secondary" onClick={()=>router.push("/PortfolioManagement/Dashboard")}>
							📊 View Historical Performance
						</Button>
						<Button variant="outline" onClick={()=>router.push("/PortfolioManagement/Plan")}>
							🎯 Map to Goals
						</Button>
					</div>
				</CardContent>
			</Card>

			<div className="flex flex-col sm:flex-row gap-3 justify-center">
				<Button variant="outline" onClick={async () => { try { let activeId = (useApp.getState() as any).activePortfolioId as string | undefined; if (!activeId) { const created = await (await fetch('/api/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'My Portfolio' }) })).json(); activeId = created?.portfolioId; if (activeId) (useApp.getState() as any).setActivePortfolio(activeId); } if (!activeId) return; const toSave = (refined || plan) as any; await fetch('/api/portfolio/plan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portfolioId: activeId, plan: toSave }) }); setPlan(toSave); setSaved(true); } catch {} }} className="min-w-[160px]">{saved ? "Saved" : "Save Plan"}</Button>
				<Button variant="secondary" onClick={() => router.push("/PortfolioManagement/AddHolding")} className="min-w-[160px]">Add Holdings</Button>
				<Button variant="outline" onClick={() => router.push("/PortfolioManagement/Dashboard")} className="min-w-[160px]">Go to Dashboard</Button>
			</div>
		</div>
	);
}