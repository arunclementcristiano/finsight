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
	"Mutual Funds": { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", chart: "#10B981" },
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
								// Use a simpler approach to avoid regex issues
								const cleanName = schemeName.replace('- Direct Plan', '').replace('Growth', '').trim();
								funds.push({
									schemeCode,
									name: cleanName,
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
				<button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
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

			{/* Holdings Table */}
			<div className="rounded-2xl border border-border bg-card">
				<div className="px-4 py-3 border-b border-border">
					<div className="font-medium text-foreground">All Holdings</div>
				</div>
				<div className="p-4">
					{holdings && holdings.length > 0 ? (
						<div className="space-y-3">
							{holdings.map((holding) => (
								<div key={holding.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
									<div>
										<div className="font-medium">{holding.name}</div>
										{holding.symbol && <div className="text-sm text-muted-foreground">{holding.symbol}</div>}
									</div>
									<div className="text-right">
										<div className="font-medium">₹{computeHoldingValue(holding).toLocaleString()}</div>
										<div className="text-sm text-muted-foreground">{holding.instrumentClass}</div>
									</div>
									<div className="flex gap-2">
										<button onClick={() => openEdit(holding)} className="p-2 rounded hover:bg-muted">
											<Edit2 size={16} />
										</button>
										<button onClick={() => handleDeleteHolding(holding.id)} className="p-2 rounded hover:bg-muted text-rose-600">
											<Trash2 size={16} />
										</button>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8 text-muted-foreground">
							No holdings yet. Click "Add Holding" to get started.
						</div>
					)}
				</div>
			</div>

			{/* Add/Edit Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50">
					<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); resetForm(); }} />
					<div className="absolute inset-x-0 top-10 mx-auto w-[95%] max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
						<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
							<div>
								<div className="text-xl font-bold text-gray-900">{editingId ? "Edit Holding" : "Add New Holding"}</div>
								<div className="text-sm text-gray-600 mt-1">Select portfolio role and instrument details</div>
							</div>
							<button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Close">
								<X size={20} className="text-gray-500" />
							</button>
						</div>
						
						<form onSubmit={submitForm} className="p-6 space-y-8">
							{/* Portfolio Role Selection */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-4">Portfolio Role</label>
								<div className="flex gap-3 flex-wrap">
									{(['Equity', 'Defensive', 'Satellite'] as const).map(role => (
										<button
											key={role}
											type="button"
											onClick={() => {
												setSelectedRole(role);
												setSelectedInstrumentType(null);
												setForm({ ...form, name: "", symbol: "" });
											}}
											className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 shadow-sm ${
												selectedRole === role
													? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md scale-105"
													: "bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:shadow-md"
											}`}
										>
											{role}
										</button>
									))}
								</div>
							</div>

							{/* Instrument Type Selection */}
							{selectedRole && (
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-4">Instrument Type</label>
									<div className="flex gap-3 flex-wrap">
										{ROLE_INSTRUMENT_TYPES[selectedRole].map(type => (
											<button
												key={type.value}
												type="button"
												onClick={() => {
													setSelectedInstrumentType(type.value);
													setForm({ ...form, name: "", symbol: "" });
												}}
												className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 shadow-sm ${
													selectedInstrumentType === type.value
														? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md scale-105"
														: "bg-white border-2 border-gray-200 text-gray-700 hover:border-emerald-300 hover:shadow-md"
												}`}
											>
												{type.label}
											</button>
										))}
									</div>
								</div>
							)}

							{/* Instrument Name */}
							{selectedInstrumentType && (
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Instrument Name *</label>
									<input
										value={form.name}
										onChange={(e) => setForm({ ...form, name: e.target.value })}
										required
										className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
										placeholder="Enter instrument name"
									/>
								</div>
							)}

							{/* Amount/Units Input */}
							{selectedInstrumentType && form.name && (
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
									<input
										type="number"
										value={form.investedAmount}
										onChange={(e) => setForm({ ...form, investedAmount: e.target.value })}
										required
										className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
										placeholder="Enter invested amount"
									/>
								</div>
							)}

							{/* Form Actions */}
							<div className="flex items-center justify-between pt-6 border-t border-gray-200">
								<div className="flex items-center gap-3">
									<button
										type="button"
										onClick={() => { setIsModalOpen(false); resetForm(); }}
										className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={resetForm}
										className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
									>
										Reset Form
									</button>
								</div>
								<button
									type="submit"
									className="min-w-[180px] px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
								>
									{editingId ? "Save Changes" : "Add Holding"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}