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
	const [tab, setTab] = useState<"holdings" | "add" | "import">("holdings");

	function onChange<K extends keyof HoldingFormState>(key: K) {
		return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			setForm(prev => ({ ...prev, [key]: e.target.value }));
		};
	}

	const numeric = useMemo(() => {
		const n = { units: parseFloat(form.units), price: parseFloat(form.price), investedAmount: parseFloat(form.investedAmount), currentValue: parseFloat(form.currentValue) };
		return {
			units: Number.isFinite(n.units) ? n.units : NaN,
			price: Number.isFinite(n.price) ? n.price : NaN,
			investedAmount: Number.isFinite(n.investedAmount) ? n.investedAmount : NaN,
			currentValue: Number.isFinite(n.currentValue) ? n.currentValue : NaN,
		};
	}, [form]);

	const computed = useMemo(() => {
		const totalByUnits = !Number.isNaN(numeric.units) && !Number.isNaN(numeric.price) ? numeric.units * numeric.price : NaN;
		const totalByAmount = !Number.isNaN(numeric.currentValue) ? numeric.currentValue : NaN;
		const invested = mode === "units" ? (!Number.isNaN(totalByUnits) ? totalByUnits : NaN) : (!Number.isNaN(numeric.investedAmount) ? numeric.investedAmount : NaN);
		const current = mode === "units" ? totalByUnits : totalByAmount;
		const pnl = !Number.isNaN(invested) && !Number.isNaN(current) ? current - invested : NaN;
		const pnlPct = !Number.isNaN(invested) && invested > 0 && !Number.isNaN(current) ? ((current - invested) / invested) * 100 : NaN;
		return { invested, current, pnl, pnlPct };
	}, [numeric, mode]);

	const errors = useMemo(() => {
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

	const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

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
		<div className="space-y-4">
			<div className="flex items-center gap-2 border-b border-border">
				<button onClick={() => setTab("holdings")} className={`px-4 py-2 text-sm rounded-t-md transition-colors ${tab === "holdings" ? "text-indigo-600 border-b-2 border-indigo-600 -mb-px" : "text-foreground hover:bg-muted"}`}>Holdings</button>
				<button onClick={() => setTab("add")} className={`px-4 py-2 text-sm rounded-t-md transition-colors ${tab === "add" ? "text-indigo-600 border-b-2 border-indigo-600 -mb-px" : "text-foreground hover:bg-muted"}`}>Add Holding</button>
				<button onClick={() => setTab("import")} className={`px-4 py-2 text-sm rounded-t-md transition-colors ${tab === "import" ? "text-indigo-600 border-b-2 border-indigo-600 -mb-px" : "text-foreground hover:bg-muted"}`}>Import</button>
			</div>

			{tab === "holdings" && (
				<HoldingsTableWithPagination onImport={() => setTab("import")} />
			)}

			{tab === "add" && (
				<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
					<div className="flex flex-col gap-6 order-1 xl:order-none">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-indigo-600" /> Add Holding</CardTitle>
								<CardDescription>Record a new asset in your portfolio. Choose how you'd like to enter values.</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="mb-4 inline-flex rounded-xl border border-border bg-card p-1 transition-colors">
									<button type="button" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "units" ? "bg-gradient-to-r from-emerald-500 to-indigo-600 text-white" : "text-foreground hover:bg-muted"}`} onClick={() => setMode("units")}>
										By Units
									</button>
									<button type="button" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "amount" ? "bg-gradient-to-r from-emerald-500 to-indigo-600 text-white" : "text-foreground hover:bg-muted"}`} onClick={() => setMode("amount")}>
										By Amount
									</button>
								</div>

								<form onSubmit={handleSubmit} className="space-y-5">
									{/* instrument, name, symbol and numeric inputs - unchanged */}
									<div>
										<label className="block text-sm font-medium text-muted-foreground mb-1">Instrument Class</label>
										<select value={form.instrumentClass} onChange={onChange("instrumentClass")} className="w-full h-11 rounded-xl border border-border px-3 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors">
											<option value="">Select</option>
											{instrumentOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
										</select>
										{errors.instrumentClass ? <p className="mt-1 text-sm text-rose-600">{errors.instrumentClass}</p> : null}
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
											<input value={form.name} onChange={onChange("name")} className="w-full h-11 rounded-xl border border-border px-3 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors" placeholder="e.g., Reliance Industries" />
											{errors.name ? <p className="mt-1 text-sm text-rose-600">{errors.name}</p> : null}
										</div>
										<div>
											<label className="block text-sm font-medium text-muted-foreground mb-1">Symbol (optional)</label>
											<input value={form.symbol} onChange={onChange("symbol")} className="w-full h-11 rounded-xl border border-border px-3 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors" placeholder="e.g., RELIANCE" />
										</div>
									</div>

									{mode === "units" ? (
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div>
												<label className="block text-sm font-medium text-muted-foreground mb-1">Units</label>
												<div className="relative">
													<input inputMode="decimal" type="number" step="0.0001" value={form.units} onChange={onChange("units")} className="w-full h-11 rounded-xl border border-border pl-3 pr-10 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors" placeholder="0.00" />
													<BarChart3 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
												</div>
												{errors.units ? <p className="mt-1 text-sm text-rose-600">{errors.units}</p> : null}
											</div>
											<div>
												<label className="block text-sm font-medium text-muted-foreground mb-1">Price</label>
												<div className="relative">
													<input inputMode="decimal" type="number" step="0.01" value={form.price} onChange={onChange("price")} className="w-full h-11 rounded-xl border border-border pl-9 pr-3 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors" placeholder="0.00" />
													<IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
												</div>
												{errors.price ? <p className="mt-1 text-sm text-rose-600">{errors.price}</p> : null}
											</div>
										</div>
									) : (
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div>
												<label className="block text-sm font-medium text-muted-foreground mb-1">Invested Amount</label>
												<div className="relative">
													<input inputMode="decimal" type="number" step="0.01" value={form.investedAmount} onChange={onChange("investedAmount")} className="w-full h-11 rounded-xl border border-border pl-9 pr-3 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors" placeholder="0.00" />
													<Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
												</div>
												{errors.investedAmount ? <p className="mt-1 text-sm text-rose-600">{errors.investedAmount}</p> : null}
											</div>
											<div>
												<label className="block text-sm font-medium text-muted-foreground mb-1">Current Value</label>
												<div className="relative">
													<input inputMode="decimal" type="number" step="0.01" value={form.currentValue} onChange={onChange("currentValue")} className="w-full h-11 rounded-xl border border-border pl-9 pr-3 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors" placeholder="0.00" />
													<IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
												</div>
												{errors.currentValue ? <p className="mt-1 text-sm text-rose-600">{errors.currentValue}</p> : null}
											</div>
										</div>
									)}

									<CardFooter className="pt-2 flex items-center gap-3">
										<Button type="submit" disabled={!isValid} className="min-w-[160px]">Save Holding</Button>
										<Button type="button" variant="outline" onClick={resetForm}>Reset</Button>
										{submitted && (<span className="text-sm text-emerald-600">Saved!</span>)}
									</CardFooter>
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
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
									<SummaryStat label="Invested" value={formatCurrency(computed.invested, currency)} icon={<Banknote className="h-4 w-4" />} />
									<SummaryStat label="Current" value={formatCurrency(computed.current, currency)} icon={<IndianRupee className="h-4 w-4" />} />
									<SummaryStat label="P/L" value={Number.isNaN(computed.pnl) ? "—" : `${formatCurrency(computed.pnl, currency)} (${Number.isNaN(computed.pnlPct) ? "—" : formatNumber(computed.pnlPct, 2)}%)`} icon={<Percent className="h-4 w-4" />} valueClassName={computed.pnl > 0 ? "text-emerald-600" : computed.pnl < 0 ? "text-rose-600" : ""} />
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			)}

			{tab === "import" && (
				<Card>
					<CardHeader>
						<CardTitle>Import Holdings</CardTitle>
						<CardDescription>Upload a CSV/XLSX (stub)</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">Import wizard coming soon.</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function SummaryStat({ label, value, icon, valueClassName = "" }: { label: string; value: string; icon?: React.ReactNode; valueClassName?: string }) {
	return (
		<div className="rounded-xl border border-border p-4 bg-card transition-colors">
			<div className="flex items-center gap-2 mb-1 text-muted-foreground">
				<span className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-muted text-foreground/80">{icon}</span>
				<span className="text-sm">{label}</span>
			</div>
			<div className={`text-xl font-semibold ${valueClassName}`}>{value}</div>
		</div>
	);
}

function DetailItem({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className="text-sm font-medium">{value}</div>
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
					<div className="text-muted-foreground">No holdings yet. Add your first holding using the form.</div>
				) : (
					<table className="w-full text-left border rounded-xl overflow-hidden border-border text-sm">
						<thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
							<tr>
								<th className="px-3 py-2 border-b">Class</th>
								<th className="px-3 py-2 border-b">Name / Symbol</th>
								<th className="px-3 py-2 border-b text-right">Units / Price</th>
								<th className="px-3 py-2 border-b text-right">Invested / Current</th>
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
									<tr key={h.id} className="border-b hover:bg-muted/60 align-top">
										<td className="px-3 py-2 whitespace-nowrap"><span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{h.instrumentClass}</span></td>
										<td className="px-3 py-2">
											<div className="font-medium leading-tight">{h.name}</div>
											<div className="text-muted-foreground text-xs leading-tight">{h.symbol || "—"}</div>
										</td>
										<td className="px-3 py-2 text-right">
											<div className="leading-tight">{typeof h.units === "number" ? formatNumber(h.units, 2) : "—"}</div>
											<div className="text-muted-foreground text-xs leading-tight">{typeof h.price === "number" ? formatCurrency(h.price, currency) : "—"}</div>
										</td>
										<td className="px-3 py-2 text-right">
											<div className="leading-tight">{formatCurrency(invested, currency)}</div>
											<div className="text-muted-foreground text-xs leading-tight">{formatCurrency(current, currency)}</div>
										</td>
										<td className="px-3 py-2 text-right">
											<span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", pnl >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200")}>{formatCurrency(pnl, currency)}</span>
											<span className="ml-2 text-muted-foreground">({formatNumber(pnlPct, 2)}%)</span>
										</td>
										<td className="px-3 py-2"><button className="text-xs text-rose-600 hover:underline" onClick={() => deleteHolding(h.id)}>Delete</button></td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</CardContent>
			<CardFooter className="flex items-center justify-between gap-3 flex-shrink-0">
				<div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={prev} disabled={page === 1} leftIcon={<ChevronLeft className="h-4 w-4" />}>Prev</Button>
					<Button variant="outline" size="sm" onClick={next} disabled={page === totalPages}><ChevronRight className="h-4 w-4 mr-2" />Next</Button>
				</div>
			</CardFooter>
		</Card>
	);
}