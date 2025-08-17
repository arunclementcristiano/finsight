"use client";
import React, { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/Card";
import { useApp } from "../../store";
import type { AssetClass } from "../../PortfolioManagement/domain/allocationEngine";
import { v4 as uuidv4 } from "uuid";
import { formatCurrency, formatNumber } from "../../utils/format";
import { Banknote, BarChart3, IndianRupee, Percent, Layers, BadgeCheck } from "lucide-react";

type EntryMode = "units" | "amount";

interface HoldingFormState {
	instrumentClass: AssetClass | "";
	name: string;
	symbol: string;
	units: string; // keep as string for input control
	price: string;
	investedAmount: string;
	currentValue: string;
}

const instrumentOptions: AssetClass[] = ["Stocks", "Mutual Funds", "Gold", "Real Estate", "Debt", "Liquid"];

export default function AddHoldingPage() {
	const { addHolding, profile } = useApp();
	const currency = profile.currency || "INR";
	const [mode, setMode] = useState<EntryMode>("units");
	const [form, setForm] = useState<HoldingFormState>({
		instrumentClass: "",
		name: "",
		symbol: "",
		units: "",
		price: "",
		investedAmount: "",
		currentValue: "",
	});
	const [submitted, setSubmitted] = useState(false);

	function onChange<K extends keyof HoldingFormState>(key: K) {
		return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			setForm(prev => ({ ...prev, [key]: e.target.value }));
		};
	}

	const numeric = useMemo(() => {
		const n = {
			units: parseFloat(form.units),
			price: parseFloat(form.price),
			investedAmount: parseFloat(form.investedAmount),
			currentValue: parseFloat(form.currentValue),
		};
		return {
			units: Number.isFinite(n.units) ? n.units : NaN,
			price: Number.isFinite(n.price) ? n.price : NaN,
			investedAmount: Number.isFinite(n.investedAmount) ? n.investedAmount : NaN,
			currentValue: Number.isFinite(n.currentValue) ? n.currentValue : NaN,
		};
	}, [form]);

	const computed = useMemo(() => {
		const totalByUnits = !Number.isNaN(numeric.units) && !Number.isNaN(numeric.price)
			? numeric.units * numeric.price
			: NaN;
		const totalByAmount = !Number.isNaN(numeric.currentValue) ? numeric.currentValue : NaN;
		const invested = mode === "units"
			? (!Number.isNaN(totalByUnits) ? totalByUnits : NaN)
			: (!Number.isNaN(numeric.investedAmount) ? numeric.investedAmount : NaN);
		const current = mode === "units" ? totalByUnits : totalByAmount;
		const pnl = !Number.isNaN(invested) && !Number.isNaN(current) ? current - invested : NaN;
		const pnlPct = !Number.isNaN(invested) && invested > 0 && !Number.isNaN(current)
			? ((current - invested) / invested) * 100
			: NaN;
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
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-indigo-600" /> Add Holding</CardTitle>
						<CardDescription>Record a new asset in your portfolio. Choose how you'd like to enter values.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="mb-4 inline-flex rounded-xl border border-border bg-card p-1 transition-colors">
							<button type="button" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "units" ? "bg-gradient-to-r from-emerald-500 to-indigo-600 text-white" : "text-foreground hover:bg-muted"}`} onClick={() => setMode("units")}>By Units</button>
							<button type="button" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "amount" ? "bg-gradient-to-r from-emerald-500 to-indigo-600 text-white" : "text-foreground hover:bg-muted"}`} onClick={() => setMode("amount")}>By Amount</button>
						</div>

						<form onSubmit={handleSubmit} className="space-y-5">
							<div>
								<label className="block text-sm font-medium text-muted-foreground mb-1">Instrument Class</label>
								<select value={form.instrumentClass} onChange={onChange("instrumentClass")} className="w-full h-11 rounded-xl border border-border px-3 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors">
									<option value="">Select</option>
									{instrumentOptions.map(opt => (
										<option key={opt} value={opt}>{opt}</option>
									))}
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
							</CardFooter>
						</form>
					</CardContent>
				</Card>

				{submitted ? (
					<Card className="border-green-200">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-green-700"><BadgeCheck className="h-5 w-5" /> Holding saved</CardTitle>
							<CardDescription>Your holding was added to the portfolio. You can add another or go to dashboard.</CardDescription>
						</CardHeader>
						<CardFooter className="pt-0 flex gap-3">
							<Button onClick={resetForm}>Add Another</Button>
							<Button variant="outline" onClick={() => window.location.assign("/PortfolioManagement/Dashboard")}>Go to Dashboard</Button>
						</CardFooter>
					</Card>
				) : null}

				{/* Holdings list */}
				<HoldingsList />
			</div>

			<div className="space-y-6">
				<Card>
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

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-indigo-600" /> Details</CardTitle>
					</CardHeader>
					<CardContent>
						<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
							<DetailItem label="Class" value={form.instrumentClass || "—"} />
							<DetailItem label="Name" value={form.name || "—"} />
							<DetailItem label="Symbol" value={form.symbol || "—"} />
							{mode === "units" ? (
								<>
									<DetailItem label="Units" value={!Number.isNaN(numeric.units) ? formatNumber(numeric.units, 4) : "—"} />
									<DetailItem label="Price" value={!Number.isNaN(numeric.price) ? formatCurrency(numeric.price, currency) : "—"} />
								</>
							) : (
								<>
									<DetailItem label="Invested" value={!Number.isNaN(numeric.investedAmount) ? formatCurrency(numeric.investedAmount, currency) : "—"} />
									<DetailItem label="Current" value={!Number.isNaN(numeric.currentValue) ? formatCurrency(numeric.currentValue, currency) : "—"} />
								</>
							)}
						</dl>
					</CardContent>
				</Card>
			</div>
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
			<div className="text-xs text-slate-500">{label}</div>
			<div className="text-sm font-medium text-slate-800 dark:text-slate-200">{value}</div>
		</div>
	);
}

function TrendingUpIcon() {
	return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700"> <BarChart3 className="h-4 w-4" /> </span>;
}

function HoldingsList() {
	const { holdings, deleteHolding, profile } = useApp();
	const currency = profile.currency || "INR";
	if (holdings.length === 0) return (
		<Card>
			<CardHeader>
				<CardTitle>Your Holdings</CardTitle>
				<CardDescription>Saved positions will appear here.</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="text-slate-500">No holdings yet. Add your first holding using the form above.</div>
			</CardContent>
		</Card>
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle>Your Holdings</CardTitle>
				<CardDescription>Overview of positions you have added</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="hidden md:block">
					<table className="w-full text-left border rounded-xl overflow-hidden border-slate-200 dark:border-slate-800">
						<thead className="bg-slate-50 dark:bg-slate-900/50">
							<tr>
								<th className="px-4 py-3 border-b">Class</th>
								<th className="px-4 py-3 border-b">Name</th>
								<th className="px-4 py-3 border-b">Symbol</th>
								<th className="px-4 py-3 border-b">Units</th>
								<th className="px-4 py-3 border-b">Price</th>
								<th className="px-4 py-3 border-b">Invested</th>
								<th className="px-4 py-3 border-b">Current</th>
								<th className="px-4 py-3 border-b">P/L</th>
								<th className="px-4 py-3 border-b">Actions</th>
							</tr>
						</thead>
						<tbody>
							{holdings.map(h => {
								const invested = h.investedAmount ?? (h.units && h.price ? h.units * h.price : 0);
								const current = h.currentValue ?? invested;
								const pnl = current - invested;
								const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
								return (
									<tr key={h.id} className="border-b">
										<td className="px-4 py-3">{h.instrumentClass}</td>
										<td className="px-4 py-3">{h.name}</td>
										<td className="px-4 py-3">{h.symbol || "—"}</td>
										<td className="px-4 py-3">{typeof h.units === "number" ? formatNumber(h.units, 4) : "—"}</td>
										<td className="px-4 py-3">{typeof h.price === "number" ? formatCurrency(h.price, currency) : "—"}</td>
										<td className="px-4 py-3">{formatCurrency(invested, currency)}</td>
										<td className="px-4 py-3">{formatCurrency(current, currency)}</td>
										<td className={"px-4 py-3 " + (pnl >= 0 ? "text-emerald-700" : "text-rose-700")}>{formatCurrency(pnl, currency)} ({formatNumber(pnlPct, 2)}%)</td>
										<td className="px-4 py-3">
											<button className="text-sm text-rose-600 hover:underline" onClick={() => deleteHolding(h.id)}>Delete</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<div className="md:hidden grid grid-cols-1 gap-3">
					{holdings.map(h => {
						const invested = h.investedAmount ?? (h.units && h.price ? h.units * h.price : 0);
						const current = h.currentValue ?? invested;
						const pnl = current - invested;
						const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
						return (
							<Card key={h.id}>
								<CardContent>
									<div className="flex items-center justify-between">
										<div>
											<div className="text-sm text-slate-500">{h.instrumentClass}</div>
											<div className="text-base font-semibold">{h.name} {h.symbol ? <span className="text-slate-500">({h.symbol})</span> : null}</div>
										</div>
										<div className={pnl >= 0 ? "text-emerald-700" : "text-rose-700"}>{formatCurrency(pnl, currency)} ({formatNumber(pnlPct, 2)}%)</div>
									</div>
									<div className="mt-2 grid grid-cols-3 text-sm">
										<div><div className="text-slate-500">Invested</div><div className="font-medium">{formatCurrency(invested, currency)}</div></div>
										<div><div className="text-slate-500">Current</div><div className="font-medium">{formatCurrency(current, currency)}</div></div>
										<div><div className="text-slate-500">Units</div><div className="font-medium">{typeof h.units === "number" ? formatNumber(h.units, 2) : "—"}</div></div>
									</div>
									<div className="mt-3 flex justify-end">
										<button className="text-sm text-rose-600 hover:underline" onClick={() => deleteHolding(h.id)}>Delete</button>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}