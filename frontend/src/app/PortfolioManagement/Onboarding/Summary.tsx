"use client";
import React, { useMemo, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
import { useRouter } from "next/navigation";
import { useApp } from "../../store";
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
	const { setPlan } = useApp();
	const [saved, setSaved] = useState(false);
	const [aiOn, setAiOn] = useState(true);
	const [aiLoading, setAiLoading] = useState(false);
	const [aiRationale, setAiRationale] = useState<string | undefined>(undefined);
	const [aiConfidence, setAiConfidence] = useState<number | undefined>(undefined);
	const [refined, setRefined] = useState<any | null>(null);
	const theme = useChartThemeColors();
	const chartData = {
		labels: plan.buckets.map(b => b.class),
		datasets: [
			{
				data: plan.buckets.map(b => b.pct),
				backgroundColor: ["#6366f1", "#10b981", "#f59e42", "#fbbf24", "#3b82f6", "#ef4444", "#a3e635"],
				borderWidth: 2,
				borderColor: "#fff",
			},
		],
	};
	const chartOptions = {
		plugins: { legend: { display: true, position: "bottom" as const, labels: { font: { size: 13 }, color: theme.text } }, tooltip: { callbacks: { label: function(context: any) { return `${context.label}: ${context.parsed}%`; } } } },
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

	async function refineWithAI() {
		try {
			setAiLoading(true);
			const res = await fetch("/api/plan/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionnaire: {}, baseline: plan }) });
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
		<div className="space-y-6">
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Your Suggested Allocation</CardTitle>
					<CardDescription className="mt-1">Toggle AI refinement for a personalized plan within guardrails.</CardDescription>
					<div className="mt-2 inline-flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Risk Level:</span>
						<span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${riskBadgeClass(plan.riskLevel)}`}>{plan.riskLevel}</span>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="w-full h-64 md:h-56">
							<Doughnut data={(refined||plan) ? {
								labels: (refined||plan).buckets.map((b:any)=>b.class),
								datasets: [{ data: (refined||plan).buckets.map((b:any)=>b.pct), backgroundColor: ["#6366f1", "#10b981", "#f59e42", "#fbbf24", "#3b82f6", "#ef4444", "#a3e635"], borderWidth: 2, borderColor: "#fff" }]
							} : chartData} options={chartOptions} />
						</div>
						<div className="grid grid-cols-3 gap-3">
							<div className="rounded-xl border border-border p-3 text-center">
								<div className="text-xs text-muted-foreground">Equity</div>
								<div className="text-lg font-semibold text-indigo-600 dark:text-indigo-300">{kpis.equity}%</div>
							</div>
							<div className="rounded-xl border border-border p-3 text-center">
								<div className="text-xs text-muted-foreground">Defensive</div>
								<div className="text-lg font-semibold text-emerald-600 dark:text-emerald-300">{kpis.defensive}%</div>
							</div>
							<div className="rounded-xl border border-border p-3 text-center">
								<div className="text-xs text-muted-foreground">Satellite</div>
								<div className="text-lg font-semibold text-amber-600 dark:text-amber-300">{kpis.satellite}%</div>
							</div>
							<div className="col-span-3 flex items-center justify-between mt-1">
								<label className="inline-flex items-center gap-2 text-sm">
									<input type="checkbox" checked={aiOn} onChange={(e)=> { setAiOn(e.target.checked); if (e.target.checked) refineWithAI(); else setRefined(null); }} />
									<span>AI refinement</span>
								</label>
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
					<div className="rounded-xl border border-border overflow-hidden">
						<table className="w-full text-left text-sm">
							<thead className="bg-card">
								<tr>
									<th className="py-3 px-4 text-muted-foreground">Asset Class</th>
									<th className="py-3 px-4 text-muted-foreground text-right">Target</th>
									<th className="py-3 px-4 text-muted-foreground text-right">Range</th>
									<th className="py-3 px-4 text-muted-foreground">Risk</th>
									<th className="py-3 px-4 text-muted-foreground">Notes</th>
								</tr>
							</thead>
							<tbody>
								{(refined||plan).buckets.map((b: any) => (
									<tr key={b.class} className="border-t border-border/50">
										<td className="py-3 px-4 font-medium">{b.class}</td>
										<td className="py-3 px-4 text-right font-semibold text-indigo-600 dark:text-indigo-300">{b.pct}%</td>
										<td className="py-3 px-4 text-right">{b.range[0]}% – {b.range[1]}%</td>
										<td className="py-3 px-4"><span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs">{b.riskCategory}</span></td>
										<td className="py-3 px-4 italic text-muted-foreground">{b.notes}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{aiOn && (aiRationale || aiConfidence !== undefined) && (
						<div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
							<Card className="md:col-span-2">
								<CardHeader><CardTitle className="text-base">Why this plan</CardTitle></CardHeader>
								<CardContent><div className="text-sm text-muted-foreground">{aiRationale || "Refined based on your answers and risk profile."}</div></CardContent>
							</Card>
							<Card>
								<CardHeader><CardTitle className="text-base">AI Confidence</CardTitle></CardHeader>
								<CardContent><div className="text-sm font-medium">{aiConfidence !== undefined ? `${Math.round(aiConfidence*100)}%` : "—"}</div></CardContent>
							</Card>
						</div>
					)}
				</CardContent>
			</Card>

			<div className="flex flex-col sm:flex-row gap-3 justify-center">
				<Button onClick={() => { setPlan(plan as any); setSaved(true); }} className="min-w-[160px]">{saved ? "Saved" : "Save Plan"}</Button>
				<Button variant="secondary" onClick={() => router.push("/PortfolioManagement/AddHolding")} className="min-w-[160px]">Add Holdings</Button>
				<Button variant="outline" onClick={() => router.push("/PortfolioManagement/Dashboard")} className="min-w-[160px]">Go to Dashboard</Button>
			</div>
		</div>
	);
}