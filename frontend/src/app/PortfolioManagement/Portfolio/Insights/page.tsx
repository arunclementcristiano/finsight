"use client";
import React, { useMemo } from "react";
import { useApp } from "../../../store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/Card";
import { formatNumber } from "../../../utils/format";
import { computeRebalance } from "../../domain/rebalance";
import { useChartThemeColors } from "../../../components/useChartTheme";
import { Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from "chart.js";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line as RechartsLine, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, Target, AlertTriangle, DollarSign, BarChart3, PieChart as PieChartIcon, Activity } from "lucide-react";

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

export default function PortfolioInsightsPage() {
	const { plan, holdings, questionnaire, profile, driftTolerancePct, goals } = useApp() as any;
	const theme = useChartThemeColors();

	// Enhanced analytics calculations
	const portfolioAnalytics = useMemo(() => {
		let invested = 0, current = 0;
		const holdingsList = holdings || [];
		const byAssetClass: Record<string, { invested: number; current: number; count: number }> = {};
		
		for (const h of holdingsList) {
			const inv = typeof h.investedAmount === 'number' ? h.investedAmount : 
				(typeof h.units === 'number' && typeof h.price === 'number' ? h.units * h.price : 0);
			const cur = typeof h.currentValue === 'number' ? h.currentValue : inv;
			
			invested += inv;
			current += cur;
			
			const assetClass = h.instrumentClass || 'Other';
			if (!byAssetClass[assetClass]) {
				byAssetClass[assetClass] = { invested: 0, current: 0, count: 0 };
			}
			byAssetClass[assetClass].invested += inv;
			byAssetClass[assetClass].current += cur;
			byAssetClass[assetClass].count += 1;
		}
		
		const pnl = current - invested;
		const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
		
		// Asset class breakdown with performance
		const assetBreakdown = Object.entries(byAssetClass).map(([assetClass, data]) => {
			const assetPnl = data.current - data.invested;
			const assetPnlPct = data.invested > 0 ? (assetPnl / data.invested) * 100 : 0;
			const currentPct = current > 0 ? (data.current / current) * 100 : 0;
			return {
				assetClass,
				invested: data.invested,
				current: data.current,
				pnl: assetPnl,
				pnlPct: assetPnlPct,
				currentPct,
				holdingsCount: data.count
			};
		}).sort((a, b) => b.current - a.current);
		
		return { 
			invested, 
			current, 
			pnl, 
			pnlPct, 
			assetBreakdown,
			totalHoldings: holdingsList.length 
		};
	}, [holdings]);

	// Mock time series data for portfolio performance (in real app, fetch from API)
	const portfolioTimeSeriesData = useMemo(() => {
		if (!holdings || holdings.length === 0) return [];
		
		// Generate mock data for the last 12 months
		const months = [];
		const currentDate = new Date();
		let baseValue = portfolioAnalytics.current * 0.8; // Start at 80% of current value
		
		for (let i = 11; i >= 0; i--) {
			const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
			const monthName = date.toLocaleDateString('en-US', { month: 'short' });
			
			// Add some realistic variation
			const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
			baseValue = baseValue * (1 + variation);
			
			months.push({
				month: monthName,
				value: Math.round(baseValue),
				invested: Math.round(portfolioAnalytics.invested * (0.8 + (i * 0.02))) // Gradual increase in investment
			});
		}
		
		return months;
	}, [holdings, portfolioAnalytics.current, portfolioAnalytics.invested]);

	// Chart.js data for time series
	const timeSeriesChartData = useMemo(() => {
		if (!portfolioTimeSeriesData.length) return null;
		
		return {
			labels: portfolioTimeSeriesData.map(item => item.month),
			datasets: [
				{
					label: 'Portfolio Value',
					data: portfolioTimeSeriesData.map(item => item.value),
					borderColor: '#8884d8',
					backgroundColor: '#8884d8' + '20',
					fill: true,
					tension: 0.4,
					pointRadius: 4,
					pointHoverRadius: 6
				},
				{
					label: 'Amount Invested',
					data: portfolioTimeSeriesData.map(item => item.invested),
					borderColor: '#82ca9d',
					backgroundColor: '#82ca9d' + '20',
					fill: true,
					tension: 0.4,
					pointRadius: 4,
					pointHoverRadius: 6
				}
			]
		};
	}, [portfolioTimeSeriesData]);

	// Plan vs Actual analysis
	const allocationAnalysis = useMemo(() => {
		if (!plan || !plan.buckets) return null;
		
		const targetByClass: Record<string, number> = {};
		const actualByClass: Record<string, number> = {};
		
		// Get target allocations from plan
		plan.buckets.forEach((bucket: any) => {
			targetByClass[bucket.class] = bucket.pct;
		});
		
		// Calculate actual allocations
		const total = portfolioAnalytics.current;
		portfolioAnalytics.assetBreakdown.forEach(asset => {
			actualByClass[asset.assetClass] = total > 0 ? (asset.current / total) * 100 : 0;
		});
		
		// Calculate drift analysis
		const driftAnalysis = plan.buckets.map((bucket: any) => {
			const actual = actualByClass[bucket.class] || 0;
			const target = bucket.pct;
			const delta = actual - target;
			const driftSeverity = Math.abs(delta) > (driftTolerancePct || 5) ? 'high' : 
				Math.abs(delta) > 2 ? 'medium' : 'low';
			
			return {
				assetClass: bucket.class,
				target,
				actual,
				delta,
				driftSeverity,
				needsRebalancing: Math.abs(delta) > (driftTolerancePct || 5)
			};
		}).sort((a: any, b: any) => Math.abs(b.delta) - Math.abs(a.delta));
		
		return { targetByClass, actualByClass, driftAnalysis };
	}, [plan, portfolioAnalytics, driftTolerancePct]);

	// Goals analysis
	const goalsAnalysis = useMemo(() => {
		try {
			const raw = localStorage.getItem('investmentGoals');
			const goals = raw ? JSON.parse(raw) : [];
			
			const totalTargetAmount = goals.reduce((sum: number, goal: any) => sum + (goal.targetAmount || 0), 0);
			const activeGoals = goals.filter((goal: any) => goal.isActive !== false);
			
			// Categorize by timeline
			const now = new Date();
			const shortTerm = goals.filter((goal: any) => {
				const targetDate = new Date(goal.targetDate);
				const yearsToTarget = (targetDate.getTime() - now.getTime()) / (1000 * 3600 * 24 * 365.25);
				return yearsToTarget <= 3;
			});
			
			const mediumTerm = goals.filter((goal: any) => {
				const targetDate = new Date(goal.targetDate);
				const yearsToTarget = (targetDate.getTime() - now.getTime()) / (1000 * 3600 * 24 * 365.25);
				return yearsToTarget > 3 && yearsToTarget <= 7;
			});
			
			const longTerm = goals.filter((goal: any) => {
				const targetDate = new Date(goal.targetDate);
				const yearsToTarget = (targetDate.getTime() - now.getTime()) / (1000 * 3600 * 24 * 365.25);
				return yearsToTarget > 7;
			});
			
			return {
				total: goals.length,
				active: activeGoals.length,
				totalTargetAmount,
				shortTerm: shortTerm.length,
				mediumTerm: mediumTerm.length,
				longTerm: longTerm.length,
				goals: goals.slice(0, 5) // Top 5 for display
			};
		} catch {
			return { total: 0, active: 0, totalTargetAmount: 0, shortTerm: 0, mediumTerm: 0, longTerm: 0, goals: [] };
		}
	}, []);

	// Rebalancing analysis
	const rebalanceAnalysis = useMemo(() => {
		if (!plan) return { items: [], totalCurrentValue: 0, needsRebalancing: false };
		const rebalance = computeRebalance(holdings, plan, driftTolerancePct);
		return {
			...rebalance,
			needsRebalancing: rebalance.items.length > 0
		};
	}, [holdings, plan, driftTolerancePct]);

	// Risk and signals analysis
	const riskAnalysis = useMemo(() => {
		if (!plan) return null;
		
		const equityExposure = (plan.equity || 0);
		const defensiveExposure = (plan.defensive || 0);
		const satelliteExposure = (plan.satellite || 0);
		
		const riskLevel = plan.riskLevel || 'Moderate';
		const riskScore = plan.riskScore || 50;
		
		return {
			equityExposure,
			defensiveExposure,
			satelliteExposure,
			riskLevel,
			riskScore,
			signals: plan.signals || [],
			stressTest: plan.stressTest || null
		};
	}, [plan]);

	return (
		<div className="max-w-full space-y-4 pl-2">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="text-sm text-muted-foreground">Portfolio Insights</div>
				</div>
			</div>

			{/* Key Metrics Dashboard */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<Card className="relative overflow-hidden border-2 border-blue-100 dark:border-blue-900">
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Invested</CardTitle>
							<DollarSign className="h-4 w-4 text-blue-600" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-blue-900 dark:text-blue-100">₹{formatNumber(portfolioAnalytics.invested, 0)}</div>
						<p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{portfolioAnalytics.totalHoldings} holdings</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border-2 border-green-100 dark:border-green-900">
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Current Value</CardTitle>
							<TrendingUp className="h-4 w-4 text-green-600" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-900 dark:text-green-100">₹{formatNumber(portfolioAnalytics.current, 0)}</div>
						<p className="text-xs text-green-600 dark:text-green-400 mt-1">
							{portfolioAnalytics.pnl >= 0 ? '+' : ''}₹{formatNumber(portfolioAnalytics.pnl, 0)} gain
						</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border-2 border-purple-100 dark:border-purple-900">
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Returns</CardTitle>
							{portfolioAnalytics.pnlPct >= 0 ? 
								<TrendingUp className="h-4 w-4 text-green-600" /> : 
								<TrendingDown className="h-4 w-4 text-red-600" />
							}
						</div>
					</CardHeader>
					<CardContent>
						<div className={`text-2xl font-bold ${portfolioAnalytics.pnlPct >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
							{portfolioAnalytics.pnlPct >= 0 ? '+' : ''}{formatNumber(portfolioAnalytics.pnlPct, 2)}%
						</div>
						<p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Overall performance</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border-2 border-orange-100 dark:border-orange-900">
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Active Goals</CardTitle>
							<Target className="h-4 w-4 text-orange-600" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{goalsAnalysis.active}</div>
						<p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
							₹{formatNumber(goalsAnalysis.totalTargetAmount / 100000, 1)}L target
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Charts Row 1: Allocation Analysis */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Asset Allocation Chart */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<PieChartIcon className="h-5 w-5" />
							Asset Allocation
						</CardTitle>
						<CardDescription>Current portfolio breakdown by asset class</CardDescription>
					</CardHeader>
					<CardContent>
						{portfolioAnalytics.assetBreakdown.length > 0 ? (
							<div className="h-80">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={portfolioAnalytics.assetBreakdown}
											dataKey="currentPct"
											nameKey="assetClass"
											cx="50%"
											cy="50%"
											outerRadius={100}
											fill="#8884d8"
											label={({ assetClass, currentPct }) => `${assetClass}: ${formatNumber(currentPct, 1)}%`}
										>
											{portfolioAnalytics.assetBreakdown.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
											))}
										</Pie>
										<Tooltip formatter={(value: any, name: string) => [`${formatNumber(value, 1)}%`, name]} />
									</PieChart>
								</ResponsiveContainer>
							</div>
						) : (
							<div className="h-80 flex items-center justify-center text-muted-foreground">
								No holdings data available
							</div>
						)}
					</CardContent>
				</Card>

				{/* Plan vs Actual Comparison */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<BarChart3 className="h-5 w-5" />
							Plan vs Actual
						</CardTitle>
						<CardDescription>Target allocation vs current portfolio</CardDescription>
					</CardHeader>
					<CardContent>
						{allocationAnalysis ? (
							<div className="h-80">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart
										data={allocationAnalysis.driftAnalysis}
										margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
									>
										<XAxis dataKey="assetClass" />
										<YAxis />
										<Tooltip />
										<Bar dataKey="target" fill="#8884d8" name="Target %" />
										<Bar dataKey="actual" fill="#82ca9d" name="Actual %" />
									</BarChart>
								</ResponsiveContainer>
							</div>
						) : (
							<div className="h-80 flex items-center justify-center text-muted-foreground">
								Complete questionnaire to see target allocation
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Asset Performance Breakdown */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Activity className="h-5 w-5" />
						Asset Class Performance
					</CardTitle>
					<CardDescription>Detailed breakdown of performance by asset class</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="text-left py-3 px-2">Asset Class</th>
									<th className="text-right py-3 px-2">Holdings</th>
									<th className="text-right py-3 px-2">Invested</th>
									<th className="text-right py-3 px-2">Current</th>
									<th className="text-right py-3 px-2">P&L</th>
									<th className="text-right py-3 px-2">Returns</th>
									<th className="text-right py-3 px-2">Allocation</th>
								</tr>
							</thead>
							<tbody>
								{portfolioAnalytics.assetBreakdown.map((asset, index) => (
									<tr key={asset.assetClass} className="border-b hover:bg-muted/50">
										<td className="py-3 px-2 font-medium">{asset.assetClass}</td>
										<td className="text-right py-3 px-2">{asset.holdingsCount}</td>
										<td className="text-right py-3 px-2">₹{formatNumber(asset.invested, 0)}</td>
										<td className="text-right py-3 px-2">₹{formatNumber(asset.current, 0)}</td>
										<td className={`text-right py-3 px-2 ${asset.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
											{asset.pnl >= 0 ? '+' : ''}₹{formatNumber(asset.pnl, 0)}
										</td>
										<td className={`text-right py-3 px-2 font-semibold ${asset.pnlPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
											{asset.pnlPct >= 0 ? '+' : ''}{formatNumber(asset.pnlPct, 2)}%
										</td>
										<td className="text-right py-3 px-2">{formatNumber(asset.currentPct, 1)}%</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			{/* Risk & Strategy Analysis */}
			{riskAnalysis && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Risk Profile */}
					<Card>
						<CardHeader>
							<CardTitle>Risk Profile & Strategy</CardTitle>
							<CardDescription>Your investment approach and risk characteristics</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="font-medium">Risk Level:</span>
								<span className={`px-3 py-1 rounded-full text-sm font-semibold ${
									riskAnalysis.riskLevel === 'Conservative' ? 'bg-green-100 text-green-700' :
									riskAnalysis.riskLevel === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
									'bg-red-100 text-red-700'
								}`}>
									{riskAnalysis.riskLevel}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="font-medium">Risk Score:</span>
								<span className="text-lg font-bold">{riskAnalysis.riskScore}/100</span>
							</div>
							<div className="space-y-3">
								<div>
									<div className="flex justify-between text-sm mb-1">
										<span>Equity Exposure</span>
										<span>{formatNumber(riskAnalysis.equityExposure, 1)}%</span>
									</div>
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div className="bg-blue-600 h-2 rounded-full" style={{ width: `${riskAnalysis.equityExposure}%` }}></div>
									</div>
								</div>
								<div>
									<div className="flex justify-between text-sm mb-1">
										<span>Defensive Assets</span>
										<span>{formatNumber(riskAnalysis.defensiveExposure, 1)}%</span>
									</div>
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div className="bg-green-600 h-2 rounded-full" style={{ width: `${riskAnalysis.defensiveExposure}%` }}></div>
									</div>
								</div>
								<div>
									<div className="flex justify-between text-sm mb-1">
										<span>Alternative Assets</span>
										<span>{formatNumber(riskAnalysis.satelliteExposure, 1)}%</span>
									</div>
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div className="bg-purple-600 h-2 rounded-full" style={{ width: `${riskAnalysis.satelliteExposure}%` }}></div>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Goals Timeline */}
					<Card>
						<CardHeader>
							<CardTitle>Goals Timeline</CardTitle>
							<CardDescription>Investment goals by time horizon</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
									<div>
										<div className="font-semibold text-blue-700 dark:text-blue-300">Short Term (≤3 years)</div>
										<div className="text-sm text-blue-600 dark:text-blue-400">Immediate priorities</div>
									</div>
									<div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{goalsAnalysis.shortTerm}</div>
								</div>
								<div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
									<div>
										<div className="font-semibold text-yellow-700 dark:text-yellow-300">Medium Term (3-7 years)</div>
										<div className="text-sm text-yellow-600 dark:text-yellow-400">Major milestones</div>
									</div>
									<div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{goalsAnalysis.mediumTerm}</div>
								</div>
								<div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
									<div>
										<div className="font-semibold text-green-700 dark:text-green-300">Long Term (7+ years)</div>
										<div className="text-sm text-green-600 dark:text-green-400">Future planning</div>
									</div>
									<div className="text-2xl font-bold text-green-700 dark:text-green-300">{goalsAnalysis.longTerm}</div>
								</div>
							</div>
							
							{goalsAnalysis.goals.length > 0 && (
								<div className="mt-6">
									<h4 className="font-semibold mb-3">Upcoming Goals</h4>
									<div className="space-y-2">
										{goalsAnalysis.goals.map((goal: any) => (
											<div key={goal.id} className="flex justify-between items-center p-2 border rounded">
												<div>
													<div className="font-medium">{goal.name}</div>
													<div className="text-sm text-muted-foreground">
														Target: ₹{formatNumber(goal.targetAmount, 0)}
													</div>
												</div>
												<div className="text-sm text-muted-foreground">
													{new Date(goal.targetDate).toLocaleDateString()}
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			)}

			{/* Drift Analysis & Rebalancing */}
			{allocationAnalysis && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5" />
							Allocation Drift Analysis
						</CardTitle>
						<CardDescription>
							Variances from target allocation requiring attention (tolerance: ±{driftTolerancePct || 5}%)
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{allocationAnalysis.driftAnalysis.map((drift: any) => (
								<div key={drift.assetClass} className="flex items-center justify-between p-4 border rounded-lg">
									<div className="flex items-center gap-4">
										<div className="font-medium">{drift.assetClass}</div>
										<div className={`px-2 py-1 rounded text-xs font-semibold ${
											drift.driftSeverity === 'high' ? 'bg-red-100 text-red-700' :
											drift.driftSeverity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
											'bg-green-100 text-green-700'
										}`}>
											{drift.driftSeverity} drift
										</div>
									</div>
									<div className="text-right">
										<div className="font-semibold">
											{formatNumber(drift.actual, 1)}% / {formatNumber(drift.target, 1)}%
										</div>
										<div className={`text-sm ${drift.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
											{drift.delta >= 0 ? '+' : ''}{formatNumber(drift.delta, 1)}% drift
										</div>
									</div>
								</div>
							))}
						</div>

						{rebalanceAnalysis.needsRebalancing && (
							<div className="mt-6 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
								<h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
									Rebalancing Recommended
								</h4>
								<p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
									Your portfolio has drifted beyond tolerance limits. Consider the following adjustments:
								</p>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{rebalanceAnalysis.items.map((item: any) => (
										<div key={item.class} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded border">
											<div>
												<div className="font-medium">{item.class}</div>
												<div className="text-sm text-muted-foreground">
													{item.actualPct}% → {item.targetPct}%
												</div>
											</div>
											<div className={`font-bold ${item.action === 'Increase' ? 'text-green-600' : 'text-red-600'}`}>
												{item.action === 'Increase' ? '+' : '-'}₹{formatNumber(Math.abs(item.amount), 0)}
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Signals & Stress Test */}
			{riskAnalysis?.signals?.length > 0 && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<Card>
						<CardHeader>
							<CardTitle>Investment Signals</CardTitle>
							<CardDescription>Factors influencing your allocation strategy</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{riskAnalysis?.signals
									.sort((a: any, b: any) => Math.abs(b.equitySignal * b.weight) - Math.abs(a.equitySignal * a.weight))
									.slice(0, 6)
									.map((signal: any, index: number) => {
										const impact = signal.equitySignal * signal.weight;
										const width = Math.min(100, Math.max(10, Math.abs(impact) * 20));
										return (
											<div key={index} className="space-y-2">
												<div className="flex justify-between items-center">
													<span className="font-medium capitalize">
														{String(signal.factor || '').replace(/_/g, ' ')}
													</span>
													<span className={`font-bold ${impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
														{impact >= 0 ? '+' : ''}{Math.round(impact * 10)}
													</span>
												</div>
												<div className="w-full bg-gray-200 rounded-full h-2">
													<div 
														className={`h-2 rounded-full ${impact >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
														style={{ width: `${width}%` }}
													></div>
												</div>
												<p className="text-xs text-muted-foreground">{signal.explanation}</p>
											</div>
										);
									})}
							</div>
						</CardContent>
					</Card>

					{riskAnalysis?.stressTest?.scenarios && (
						<Card>
							<CardHeader>
								<CardTitle>Stress Test Results</CardTitle>
								<CardDescription>Portfolio resilience under adverse conditions</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{Object.entries(riskAnalysis?.stressTest?.scenarios || {}).slice(0, 4).map(([scenario, result]: any) => (
										<div key={scenario} className="p-3 border rounded-lg">
											<div className="flex justify-between items-center mb-2">
												<span className="font-medium">{scenario}</span>
												<span className={`font-bold ${result.portfolioImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
													{result.portfolioImpact >= 0 ? '+' : ''}{Number(result.portfolioImpact).toFixed(1)}%
												</span>
											</div>
											<div className="w-full bg-gray-200 rounded-full h-2 mb-2">
												<div 
													className={`h-2 rounded-full ${result.portfolioImpact >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
													style={{ 
														width: `${Math.min(100, Math.max(5, Math.abs(result.portfolioImpact) * 2))}%` 
													}}
												></div>
											</div>
											<div className="text-xs text-muted-foreground">
												Coverage: {Number(result.monthsCovered || 0).toFixed(1)} months
												{result.historicalDrop && ` • Historical: ${result.historicalDrop}`}
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			)}

			{/* Portfolio Performance Time Series Chart */}
			<Card className="mt-8">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Activity size={20} />
						Portfolio Performance Over Time
					</CardTitle>
					<CardDescription>Track your portfolio value and investment growth over the last 12 months</CardDescription>
				</CardHeader>
				<CardContent>
					{holdings && holdings.length > 0 ? (
						<div>
							<div className="h-80">
								{timeSeriesChartData && (
									<Line 
										data={timeSeriesChartData}
										options={{
											responsive: true,
											maintainAspectRatio: false,
											plugins: {
												legend: {
													position: 'top' as const,
												},
												tooltip: {
													mode: 'index' as const,
													intersect: false,
													callbacks: {
														label: function(context) {
															return `${context.dataset.label}: ₹${Number(context.parsed.y).toLocaleString()}`;
														}
													}
												}
											},
											scales: {
												y: {
													beginAtZero: false,
													ticks: {
														callback: function(value) {
															return '₹' + Number(value).toLocaleString();
														}
													}
												}
											},
											interaction: {
												mode: 'nearest' as const,
												axis: 'x' as const,
												intersect: false
											}
										}}
									/>
								)}
							</div>
							
							{/* Performance Summary */}
							<div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
								<div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
									<div className="text-sm text-muted-foreground mb-1">Current Value</div>
									<div className="text-2xl font-bold text-blue-600">₹{portfolioAnalytics.current.toLocaleString()}</div>
								</div>
								<div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
									<div className="text-sm text-muted-foreground mb-1">Total Return</div>
									<div className={`text-2xl font-bold ${portfolioAnalytics.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
										{portfolioAnalytics.pnl >= 0 ? '+' : ''}{portfolioAnalytics.pnl.toFixed(2)}%
									</div>
								</div>
								<div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
									<div className="text-sm text-muted-foreground mb-1">Total Invested</div>
									<div className="text-2xl font-bold text-purple-600">₹{portfolioAnalytics.invested.toLocaleString()}</div>
								</div>
							</div>
						</div>
					) : (
						<div className="text-center py-12 text-muted-foreground">
							<div className="text-4xl mb-3">📈</div>
							<div className="text-lg font-medium mb-2">No Performance Data Available</div>
							<div className="text-sm">Add some holdings to see your portfolio performance over time</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

