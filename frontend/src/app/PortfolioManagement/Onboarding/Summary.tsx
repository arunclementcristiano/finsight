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
			{/* Mobile-optimized summary header */}
			<Card>
				<CardHeader className="text-center">
					<div className="text-4xl mb-2">🎯</div>
					<CardTitle className="text-2xl">Your Personalized Plan</CardTitle>
					<div className="mt-3 inline-flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Risk Level:</span>
						<span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-indigo-600 text-white px-4 py-2 text-sm font-medium">
							{plan.riskLevel}
						</span>
					</div>
				</CardHeader>
				<CardContent>
					<div className="w-full flex flex-col items-center">
						<div className="w-full max-w-sm h-64 sm:h-72">
							<Doughnut data={chartData} options={chartOptions} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Mobile-responsive allocation details */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						📊 Allocation Details
					</CardTitle>
				</CardHeader>
				<CardContent>
					{/* Desktop table view */}
					<div className="hidden lg:block rounded-xl border border-border overflow-hidden">
						<table className="w-full text-left text-sm">
							<thead className="bg-muted/50">
								<tr>
									<th className="py-3 px-4 text-muted-foreground font-medium">Asset Class</th>
									<th className="py-3 px-4 text-muted-foreground text-right font-medium">Target</th>
									<th className="py-3 px-4 text-muted-foreground text-right font-medium">Range</th>
									<th className="py-3 px-4 text-muted-foreground font-medium">Risk</th>
									<th className="py-3 px-4 text-muted-foreground font-medium">Notes</th>
								</tr>
							</thead>
							<tbody>
								{plan.buckets.map((b: any, idx: number) => (
									<tr key={b.class} className={idx % 2 === 0 ? "bg-transparent" : "bg-muted/30"}>
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

					{/* Mobile card view */}
					<div className="lg:hidden space-y-3">
						{plan.buckets.map((b: any) => (
							<Card key={b.class} className="border-dashed">
								<CardContent className="p-4">
									<div className="flex items-center justify-between mb-2">
										<h3 className="font-semibold">{b.class}</h3>
										<span className="text-2xl font-bold text-indigo-600 dark:text-indigo-300">
											{b.pct}%
										</span>
									</div>
									<div className="grid grid-cols-2 gap-2 text-sm">
										<div>
											<span className="text-muted-foreground">Range:</span>
											<span className="ml-1 font-medium">{b.range[0]}% – {b.range[1]}%</span>
										</div>
										<div>
											<span className="text-muted-foreground">Risk:</span>
											<span className="ml-1 inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs">
												{b.riskCategory}
											</span>
										</div>
									</div>
									<div className="mt-2 text-xs italic text-muted-foreground">
										{b.notes}
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Mobile-optimized action buttons */}
			<div className="space-y-3 sm:flex sm:flex-row sm:gap-3 sm:justify-center sm:space-y-0">
				<Button 
					onClick={() => { setPlan(plan as any); }} 
					className="w-full sm:min-w-[160px] h-12 text-base font-medium"
				>
					✅ Save Plan
				</Button>
				<Button 
					variant="secondary" 
					onClick={() => router.push("/PortfolioManagement/AddHolding")} 
					className="w-full sm:min-w-[160px] h-12 text-base"
				>
					➕ Add Holdings
				</Button>
				<Button 
					variant="outline" 
					onClick={() => router.push("/PortfolioManagement/Dashboard")} 
					className="w-full sm:min-w-[160px] h-12 text-base"
				>
					📊 Go to Dashboard
				</Button>
			</div>
		</div>
	);
}