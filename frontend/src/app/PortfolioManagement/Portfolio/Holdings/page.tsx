"use client";
import React, { useMemo, useState } from "react";
import { useApp, type Holding } from "../../../store";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Plus, Edit2, Trash2, X, Search } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

type AssetClass = Holding["instrumentClass"];

const CLASS_COLORS: Record<AssetClass, { bg: string; text: string; chart: string }> = {
	"Stocks": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", chart: "#3B82F6" },
	"Mutual Funds": { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", chart: "#10B981" },
	"Debt": { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", chart: "#8B5CF6" },
	"Liquid": { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", chart: "#F59E0B" },
	"Gold": { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", chart: "#EAB308" },
	"Real Estate": { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-300", chart: "#F43F5E" },
};

function computeHoldingValue(h: Holding): number {
	if (typeof h.currentValue === "number" && !Number.isNaN(h.currentValue)) return h.currentValue;
	if (typeof h.units === "number" && typeof h.price === "number") return h.units * h.price;
	if (typeof h.investedAmount === "number") return h.investedAmount;
	return 0;
}

function computeInvestedAmount(h: Holding): number {
	if (typeof h.investedAmount === "number" && !Number.isNaN(h.investedAmount)) return h.investedAmount;
	if (typeof h.units === "number" && typeof h.price === "number") return h.units * h.price;
	return 0;
}

function getRoleForAssetClass(asset: AssetClass): "Equity" | "Defensive" | "Satellite" {
	switch (asset) {
		case "Stocks":
		case "Mutual Funds":
			return "Equity";
		case "Debt":
		case "Liquid":
			return "Defensive";
		case "Gold":
		case "Real Estate":
			return "Satellite";
		default:
			return "Defensive";
	}
}

export default function PortfolioHoldingsPage() {
	const { holdings, addHolding, updateHolding, deleteHolding } = useApp() as any;
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [roleFilter, setRoleFilter] = useState<'All'|'Equity'|'Defensive'|'Satellite'>('All');
	const [classFilter, setClassFilter] = useState<'All'|AssetClass>('All');
	const [form, setForm] = useState<{
		instrumentClass: AssetClass;
		name: string;
		symbol?: string;
		units?: string;
		price?: string;
		investedAmount?: string;
		currentValue?: string;
	}>({ instrumentClass: "Stocks", name: "", symbol: "", units: "", price: "", investedAmount: "", currentValue: "" });

	// Enhanced stock functionality
	const [stockSearchTerm, setStockSearchTerm] = useState("");
	const [selectedStock, setSelectedStock] = useState<{ 
		name: string; 
		symbol: string; 
		currentPrice?: number; 
	} | null>(null);
	
	// Hardcoded stock options (later fetch from DB)
	const stockOptions: { name: string; symbol: string; currentPrice: number }[] = [
		{ name: "Reliance Industries Ltd", symbol: "RELIANCE", currentPrice: 2720 },
		{ name: "Reliance Power Ltd", symbol: "RPOWER", currentPrice: 45 },
		{ name: "Reliance Capital Ltd", symbol: "RELCAPITAL", currentPrice: 12 },
		{ name: "Tata Consultancy Services Ltd", symbol: "TCS", currentPrice: 3850 },
		{ name: "HDFC Bank Ltd", symbol: "HDFCBANK", currentPrice: 1650 },
		{ name: "Infosys Ltd", symbol: "INFY", currentPrice: 1820 },
		{ name: "ICICI Bank Ltd", symbol: "ICICIBANK", currentPrice: 1180 },
		{ name: "Hindustan Unilever Ltd", symbol: "HINDUNILVR", currentPrice: 2420 },
		{ name: "ITC Ltd", symbol: "ITC", currentPrice: 485 },
		{ name: "State Bank of India", symbol: "SBIN", currentPrice: 820 },
	];
	
	const [filteredStockOptions, setFilteredStockOptions] = useState<typeof stockOptions>([]);
	const [showStockDropdown, setShowStockDropdown] = useState(false);
	
	const filterStockOptions = (term: string): void => {
		if (term.trim() === "") {
			setFilteredStockOptions([]);
			setShowStockDropdown(false);
		} else {
			const filtered = stockOptions.filter(option =>
				option.name.toLowerCase().includes(term.toLowerCase()) ||
				option.symbol.toLowerCase().includes(term.toLowerCase())
			);
			setFilteredStockOptions(filtered);
			setShowStockDropdown(filtered.length > 0);
		}
	};

	// Entry mode: 'units' or 'amount'
	const [stockEntryMode, setStockEntryMode] = useState<"units" | "amount">("units");

	// Mutual Fund functionality
	const [mfSearchTerm, setMfSearchTerm] = useState("");
	const [selectedMF, setSelectedMF] = useState<{ 
		name: string; 
		schemeCode: string; 
		currentNAV?: number; 
	} | null>(null);
	const [filteredMFOptions, setFilteredMFOptions] = useState<any[]>([]);
	const [showMFDropdown, setShowMFDropdown] = useState(false);
	const [mfOptions, setMfOptions] = useState<any[]>([]);
	const [mfCalculatedUnits, setMfCalculatedUnits] = useState<number | null>(null);
	const [mfCurrentValue, setMfCurrentValue] = useState<number | null>(null);
	const [mfGainLoss, setMfGainLoss] = useState<number | null>(null);
	const [mfGainLossPercent, setMfGainLossPercent] = useState<number | null>(null);

	// Load mutual fund data from AMFI NAV file
	React.useEffect(() => {
		async function loadMFData() {
			try {
				const response = await fetch('/navall.txt');
				const text = await response.text();
				const lines = text.split('\n');
				const funds: any[] = [];
				
				for (const line of lines) {
					if (line.includes('Direct Plan') && line.includes('Growth') && line.includes(';')) {
						const parts = line.split(';');
						if (parts.length >= 5) {
							const schemeCode = parts[0]?.trim();
							const schemeName = parts[3]?.trim();
							const nav = parseFloat(parts[4]?.trim());
							
							if (schemeCode && schemeName && !isNaN(nav)) {
								funds.push({
									schemeCode,
									name: schemeName.replace(/- Direct Plan.*Growth/i, '').trim(),
									fullName: schemeName,
									currentNAV: nav
								});
							}
						}
					}
				}
				
				// Sort by name for better UX
				funds.sort((a, b) => a.name.localeCompare(b.name));
				setMfOptions(funds);
			} catch (error) {
				console.error('Error loading MF data:', error);
			}
		}
		
		loadMFData();
	}, []);

	const filterMFOptions = (term: string): void => {
		if (term.trim() === "") {
			setFilteredMFOptions([]);
			setShowMFDropdown(false);
		} else {
			const filtered = mfOptions.filter(option =>
				option.name.toLowerCase().includes(term.toLowerCase()) ||
				option.fullName.toLowerCase().includes(term.toLowerCase())
			);
			setFilteredMFOptions(filtered.slice(0, 10)); // Limit to 10 results
			setShowMFDropdown(filtered.length > 0);
		}
	};

	// Auto-calculate MF values
	React.useEffect(() => {
		if (selectedMF && form.investedAmount && selectedMF.currentNAV) {
			const investedAmount = parseFloat(form.investedAmount);
			if (!isNaN(investedAmount) && investedAmount > 0) {
				// For simplicity, using current NAV as purchase NAV (in real app, fetch historical NAV)
				const purchaseNAV = selectedMF.currentNAV; // TODO: Fetch historical NAV based on date
				const units = investedAmount / purchaseNAV;
				const currentValue = units * selectedMF.currentNAV;
				const gainLoss = currentValue - investedAmount;
				const gainLossPercent = (gainLoss / investedAmount) * 100;
				
				setMfCalculatedUnits(units);
				setMfCurrentValue(currentValue);
				setMfGainLoss(gainLoss);
				setMfGainLossPercent(gainLossPercent);
				
				// Auto-set calculated current value in form
				setForm({ ...form, currentValue: currentValue.toFixed(2) });
			}
		}
	}, [selectedMF, form.investedAmount]);

	const totalValue = useMemo(() => (holdings || []).reduce((s: number, h: Holding) => s + computeHoldingValue(h), 0), [holdings]);
	const totalInvested = useMemo(() => (holdings || []).reduce((s: number, h: Holding) => s + computeInvestedAmount(h), 0), [holdings]);
	const totalPL = useMemo(() => totalValue - totalInvested, [totalValue, totalInvested]);
	const totalPLPct = useMemo(() => (totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0), [totalPL, totalInvested]);

	const totalPages = useMemo(() => Math.max(1, Math.ceil((holdings?.length || 0) / pageSize)), [holdings, pageSize]);
	const visibleHoldings = useMemo(() => {
		const list: Holding[] = holdings || [];
		const filtered = list.filter(h => {
			const byClass = classFilter === 'All' ? true : h.instrumentClass === classFilter;
			const byRole = roleFilter === 'All' ? true : getRoleForAssetClass(h.instrumentClass) === roleFilter;
			return byClass && byRole;
		});
		const start = (page - 1) * pageSize;
		return filtered.slice(start, start + pageSize);
	}, [holdings, page, pageSize, roleFilter, classFilter]);

	const byClass = useMemo(() => {
		const map: Record<string, number> = {};
		(holdings || []).forEach((h: Holding) => { map[h.instrumentClass] = (map[h.instrumentClass] || 0) + computeHoldingValue(h); });
		return Object.entries(map).map(([k, v]) => ({ name: k as AssetClass, value: v, color: CLASS_COLORS[k as AssetClass].chart }));
	}, [holdings]);

	function resetForm() {
		setForm({ instrumentClass: "Stocks", name: "", symbol: "", units: "", price: "", investedAmount: "", currentValue: "" });
		setEditingId(null);
		// Reset stock functionality
		setStockSearchTerm("");
		setSelectedStock(null);
		setFilteredStockOptions([]);
		setShowStockDropdown(false);
		setStockEntryMode("units");
		// Reset MF functionality
		setMfSearchTerm("");
		setSelectedMF(null);
		setFilteredMFOptions([]);
		setShowMFDropdown(false);
		setMfCalculatedUnits(null);
		setMfCurrentValue(null);
		setMfGainLoss(null);
		setMfGainLossPercent(null);
	}

	function openCreate() {
		resetForm();
		setIsModalOpen(true);
	}

	function openEdit(h: Holding) {
		setEditingId(h.id);
		setForm({
			instrumentClass: h.instrumentClass,
			name: h.name || "",
			symbol: h.symbol || "",
			units: h.units != null ? String(h.units) : "",
			price: h.price != null ? String(h.price) : "",
			investedAmount: h.investedAmount != null ? String(h.investedAmount) : "",
			currentValue: h.currentValue != null ? String(h.currentValue) : "",
		});
		setIsModalOpen(true);
	}

	function submitForm(e: React.FormEvent) {
		e.preventDefault();
		const payload: Holding = {
			id: editingId || uuidv4(),
			instrumentClass: form.instrumentClass,
			name: form.name.trim(),
			symbol: form.symbol?.trim() || undefined,
			units: form.units ? Number(form.units) : undefined,
			price: form.price ? Number(form.price) : undefined,
			investedAmount: form.investedAmount ? Number(form.investedAmount) : undefined,
			currentValue: form.currentValue ? Number(form.currentValue) : undefined,
		};

		if (editingId) updateHolding(editingId, payload);
		else addHolding(payload);

		setIsModalOpen(false);
		resetForm();
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-foreground">Holdings</h1>
						<p className="text-sm text-muted-foreground">Capture your investments and view allocation.</p>
					</div>
					<button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
						<Plus size={18} /> Add Holding
					</button>
				</div>

				{/* KPI Row */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 sticky top-0 z-10 bg-background/80 backdrop-blur py-1">
					<div className="rounded-2xl border border-border bg-card/90 backdrop-blur p-5 shadow-sm">
						<div className="text-sm text-muted-foreground">Total Value</div>
						<div className="text-2xl font-semibold text-foreground mt-1 tracking-tight">₹{Math.round(totalValue).toLocaleString()}</div>
					</div>
					<div className="rounded-xl border border-border bg-card p-4">
						<div className="text-sm text-muted-foreground">Invested</div>
						<div className="text-2xl font-semibold text-foreground mt-1">₹{Math.round(totalInvested).toLocaleString()}</div>
					</div>
					<div className="rounded-2xl border border-border bg-card/90 backdrop-blur p-5 shadow-sm">
						<div className="text-sm text-muted-foreground">P/L</div>
						<div className={`text-2xl font-semibold mt-1 tracking-tight ${totalPL >= 0 ? "text-emerald-600" : "text-rose-600"}`}>₹{Math.round(totalPL).toLocaleString()}</div>
					</div>
					<div className="rounded-xl border border-border bg-card p-4">
						<div className="text-sm text-muted-foreground">P/L %</div>
						<div className={`text-2xl font-semibold mt-1 ${totalPLPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{totalInvested > 0 ? `${totalPLPct.toFixed(2)}%` : "—"}</div>
					</div>
				</div>

				{/* Table left, KPI + Chart right */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
					{/* Left: Table */}
					<div className="lg:col-span-8 rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
						<div className="px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 z-10 bg-card/95 backdrop-blur">
							<div className="font-medium text-foreground">All Holdings</div>
							<div className="flex items-center gap-2">
								<select value={roleFilter} onChange={(e)=> { setPage(1); setRoleFilter(e.target.value as any); }} className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground shadow-sm hover:border-foreground/20">
									<option value="All">All Roles</option>
									<option value="Equity">Equity</option>
									<option value="Defensive">Defensive</option>
									<option value="Satellite">Satellite</option>
								</select>
								<select value={classFilter} onChange={(e)=> { setPage(1); setClassFilter(e.target.value as any); }} className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground shadow-sm hover:border-foreground/20">
									<option value="All">All Classes</option>
									{Object.keys(CLASS_COLORS).map(k => (
										<option key={k} value={k}>{k}</option>
									))}
								</select>
							</div>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-xs md:text-sm table-fixed">
									<thead className="bg-muted/80 supports-[backdrop-filter]:bg-muted/60 backdrop-blur text-muted-foreground uppercase tracking-wide">
										<tr>
											<th className="text-left px-2 py-2 md:px-2 md:py-2 font-semibold w-32 truncate">Name</th>
											<th className="text-left px-2 py-2 md:px-2 md:py-2 font-semibold w-20 truncate">Class</th>
											<th className="text-left px-2 py-2 md:px-2 md:py-2 hidden md:table-cell font-semibold w-20 truncate">Role</th>
											<th className="text-right px-2 py-2 md:px-2 md:py-2 hidden md:table-cell font-semibold w-16 truncate">Units</th>
											<th className="text-right px-2 py-2 md:px-2 md:py-2 hidden md:table-cell font-semibold w-16 truncate">Buy</th>
											<th className="text-right px-2 py-2 md:px-2 md:py-2 font-semibold w-20 truncate">Invested</th>
											<th className="text-right px-2 py-2 md:px-2 md:py-2 font-semibold w-20 truncate">Current</th>
											<th className="text-right px-2 py-2 md:px-2 md:py-2 font-semibold w-16 truncate">Actions</th>
										</tr>
									</thead>
								<tbody className="divide-y divide-border">
									{(holdings || []).length === 0 ? (
										<tr>
											<td colSpan={8} className="px-2 py-8 text-center text-muted-foreground">No holdings yet. Click “Add Holding”.</td>
										</tr>
									) : (
										(visibleHoldings || []).map((h: Holding) => {
											const value = computeHoldingValue(h);
											const invested = typeof h.investedAmount === "number" ? h.investedAmount : (h.units && h.price ? h.units * h.price : undefined);
											const cls = CLASS_COLORS[h.instrumentClass];
											const role = getRoleForAssetClass(h.instrumentClass);
											return (
												<tr key={h.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group">
																	<td className="px-2 py-2 md:px-2 md:py-2 whitespace-nowrap max-w-[120px] truncate">
																		<div className="font-medium text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors truncate" title={h.name}>{h.name}</div>
																		{h.symbol ? (<div className="text-xs text-muted-foreground truncate" title={h.symbol}>{h.symbol}</div>) : null}
																	</td>
																	<td className="px-2 py-2 md:px-2 md:py-2 max-w-[80px] truncate">
																		<span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs ${cls.bg} ${cls.text} truncate`} title={h.instrumentClass}>{h.instrumentClass}</span>
																	</td>
																	<td className="px-2 py-2 md:px-2 md:py-2 hidden md:table-cell max-w-[80px] truncate">
																		<span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-muted text-foreground/80 truncate" title={role}>{role}</span>
																	</td>
													<td className="px-2 py-2 md:px-3 md:py-2 text-right hidden md:table-cell">{h.units != null ? h.units : "—"}</td>
													<td className="px-2 py-2 md:px-3 md:py-2 text-right hidden md:table-cell">{h.price != null ? `₹${h.price.toLocaleString()}` : "—"}</td>
													<td className="px-2 py-2 md:px-3 md:py-2 text-right">{invested != null ? `₹${Math.round(invested).toLocaleString()}` : "—"}</td>
													<td className="px-2 py-2 md:px-3 md:py-2 text-right">{value != null ? `₹${Math.round(value).toLocaleString()}` : "—"}</td>
													<td className="px-2 py-2 md:px-3 md:py-2 text-right">
														<div className="inline-flex items-center gap-1 md:gap-2">
															<button onClick={() => openEdit(h)} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors" aria-label="Edit">
																<Edit2 size={15} className="text-foreground/80 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
															</button>
															<button onClick={() => deleteHolding(h.id)} className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors" aria-label="Delete">
																<Trash2 size={15} className="text-rose-600 group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors" />
															</button>
														</div>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
						<div className="px-4 py-3 border-t border-border flex items-center justify-between">
							<div className="text-xs text-muted-foreground">Page {page} of {totalPages}</div>
							<div className="flex items-center gap-2">
								<select value={pageSize} onChange={(e)=> { setPage(1); setPageSize(Number(e.target.value) || 10); }} className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground shadow-sm hover:border-foreground/20">
									<option value={10}>10 / page</option>
									<option value={25}>25 / page</option>
									<option value={50}>50 / page</option>
								</select>
								<div className="h-8 w-px bg-border" />
								<button disabled={page<=1} onClick={()=> setPage(p=> Math.max(1, p-1))} className="h-8 px-3 rounded-md border border-border text-sm disabled:opacity-50 shadow-sm hover:border-foreground/20">Prev</button>
								<button disabled={page>=totalPages} onClick={()=> setPage(p=> Math.min(totalPages, p+1))} className="h-8 px-3 rounded-md border border-border text-sm disabled:opacity-50 shadow-sm hover:border-foreground/20">Next</button>
							</div>
						</div>
					</div>

					{/* Right: KPI + Chart stacked */}
					<div className="lg:col-span-4 space-y-6">
						<div className="rounded-2xl border border-border bg-card/90 backdrop-blur p-5 shadow-sm">
							<div className="flex items-center justify-between mb-3">
								<div className="font-medium text-foreground">Allocation by Asset Class</div>
								<div className="text-xs text-muted-foreground">Based on current value or invested</div>
							</div>
							<div className="h-72">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie data={byClass} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2} cornerRadius={8}>
											{byClass.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.color} />
											))}
										</Pie>
										<Tooltip formatter={(v: any) => `₹${Math.round(v as number).toLocaleString()}`} contentStyle={{ borderRadius: 12, border: '1px solid rgba(148,163,184,0.2)' }} />
										<Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: 8 }} />
									</PieChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50">
					<div className="absolute inset-0 bg-black/40" onClick={() => { setIsModalOpen(false); resetForm(); }} />
					<div className="absolute inset-x-0 top-10 mx-auto w-[95%] max-w-2xl rounded-xl border border-border bg-card shadow-xl">
						<div className="px-4 py-3 border-b border-border flex items-center justify-between">
							<div className="font-medium text-foreground">{editingId ? "Edit Holding" : "Add Holding"}</div>
							<button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-1 rounded hover:bg-muted" aria-label="Close">
								<X size={18} className="text-foreground/80" />
							</button>
						</div>
						<form onSubmit={submitForm} className="p-4 space-y-4">
							{/* Asset Class */}
							<div>
								<label className="block text-xs text-muted-foreground mb-1">Asset Class</label>
								<select value={form.instrumentClass} onChange={(e) => setForm({ ...form, instrumentClass: e.target.value as AssetClass })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
									{Object.keys(CLASS_COLORS).map((k) => (
										<option key={k} value={k}>{k}</option>
									))}
								</select>
							</div>

							{/* Enhanced Stock Search - Only for Stocks */}
							{form.instrumentClass === "Stocks" ? (
								<div className="space-y-4">
									{/* Stock Search */}
									<div className="relative">
										<label className="block text-xs text-muted-foreground mb-2">
											Search Stock (Name / Symbol) *
										</label>
										<div className="relative">
											<div className="flex">
												<div className="relative flex-1">
													<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
													<input
														type="text"
														value={stockSearchTerm}
														onChange={e => {
															setStockSearchTerm(e.target.value);
															filterStockOptions(e.target.value);
														}}
														onFocus={() => {
															if (stockSearchTerm) {
																filterStockOptions(stockSearchTerm);
															}
														}}
														onBlur={() => {
															setTimeout(() => setShowStockDropdown(false), 200);
														}}
														className="w-full pl-10 pr-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
														placeholder="Start typing stock name or symbol..."
														required
													/>
												</div>
												{selectedStock && (
													<div className="px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-sm rounded-r-lg">
														✓ Selected
													</div>
												)}
											</div>
											
											{/* Dropdown */}
											{showStockDropdown && filteredStockOptions.length > 0 && (
												<div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
													{filteredStockOptions.map(option => (
														<div
															key={option.symbol}
															onClick={() => {
																setSelectedStock(option);
																setStockSearchTerm(option.name);
																setShowStockDropdown(false);
																setForm({ ...form, name: option.name, symbol: option.symbol });
																// Auto-fill current price as buy price suggestion
																if (stockEntryMode === "units" && !form.price) {
																	setForm({ ...form, name: option.name, symbol: option.symbol, price: option.currentPrice.toString() });
																}
															}}
															className="px-4 py-3 cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-b-0"
														>
															<div className="flex justify-between items-center">
																<div>
																	<div className="font-medium text-foreground text-sm">{option.name}</div>
																	<div className="text-xs text-muted-foreground">({option.symbol})</div>
																</div>
																<div className="text-right">
																	<div className="text-sm font-medium text-foreground">₹{option.currentPrice.toLocaleString()}</div>
																	<div className="text-xs text-muted-foreground">Current Price</div>
																</div>
															</div>
														</div>
													))}
												</div>
											)}
										</div>
									</div>

									{/* Entry Mode Toggle */}
									{selectedStock && (
										<div>
											<label className="block text-xs text-muted-foreground mb-3">
												Purchase Method
											</label>
											<div className="flex bg-muted/50 rounded-lg p-1">
												<button
													type="button"
													onClick={() => setStockEntryMode("units")}
													className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
														stockEntryMode === "units"
															? "bg-card text-blue-600 shadow-sm border border-border"
															: "text-muted-foreground hover:text-foreground"
													}`}
												>
													By Units & Buy Price
												</button>
												<button
													type="button"
													onClick={() => setStockEntryMode("amount")}
													className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
														stockEntryMode === "amount"
															? "bg-card text-blue-600 shadow-sm border border-border"
															: "text-muted-foreground hover:text-foreground"
													}`}
												>
													By Total Invested Amount
												</button>
											</div>
										</div>
									)}

									{/* Input Fields Based on Mode */}
									{selectedStock && stockEntryMode === "units" && (
										<div className="grid grid-cols-2 gap-4">
											<div>
												<label className="block text-xs text-muted-foreground mb-2">
													Units Held *
												</label>
												<input
													type="number"
													value={form.units}
													onChange={e => setForm({ ...form, units: e.target.value })}
													className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
													placeholder="Number of shares"
													required
													min="0"
													step="0.01"
												/>
											</div>
											<div>
												<label className="block text-xs text-muted-foreground mb-2">
													Buy Price (₹) *
												</label>
												<input
													type="number"
													value={form.price}
													onChange={e => setForm({ ...form, price: e.target.value })}
													className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
													placeholder="Per share price"
													required
													min="0"
													step="0.01"
												/>
											</div>
										</div>
									)}

									{selectedStock && stockEntryMode === "amount" && (
										<div>
											<label className="block text-xs text-muted-foreground mb-2">
												Total Invested Amount (₹) *
											</label>
											<input
												type="number"
												value={form.investedAmount}
												onChange={e => setForm({ ...form, investedAmount: e.target.value })}
												className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
												placeholder="Total money invested"
												required
												min="0"
												step="0.01"
											/>
										</div>
									)}
								</div>
							) : form.instrumentClass === "Mutual Funds" ? (
								/* Enhanced Mutual Funds Form */
								<div className="space-y-4">
									{/* MF Search */}
									<div className="relative">
										<label className="block text-xs text-muted-foreground mb-2">
											Search Mutual Fund (Direct Growth Plans) *
										</label>
										<div className="relative">
											<div className="flex">
												<div className="relative flex-1">
													<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
													<input
														type="text"
														value={mfSearchTerm}
														onChange={e => {
															setMfSearchTerm(e.target.value);
															filterMFOptions(e.target.value);
														}}
														onFocus={() => {
															if (mfSearchTerm) {
																filterMFOptions(mfSearchTerm);
															}
														}}
														onBlur={() => {
															setTimeout(() => setShowMFDropdown(false), 200);
														}}
														className="w-full pl-10 pr-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
														placeholder="Start typing fund name (e.g., Parag Parikh)..."
														required
													/>
												</div>
												{selectedMF && (
													<div className="px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-sm rounded-r-lg">
														✓ Selected
													</div>
												)}
											</div>
											
											{/* MF Dropdown */}
											{showMFDropdown && filteredMFOptions.length > 0 && (
												<div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
													{filteredMFOptions.map(option => (
														<div
															key={option.schemeCode}
															onClick={() => {
																setSelectedMF(option);
																setMfSearchTerm(option.name);
																setShowMFDropdown(false);
																setForm({ ...form, name: option.name, symbol: option.schemeCode });
															}}
															className="px-4 py-3 cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-b-0"
														>
															<div className="flex justify-between items-center">
																<div className="flex-1">
																	<div className="font-medium text-foreground text-sm">{option.name}</div>
																	<div className="text-xs text-muted-foreground">Direct Plan - Growth</div>
																</div>
																<div className="text-right">
																	<div className="text-sm font-medium text-foreground">₹{option.currentNAV?.toFixed(4)}</div>
																	<div className="text-xs text-muted-foreground">Current NAV</div>
																</div>
															</div>
														</div>
													))}
												</div>
											)}
										</div>
									</div>

									{/* Investment Details */}
									{selectedMF && (
										<div className="space-y-4">
											<div className="grid grid-cols-2 gap-4">
												<div>
													<label className="block text-xs text-muted-foreground mb-2">
														Invested Amount (₹) *
													</label>
													<input
														type="number"
														value={form.investedAmount}
														onChange={e => setForm({ ...form, investedAmount: e.target.value })}
														className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
														placeholder="Total amount invested"
														required
														min="0"
														step="0.01"
													/>
												</div>
												<div>
													<label className="block text-xs text-muted-foreground mb-2">
														Investment Date (optional)
													</label>
													<input
														type="date"
														className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
														defaultValue={new Date().toISOString().substr(0, 10)}
													/>
												</div>
											</div>

											{/* MF Preview Card */}
											{form.investedAmount && mfCalculatedUnits && (
												<div className="mt-6 p-6 bg-gradient-to-r from-emerald-50/50 to-blue-50/50 dark:from-emerald-900/10 dark:to-blue-900/10 rounded-2xl border border-border backdrop-blur-sm">
													<h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
														<span className="mr-2">📈</span>
														Investment Preview
													</h4>
													
													<div className="grid grid-cols-2 gap-4">
														<div className="space-y-3">
															<div>
																<div className="text-xs text-muted-foreground">Mutual Fund</div>
																<div className="font-medium text-foreground">
																	{selectedMF.name}
																</div>
															</div>
															
															<div>
																<div className="text-xs text-muted-foreground">Invested Amount</div>
																<div className="font-medium text-foreground">
																	₹{parseFloat(form.investedAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
																</div>
															</div>
															
															<div>
																<div className="text-xs text-muted-foreground">Units Allocated</div>
																<div className="font-medium text-foreground">
																	{mfCalculatedUnits?.toFixed(4)} units
																</div>
															</div>
															
															<div>
																<div className="text-xs text-muted-foreground">Purchase NAV (approx)</div>
																<div className="font-medium text-foreground">
																	₹{selectedMF.currentNAV?.toFixed(4)}
																</div>
															</div>
														</div>
														
														<div className="space-y-3">
															<div>
																<div className="text-xs text-muted-foreground">Current NAV</div>
																<div className="font-medium text-foreground">
																	₹{selectedMF.currentNAV?.toFixed(4)}
																</div>
															</div>
															
															<div>
																<div className="text-xs text-muted-foreground">Current Value</div>
																<div className="font-medium text-foreground">
																	₹{mfCurrentValue?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
																</div>
															</div>
															
															<div>
																<div className="text-xs text-muted-foreground">Gain/Loss</div>
																<div className={`font-semibold ${mfGainLoss && mfGainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
																	{mfGainLoss && mfGainLoss >= 0 ? '+' : ''}₹{mfGainLoss?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
																</div>
															</div>
															
															<div>
																<div className="text-xs text-muted-foreground">% Return</div>
																<div className={`font-semibold ${mfGainLossPercent && mfGainLossPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
																	{mfGainLossPercent && mfGainLossPercent >= 0 ? '+' : ''}{mfGainLossPercent?.toFixed(2)}%
																</div>
															</div>
														</div>
													</div>
													
													<div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
														<div className="text-blue-700 dark:text-blue-300 text-sm">
															<strong>Note:</strong> Using current NAV as purchase NAV for calculation. In real implementation, historical NAV for the investment date would be fetched.
														</div>
													</div>
												</div>
											)}
										</div>
									)}
								</div>
							) : (
								/* Standard form for other asset classes */
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="col-span-1">
										<label className="block text-xs text-muted-foreground mb-1">Name *</label>
										<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
									</div>
									<div className="col-span-1">
										<label className="block text-xs text-muted-foreground mb-1">Symbol (optional)</label>
										<input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
									</div>
									<div className="col-span-1">
										<label className="block text-xs text-muted-foreground mb-1">Units (optional)</label>
										<input type="number" inputMode="decimal" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
									</div>
									<div className="col-span-1">
										<label className="block text-xs text-muted-foreground mb-1">Buy Price (optional)</label>
										<input type="number" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
									</div>
									<div className="col-span-1">
										<label className="block text-xs text-muted-foreground mb-1">Invested Amount (optional)</label>
										<input type="number" inputMode="decimal" value={form.investedAmount} onChange={(e) => setForm({ ...form, investedAmount: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
									</div>
									<div className="col-span-1">
										<label className="block text-xs text-muted-foreground mb-1">Current Value (optional)</label>
										<input type="number" inputMode="decimal" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
									</div>
								</div>
							)}

							<div className="flex items-center justify-end gap-3 pt-4">
								<button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted">Cancel</button>
								<button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">{editingId ? "Save Changes" : "Add Holding"}</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
