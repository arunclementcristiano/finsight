"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/Card";
import { Button } from "../../../components/Button";

export default function PortfolioOverviewPage() {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-lg font-semibold">Portfolio Overview</h1>
					<p className="text-xs text-muted-foreground">Mini dashboard of allocation and KPIs</p>
				</div>
				<Button variant="outline" onClick={()=> window.location.assign('/PortfolioManagement/Plan')}>Open Plan</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
				<Card>
					<CardHeader className="py-2"><CardTitle className="text-base">Allocation</CardTitle><CardDescription className="text-xs">Donut (placeholder)</CardDescription></CardHeader>
					<CardContent className="pt-0 text-xs text-muted-foreground">Chart placeholder</CardContent>
				</Card>
				<Card>
					<CardHeader className="py-2"><CardTitle className="text-base">Top KPIs</CardTitle><CardDescription className="text-xs">Equity/Defensive/Satellite</CardDescription></CardHeader>
					<CardContent className="pt-0 text-xs">Equity 60% • Defensive 30% • Satellite 10%</CardContent>
				</Card>
				<Card>
					<CardHeader className="py-2"><CardTitle className="text-base">Quick Rebalance</CardTitle><CardDescription className="text-xs">Suggestion (placeholder)</CardDescription></CardHeader>
					<CardContent className="pt-0 text-xs">
						<div className="mb-2">No major drift. Minor: Stocks +1%, Debt -1%</div>
						<Button size="sm" onClick={()=> window.location.assign('/PortfolioManagement/Dashboard')}>View Suggestions</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}