"use client";
import React, { useState, useMemo } from "react";
import { Button } from "../../../components/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../../components/Card";
import { useApp } from "../../../store";
import type { AssetClass } from "../../domain/allocationEngine";
import { v4 as uuidv4 } from "uuid";
import { formatCurrency, formatNumber } from "../../../utils/format";
import { Banknote, BarChart3, IndianRupee, Percent, Layers, ChevronLeft, ChevronRight, X, Search } from "lucide-react";
import { cn } from "../../../components/utils";

type EntryMode = "units" | "amount";
type PortfolioRole = "Equity" | "Defensive" | "Satellite";

interface HoldingFormState {
	portfolioRole: PortfolioRole | "";
	instrumentType: string;
	instrumentName: string;
	symbol: string;
	units: string;
	price: string;
	investedAmount: string;
	currentValue: string;
}

// Role-based instrument type mapping
const roleInstrumentTypes: Record<PortfolioRole, string[]> = {
	Equity: ["Stocks", "Equity Mutual Funds", "Equity ETFs"],
	Defensive: ["Bonds", "Debt Mutual Funds", "Liquid Mutual Funds", "Cash"],
	Satellite: ["Gold ETFs", "Gold Mutual Funds", "Physical Gold", "REITs", "Properties"]
};

// Mock NAVALL data structure for demonstration
interface NAVALLItem {
	schemeName: string;
	category: string;
	plan: string;
	growth: string;
}

// Mock NAVALL data - in real implementation, this would come from NAVALL.txt
const mockNAVALLData: NAVALLItem[] = [
	// Equity Mutual Funds
	{ schemeName: "HDFC Mid-Cap Opportunities Fund", category: "Equity", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "Axis Bluechip Fund", category: "Equity", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "Mirae Asset Large Cap Fund", category: "Equity", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "Kotak Emerging Equity Fund", category: "Equity", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "SBI Small Cap Fund", category: "Equity", plan: "Direct Plan", growth: "Growth" },
	
	// Debt Mutual Funds
	{ schemeName: "HDFC Corporate Bond Fund", category: "Debt", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "ICICI Prudential Corporate Bond Fund", category: "Bond", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "SBI Corporate Bond Fund", category: "Income", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "Axis Corporate Debt Fund", category: "Bond", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "Kotak Corporate Bond Fund", category: "Debt", plan: "Direct Plan", growth: "Growth" },
	
	// Liquid Mutual Funds
	{ schemeName: "HDFC Liquid Fund", category: "Liquid", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "ICICI Prudential Liquid Fund", category: "Overnight", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "SBI Liquid Fund", category: "Liquid", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "Axis Liquid Fund", category: "Liquid", plan: "Direct Plan", growth: "Growth" },
	
	// Gold Mutual Funds
	{ schemeName: "HDFC Gold Fund", category: "Gold", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "SBI Gold Fund", category: "Gold", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "Axis Gold Fund", category: "Gold", plan: "Direct Plan", growth: "Growth" },
	
	// ETFs
	{ schemeName: "NIFTY 50 ETF", category: "ETF", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "GOLDBEES ETF", category: "ETF", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "BANK NIFTY ETF", category: "ETF", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "NIFTY NEXT 50 ETF", category: "ETF", plan: "Direct Plan", growth: "Growth" },
	{ schemeName: "SENSEX ETF", category: "ETF", plan: "Direct Plan", growth: "Growth" }
];

export default function HoldingsPage() {
	const { addHolding, profile, holdings } = useApp();
	const currency = profile.currency || "INR";
	const [mode, setMode] = useState<EntryMode>("units");
	const [form, setForm] = useState<HoldingFormState>({ 
		portfolioRole: "", 
		instrumentType: "", 
		instrumentName: "", 
		symbol: "", 
		units: "", 
		price: "", 
		investedAmount: "", 
		currentValue: "" 
	});
	const [submitted, setSubmitted] = useState(false);
	const [showAddModal, setShowAddModal] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(8);

	// Filter NAVALL data based on selected role and instrument type
	const filteredNAVALLData = useMemo(() => {
		if (!form.portfolioRole || !form.instrumentType) return [];
		
		const role = form.portfolioRole;
		const instrumentType = form.instrumentType;
		
		return mockNAVALLData.filter(item => {
			// Equity Mutual Funds
			if (instrumentType === "Equity Mutual Funds") {
				return item.category === "Equity" && 
					   item.plan === "Direct Plan" && 
					   item.growth === "Growth";
			}
			
			// Debt Mutual Funds
			if (instrumentType === "Debt Mutual Funds") {
				return (item.category === "Debt" || item.category === "Income" || item.category === "Bond" || item.category === "Gilt") &&
					   item.plan === "Direct Plan" && 
					   item.growth === "Growth";
			}
			
			// Liquid Mutual Funds
			if (instrumentType === "Liquid Mutual Funds") {
				return (item.category === "Liquid" || item.category === "Overnight") &&
					   item.plan === "Direct Plan" && 
					   item.growth === "Growth";
			}
			
			// Gold Mutual Funds
			if (instrumentType === "Gold Mutual Funds") {
				return item.category === "Gold" &&
					   item.plan === "Direct Plan" && 
					   item.growth === "Growth";
			}
			
			// ETFs
			if (instrumentType.includes("ETF")) {
				if (instrumentType === "Equity ETFs") {
					return item.category === "ETF" && 
						   (item.schemeName.includes("NIFTY") || item.schemeName.includes("BANK"));
				}
				if (instrumentType === "Gold ETFs") {
					return item.category === "ETF" && item.schemeName.includes("GOLD");
				}
				return item.category === "ETF";
			}
			
			return false;
		});
	}, [form.portfolioRole, form.instrumentType]);

	// Filtered NAVALL data based on search query
	const searchFilteredData = useMemo(() => {
		if (!searchQuery) return filteredNAVALLData;
		return filteredNAVALLData.filter(item => 
			item.schemeName.toLowerCase().includes(searchQuery.toLowerCase())
		);
	}, [filteredNAVALLData, searchQuery]);

	function onChange<K extends keyof HoldingFormState>(key: K) {
		return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			setForm(prev => ({ ...prev, [key]: e.target.value }));
			// Reset dependent fields when role or instrument type changes
			if (key === "portfolioRole" || key === "instrumentType") {
				setForm(prev => ({ 
					...prev, 
					instrumentName: "", 
					symbol: "" 
				}));
			}
		};
	}

	const numeric = React.useMemo(() => {
		const n = { 
			units: parseFloat(form.units), 
			price: parseFloat(form.price), 
			investedAmount: parseFloat(form.investedAmount), 
			currentValue: parseFloat(form.currentValue) 
		};
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
		if (!form.portfolioRole) e.portfolioRole = "Select a portfolio role";
		if (!form.instrumentType) e.instrumentType = "Select an instrument type";
		if (!form.instrumentName.trim()) e.instrumentName = "Enter instrument name";
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
		
		// Map instrument type to AssetClass for compatibility
		let assetClass: AssetClass = "Stocks";
		if (form.instrumentType.includes("Mutual Fund")) assetClass = "Mutual Funds";
		else if (form.instrumentType.includes("Gold")) assetClass = "Gold";
		else if (form.instrumentType.includes("Real Estate") || form.instrumentType.includes("REIT") || form.instrumentType.includes("Property")) assetClass = "Real Estate";
		else if (form.instrumentType.includes("Bond") || form.instrumentType.includes("Debt")) assetClass = "Debt";
		else if (form.instrumentType.includes("Liquid") || form.instrumentType.includes("Cash")) assetClass = "Liquid";
		
		const id = uuidv4();
		addHolding({
			id,
			instrumentClass: assetClass,
			name: form.instrumentName.trim(),
			symbol: form.symbol.trim() || undefined,
			units: mode === "units" && !Number.isNaN(numeric.units) ? numeric.units : undefined,
			price: mode === "units" && !Number.isNaN(numeric.price) ? numeric.price : undefined,
			investedAmount: !Number.isNaN(computed.invested) ? Number(computed.invested.toFixed(2)) : undefined,
			currentValue: !Number.isNaN(computed.current) ? Number(computed.current.toFixed(2)) : undefined,
		});
		setSubmitted(true);
		setTimeout(() => {
			setShowAddModal(false);
			resetForm();
		}, 1500);
	}

	function resetForm() {
		setForm({ 
			portfolioRole: "", 
			instrumentType: "", 
			instrumentName: "", 
			symbol: "", 
			units: "", 
			price: "", 
			investedAmount: "", 
			currentValue: "" 
		});
		setSubmitted(false);
		setSearchQuery("");
	}

	function openAddModal() {
		setShowAddModal(true);
		resetForm();
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
		<div className="space-y-6">
			{/* Navigation Breadcrumb */}
			<div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
				<button 
					onClick={() => window.history.back()} 
					className="hover:text-foreground transition-colors"
				>
					← Back
				</button>
				<span>/</span>
				<button 
					onClick={() => window.location.href = "/PortfolioManagement/Dashboard"} 
					className="hover:text-foreground transition-colors"
				>
					Dashboard
				</button>
				<span>/</span>
				<span className="text-foreground">Portfolio Holdings</span>
			</div>

			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-foreground">Portfolio Holdings</h1>
					<p className="text-muted-foreground mt-2">Manage your investment portfolio and track performance</p>
				</div>
				<Button onClick={openAddModal} className="min-w-[160px]" leftIcon={<Layers className="h-4 w-4" />}>
					Add Holding
				</Button>
			</div>

			{/* Portfolio Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-3">
							<div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
								<Banknote className="h-6 w-6 text-indigo-600" />
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Total Invested</p>
								<p className="text-2xl font-bold">{formatCurrency(totals.invested, currency)}</p>
							</div>
						</div>
					</CardContent>
				</Card>
				
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-3">
							<div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
								<BarChart3 className="h-6 w-6 text-emerald-600" />
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Current Value</p>
								<p className="text-2xl font-bold">{formatCurrency(totals.current, currency)}</p>
							</div>
						</div>
					</CardContent>
				</Card>
				
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-3">
							<div className={cn("h-12 w-12 rounded-full flex items-center justify-center", 
								totals.pnlPct >= 0 ? "bg-emerald-100" : "bg-rose-100")}>
								<Percent className={cn("h-6 w-6", 
									totals.pnlPct >= 0 ? "text-emerald-600" : "text-rose-600")} />
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Total P/L</p>
								<p className={cn("text-2xl font-bold", 
									totals.pnlPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
									{formatNumber(totals.pnlPct, 2)}%
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Holdings Table */}
			<Card>
				<CardHeader>
					<CardTitle>Your Holdings</CardTitle>
					<CardDescription>Overview of all your investment positions</CardDescription>
				</CardHeader>
				<CardContent>
					{holdings.length === 0 ? (
						<div className="text-center py-12">
							<Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
							<h3 className="text-lg font-medium text-foreground mb-2">No holdings yet</h3>
							<p className="text-muted-foreground mb-4">Start building your portfolio by adding your first holding</p>
							<Button onClick={openAddModal}>Add Your First Holding</Button>
						</div>
					) : (
						<>
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
												<td className={cn("px-3 py-2 whitespace-nowrap font-semibold", getClassTextColor(h.instrumentClass))}>
													{h.instrumentClass}
												</td>
												<td className="px-3 py-2">
													<div className="font-medium leading-tight">{h.name}</div>
													<div className="text-foreground/80 text-xs leading-tight">{h.symbol || "—"}</div>
												</td>
												<td className="px-3 py-2 text-right">{typeof h.units === "number" ? formatNumber(h.units, 2) : "—"}</td>
												<td className="px-3 py-2 text-right">{typeof h.price === "number" ? formatNumber(h.price, 2) : "—"}</td>
												<td className="px-3 py-2 text-right">{formatNumber(invested, 2)}</td>
												<td className="px-3 py-2 text-right">{formatNumber(current, 2)}</td>
												<td className="px-3 py-2 text-right">
													<span className={cn("font-semibold", pnlPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
														{formatNumber(pnlPct, 2)}%
													</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
							
							{/* Pagination */}
							{holdings.length > pageSize && (
								<div className="flex items-center justify-between gap-3 mt-4">
									<div className="text-sm text-foreground/80">Page {page} of {totalPages}</div>
									<div className="flex items-center gap-2">
										<Button variant="outline" size="sm" onClick={prev} disabled={page === 1} leftIcon={<ChevronLeft className="h-4 w-4" />}>
											Prev
										</Button>
										<Button variant="outline" size="sm" onClick={next} disabled={page === totalPages}>
											Next<ChevronRight className="h-4 w-4 ml-2" />
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{/* Add Holding Modal */}
			{showAddModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 text-foreground">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-xl font-semibold">Add New Holding</h3>
							<button className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted" onClick={() => setShowAddModal(false)}>
								<X className="h-5 w-5" />
							</button>
						</div>
						
						<form onSubmit={handleSubmit} className="space-y-6">
							{/* Portfolio Role Selection */}
							<div>
								<label className="block text-sm font-medium text-muted-foreground mb-3">Portfolio Role</label>
								<div className="flex gap-2">
									{(["Equity", "Defensive", "Satellite"] as PortfolioRole[]).map(role => (
										<button
											key={role}
											type="button"
											onClick={() => onChange("portfolioRole")({ target: { value: role } } as any)}
											className={cn(
												"px-4 py-2 rounded-full text-sm font-medium transition-colors",
												form.portfolioRole === role
													? "bg-indigo-600 text-white"
													: "bg-muted text-foreground hover:bg-muted/80"
											)}
										>
											{role}
										</button>
									))}
								</div>
								{errors.portfolioRole ? <p className="mt-1 text-sm text-rose-600">{errors.portfolioRole}</p> : null}
							</div>

							{/* Instrument Type Selection */}
							{form.portfolioRole && (
								<div>
									<label className="block text-sm font-medium text-muted-foreground mb-2">Instrument Type</label>
									<select 
										value={form.instrumentType} 
										onChange={onChange("instrumentType")} 
										className="w-full h-11 rounded-xl border border-border px-3 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
									>
										<option value="">Select instrument type</option>
										{roleInstrumentTypes[form.portfolioRole].map(type => (
											<option key={type} value={type}>{type}</option>
										))}
									</select>
									{errors.instrumentType ? <p className="mt-1 text-sm text-rose-600">{errors.instrumentType}</p> : null}
								</div>
							)}

							{/* Instrument Name Selection/Input */}
							{form.instrumentType && (
								<div>
									<label className="block text-sm font-medium text-muted-foreground mb-2">Instrument Name</label>
									
									{/* For instrument types that can use NAVALL data */}
									{(form.instrumentType.includes("Mutual Fund") || form.instrumentType.includes("ETF")) ? (
										<div className="space-y-3">
											<div className="relative">
												<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
												<input
													type="text"
													placeholder="Search for instruments..."
													value={searchQuery}
													onChange={(e) => setSearchQuery(e.target.value)}
													className="w-full h-11 rounded-xl border border-border pl-10 pr-3 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
												/>
											</div>
											
											{searchFilteredData.length > 0 && (
												<div className="max-h-40 overflow-y-auto border border-border rounded-lg">
													{searchFilteredData.map((item, index) => (
														<button
															key={index}
															type="button"
															onClick={() => {
																setForm(prev => ({ ...prev, instrumentName: item.schemeName }));
																setSearchQuery("");
															}}
															className="w-full text-left px-3 py-2 hover:bg-muted border-b border-border last:border-b-0"
														>
															<div className="font-medium">{item.schemeName}</div>
															<div className="text-xs text-muted-foreground">{item.category} • {item.plan} • {item.growth}</div>
														</button>
													))}
												</div>
											)}
											
											{searchQuery && searchFilteredData.length === 0 && (
												<div className="text-sm text-muted-foreground py-2">
													No instruments found. You can manually enter the name below.
												</div>
											)}
										</div>
									) : null}
									
									{/* Manual input for all instrument types */}
									<input
										value={form.instrumentName}
										onChange={onChange("instrumentName")}
										placeholder="Enter instrument name"
										className="w-full h-11 rounded-xl border border-border px-3 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
									/>
									{errors.instrumentName ? <p className="mt-1 text-sm text-rose-600">{errors.instrumentName}</p> : null}
								</div>
							)}

							{/* Symbol (optional) */}
							{form.instrumentName && (
								<div>
									<label className="block text-sm font-medium text-muted-foreground mb-2">Symbol (optional)</label>
									<input
										value={form.symbol}
										onChange={onChange("symbol")}
										placeholder="e.g., RELIANCE, NIFTY50"
										className="w-full h-11 rounded-xl border border-border px-3 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
									/>
								</div>
							)}

							{/* Entry Mode Selection */}
							{form.symbol && (
								<div>
									<label className="block text-sm font-medium text-muted-foreground mb-3">Entry Mode</label>
									<div className="inline-flex rounded-xl border border-border bg-card p-1 transition-colors">
										<button
											type="button"
											className={cn(
												"px-4 py-2 rounded-lg text-sm font-medium transition-colors",
												mode === "units" 
													? "bg-gradient-to-r from-emerald-500 to-indigo-600 text-white" 
													: "text-foreground hover:bg-muted"
											)}
											onClick={() => setMode("units")}
										>
											By Units
										</button>
										<button
											type="button"
											className={cn(
												"px-4 py-2 rounded-lg text-sm font-medium transition-colors",
												mode === "amount" 
													? "bg-gradient-to-r from-emerald-500 to-indigo-600 text-white" 
													: "text-foreground hover:bg-muted"
											)}
											onClick={() => setMode("amount")}
										>
											By Amount
										</button>
									</div>
								</div>
							)}

							{/* Units and Price OR Invested and Current Value */}
							{form.symbol && (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{mode === "units" ? (
										<>
											<div>
												<label className="block text-sm font-medium text-muted-foreground mb-2">Units</label>
												<div className="relative">
													<input
														inputMode="decimal"
														type="number"
														step="0.0001"
														value={form.units}
														onChange={onChange("units")}
														placeholder="0.00"
														className="w-full h-11 rounded-xl border border-border pl-3 pr-10 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
													/>
													<BarChart3 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
												</div>
												{errors.units ? <p className="mt-1 text-sm text-rose-600">{errors.units}</p> : null}
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
														placeholder="0.00"
														className="w-full h-11 rounded-xl border border-border pl-9 pr-3 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
													/>
													<IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
												</div>
												{errors.price ? <p className="mt-1 text-sm text-rose-600">{errors.price}</p> : null}
											</div>
										</>
									) : (
										<>
											<div>
												<label className="block text-sm font-medium text-muted-foreground mb-2">Invested Amount</label>
												<div className="relative">
													<input
														inputMode="decimal"
														type="number"
														step="0.01"
														value={form.investedAmount}
														onChange={onChange("investedAmount")}
														placeholder="0.00"
														className="w-full h-11 rounded-xl border border-border pl-9 pr-3 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
													/>
													<Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
												</div>
												{errors.investedAmount ? <p className="mt-1 text-sm text-rose-600">{errors.investedAmount}</p> : null}
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
														placeholder="0.00"
														className="w-full h-11 rounded-xl border border-border pl-9 pr-3 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
													/>
													<IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
												</div>
												{errors.currentValue ? <p className="mt-1 text-sm text-rose-600">{errors.currentValue}</p> : null}
											</div>
										</>
									)}
								</div>
							)}

							{/* Summary Preview */}
							{form.instrumentName && (form.units || form.investedAmount) && (
								<Card className="bg-muted/50">
									<CardContent className="p-4">
										<h4 className="font-medium mb-3">Summary Preview</h4>
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
											<SummaryStat 
												label="Invested" 
												value={formatCurrency(computed.invested, currency)} 
												icon={<Banknote className="h-4 w-4" />} 
											/>
											<SummaryStat 
												label="Current" 
												value={formatCurrency(computed.current, currency)} 
												icon={<IndianRupee className="h-4 w-4" />} 
											/>
											<SummaryStat 
												label="P/L" 
												value={Number.isNaN(computed.pnl) ? "—" : `${formatCurrency(computed.pnl, currency)} (${Number.isNaN(computed.pnlPct) ? "—" : formatNumber(computed.pnlPct, 2)}%)`} 
												icon={<Percent className="h-4 w-4" />} 
												valueClassName={computed.pnl > 0 ? "text-emerald-600" : computed.pnl < 0 ? "text-rose-600" : ""} 
											/>
										</div>
									</CardContent>
								</Card>
							)}

							{/* Form Actions */}
							<CardFooter className="pt-2 flex items-center gap-3 px-0">
								<Button type="submit" disabled={!isValid} className="min-w-[160px]">
									{submitted ? "Saved!" : "Save Holding"}
								</Button>
								<Button type="button" variant="outline" onClick={resetForm}>
									Reset
								</Button>
								<Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
									Cancel
								</Button>
							</CardFooter>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

function SummaryStat({ label, value, icon, valueClassName = "" }: { label: string; value: string; icon?: React.ReactNode; valueClassName?: string }) {
	return (
		<div className="rounded-xl border border-border p-3 bg-card transition-colors">
			<div className="flex items-center gap-2 mb-1 text-muted-foreground">
				<span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-muted text-foreground/80">{icon}</span>
				<span className="text-xs">{label}</span>
			</div>
			<div className={`text-sm font-semibold ${valueClassName}`}>{value}</div>
		</div>
	);
}

function getClassTextColor(cls: AssetClass) {
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