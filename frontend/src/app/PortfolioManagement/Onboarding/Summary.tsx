"use client";
import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
import { useRouter } from "next/navigation";
import { useApp } from "../../store";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/Card";
import { Button } from "../../components/Button";
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
	const chartData = {
		labels: plan.buckets.map(b => b.class),
		datasets: [
			{
				data: plan.buckets.map(b => b.pct),
				backgroundColor: ["#3b82f6", "#10b981", "#f59e42", "#fbbf24", "#6366f1", "#ef4444", "#a3e635"],
				borderWidth: 2,
				borderColor: "#fff",
			},
		],
	};
	const chartOptions = {
		plugins: { legend: { display: true, position: "bottom" as const, labels: { font: { size: 14 } } }, tooltip: { callbacks: { label: function(context: any) { return `${context.label}: ${context.parsed}%`; } } } },
		cutout: "70%",
		responsive: true,
		maintainAspectRatio: false,
	};
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Portfolio Summary</CardTitle>
					<div className="mt-2 inline-block rounded-full bg-blue-50 px-4 py-2 text-blue-700 font-semibold">Risk Level: <span className="text-blue-800">{plan.riskLevel}</span></div>
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
						<table className="min-w-[600px] w-full text-left border border-gray-200 rounded-xl shadow-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="py-3 px-4 border-b font-semibold text-gray-700">Asset Class</th>
									<th className="py-3 px-4 border-b font-semibold text-gray-700">% Allocation</th>
									<th className="py-3 px-4 border-b font-semibold text-gray-700">Range</th>
									<th className="py-3 px-4 border-b font-semibold text-gray-700">Risk Category</th>
									<th className="py-3 px-4 border-b font-semibold text-gray-700">Notes</th>
								</tr>
							</thead>
							<tbody>
								{plan.buckets.map((b: any, idx: number) => (
									<tr key={b.class} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
										<td className="py-3 px-4 border-b text-gray-900 font-medium">{b.class}</td>
										<td className="py-3 px-4 border-b text-blue-700 font-semibold">{b.pct}%</td>
										<td className="py-3 px-4 border-b text-gray-700">{b.range[0]}% – {b.range[1]}%</td>
										<td className="py-3 px-4 border-b text-green-700 font-semibold">{b.riskCategory}</td>
										<td className="py-3 px-4 border-b text-gray-600 italic">{b.notes}</td>
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
