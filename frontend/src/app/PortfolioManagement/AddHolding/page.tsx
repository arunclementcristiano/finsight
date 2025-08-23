"use client";
import React, { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/Card";
import { useApp } from "../../store";
import type { AssetClass } from "../../PortfolioManagement/domain/allocationEngine";
import { v4 as uuidv4 } from "uuid";
import { formatCurrency, formatNumber } from "../../utils/format";
import { Banknote, BarChart3, IndianRupee, Percent, Layers, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { cn } from "../../components/utils";
import MobileHoldingCard from "../components/MobileHoldingCard";

type EntryMode = "units" | "amount";

interface HoldingFormState {
	instrumentClass: AssetClass | "";
	name: string;
	symbol: string;
	units: string;
	price: string;
	investedAmount: string;
	currentValue: string;
}

const instrumentOptions: AssetClass[] = ["Stocks", "Mutual Funds", "Gold", "Real Estate", "Debt", "Liquid"];

export default function AddHoldingPage() {
	const { addHolding, profile } = useApp();
	const currency = profile.currency || "INR";
	const [mode, setMode] = useState<EntryMode>("units");
	const [form, setForm] = useState<HoldingFormState>({ instrumentClass: "", name: "", symbol: "", units: "", price: "", investedAmount: "", currentValue: "" });
	const [submitted, setSubmitted] = useState(false);
	const [tab, setTab] = useState<"holdings" | "add">("holdings");
	const [showImport, setShowImport] = useState(false);

	function onChange<K extends keyof HoldingFormState>(key: K) {
		return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			setForm(prev => ({ ...prev, [key]: e.target.value }));
		};
	}

	const numeric = React.useMemo(() => {
		const n = { units: parseFloat(form.units), price: parseFloat(form.price), investedAmount: parseFloat(form.investedAmount), currentValue: parseFloat(form.currentValue) };
		return {
			units: Number.isFinite(n.units) ? n.units : NaN,
			price: Number.isFinite(n.price) ? n.price : NaN,
			investedAmount: Number.isFinite(n.investedAmount) ? n.investedAmount : NaN,
			currentValue: Number.isFinite(n.currentValue) ? n.currentValue : NaN,
		};
	}, [form]);

	const computed = React.useMemo(() => {
		const totalByUnits = !Number.isNaN(numeric.units) && !Number.isNaN(numeric.price) ? numeric.units * numeric.price : NaN;
		const totalByAmount = !Number.isNaN(numeric.currentValue) ? numeric.currentValue : NaN;
		const invested = mode === "units" ? (!Number.isNaN(totalByUnits) ? totalByUnits : NaN) : (!Number.isNaN(numeric.investedAmount) ? numeric.investedAmount : NaN);
		const current = mode === "units" ? totalByUnits : totalByAmount;
		const pnl = !Number.isNaN(invested) && !Number.isNaN(current) ? current - invested : NaN;
		const pnlPct = !Number.isNaN(invested) && invested > 0 && !Number.isNaN(current) ? ((current - invested) / invested) * 100 : NaN;
		return { invested, current, pnl, pnlPct };
	}, [numeric, mode]);

	const errors = React.useMemo(() => {
		const e: Partial<Record<keyof HoldingFormState | "_form", string>> = {};
		if (!form.instrumentClass) e.instrumentClass = "Select an instrument class";
		if (!form.name.trim()) e.name = "Enter a name";
		if (mode === "units") {
			if (Number.isNaN(numeric.units) || numeric.units <= 0) e.units = "Enter units > 0";
			if (Number.isNaN(numeric.price) || numeric.price <= 0) e.price = "Enter price > 0";
		} else {
			if (Number.isNaN(numeric.investedAmount) || numeric.investedAmount < 0) e.investedAmount = "Enter invested amount ≥ 0";
			if (Number.isNaN(numeric.currentValue) || numeric.currentValue <= 0) e.currentValue = "Enter current value > 0";
		}
		return e;
	}, [form, mode, numeric]);

	const isValid = React.useMemo(() => Object.keys(errors).length === 0, [errors]);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!isValid) return;
		const id = uuidv4();
		addHolding({
			id,
			instrumentClass: form.instrumentClass as AssetClass,
			name: form.name.trim(),
			symbol: form.symbol.trim() || undefined,
			units: mode === "units" && !Number.isNaN(numeric.units) ? numeric.units : undefined,
			price: mode === "units" && !Number.isNaN(numeric.price) ? numeric.price : undefined,
			investedAmount: !Number.isNaN(computed.invested) ? Number(computed.invested.toFixed(2)) : undefined,
			currentValue: !Number.isNaN(computed.current) ? Number(computed.current.toFixed(2)) : undefined,
		});
		setSubmitted(true);
	}

	function resetForm() {
		setForm({ instrumentClass: "", name: "", symbol: "", units: "", price: "", investedAmount: "", currentValue: "" });
		setSubmitted(false);
	}

	return (
		<div className="space-y-6">
			{/* Mobile-optimized tab navigation */}
			<div className="border-b border-border">
				<nav className="flex space-x-1" aria-label="Tabs">
					<button 
						onClick={() => setTab("holdings")} 
						className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium rounded-t-lg transition-colors touch-manipulation ${
							tab === "holdings" 
								? "text-indigo-600 border-b-2 border-indigo-600 -mb-px bg-indigo-50 dark:bg-indigo-900/20" 
								: "text-foreground hover:bg-muted"
						}`}
					>
						📊 Holdings
					</button>
					<button 
						onClick={() => setTab("add")} 
						className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium rounded-t-lg transition-colors touch-manipulation ${
							tab === "add" 
								? "text-indigo-600 border-b-2 border-indigo-600 -mb-px bg-indigo-50 dark:bg-indigo-900/20" 
								: "text-foreground hover:bg-muted"
						}`}
					>
						➕ Add Holding
					</button>
				</nav>
			</div>

			{tab === "holdings" && (
				<HoldingsTableWithPagination onImport={() => setShowImport(true)} />
			)}

			{tab === "add" && (
				<div className="space-y-6 xl:grid xl:grid-cols-2 xl:gap-6 xl:space-y-0">
					<div className="flex flex-col gap-6 order-1 xl:order-none">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Layers className="h-5 w-5 text-indigo-600" /> 
									Add Holding
								</CardTitle>
								<CardDescription>Record a new asset in your portfolio. Choose how you'd like to enter values.</CardDescription>
							</CardHeader>
							<CardContent>
								{/* Mobile-optimized mode selector */}
								<div className="mb-6 w-full">
									<div className="grid grid-cols-2 rounded-xl border border-border bg-card p-1 transition-colors">
										<button 
											type="button" 
											className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation ${mode === "units" ? "bg-gradient-to-r from-emerald-500 to-indigo-600 text-white shadow-sm" : "text-foreground hover:bg-muted"}`} 
											onClick={() => setMode("units")}
										>
											By Units
										</button>
										<button 
											type="button" 
											className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation ${mode === "amount" ? "bg-gradient-to-r from-emerald-500 to-indigo-600 text-white shadow-sm" : "text-foreground hover:bg-muted"}`} 
											onClick={() => setMode("amount")}
										>
											By Amount
										</button>
									</div>
								</div>

								<form onSubmit={handleSubmit} className="space-y-6">
									{/* Instrument Class - Full width for mobile */}
									<div>
										<label className="block text-sm font-medium text-muted-foreground mb-2">Instrument Class</label>
										<select 
											value={form.instrumentClass} 
											onChange={onChange("instrumentClass")} 
											className="w-full h-12 rounded-xl border border-border px-4 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors text-base"
										>
											<option value="">Select an instrument class</option>
											{instrumentOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
										</select>
										{errors.instrumentClass ? <p className="mt-2 text-sm text-rose-600">{errors.instrumentClass}</p> : null}
									</div>

									{/* Name and Symbol - Stack on mobile */}
									<div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
										<div>
											<label className="block text-sm font-medium text-muted-foreground mb-2">Name</label>
											<input 
												value={form.name} 
												onChange={onChange("name")} 
												className="w-full h-12 rounded-xl border border-border px-4 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors text-base" 
												placeholder="e.g., Reliance Industries" 
											/>
											{errors.name ? <p className="mt-2 text-sm text-rose-600">{errors.name}</p> : null}
										</div>
										<div>
											<label className="block text-sm font-medium text-muted-foreground mb-2">Symbol (optional)</label>
											<input 
												value={form.symbol} 
												onChange={onChange("symbol")} 
												className="w-full h-12 rounded-xl border border-border px-4 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors text-base" 
												placeholder="e.g., RELIANCE" 
											/>
										</div>
									</div>

									{/* Value Entry Fields - Stack on mobile */}
									{mode === "units" ? (
										<div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
											<div>
												<label className="block text-sm font-medium text-muted-foreground mb-2">Units</label>
												<div className="relative">
													<input 
														inputMode="decimal" 
														type="number" 
														step="0.0001" 
														value={form.units} 
														onChange={onChange("units")} 
														className="w-full h-12 rounded-xl border border-border pl-4 pr-12 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors text-base" 
														placeholder="0.0000" 
													/>
													<BarChart3 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
												</div>
												{errors.units ? <p className="mt-2 text-sm text-rose-600">{errors.units}</p> : null}
											</div>
											<div>
												<label className="block text-sm font-medium text-muted-foreground mb-2">Price per Unit</label>
												<div className="relative">
													<input 
														inputMode="decimal" 
														type="number" 
														step="0.01" 
														value={form.price} 
														onChange={onChange("price")} 
														className="w-full h-12 rounded-xl border border-border pl-12 pr-4 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors text-base" 
														placeholder="0.00" 
													/>
													<IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
												</div>
												{errors.price ? <p className="mt-2 text-sm text-rose-600">{errors.price}</p> : null}
											</div>
										</div>
									) : (
										<div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
											<div>
												<label className="block text-sm font-medium text-muted-foreground mb-2">Invested Amount</label>
												<div className="relative">
													<input 
														inputMode="decimal" 
														type="number" 
														step="0.01" 
														value={form.investedAmount} 
														onChange={onChange("investedAmount")} 
														className="w-full h-12 rounded-xl border border-border pl-12 pr-4 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors text-base" 
														placeholder="0.00" 
													/>
													<Banknote className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
												</div>
												{errors.investedAmount ? <p className="mt-2 text-sm text-rose-600">{errors.investedAmount}</p> : null}
											</div>
											<div>
												<label className="block text-sm font-medium text-muted-foreground mb-2">Current Value</label>
												<div className="relative">
													<input 
														inputMode="decimal" 
														type="number" 
														step="0.01" 
														value={form.currentValue} 
														onChange={onChange("currentValue")} 
														className="w-full h-12 rounded-xl border border-border pl-12 pr-4 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors text-base" 
														placeholder="0.00" 
													/>
													<IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
												</div>
												{errors.currentValue ? <p className="mt-2 text-sm text-rose-600">{errors.currentValue}</p> : null}
											</div>
										</div>
									)}

								{/* Mobile-optimized form actions */}
								<div className="pt-6 space-y-3 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
									<Button 
										type="submit" 
										disabled={!isValid} 
										className="w-full sm:w-auto sm:min-w-[160px] h-12 text-base font-medium"
									>
										Save Holding
									</Button>
									<Button 
										type="button" 
										variant="outline" 
										onClick={resetForm}
										className="w-full sm:w-auto h-12 text-base"
									>
										Reset
									</Button>
									{submitted && (
										<span className="text-sm text-emerald-600 text-center sm:text-left block sm:inline">
											✅ Saved successfully!
										</span>
									)}
								</div>
							</form>
						</CardContent>
					</Card>
					</div>
					<div className="flex flex-col gap-6 order-none xl:order-1">
						<Card className="xl:sticky xl:top-20">
							<CardHeader>
								<CardTitle className="flex items-center gap-2"><TrendingUpIcon /> Live Summary</CardTitle>
								<CardDescription>Real-time preview updates as you type.</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
									<SummaryStat label="Invested" value={formatCurrency(computed.invested, currency)} icon={<Banknote className="h-5 w-5" />} />
									<SummaryStat label="Current" value={formatCurrency(computed.current, currency)} icon={<IndianRupee className="h-5 w-5" />} />
									<SummaryStat label="P/L" value={Number.isNaN(computed.pnl) ? "—" : `${formatCurrency(computed.pnl, currency)} (${Number.isNaN(computed.pnlPct) ? "—" : formatNumber(computed.pnlPct, 2)}%)`} icon={<Percent className="h-5 w-5" />} valueClassName={computed.pnl > 0 ? "text-emerald-600" : computed.pnl < 0 ? "text-rose-600" : ""} />
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			)}

			{/* Mobile-optimized import modal */}
			{showImport && (
				<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-md rounded-t-2xl sm:rounded-xl border border-border bg-card text-foreground animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0">
						<div className="flex items-center justify-between p-6 border-b border-border">
							<h3 className="text-lg font-semibold">📄 Import Holdings</h3>
							<button 
								className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-muted transition-colors touch-manipulation" 
								onClick={() => setShowImport(false)}
								aria-label="Close modal"
							>
								✕
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-muted-foreground mb-2">Select File</label>
								<input 
									type="file" 
									accept=".csv,.xlsx,.xls"
									className="w-full h-12 rounded-xl border border-border px-4 bg-card text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-muted file:text-foreground hover:file:bg-muted/80 transition-colors" 
								/>
							</div>
							<div className="rounded-lg bg-muted/50 p-3">
								<p className="text-sm text-muted-foreground">
									📋 <strong>Supported formats:</strong> CSV, XLSX files<br/>
									💡 This is a UI demonstration
								</p>
							</div>
							<div className="flex flex-col sm:flex-row gap-3 pt-2">
								<Button 
									variant="outline" 
									onClick={() => setShowImport(false)}
									className="w-full sm:w-auto h-12"
								>
									Cancel
								</Button>
								<Button 
									onClick={() => setShowImport(false)}
									className="w-full sm:w-auto h-12"
								>
									Import Holdings
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function SummaryStat({ label, value, icon, valueClassName = "" }: { label: string; value: string; icon?: React.ReactNode; valueClassName?: string }) {
	return (
		<div className="rounded-xl border border-border p-4 bg-card transition-colors hover:shadow-sm">
			<div className="flex items-center gap-3 mb-2 text-muted-foreground">
				<span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-muted text-foreground/80">{icon}</span>
				<span className="text-sm font-medium">{label}</span>
			</div>
			<div className={`text-lg sm:text-xl font-semibold leading-tight ${valueClassName}`}>{value}</div>
		</div>
	);
}

function TrendingUpIcon() {
	return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700"> <BarChart3 className="h-4 w-4" /> </span>;
}

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
					<div className="text-foreground/80 text-center py-8">
						<div className="text-4xl mb-2">📊</div>
						<p>No holdings yet. Add your first holding using the form.</p>
					</div>
				) : (
					<>
						{/* Summary Cards */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
							<div className="rounded-xl border border-border p-3">
								<div className="text-xs text-foreground/80 mb-1">Total Invested</div>
								<div className="text-lg font-semibold">{formatCurrency(totals.invested, currency)}</div>
							</div>
							<div className="rounded-xl border border-border p-3">
								<div className="text-xs text-foreground/80 mb-1">Total Current</div>
								<div className="text-lg font-semibold">{formatCurrency(totals.current, currency)}</div>
							</div>
							<div className="rounded-xl border border-border p-3">
								<div className="text-xs text-foreground/80 mb-1">P/L</div>
								<div className={cn("text-lg font-semibold", totals.pnlPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
									{formatCurrency(totals.pnl, currency)} ({formatNumber(totals.pnlPct, 2)}%)
								</div>
							</div>
						</div>

						{/* Desktop Table View */}
						<div className="hidden lg:block">
							<table className="w-full text-left border rounded-xl overflow-hidden border-border text-sm">
								<thead className="bg-card sticky top-0 z-10">
									<tr>
										<th className="px-4 py-3 border-b font-medium">Class</th>
										<th className="px-4 py-3 border-b font-medium">Name / Symbol</th>
										<th className="px-4 py-3 border-b text-right font-medium">Units</th>
										<th className="px-4 py-3 border-b text-right font-medium">Price</th>
										<th className="px-4 py-3 border-b text-right font-medium">Invested</th>
										<th className="px-4 py-3 border-b text-right font-medium">Current</th>
										<th className="px-4 py-3 border-b text-right font-medium">P/L</th>
										<th className="px-4 py-3 border-b font-medium">Actions</th>
									</tr>
								</thead>
								<tbody>
									{pageRows.map(h => {
										const invested = h.investedAmount ?? (h.units && h.price ? h.units * h.price : 0);
										const current = h.currentValue ?? invested;
										const pnl = current - invested;
										const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
										return (
											<tr key={h.id} className="border-b align-top hover:bg-muted/50 transition-colors">
												<td className={cn("px-4 py-3 whitespace-nowrap font-semibold", classTextColor(h.instrumentClass))}>{h.instrumentClass}</td>
												<td className="px-4 py-3">
													<div className="font-medium leading-tight">{h.name}</div>
													<div className="text-foreground/80 text-xs leading-tight">{h.symbol || "—"}</div>
												</td>
												<td className="px-4 py-3 text-right">{typeof h.units === "number" ? formatNumber(h.units, 4) : "—"}</td>
												<td className="px-4 py-3 text-right">{typeof h.price === "number" ? formatCurrency(h.price, currency) : "—"}</td>
												<td className="px-4 py-3 text-right">{formatCurrency(invested, currency)}</td>
												<td className="px-4 py-3 text-right">{formatCurrency(current, currency)}</td>
												<td className="px-4 py-3 text-right">
													<span className={cn("font-semibold", pnlPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
														{formatCurrency(pnl, currency)} ({formatNumber(pnlPct, 2)}%)
													</span>
												</td>
												<td className="px-4 py-3">
													<button 
														className="text-sm text-rose-600 hover:underline hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2 py-1 rounded transition-colors" 
														onClick={() => deleteHolding(h.id)}
													>
														Delete
													</button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						{/* Mobile Card View */}
						<div className="lg:hidden space-y-3">
							{pageRows.map(h => (
								<MobileHoldingCard 
									key={h.id} 
									holding={h} 
									currency={currency}
									onDelete={() => deleteHolding(h.id)}
								/>
							))}
						</div>
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