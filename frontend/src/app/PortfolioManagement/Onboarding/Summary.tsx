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
					<div className="w-full overflow-x-auto">
						<table className="min-w-[800px] w-full text-left border border-border rounded-xl">
							<thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
								<tr>
									<th className="py-2.5 px-4 border-b">Asset Class</th>
									<th className="py-2.5 px-4 border-b">Target</th>
									<th className="py-2.5 px-4 border-b">Range</th>
									<th className="py-2.5 px-4 border-b">Risk</th>
									<th className="py-2.5 px-4 border-b">Notes</th>
								</tr>
							</thead>
							<tbody>
								{plan.buckets.map((b: any, idx: number) => (
									<tr key={b.class} className={"border-b hover:bg-muted/40 " + (idx % 2 === 0 ? "bg-white dark:bg-slate-900/50" : "bg-slate-50 dark:bg-slate-900/30") }>
										<td className="py-2.5 px-4">{b.class}</td>
										<td className="py-2.5 px-4 font-semibold"><span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5">{b.pct}%</span></td>
										<td className="py-2.5 px-4"><span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5">{b.range[0]}% – {b.range[1]}%</span></td>
										<td className="py-2.5 px-4"><span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5">{b.riskCategory}</span></td>
										<td className="py-2.5 px-4 italic text-muted-foreground">{b.notes}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
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
