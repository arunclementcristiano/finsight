"use client";
import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
import { useRouter } from "next/navigation";
import { useApp } from "../../store";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/Card";
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
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Portfolio Summary</CardTitle>
					<div className="mt-2 inline-block rounded-full bg-indigo-50 px-4 py-2 text-indigo-700 font-semibold dark:bg-indigo-900/40 dark:text-indigo-200">Risk Level: <span className="font-bold">{plan.riskLevel}</span></div>
				</CardHeader>
				<CardContent>
					<div className="w-full flex flex-col items-center">
						<div className="w-full max-w-xs h-64">
							<Doughnut data={chartData} options={chartOptions} />
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Allocation Details</CardTitle>
				</CardHeader>
				<CardContent>
					{/* Card grid view */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{plan.buckets.map((b: any) => (
							<div key={b.class} className="rounded-xl border border-border bg-card p-4">
								<div className="text-sm text-muted-foreground mb-1">{b.riskCategory}</div>
								<div className="text-lg font-semibold">{b.class}</div>
								<div className="mt-2 flex items-center justify-between">
									<span className="text-sm text-muted-foreground">Target</span>
									<span className="text-indigo-600 dark:text-indigo-300 font-semibold">{b.pct}%</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">Range</span>
									<span>{b.range[0]}% – {b.range[1]}%</span>
								</div>
								<div className="mt-2 text-sm italic text-muted-foreground">{b.notes}</div>
							</div>
						))}
					</div>

					{/* Accessible table fallback (collapsible) */}
					<details className="mt-6">
						<summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">Show table</summary>
						<div className="mt-3 w-full overflow-x-auto">
							<table className="min-w-[640px] w-full text-left border border-slate-200 dark:border-slate-800 rounded-xl">
								<thead className="bg-slate-50 dark:bg-slate-900/50">
									<tr>
										<th className="py-3 px-4 border-b">Asset Class</th>
										<th className="py-3 px-4 border-b">% Allocation</th>
										<th className="py-3 px-4 border-b">Range</th>
										<th className="py-3 px-4 border-b">Risk Category</th>
										<th className="py-3 px-4 border-b">Notes</th>
									</tr>
								</thead>
								<tbody>
									{plan.buckets.map((b: any, idx: number) => (
										<tr key={b.class} className={idx % 2 === 0 ? "bg-white dark:bg-slate-900/50" : "bg-slate-50 dark:bg-slate-900/30"}>
											<td className="py-3 px-4 border-b">{b.class}</td>
											<td className="py-3 px-4 border-b font-semibold text-indigo-700 dark:text-indigo-300">{b.pct}%</td>
											<td className="py-3 px-4 border-b">{b.range[0]}% – {b.range[1]}%</td>
											<td className="py-3 px-4 border-b font-semibold text-emerald-700 dark:text-emerald-300">{b.riskCategory}</td>
											<td className="py-3 px-4 border-b italic text-muted-foreground">{b.notes}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</details>
				</CardContent>
			</Card>

			<div className="flex flex-col sm:flex-row gap-3 justify-center">
				<Button onClick={() => { setPlan(plan as any); }} className="min-w-[160px]">Save Plan</Button>
				<Button variant="secondary" onClick={() => router.push("/PortfolioManagement/AddHolding")} className="min-w-[160px]">Add Holdings</Button>
				<Button variant="outline" onClick={() => router.push("/PortfolioManagement/Dashboard")} className="min-w-[160px]">Go to Dashboard</Button>
			</div>
		</div>
	);
}
