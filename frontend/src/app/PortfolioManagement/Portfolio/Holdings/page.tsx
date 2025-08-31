"use client";
import React, { useMemo, useState } from "react";
import { useApp, type Holding } from "../../../store";
import type { AssetClass } from "../../domain/allocationEngine";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Plus, Edit2, Trash2, X, Search } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

// Asset class colors for charts
const CLASS_COLORS = {
	"Stocks": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", chart: "#3B82F6" },
	"Mutual Funds": { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-blue-300", chart: "#10B981" },
	"Debt": { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", chart: "#8B5CF6" },
	"Liquid": { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", chart: "#F59E0B" },
	"Gold": { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", chart: "#EAB308" },
	"Real Estate": { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-300", chart: "#F43F5E" },
};

// Role-based instrument type mapping
const ROLE_INSTRUMENT_TYPES = {
	Equity: [
		{ label: "Stocks", value: "Stocks", category: "Stocks" },
		{ label: "Equity MF", value: "Equity MF", category: "Mutual Funds" },
		{ label: "Equity ETF", value: "Equity ETF", category: "Stocks" }
	],
	Defensive: [
		{ label: "Bonds", value: "Bonds", category: "Debt" },
		{ label: "Debt MF", value: "Debt MF", category: "Mutual Funds" },
		{ label: "Liquid MF", value: "Liquid MF", category: "Mutual Funds" },
		{ label: "Cash", value: "Cash", category: "Liquid" }
	],
	Satellite: [
		{ label: "Gold ETF", value: "Gold ETF", category: "Gold" },
		{ label: "Gold MF", value: "Gold MF", category: "Mutual Funds" },
		{ label: "Physical Gold", value: "Physical Gold", category: "Gold" },
		{ label: "REITs", value: "REITs", category: "Real Estate" },
		{ label: "Properties", value: "Properties", category: "Real Estate" }
	]
};

// Auto-map instrument type to AssetClass
function mapInstrumentTypeToAssetClass(instrumentType: string): AssetClass {
	if (instrumentType.includes("MF")) return "Mutual Funds";
	if (instrumentType.includes("Gold")) return "Gold";
	if (instrumentType.includes("Real Estate") || instrumentType.includes("REIT") || instrumentType.includes("Property")) return "Real Estate";
	if (instrumentType.includes("Bond") || instrumentType.includes("Debt")) return "Debt";
	if (instrumentType.includes("Liquid") || instrumentType.includes("Cash")) return "Liquid";
	if (instrumentType.includes("Stock") || instrumentType.includes("ETF")) return "Stocks";
	return "Stocks"; // Default fallback
}

// Utility functions
function computeHoldingValue(holding: Holding): number {
	if (holding.currentValue !== undefined) return holding.currentValue;
	if (holding.units && holding.price) return holding.units * holding.price;
	if (holding.investedAmount) return holding.investedAmount;
	return 0;
}

function computeInvestedAmount(holding: Holding): number {
	if (holding.investedAmount !== undefined) return holding.investedAmount;
	if (holding.units && holding.price) return holding.units * holding.price;
	return 0;
}

function getRoleForAssetClass(assetClass: AssetClass): 'Equity' | 'Defensive' | 'Satellite' {
	switch (assetClass) {
		case 'Stocks':
		case 'Mutual Funds':
			return 'Equity';
		case 'Debt':
		case 'Liquid':
			return 'Defensive';
		case 'Gold':
		case 'Real Estate':
			return 'Satellite';
		default:
			return 'Equity';
	}
}

export default function HoldingsPage() {
	const { holdings, addHolding, updateHolding, deleteHolding, profile } = useApp();
	
	// Modal state
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	
	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	
	// New state for role-based flow
	const [selectedRole, setSelectedRole] = useState<'Equity' | 'Defensive' | 'Satellite' | null>(null);
	const [selectedInstrumentType, setSelectedInstrumentType] = useState<string | null>(null);
	const [entryMode, setEntryMode] = useState<'units' | 'amount'>('units');
	
	// Enhanced stock functionality
	const [stockSearchTerm, setStockSearchTerm] = useState("");
	const [selectedStock, setSelectedStock] = useState<any>(null);
	const [filteredStockOptions, setFilteredStockOptions] = useState<any[]>([]);
	const [showStockDropdown, setShowStockDropdown] = useState(false);
	const [stockEntryMode, setStockEntryMode] = useState<'units' | 'amount'>('units');
	
	// Hardcoded stock options (later fetch from DB)
	const stockOptions = [
		{ symbol: "RELIANCE", name: "Reliance Industries Ltd", price: 2450.50 },
		{ symbol: "TCS", name: "Tata Consultancy Services Ltd", price: 3850.75 },
		{ symbol: "HDFC", name: "HDFC Bank Ltd", price: 1650.25 },
		{ symbol: "INFY", name: "Infosys Ltd", price: 1450.80 },
		{ symbol: "ICICIBANK", name: "ICICI Bank Ltd", price: 950.40 },
		{ symbol: "HINDUNILVR", name: "Hindustan Unilever Ltd", price: 2850.90 },
		{ symbol: "ITC", name: "ITC Ltd", price: 450.60 },
		{ symbol: "SBIN", name: "State Bank of India", price: 650.30 },
		{ symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", price: 1150.20 },
		{ symbol: "AXISBANK", name: "Axis Bank Ltd", price: 1050.45 }
	];
	
	// Entry mode: 'units' or 'amount'
	const [form, setForm] = useState({
		instrumentClass: "Stocks" as AssetClass,
		name: "",
		symbol: "",
		units: "",
		price: "",
		investedAmount: "",
		currentValue: ""
	});
	
	// Mutual Fund functionality
	const [mfSearchTerm, setMfSearchTerm] = useState("");
	const [selectedMF, setSelectedMF] = useState<any>(null);
	const [mfOptions, setMfOptions] = useState<any[]>([]);
	const [filteredMFOptions, setFilteredMFOptions] = useState<any[]>([]);
	const [showMFDropdown, setShowMFDropdown] = useState(false);
	const [mfCalculatedUnits, setMfCalculatedUnits] = useState<number | null>(null);
	const [mfCurrentValue, setMfCurrentValue] = useState<number | null>(null);
	const [mfGainLoss, setMfGainLoss] = useState<number | null>(null);
	const [mfGainLossPercent, setMfGainLossPercent] = useState<number | null>(null);

	// Load mutual fund data from AMFI NAV file with proper filtering
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
								// Use a simpler approach to avoid regex issues
								const cleanName = schemeName.replace('- Direct Plan', '').replace('Growth', '').trim();
								
								// Categorize the fund based on name and category
								let fundType = 'Equity MF';
								if (schemeName.toLowerCase().includes('debt') || schemeName.toLowerCase().includes('income') || schemeName.toLowerCase().includes('bond') || schemeName.toLowerCase().includes('gilt')) {
									fundType = 'Debt MF';
								} else if (schemeName.toLowerCase().includes('liquid') || schemeName.toLowerCase().includes('overnight')) {
									fundType = 'Liquid MF';
								} else if (schemeName.toLowerCase().includes('gold')) {
									fundType = 'Gold MF';
								} else if (schemeName.toLowerCase().includes('etf')) {
									if (schemeName.toLowerCase().includes('gold')) {
										fundType = 'Gold ETF';
									} else {
										fundType = 'Equity ETF';
									}
								}
								
								funds.push({
									schemeCode,
									name: cleanName,
									fullName: schemeName,
									currentNAV: nav,
									fundType
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

	// Filter stock options
	const filterStockOptions = (term: string): void => {
		if (term.trim() === "") {
			setFilteredStockOptions([]);
			setShowStockDropdown(false);
		} else {
			const filtered = stockOptions.filter(option =>
				option.name.toLowerCase().includes(term.toLowerCase()) ||
				option.symbol.toLowerCase().includes(term.toLowerCase())
			);
			setFilteredStockOptions(filtered.slice(0, 10));
			setShowStockDropdown(filtered.length > 0);
		}
	};

	const filterMFOptions = (term: string): void => {
		if (term.trim() === "") {
			setFilteredMFOptions([]);
			setShowMFDropdown(false);
		} else {
			// Filter based on selected instrument type
			let filtered = mfOptions;
			
			if (selectedInstrumentType === 'Equity MF') {
				filtered = mfOptions.filter(option => 
					option.fundType === 'Equity MF' &&
					!option.fullName.toLowerCase().includes('debt') &&
					!option.fullName.toLowerCase().includes('liquid') &&
					!option.fullName.toLowerCase().includes('overnight') &&
					!option.fullName.toLowerCase().includes('gilt') &&
					!option.fullName.toLowerCase().includes('gold')
				);
			} else if (selectedInstrumentType === 'Debt MF') {
				filtered = mfOptions.filter(option => 
					option.fundType === 'Debt MF'
				);
			} else if (selectedInstrumentType === 'Liquid MF') {
				filtered = mfOptions.filter(option => 
					option.fundType === 'Liquid MF'
				);
			} else if (selectedInstrumentType === 'Gold MF') {
				filtered = mfOptions.filter(option => 
					option.fundType === 'Gold MF'
				);
			} else if (selectedInstrumentType === 'Equity ETF') {
				filtered = mfOptions.filter(option => 
					option.fundType === 'Equity ETF'
				);
			} else if (selectedInstrumentType === 'Gold ETF') {
				filtered = mfOptions.filter(option => 
					option.fundType === 'Gold ETF'
				);
			}
			
			// Then filter by search term
			filtered = filtered.filter(option =>
				option.name.toLowerCase().includes(term.toLowerCase()) ||
				option.fullName.toLowerCase().includes(term.toLowerCase())
			);
			
			setFilteredMFOptions(filtered.slice(0, 10));
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

	// Portfolio allocation data for pie chart
	const portfolioAllocationData = useMemo(() => {
		if (!holdings || holdings.length === 0) return [];
		
		const allocationMap = new Map<string, number>();
		
		holdings.forEach(holding => {
			const assetClass = holding.instrumentClass;
			const currentValue = computeHoldingValue(holding);
			allocationMap.set(assetClass, (allocationMap.get(assetClass) || 0) + currentValue);
		});
		
		// Convert to array and sort by value
		const allocationArray = Array.from(allocationMap.entries()).map(([name, value]) => ({
			name,
			value,
			color: CLASS_COLORS[name as keyof typeof CLASS_COLORS]?.chart || '#6B7280'
		})).sort((a, b) => b.value - a.value);
		
		return allocationArray;
	}, [holdings]);

	// Portfolio role allocation data for pie chart
	const portfolioRoleData = useMemo(() => {
		if (!holdings || holdings.length === 0) return [];

		const roleMap = new Map<string, number>();

		holdings.forEach(holding => {
			const role = getRoleForAssetClass(holding.instrumentClass);
			const currentValue = computeHoldingValue(holding);
			roleMap.set(role, (roleMap.get(role) || 0) + currentValue);
		});

		const roleArray = Array.from(roleMap.entries()).map(([name, value]) => ({
			name,
			value,
			color: name === 'Equity' ? '#3B82F6' : name === 'Defensive' ? '#10B981' : '#F43F5E'
		})).sort((a, b) => b.value - a.value);

		return roleArray;
	}, [holdings]);

	// Pagination logic
	const totalPages = Math.ceil((holdings?.length || 0) / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentHoldings = holdings?.slice(startIndex, endIndex) || [];

	// Reset to first page when holdings change
	React.useEffect(() => {
		setCurrentPage(1);
	}, [holdings?.length]);

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
		// Reset role-based state
		setSelectedRole(null);
		setSelectedInstrumentType(null);
		setEntryMode('units');
	}

	function submitForm(e: React.FormEvent) {
		e.preventDefault();
		
		if (!form.name.trim()) return;
		
		const holding: Holding = {
			id: editingId || uuidv4(),
			instrumentClass: selectedRole && selectedInstrumentType 
				? mapInstrumentTypeToAssetClass(selectedInstrumentType)
				: form.instrumentClass,
			name: form.name.trim(),
			symbol: form.symbol.trim() || undefined,
			units: form.units ? parseFloat(form.units) : undefined,
			price: form.price ? parseFloat(form.price) : undefined,
			investedAmount: form.investedAmount ? parseFloat(form.investedAmount) : undefined,
			currentValue: form.currentValue ? parseFloat(form.currentValue) : undefined
		};
		
		if (editingId) {
			updateHolding(editingId, holding);
		} else {
			addHolding(holding);
		}
		
		setIsModalOpen(false);
		resetForm();
	}

	function openEdit(holding: Holding) {
		setEditingId(holding.id);
		setForm({
			instrumentClass: holding.instrumentClass,
			name: holding.name,
			symbol: holding.symbol || "",
			units: holding.units?.toString() || "",
			price: holding.price?.toString() || "",
			investedAmount: holding.investedAmount?.toString() || "",
			currentValue: holding.currentValue?.toString() || ""
		});
		setIsModalOpen(true);
	}

	function handleDeleteHolding(id: string) {
		if (confirm("Are you sure you want to delete this holding?")) {
			deleteHolding(id);
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Holdings</h1>
					<p className="text-sm text-muted-foreground">Capture your investments and view allocation.</p>
				</div>
				<button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
					<Plus size={18} /> Add Holding
				</button>
			</div>
			
			{/* KPI Row */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
					<div className="text-sm text-muted-foreground">Total Value</div>
					<div className="text-2xl font-semibold text-foreground mt-1">₹{Math.round(totalValue).toLocaleString()}</div>
				</div>
				<div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
					<div className="text-sm text-muted-foreground">Invested</div>
					<div className="text-2xl font-semibold text-foreground mt-1">₹{Math.round(totalInvested).toLocaleString()}</div>
				</div>
				<div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
					<div className="text-sm text-muted-foreground">P/L</div>
					<div className={`text-2xl font-semibold mt-1 ${totalPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
						₹{Math.round(totalPL).toLocaleString()}
					</div>
				</div>
				<div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
					<div className="text-sm text-muted-foreground">P/L %</div>
					<div className={`text-2xl font-semibold mt-1 ${totalPLPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
						{totalPLPct >= 0 ? `${totalPLPct.toFixed(2)}%` : "—"}
					</div>
				</div>
			</div>

			{/* Holdings Table with Pie Chart */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Holdings List - Takes 2 columns */}
				<div className="lg:col-span-2 rounded-2xl border border-border bg-card">
					<div className="px-4 py-3 border-b border-border">
						<div className="font-medium text-foreground">All Holdings</div>
					</div>
					<div className="p-4">
						{holdings && holdings.length > 0 ? (
							<div>
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead>
											<tr className="border-b border-border">
												<th className="py-2 px-2 text-xs font-semibold text-muted-foreground text-left tracking-wide">Instrument</th>
												<th className="py-2 px-2 text-xs font-semibold text-muted-foreground text-left tracking-wide">Asset Class</th>
												<th className="py-2 px-2 text-xs font-semibold text-muted-foreground text-left tracking-wide">Units</th>
												<th className="py-2 px-2 text-xs font-semibold text-muted-foreground text-left tracking-wide">Price</th>
												<th className="py-2 px-2 text-xs font-semibold text-muted-foreground text-right tracking-wide">Current Value</th>
												<th className="py-2 px-2 text-xs font-semibold text-muted-foreground text-right tracking-wide">Invested Amount</th>
												<th className="py-2 px-2 text-xs font-semibold text-muted-foreground text-right tracking-wide">P/L</th>
												<th className="py-2 px-2 text-xs font-semibold text-muted-foreground text-center tracking-wide">Actions</th>
											</tr>
										</thead>
										<tbody>
											{currentHoldings.map((holding) => {
												const currentValue = computeHoldingValue(holding);
												const investedAmount = computeInvestedAmount(holding);
												const pl = currentValue - investedAmount;
												const plPercent = investedAmount > 0 ? (pl / investedAmount) * 100 : 0;
												
												return (
													<tr key={holding.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
														<td className="py-2 px-2">
															<div>
																<div className="font-medium text-foreground text-sm">{holding.name}</div>
																{holding.symbol && (
																	<div className="text-xs text-muted-foreground font-medium">{holding.symbol}</div>
																)}
															</div>
														</td>
														<td className="py-2 px-2 text-left">
															<span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold ${
																CLASS_COLORS[holding.instrumentClass as keyof typeof CLASS_COLORS]?.bg || 'bg-gray-100 dark:bg-gray-800'
															} ${
																CLASS_COLORS[holding.instrumentClass as keyof typeof CLASS_COLORS]?.text || 'text-gray-700 dark:text-gray-300'
															}`}>
																{holding.instrumentClass}
															</span>
														</td>
														<td className="py-2 px-2 text-left">
															<div className="font-medium text-foreground text-sm">{holding.units?.toFixed(2) || '0.00'}</div>
														</td>
														<td className="py-2 px-2 text-left">
															<div className="font-medium text-foreground text-sm">₹{holding.price?.toLocaleString() || '0.00'}</div>
														</td>
														<td className="py-2 px-2 text-right">
															<div className="font-medium text-foreground text-sm">₹{currentValue.toLocaleString()}</div>
														</td>
														<td className="py-2 px-2 text-right">
															<div className="font-medium text-foreground text-sm">₹{investedAmount.toLocaleString()}</div>
														</td>
														<td className="py-2 px-2 text-right">
															<div className={`font-medium text-sm ${pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
																₹{pl.toLocaleString()}
															</div>
															<div className={`text-xs font-medium ${pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
																{plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%
															</div>
														</td>
														<td className="py-2 px-2 text-center">
															<div className="flex items-center justify-center gap-1">
																<button 
																	onClick={() => openEdit(holding)} 
																	className="p-1.5 rounded-md hover:bg-muted transition-colors text-blue-600 hover:text-blue-700"
																	title="Edit"
																>
																	<Edit2 size={14} />
																</button>
																<button 
																	onClick={() => handleDeleteHolding(holding.id)} 
																	className="p-1.5 rounded-md hover:bg-muted transition-colors text-rose-600 hover:text-rose-700"
																	title="Delete"
																>
																	<Trash2 size={14} />
																</button>
															</div>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
								
								{/* Pagination Controls */}
								{totalPages > 1 && (
									<div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
										<div className="text-xs text-muted-foreground">
											Showing {startIndex + 1} to {Math.min(endIndex, holdings.length)} of {holdings.length} holdings
										</div>
										<div className="flex items-center gap-2">
											<button
												onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
												disabled={currentPage === 1}
												className="px-2 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
											>
												Previous
											</button>
											
											<div className="flex items-center gap-1">
												{Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
													<button
														key={page}
														onClick={() => setCurrentPage(page)}
														className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
															currentPage === page
																? 'bg-primary text-primary-foreground'
																: 'text-foreground bg-card border border-border hover:bg-muted'
														}`}
													>
														{page}
													</button>
												))}
											</div>
											
											<button
												onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
												disabled={currentPage === totalPages}
												className="px-2 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
											>
												Next
											</button>
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="text-center py-8 text-muted-foreground">
								<div className="text-4xl mb-2">📊</div>
								<div className="text-lg font-medium mb-2">No holdings yet</div>
								<div className="text-sm">Click "Add Holding" to get started with your portfolio</div>
							</div>
						)}
					</div>
				</div>

				{/* Portfolio Allocation Pie Chart - Takes 1 column */}
				<div className="rounded-2xl border border-border bg-card">
					<div className="px-4 py-3 border-b border-border">
						<div className="font-medium text-foreground">Portfolio Allocation</div>
					</div>
					<div className="p-4">
						{holdings && holdings.length > 0 ? (
							<div className="space-y-8">
								{/* Asset Class Chart with Details */}
								<div>
									<div className="text-sm font-medium text-muted-foreground mb-3 text-center">By Asset Class</div>
									<div className="h-40 flex items-center justify-center mb-4">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={portfolioAllocationData}
													cx="50%"
													cy="50%"
													innerRadius={30}
													outerRadius={60}
													paddingAngle={3}
													dataKey="value"
												>
													{portfolioAllocationData.map((entry, index) => (
														<Cell key={`cell-${index}`} fill={entry.color} />
													))}
												</Pie>
												<Tooltip 
													formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Value']}
													labelFormatter={(label) => `${label}`}
													contentStyle={{
														backgroundColor: 'hsl(var(--card))',
														border: '1px solid hsl(var(--border))',
														borderRadius: '8px',
														boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
													}}
												/>
											</PieChart>
										</ResponsiveContainer>
									</div>
									
									{/* Asset Class Summary */}
									<div className="space-y-2">
										{portfolioAllocationData.map((item, index) => (
											<div key={index} className="flex items-center justify-between text-sm">
												<div className="flex items-center gap-2">
													<div 
														className="w-3 h-3 rounded-full" 
														style={{ backgroundColor: item.color }}
													></div>
													<span className="text-foreground font-medium">{item.name}</span>
												</div>
												<div className="text-muted-foreground font-medium">
													{((item.value / totalValue) * 100).toFixed(1)}%
												</div>
											</div>
										))}
									</div>
								</div>
								
								{/* Portfolio Role Chart with Details */}
								<div>
									<div className="text-sm font-medium text-muted-foreground mb-3 text-center">By Portfolio Role</div>
									<div className="h-40 flex items-center justify-center mb-4">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={portfolioRoleData}
													cx="50%"
													cy="50%"
													innerRadius={30}
													outerRadius={60}
													paddingAngle={3}
													dataKey="value"
												>
													{portfolioRoleData.map((entry, index) => (
														<Cell key={`cell-${index}`} fill={entry.color} />
													))}
												</Pie>
												<Tooltip 
													formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Value']}
													labelFormatter={(label) => `${label}`}
													contentStyle={{
														backgroundColor: 'hsl(var(--card))',
														border: '1px solid hsl(var(--border))',
														borderRadius: '8px',
														boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
													}}
												/>
											</PieChart>
										</ResponsiveContainer>
									</div>
									
									{/* Portfolio Role Summary */}
									<div className="space-y-2">
										{portfolioRoleData.map((item, index) => (
											<div key={index} className="flex items-center justify-between text-sm">
												<div className="flex items-center gap-2">
													<div 
														className="w-3 h-3 rounded-full" 
														style={{ backgroundColor: item.color }}
													></div>
													<span className="text-foreground font-medium">{item.name}</span>
												</div>
												<div className="text-muted-foreground font-medium">
													{((item.value / totalValue) * 100).toFixed(1)}%
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						) : (
							<div className="text-center py-8 text-muted-foreground">
								<div className="text-4xl mb-2">📊</div>
								<div className="text-sm">No data to display</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Add/Edit Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50">
					<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); resetForm(); }} />
					<div className="absolute inset-x-0 top-20 mx-auto w-[90%] max-w-4xl rounded-2xl border border-border bg-card shadow-2xl">
						{/* Header */}
						<div className="px-6 py-4 border-b border-border flex items-center justify-between">
							<div>
								<div className="text-lg font-bold text-foreground">{editingId ? "Edit Holding" : "Add New Holding"}</div>
								<div className="text-sm text-muted-foreground mt-1">Select portfolio role and instrument details</div>
							</div>
							<button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Close">
								<X size={18} className="text-muted-foreground" />
							</button>
						</div>
						
						{/* Portfolio Role Selection - Top Row */}
						<div className="px-6 py-3 border-b border-border">
							<div className="text-center">
								<label className="block text-sm font-medium text-foreground mb-3">Portfolio Role</label>
								<div className="flex items-center justify-center gap-3">
									{(['Equity', 'Defensive', 'Satellite'] as const).map(role => (
										<button
											key={role}
											type="button"
											onClick={() => {
												setSelectedRole(role);
												setSelectedInstrumentType(null);
												setForm({ ...form, name: "", symbol: "" });
											}}
											className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform ${
												selectedRole === role
													? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105 ring-2 ring-blue-500/30"
													: "bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-102"
											}`}
										>
											{role}
										</button>
									))}
								</div>
							</div>
						</div>
						
						<div className="flex min-h-[400px]">
							{/* Left Column - Dynamic Instrument Type Selection */}
							<div className="w-2/5 border-r border-border bg-muted/20">
								<div className="p-4">
									{selectedRole ? (
										<>
											<h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Instrument Type</h3>
											<div className="space-y-2">
												{ROLE_INSTRUMENT_TYPES[selectedRole].map(type => (
													<button
														key={type.value}
														type="button"
														onClick={() => {
															setSelectedInstrumentType(type.value);
															setForm({ ...form, name: "", symbol: "" });
														}}
														className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-300 transform ${
															selectedInstrumentType === type.value
																? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg scale-105 ring-2 ring-emerald-500/30"
																: "bg-card border border-border text-foreground hover:bg-muted hover:border-primary/30 hover:scale-102"
														}`}
													>
														<div className="font-medium text-sm">{type.label}</div>
														<div className={`text-xs ${selectedInstrumentType === type.value ? 'text-emerald-100' : 'opacity-80'}`}>{type.category}</div>
													</button>
												))}
											</div>
										</>
									) : (
										<div className="flex items-center justify-center h-full">
											<div className="text-center text-muted-foreground">
												<div className="text-3xl mb-3">📊</div>
												<div className="text-base font-medium mb-1">Select Portfolio Role</div>
												<div className="text-xs">Choose a portfolio role above to see available instruments</div>
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Right Column - Form */}
							<div className="w-3/5 p-4">
								{selectedInstrumentType ? (
									<form onSubmit={submitForm} className="space-y-6">
										{/* Instrument Name */}
										<div>
											<label className="block text-sm font-medium text-foreground mb-2">Instrument Name *</label>
											
											{/* Stock Autocomplete */}
											{selectedInstrumentType === 'Stocks' && (
												<div className="relative">
													<input
														value={stockSearchTerm}
														onChange={(e) => {
															setStockSearchTerm(e.target.value);
															filterStockOptions(e.target.value);
														}}
														onFocus={() => filterStockOptions(stockSearchTerm)}
														className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
														placeholder="Search for stocks..."
													/>
													{showStockDropdown && (
														<div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
															{filteredStockOptions.map((stock) => (
																<div
																	key={stock.symbol}
																	onClick={() => {
																		setSelectedStock(stock);
																		setStockSearchTerm(stock.name);
																		setForm({ ...form, name: stock.name, symbol: stock.symbol, price: stock.price.toString() });
																		setShowStockDropdown(false);
																	}}
																	className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
																>
																	<div className="font-medium text-sm">{stock.name}</div>
																	<div className="text-xs text-muted-foreground">{stock.symbol} • ₹{stock.price}</div>
																</div>
															))}
														</div>
													)}
												</div>
											)}

											{/* Mutual Fund Autocomplete */}
											{selectedInstrumentType.includes('MF') && (
												<div className="relative">
													<input
														value={mfSearchTerm}
														onChange={(e) => {
															setMfSearchTerm(e.target.value);
															filterMFOptions(e.target.value);
														}}
														onFocus={() => filterMFOptions(mfSearchTerm)}
														className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
														placeholder="Search for mutual funds..."
													/>
													{showMFDropdown && (
														<div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
															{filteredMFOptions.map((fund) => (
																<div
																	key={fund.schemeCode}
																	onClick={() => {
																		setSelectedMF(fund);
																		setMfSearchTerm(fund.name);
																		setForm({ ...form, name: fund.name, symbol: fund.schemeCode });
																		setShowMFDropdown(false);
																	}}
																	className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
																>
																	<div className="font-medium text-sm">{fund.name}</div>
																	<div className="text-xs text-muted-foreground">NAV: ₹{fund.currentNAV}</div>
																</div>
															))}
														</div>
													)}
												</div>
											)}

											{/* Manual Input for Other Types */}
											{!selectedInstrumentType.includes('MF') && selectedInstrumentType !== 'Stocks' && (
												<input
													value={form.name}
													onChange={(e) => setForm({ ...form, name: e.target.value })}
													required
													className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
													placeholder="Enter instrument name"
												/>
											)}
										</div>

										{/* Amount Input */}
										{form.name && (
											<div>
												<label className="block text-sm font-medium text-foreground mb-2">Amount *</label>
												<div className="relative">
													<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground">₹</span>
													<input
														type="number"
														value={form.investedAmount}
														onChange={(e) => setForm({ ...form, investedAmount: e.target.value })}
														required
														className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
														placeholder="0.00"
													/>
												</div>
											</div>
										)}

										{/* Form Actions */}
										<div className="flex items-center justify-between pt-6 border-t border-border">
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={() => { setIsModalOpen(false); resetForm(); }}
													className="px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-sm"
												>
													Cancel
												</button>
												<button
													type="button"
													onClick={resetForm}
													className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-sm"
												>
													Reset
												</button>
											</div>
											<button
												type="submit"
												className="min-w-[140px] px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm"
											>
												{editingId ? "Save Changes" : "Add Holding"}
											</button>
										</div>
									</form>
								) : (
									<div className="flex items-center justify-center h-full">
										<div className="text-center text-muted-foreground">
											<div className="text-3xl mb-3">📋</div>
											<div className="text-base font-medium mb-1">Select Instrument Type</div>
											<div className="text-xs">Choose an instrument type from the left menu to continue</div>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}