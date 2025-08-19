"use client";
import React, { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/Card";
import { useApp } from "../../store";
import type { AssetClass } from "../../PortfolioManagement/domain/allocationEngine";
import { v4 as uuidv4 } from "uuid";
import { formatCurrency, formatNumber } from "../../utils/format";
import { Banknote, BarChart3, IndianRupee, Percent, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../components/utils";

function HoldingsTableWithPagination({ onImport }: { onImport?: () => void }) {
	const { holdings, deleteHolding, profile } = useApp();
	const currency = profile.currency || "INR";
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(8);

	function classTextColor(cls: AssetClass) {
		switch (cls) {
			case "Stocks": return "text-indigo-600 dark:text-indigo-300";
			case "Mutual Funds": return "text-emerald-600 dark:text-emerald-300";
			case "Gold": return "text-amber-600 dark:text-amber-300";
			case "Real Estate": return "text-violet-600 dark:text-violet-300";
			case "Debt": return "text-sky-600 dark:text-sky-300";
			case "Liquid": return "text-cyan-600 dark:text-cyan-300";
			default: return "";
		}
	}

	const totals = useMemo(() => {
		let invested = 0, current = 0;
		for (const h of holdings) {
			const inv = typeof h.investedAmount === 'number' ? h.investedAmount : (typeof h.units === 'number' && typeof h.price === 'number' ? h.units * h.price : 0);
			const cur = typeof h.currentValue === 'number' ? h.currentValue : inv;
			invested += inv; current += cur;
		}
		const pnl = current - invested;
		const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
		return { invested, current, pnl, pnlPct };
	}, [holdings]);

	const totalPages = Math.max(1, Math.ceil(holdings.length / pageSize));
	const startIdx = (page - 1) * pageSize;
	const pageRows = holdings.slice(startIdx, startIdx + pageSize);

	function prev() { setPage(p => Math.max(1, p - 1)); }
	function next() { setPage(p => Math.min(totalPages, p + 1)); }

	return (
		<Card className="flex flex-col">
			<CardHeader className="flex-shrink-0">
				<div className="flex items-center justify-between gap-3">
					<div>
						<CardTitle>Your Holdings</CardTitle>
						<CardDescription>Overview of positions you have added</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<Button onClick={onImport} className="h-9" leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M21 21H3"/></svg>}>Import</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{holdings.length === 0 ? (
					<div className="text-foreground/80">No holdings yet. Add your first holding using the form.</div>
				) : (
					<>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
							<div className="rounded-xl border border-border p-3">
								<div className="text-xs text-foreground/80">Total Invested</div>
								<div className="text-lg font-semibold">{formatNumber(totals.invested, 2)}</div>
							</div>
							<div className="rounded-xl border border-border p-3">
								<div className="text-xs text-foreground/80">Total Current</div>
								<div className="text-lg font-semibold">{formatNumber(totals.current, 2)}</div>
							</div>
							<div className="rounded-xl border border-border p-3">
								<div className="text-xs text-foreground/80">P/L</div>
								<div className={cn("text-lg font-semibold", totals.pnlPct >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatNumber(totals.pnlPct, 2)}%</div>
							</div>
						</div>
						<table className="w-full text-left border rounded-xl overflow-hidden border-border text-sm">
							<thead className="bg-card sticky top-0 z-10">
								<tr>
									<th className="px-3 py-2 border-b">Class</th>
									<th className="px-3 py-2 border-b">Name / Symbol</th>
									<th className="px-3 py-2 border-b text-right">Units</th>
									<th className="px-3 py-2 border-b text-right">Price</th>
									<th className="px-3 py-2 border-b text-right">Invested</th>
									<th className="px-3 py-2 border-b text-right">Current</th>
									<th className="px-3 py-2 border-b text-right">P/L</th>
									<th className="px-3 py-2 border-b">Actions</th>
								</tr>
							</thead>
							<tbody>
								{pageRows.map(h => {
									const invested = h.investedAmount ?? (h.units && h.price ? h.units * h.price : 0);
									const current = h.currentValue ?? invested;
									const pnl = current - invested;
									const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
									return (
										<tr key={h.id} className="border-b align-top">
											<td className={cn("px-3 py-2 whitespace-nowrap font-semibold", classTextColor(h.instrumentClass))}>{h.instrumentClass}</td>
											<td className="px-3 py-2">
												<div className="font-medium leading-tight">{h.name}</div>
												<div className="text-foreground/80 text-xs leading-tight">{h.symbol || "—"}</div>
											</td>
											<td className="px-3 py-2 text-right">{typeof h.units === "number" ? formatNumber(h.units, 2) : "—"}</td>
											<td className="px-3 py-2 text-right">{typeof h.price === "number" ? formatNumber(h.price, 2) : "—"}</td>
											<td className="px-3 py-2 text-right">{formatNumber(invested, 2)}</td>
											<td className="px-3 py-2 text-right">{formatNumber(current, 2)}</td>
											<td className="px-3 py-2 text-right"><span className={cn("font-semibold", pnlPct >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatNumber(pnlPct, 2)}%</span></td>
											<td className="px-3 py-2"><button className="text-xs text-rose-600 hover:underline" onClick={() => deleteHolding(h.id)}>Delete</button></td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</>
				)}
			</CardContent>
			<CardFooter className="flex items-center justify-between gap-3 flex-shrink-0">
				<div className="text-sm text-foreground/80">Page {page} of {totalPages}</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={prev} disabled={page === 1} leftIcon={<ChevronLeft className="h-4 w-4" />}>Prev</Button>
					<Button variant="outline" size="sm" onClick={next} disabled={page === totalPages}><ChevronRight className="h-4 w-4 mr-2" />Next</Button>
				</div>
			</CardFooter>
		</Card>
	);
}