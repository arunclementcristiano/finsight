"use client";
import React from "react";
import { Card, CardContent } from "../../components/Card";
import { formatCurrency, formatNumber } from "../../utils/format";
import { cn } from "../../components/utils";
import type { AssetClass } from "../domain/allocationEngine";
import type { Holding } from "../../store";
import { MoreVertical, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MobileHoldingCardProps {
	holding: Holding;
	currency?: string;
	onDelete?: (id: string) => void;
}

export default function MobileHoldingCard({ holding, currency = "INR", onDelete }: MobileHoldingCardProps) {
	const invested = holding.investedAmount ?? (holding.units && holding.price ? holding.units * holding.price : 0);
	const current = holding.currentValue ?? invested;
	const pnl = current - invested;
	const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

	function classColor(cls: AssetClass) {
		switch (cls) {
			case "Stocks": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
			case "Mutual Funds": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
			case "Gold": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
			case "Real Estate": return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300";
			case "Debt": return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
			case "Liquid": return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300";
			default: return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300";
		}
	}

	const PnLIcon = pnl > 0 ? TrendingUp : pnl < 0 ? TrendingDown : Minus;
	const pnlColor = pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-rose-600" : "text-gray-500";

	return (
		<Card className="w-full">
			<CardContent className="p-4">
				{/* Header Row */}
				<div className="flex items-start justify-between mb-3">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							<span className={cn("px-2 py-1 rounded-full text-xs font-medium", classColor(holding.instrumentClass))}>
								{holding.instrumentClass}
							</span>
						</div>
						<h3 className="font-semibold text-sm leading-tight truncate">{holding.name}</h3>
						{holding.symbol && (
							<p className="text-xs text-muted-foreground">{holding.symbol}</p>
						)}
					</div>
					
					{/* Actions */}
					<div className="flex items-center gap-1 ml-3">
						{onDelete && (
							<button
								onClick={() => onDelete(holding.id)}
								className="p-2 hover:bg-muted rounded-lg transition-colors touch-manipulation"
								aria-label="Delete holding"
							>
								<MoreVertical className="h-4 w-4 text-muted-foreground" />
							</button>
						)}
					</div>
				</div>

				{/* Financial Data Grid */}
				<div className="grid grid-cols-2 gap-3 mb-3">
					{/* Units & Price */}
					{typeof holding.units === "number" && typeof holding.price === "number" && (
						<>
							<div className="space-y-1">
								<p className="text-xs text-muted-foreground">Units</p>
								<p className="font-semibold text-sm">{formatNumber(holding.units, 4)}</p>
							</div>
							<div className="space-y-1">
								<p className="text-xs text-muted-foreground">Price</p>
								<p className="font-semibold text-sm">{formatCurrency(holding.price, currency)}</p>
							</div>
						</>
					)}
				</div>

				{/* Investment Summary */}
				<div className="grid grid-cols-2 gap-3 mb-3">
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground">Invested</p>
						<p className="font-semibold text-sm">{formatCurrency(invested, currency)}</p>
					</div>
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground">Current</p>
						<p className="font-semibold text-sm">{formatCurrency(current, currency)}</p>
					</div>
				</div>

				{/* P/L Row - Highlighted */}
				<div className="flex items-center justify-between pt-3 border-t border-border">
					<span className="text-xs text-muted-foreground">Profit/Loss</span>
					<div className="flex items-center gap-1">
						<PnLIcon className={cn("h-4 w-4", pnlColor)} />
						<span className={cn("font-semibold text-sm", pnlColor)}>
							{formatCurrency(pnl, currency)} ({formatNumber(pnlPct, 2)}%)
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}