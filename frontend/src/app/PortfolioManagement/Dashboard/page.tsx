"use client";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Button } from "../../components/Button";
import { useApp } from "../../store";
import { Doughnut, Bar } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";
import { formatCurrency, formatNumber } from "../../utils/format";
import { computeRebalance } from "../domain/rebalance";
import { ArrowUpRight, ArrowDownRight, PlusCircle, Target, PieChart, LineChart } from "lucide-react";

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function DashboardPage() {
	const { holdings, plan, driftTolerancePct, profile } = useApp();
	const currency = profile.currency || "INR";

	const { totalInvested, totalCurrent, pnl, pnlPct } = useMemo(() => {
		const invested = holdings.reduce((sum, h) => sum + (h.investedAmount || (h.units && h.price ? h.units * h.price : 0)), 0);
		const current = holdings.reduce((sum, h) => sum + (h.currentValue || (h.units && h.price ? h.units * h.price : 0)), 0);
		const p = current - invested;
		const pPct = invested > 0 ? (p / invested) * 100 : 0;
		return { totalInvested: invested, totalCurrent: current, pnl: p, pnlPct: pPct };
	}, [holdings]);

	const donutData = useMemo(() => {
		if (!plan) return null;
		return {
			labels: plan.buckets.map(b => b.class),
			datasets: [{
				data: plan.buckets.map(b => b.pct),
				backgroundColor: ["#6366f1", "#10b981", "#f59e42", "#fbbf24", "#3b82f6", "#ef4444", "#a3e635"],
				borderWidth: 2,
				borderColor: "#fff",
			}],
		};
	}, [plan]);

	const { barLabels, barTarget, barActual } = useMemo(() => {
		if (!plan) return { barLabels: [], barTarget: [], barActual: [] };
		const classToValue = new Map<string, number>();
		for (const h of holdings) {
			const val = h.currentValue || (h.units && h.price ? h.units * h.price : 0);
			classToValue.set(h.instrumentClass, (classToValue.get(h.instrumentClass) || 0) + val);
		}
		const total = Array.from(classToValue.values()).reduce((a, b) => a + b, 0);
		const labels = plan.buckets.map(b => b.class);
		const target = plan.buckets.map(b => b.pct);
		const actual = labels.map(lbl => total > 0 ? +(((classToValue.get(lbl) || 0) / total) * 100).toFixed(2) : 0);
		return { barLabels: labels, barTarget: target, barActual: actual };
	}, [plan, holdings]);

	const barData = {
		labels: barLabels,
		datasets: [
			{ label: "Target %", data: barTarget, backgroundColor: "rgba(99,102,241,0.5)" },
			{ label: "Actual %", data: barActual, backgroundColor: "rgba(16,185,129,0.5)" },
		],
	};
	const barOptions = {
		plugins: { 
			legend: { 
				position: "bottom" as const, 
				labels: { 
					font: { 
						size: typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 12 
					},
					padding: typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : 16,
					usePointStyle: true,
				} 
			},
			tooltip: {
				titleFont: { size: typeof window !== 'undefined' && window.innerWidth < 640 ? 12 : 14 },
				bodyFont: { size: typeof window !== 'undefined' && window.innerWidth < 640 ? 11 : 13 },
				cornerRadius: 8,
			}
		},
		responsive: true,
		maintainAspectRatio: false,
		scales: { 
			y: { 
				beginAtZero: true, 
				max: 100,
				ticks: {
					font: { size: typeof window !== 'undefined' && window.innerWidth < 640 ? 9 : 11 }
				}
			},
			x: {
				ticks: {
					font: { size: typeof window !== 'undefined' && window.innerWidth < 640 ? 9 : 11 },
					maxRotation: typeof window !== 'undefined' && window.innerWidth < 640 ? 45 : 0,
				}
			}
		},
	};

	const rebalance = useMemo(() => plan ? computeRebalance(holdings, plan, driftTolerancePct) : { items: [], totalCurrentValue: 0 }, [holdings, plan, driftTolerancePct]);

	return (
		<div className="space-y-6">
			{/* Mobile-optimized KPI grid */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
				<KPI title="Current Value" value={formatCurrency(totalCurrent, currency)} icon={<PieChart className="h-5 w-5 text-indigo-600" />} />
				<KPI title="Invested" value={formatCurrency(totalInvested, currency)} icon={<Target className="h-5 w-5 text-emerald-600" />} />
				<div className="col-span-2 lg:col-span-1">
					<KPI title="P/L" value={`${formatCurrency(pnl, currency)} (${formatNumber(pnlPct, 2)}%)`} icon={pnl >= 0 ? <ArrowUpRight className="h-5 w-5 text-emerald-600" /> : <ArrowDownRight className="h-5 w-5 text-rose-600" />} valueClassName={pnl >= 0 ? "text-emerald-700" : "text-rose-700"} />
				</div>
				<div className="col-span-2 lg:col-span-1 flex gap-2">
					<Button className="w-full h-auto py-3" leftIcon={<PlusCircle className="h-4 w-4" />} onClick={() => window.location.assign("/PortfolioManagement/AddHolding")}>
						<span className="hidden sm:inline">Add Holding</span>
						<span className="sm:hidden">Add</span>
					</Button>
				</div>
			</div>

			{/* Mobile-optimized charts - stack on mobile */}
			<div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">🎯 Target Allocation</CardTitle>
						<CardDescription>Your plan's target mix</CardDescription>
					</CardHeader>
					<CardContent>
						{plan && donutData ? (
							<div className="mx-auto h-64 sm:h-72 max-w-sm">
								<Doughnut 
									data={donutData} 
									options={{ 
										plugins: { 
											legend: { 
												position: "bottom" as const, 
												labels: { 
													font: { 
														size: typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 12 
													},
													padding: typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : 16,
													usePointStyle: true,
													boxWidth: typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : 12,
												} 
											},
											tooltip: {
												titleFont: { size: typeof window !== 'undefined' && window.innerWidth < 640 ? 12 : 14 },
												bodyFont: { size: typeof window !== 'undefined' && window.innerWidth < 640 ? 11 : 13 },
												cornerRadius: 8,
												displayColors: true,
												callbacks: {
													label: function(context: any) {
														const label = context.label || '';
														const value = context.parsed || 0;
														return `${label}: ${value}%`;
													}
												}
											}
										}, 
										cutout: "70%",
										maintainAspectRatio: false,
										layout: {
											padding: typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 20
										}
									}} 
								/>
							</div>
						) : (
							<div className="text-center py-12 text-muted-foreground">
								<div className="text-4xl mb-2">🎯</div>
								<p>No plan yet.</p>
								<p className="text-sm mt-1">Go to Onboarding to create one.</p>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-lg">📊 Current vs Target</CardTitle>
						<CardDescription>Compare your allocation</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-64 sm:h-72">
							{plan ? (
								<Bar data={barData} options={barOptions as any} />
							) : (
								<div className="text-center py-12 text-muted-foreground">
									<div className="text-4xl mb-2">📈</div>
									<p>Add holdings and create a plan</p>
									<p className="text-sm mt-1">to see comparison.</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-lg">⚖️ Rebalancing Suggestions</CardTitle>
					<CardDescription>Based on drift tolerance of {driftTolerancePct}%</CardDescription>
				</CardHeader>
				<CardContent>
					{plan && rebalance.items.length > 0 ? (
						<div className="space-y-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 sm:space-y-0">
							{rebalance.items.map(item => (
								<Card key={item.class} className="border-dashed">
									<CardContent className="p-4">
										<div className="space-y-2">
											<div className="flex items-center justify-between">
												<span className="text-sm font-medium text-muted-foreground">{item.class}</span>
												<span className="text-xs text-muted-foreground">{item.actualPct}% → {item.targetPct}%</span>
											</div>
											<div className="text-base font-semibold">
												<span className={item.action === "Increase" ? "text-emerald-600" : "text-orange-600"}>
													{item.action === "Increase" ? "🟢" : "🟠"} {item.action} {formatCurrency(item.amount, currency)}
												</span>
											</div>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					) : (
						<div className="text-center py-8 text-muted-foreground">
							{holdings.length === 0 ? (
								<>
									<div className="text-4xl mb-2">📊</div>
									<p>Add holdings to see suggestions.</p>
								</>
							) : (
								<>
									<div className="text-4xl mb-2">✅</div>
									<p>All good! No rebalancing needed.</p>
								</>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function KPI({ title, value, icon, valueClassName = "" }: { title: string; value: string; icon?: React.ReactNode; valueClassName?: string }) {
	return (
		<Card className="hover:shadow-sm transition-shadow">
			<CardContent className="p-4">
				<div className="flex items-start justify-between">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
							{icon}
							<span className="truncate">{title}</span>
						</div>
						<div className={`text-lg sm:text-xl font-semibold leading-tight ${valueClassName}`}>
							{value}
						</div>
					</div>
					<LineChart className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/30 flex-shrink-0 ml-2" />
				</div>
			</CardContent>
		</Card>
	);
}