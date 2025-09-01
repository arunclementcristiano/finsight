"use client";
import React, { useMemo, useState } from "react";
import { useApp, type Holding } from "../../../store";
import type { AssetClass } from "../../domain/allocationEngine";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Plus, Edit2, Trash2, X, Search, TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Card as PlanCard, CardContent as PlanCardContent, CardHeader as PlanCardHeader, CardTitle as PlanCardTitle } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { fetchMutualFundSchemes, searchFundsByName, TransformedFund, saveHolding, fetchUserHoldings, HoldingData } from "../../../../lib/dynamodb";

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
	
	// Filter state
	const [filterAssetClass, setFilterAssetClass] = useState<string | null>(null);
	const [filterAssetRole, setFilterAssetRole] = useState<string | null>(null);
	
	// New state for asset class-based flow
	const [selectedRole, setSelectedRole] = useState<'Stocks' | 'Mutual Funds' | 'ETF' | 'Gold' | 'Real Estate' | null>(null);
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
		currentValue: "",
		propertyType: ""
	});
	


	// Mutual Fund functionality
	const [mfSearchTerm, setMfSearchTerm] = useState("");
	const [selectedMF, setSelectedMF] = useState<TransformedFund | null>(null);
	const [mfOptions, setMfOptions] = useState<TransformedFund[]>([]);
	const [filteredMFOptions, setFilteredMFOptions] = useState<TransformedFund[]>([]);
	const [showMFDropdown, setShowMFDropdown] = useState(false);
	const [mfCalculatedUnits, setMfCalculatedUnits] = useState<number | null>(null);
	const [mfCurrentValue, setMfCurrentValue] = useState<number | null>(null);
	const [mfGainLoss, setMfGainLoss] = useState<number | null>(null);
	const [mfGainLossPercent, setMfGainLossPercent] = useState<number | null>(null);

	// Load mutual fund and ETF data directly from DynamoDB
	React.useEffect(() => {
		async function loadMFData() {
			try {
				const funds = await fetchMutualFundSchemes();
				setMfOptions(funds);
				console.log('Loaded funds directly from DynamoDB:', funds);
			} catch (error) {
				console.error('Error loading MF data from DynamoDB:', error);
				// Fallback to mock data if DynamoDB fails
				loadMockData();
			}
		}

		function loadMockData() {
			const mockFunds: TransformedFund[] = [
				{ schemeCode: 'MOCK001', name: 'HDFC Mid-Cap Opportunities Fund', fullName: 'HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth', currentNAV: 45.67, fundType: 'Equity MF', allocationClass: 'Equity', isETF: false },
				{ schemeCode: 'MOCK002', name: 'ICICI Prudential Bluechip Fund', fullName: 'ICICI Prudential Bluechip Fund - Direct Plan - Growth', currentNAV: 52.34, fundType: 'Equity MF', allocationClass: 'Equity', isETF: false },
				{ schemeCode: 'MOCK003', name: 'SBI Gold Fund', fullName: 'SBI Gold Fund - Direct Plan - Growth', currentNAV: 23.45, fundType: 'Gold MF', allocationClass: 'Gold', isETF: false },
				{ schemeCode: 'ETF001', name: 'NIFTY 50 ETF', fullName: 'NIFTY 50 ETF - Direct Plan - Growth', currentNAV: 185.67, fundType: 'Equity ETF', allocationClass: 'Equity', isETF: true },
				{ schemeCode: 'ETF002', name: 'GOLD ETF', fullName: 'GOLD ETF - Direct Plan - Growth', currentNAV: 45.23, fundType: 'Gold ETF', allocationClass: 'Gold', isETF: true }
			];
			
			// Sort by name for better UX
			mockFunds.sort((a, b) => a.name.localeCompare(b.name));
			setMfOptions(mockFunds);
			console.log('Using mock data as fallback');
		}
		
		loadMFData();
	}, []);

	// Load holdings from DynamoDB
	React.useEffect(() => {
		async function loadHoldingsData() {
			try {
				// For now, using a mock user ID. In production, this should come from user authentication
				const mockUserId = 'user-123';
				const dbHoldings = await fetchUserHoldings(mockUserId);
				
				// Transform DynamoDB holdings to local state format
				const transformedHoldings = dbHoldings.map(dbHolding => ({
					id: dbHolding.id,
					instrumentClass: dbHolding.instrumentClass as AssetClass,
					name: dbHolding.name,
					symbol: dbHolding.symbol,
					units: dbHolding.units,
					price: dbHolding.price,
					investedAmount: dbHolding.investedAmount,
					currentValue: dbHolding.currentValue
				}));
				
				// Update local state with DynamoDB data
				transformedHoldings.forEach(holding => {
					// Check if holding already exists to avoid duplicates
					const existingIndex = holdings.findIndex(h => h.id === holding.id);
					if (existingIndex === -1) {
						addHolding(holding);
					}
				});
				
				console.log('Loaded holdings from DynamoDB:', transformedHoldings);
			} catch (error) {
				console.error('Error loading holdings from DynamoDB:', error);
				// Continue with local state if DynamoDB fails
			}
		}
		
		loadHoldingsData();
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

	const filterMFOptions = async (term: string): Promise<void> => {
		if (term.trim() === "") {
			setFilteredMFOptions([]);
			setShowMFDropdown(false);
		} else {
			try {
				// Determine ETF status based on selected role
				let isETF: boolean | undefined;
				if (selectedRole === 'Mutual Funds') {
					isETF = false;
				} else if (selectedRole === 'ETF') {
					isETF = true;
				}
				
				// Search funds directly from DynamoDB with filtering
				const filtered = await searchFundsByName(term, isETF);
				setFilteredMFOptions(filtered);
				setShowMFDropdown(filtered.length > 0);
			} catch (error) {
				console.error('Error searching funds:', error);
				// Fallback to local filtering if DynamoDB search fails
				let filtered = mfOptions;
				
				if (selectedRole === 'Mutual Funds') {
					filtered = mfOptions.filter(option => !option.isETF);
				} else if (selectedRole === 'ETF') {
					filtered = mfOptions.filter(option => option.isETF);
				}
				
				filtered = filtered.filter(option =>
					option.name.toLowerCase().includes(term.toLowerCase()) ||
					option.fullName.toLowerCase().includes(term.toLowerCase())
				);
				
				setFilteredMFOptions(filtered.slice(0, 10));
				setShowMFDropdown(filtered.length > 0);
			}
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



	// Filter holdings based on selected filters
	const filteredHoldings = useMemo(() => {
		if (!holdings) return [];
		
		return holdings.filter(holding => {
			const matchesAssetClass = !filterAssetClass || holding.instrumentClass === filterAssetClass;
			const matchesAssetRole = !filterAssetRole || getRoleForAssetClass(holding.instrumentClass) === filterAssetRole;
			return matchesAssetClass && matchesAssetRole;
		});
	}, [holdings, filterAssetClass, filterAssetRole]);

	// Calculate totals for KPI cards - using filtered data
	const totalValue = useMemo(() => (filteredHoldings || []).reduce((s: number, h: Holding) => s + computeHoldingValue(h), 0), [filteredHoldings]);
	const totalInvested = useMemo(() => (filteredHoldings || []).reduce((s: number, h: Holding) => s + computeInvestedAmount(h), 0), [filteredHoldings]);
	const totalPL = useMemo(() => totalValue - totalInvested, [totalValue, totalInvested]);
	const totalPLPct = useMemo(() => (totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0), [totalPL, totalInvested]);

	// Portfolio allocation data for pie chart
	const portfolioAllocationData = useMemo(() => {
		if (!filteredHoldings || filteredHoldings.length === 0) return [];
		
		const allocationMap = new Map<string, number>();
		
		filteredHoldings.forEach(holding => {
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
	}, [filteredHoldings]);

	// Portfolio role allocation data for pie chart
	const portfolioRoleData = useMemo(() => {
		if (!filteredHoldings || filteredHoldings.length === 0) return [];

		const roleMap = new Map<string, number>();

		filteredHoldings.forEach(holding => {
			const role = getRoleForAssetClass(holding.instrumentClass);
			const currentValue = computeHoldingValue(holding);
			roleMap.set(role, (roleMap.get(role) || 0) + currentValue);
		});

		const roleArray = Array.from(roleMap.entries()).map(([name, value]) => ({
			name,
			value,
			color: name === 'Equity' ? '#3B82F6' : name === 'Defensive' ? '#10B981' : '#F59E0B'
		})).sort((a, b) => b.value - a.value);

		return roleArray;
	}, [filteredHoldings]);

	// Pagination logic
	const totalPages = Math.ceil((filteredHoldings?.length || 0) / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentHoldings = filteredHoldings?.slice(startIndex, endIndex) || [];

	// Reset to first page when holdings change
	React.useEffect(() => {
		setCurrentPage(1);
	}, [holdings?.length]);

	function resetForm() {
		setForm({ instrumentClass: "Stocks", name: "", symbol: "", units: "", price: "", investedAmount: "", currentValue: "", propertyType: "" });
		setEditingId(null);
		// Reset stock functionality
		setStockSearchTerm("");
		setSelectedStock(null);
		setFilteredStockOptions([]);
		setShowStockDropdown(false);
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

	async function submitForm(e: React.FormEvent) {
		e.preventDefault();
		
		if (!form.name.trim()) return;
		
		// Map selected asset class to instrument class
		let instrumentClass: AssetClass = "Stocks";
		let allocationClass: string | undefined;
		
		if (selectedRole === 'Stocks') instrumentClass = "Stocks";
		else if (selectedRole === 'Mutual Funds') instrumentClass = "Mutual Funds";
		else if (selectedRole === 'ETF') {
			// For ETFs, use the allocation_class from the selected fund
			if (selectedMF && selectedMF.allocationClass) {
				instrumentClass = selectedMF.allocationClass as AssetClass;
				allocationClass = selectedMF.allocationClass;
			} else {
				instrumentClass = "Stocks"; // Default fallback
			}
		}
		else if (selectedRole === 'Gold') instrumentClass = "Gold";
		else if (selectedRole === 'Real Estate') instrumentClass = "Real Estate";
		
		const holding: Holding = {
			id: editingId || uuidv4(),
			instrumentClass: instrumentClass,
			name: form.name.trim(),
			symbol: form.symbol.trim() || undefined,
			units: form.units ? parseFloat(form.units) : undefined,
			price: form.price ? parseFloat(form.price) : undefined,
			investedAmount: form.investedAmount ? parseFloat(form.investedAmount) : undefined,
			currentValue: form.currentValue ? parseFloat(form.currentValue) : undefined
		};
		
		try {
			// Save to DynamoDB
			const dbHolding: HoldingData = {
				id: holding.id,
				user_id: 'user-123', // Mock user ID - should come from authentication
				instrumentClass: holding.instrumentClass,
				name: holding.name,
				symbol: holding.symbol,
				units: holding.units,
				price: holding.price,
				investedAmount: holding.investedAmount,
				currentValue: holding.currentValue,
				allocation_class: allocationClass,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			};
			
			await saveHolding(dbHolding);
			
			// Update local state
			if (editingId) {
				updateHolding(editingId, holding);
			} else {
				addHolding(holding);
			}
			
			setIsModalOpen(false);
			resetForm();
		} catch (error) {
			console.error('Error saving holding to DynamoDB:', error);
			// Still update local state even if DynamoDB save fails
			if (editingId) {
				updateHolding(editingId, holding);
			} else {
				addHolding(holding);
			}
			
			setIsModalOpen(false);
			resetForm();
		}
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
			currentValue: holding.currentValue?.toString() || "",
			propertyType: (holding as any).propertyType || ""
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
					<h1 className="text-lg font-semibold tracking-tight">Holdings</h1>
					<p className="text-sm text-muted-foreground">Capture your investments and view allocation.</p>
				</div>
				<Button 
					onClick={() => setIsModalOpen(true)} 
					variant="outline" 
					size="md"
					leftIcon={<Plus size={18} />}
				>
					Add Holding
				</Button>
			</div>
			
			{/* KPI Row */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
				<PlanCard>
					<PlanCardContent className="p-3 text-center">
						<div className="text-xs text-muted-foreground mb-1">Total Value</div>
						<div className="text-lg font-semibold text-foreground mb-1">₹{Math.round(totalValue).toLocaleString()}</div>
						<div className="text-[10px] text-muted-foreground">Portfolio Worth</div>
					</PlanCardContent>
				</PlanCard>
				<PlanCard>
					<PlanCardContent className="p-3 text-center">
						<div className="text-xs text-muted-foreground mb-1">Invested</div>
						<div className="text-lg font-semibold text-foreground mb-1">₹{Math.round(totalInvested).toLocaleString()}</div>
						<div className="text-[10px] text-muted-foreground">Capital Deployed</div>
					</PlanCardContent>
				</PlanCard>
				<PlanCard>
					<PlanCardContent className="p-3 text-center">
						<div className="text-xs text-muted-foreground mb-1">P/L</div>
						<div className={`text-lg font-semibold mb-1 ${totalPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
							₹{Math.round(totalPL).toLocaleString()}
						</div>
						<div className="text-[10px] text-muted-foreground">Profit/Loss</div>
					</PlanCardContent>
				</PlanCard>
				<PlanCard>
					<PlanCardContent className="p-3 text-center">
						<div className="text-xs text-muted-foreground mb-1">P/L %</div>
						<div className={`text-lg font-semibold mb-1 ${totalPLPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
							{totalPLPct >= 0 ? `${totalPLPct.toFixed(2)}%` : "—"}
						</div>
						<div className="text-[10px] text-muted-foreground">Return %</div>
					</PlanCardContent>
				</PlanCard>
			</div>

			{/* Holdings Table and Charts - Side by Side */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
				{/* Holdings Table - Takes 2 columns */}
				<div className="lg:col-span-2">
					<PlanCard>
						<PlanCardHeader className="px-4 py-3 border-b border-border">
							<PlanCardTitle className="text-sm font-medium flex items-center gap-2">
								<BarChart3 size={16} />
								All Holdings
							</PlanCardTitle>
						</PlanCardHeader>
						<PlanCardContent className="p-4">
						{/* Filters */}
						<div className="mb-4 flex flex-wrap gap-3">
							<div className="flex items-center gap-2">
								<label className="text-xs font-medium text-muted-foreground">Asset Class:</label>
								<select
									value={filterAssetClass || ''}
									onChange={(e) => setFilterAssetClass(e.target.value || null)}
									className="px-3 py-1.5 text-xs border border-border rounded-md bg-background"
								>
									<option value="">All Classes</option>
									<option value="Stocks">Stocks</option>
									<option value="Mutual Funds">Mutual Funds</option>
									<option value="Gold">Gold</option>
									<option value="Real Estate">Real Estate</option>
									<option value="Debt">Debt</option>
									<option value="Liquid">Liquid</option>
								</select>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-xs font-medium text-muted-foreground">Asset Role:</label>
								<select
									value={filterAssetRole || ''}
									onChange={(e) => setFilterAssetRole(e.target.value || null)}
									className="px-3 py-1.5 text-xs border border-border rounded-md bg-background"
								>
									<option value="">All Roles</option>
									<option value="Equity">Equity</option>
									<option value="Defensive">Defensive</option>
									<option value="Satellite">Satellite</option>
								</select>
							</div>
						</div>
						
						{holdings && holdings.length > 0 ? (
							<div>
								<div className="rounded-xl border border-border overflow-auto">
									<table className="w-full text-left text-xs">
										<thead className="bg-card sticky top-0 z-10">
											<tr>
												<th className="py-2 px-3 text-muted-foreground">Instrument</th>
												<th className="py-2 px-3 text-muted-foreground">Class/Role</th>
												<th className="py-2 px-3 text-muted-foreground">Units</th>
												<th className="py-2 px-3 text-muted-foreground">Price</th>
												<th className="py-2 px-3 text-muted-foreground text-right">Current Value</th>
												<th className="py-2 px-3 text-muted-foreground text-right">Invested Amount</th>
												<th className="py-2 px-3 text-muted-foreground text-right">P/L</th>
												<th className="py-2 px-3 text-muted-foreground">Actions</th>
											</tr>
										</thead>
										<tbody>
											{currentHoldings.map((holding) => {
												const currentValue = computeHoldingValue(holding);
												const investedAmount = computeInvestedAmount(holding);
												const pl = currentValue - investedAmount;
												const plPercent = investedAmount > 0 ? (pl / investedAmount) * 100 : 0;
												
												return (
													<tr key={holding.id} className="border-t border-border/50">
														<td className="py-2 px-3 font-medium">
															<div>
																<div className="text-foreground">{holding.name}</div>
																{holding.symbol && (
																	<div className="text-muted-foreground">{holding.symbol}</div>
																)}
															</div>
														</td>
														<td className="py-2 px-3">
															<div className="space-y-1">
																<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
																	CLASS_COLORS[holding.instrumentClass as keyof typeof CLASS_COLORS]?.bg || 'bg-gray-100 dark:bg-gray-800'
																} ${
																	CLASS_COLORS[holding.instrumentClass as keyof typeof CLASS_COLORS]?.text || 'text-gray-700 dark:text-gray-300'
																}`}>
																	{holding.instrumentClass}
																</span>
																<div className="text-xs text-muted-foreground">
																	{getRoleForAssetClass(holding.instrumentClass)}
																</div>
															</div>
														</td>
														<td className="py-2 px-3">{holding.units?.toFixed(2) || '0.00'}</td>
														<td className="py-2 px-3">₹{holding.price?.toLocaleString() || '0.00'}</td>
														<td className="py-2 px-3 text-right">₹{currentValue.toLocaleString()}</td>
														<td className="py-2 px-3 text-right">₹{investedAmount.toLocaleString()}</td>
														<td className="py-2 px-3 text-right">
															<div className={`${pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
																₹{pl.toLocaleString()}
															</div>
															<div className={`text-[10px] ${pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
																{plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%
															</div>
														</td>
														<td className="py-2 px-3">
															<div className="flex items-center gap-2">
																<button 
																	onClick={() => openEdit(holding)} 
																	className="p-1 rounded hover:bg-muted transition-colors text-blue-600 hover:text-blue-700"
																	title="Edit"
																>
																	<Edit2 size={14} />
																</button>
																<button 
																	onClick={() => handleDeleteHolding(holding.id)} 
																	className="p-1 rounded hover:bg-muted transition-colors text-rose-600 hover:text-rose-700"
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
											Showing {startIndex + 1} to {Math.min(endIndex, filteredHoldings.length)} of {filteredHoldings.length} holdings
											{filteredHoldings.length !== holdings.length && (
												<span className="ml-2 text-blue-600">(filtered from {holdings.length} total)</span>
											)}
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
					</PlanCardContent>
				</PlanCard>
				</div>

				{/* Charts Section - Right Side */}
				<div className="lg:col-span-1 space-y-6">
					{/* Asset Class Chart */}
					<PlanCard>
						<PlanCardHeader className="px-4 py-3 border-b border-border">
							<PlanCardTitle className="text-sm font-medium flex items-center gap-2">
								<PieChartIcon size={16} />
								Asset Class
							</PlanCardTitle>
						</PlanCardHeader>
						<PlanCardContent className="p-4">
							{holdings && holdings.length > 0 ? (
								<div className="space-y-4">
									<div className="h-32 flex items-center justify-center">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={portfolioAllocationData}
													cx="50%"
													cy="50%"
													innerRadius={20}
													outerRadius={50}
													paddingAngle={2}
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
											<div key={index} className="flex items-center justify-between text-xs">
												<div className="flex items-center gap-2">
													<div 
														className="w-2 h-2 rounded-full" 
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
							) : (
								<div className="text-center py-8 text-muted-foreground">
									<div className="text-2xl mb-2">📊</div>
									<div className="text-sm">No data to display</div>
								</div>
							)}
						</PlanCardContent>
					</PlanCard>

					{/* Portfolio Role Chart - Bar Chart */}
					<PlanCard>
						<PlanCardHeader className="px-4 py-3 border-b border-border">
							<PlanCardTitle className="text-sm font-medium flex items-center gap-2">
								<BarChart3 size={16} />
								Portfolio Role
							</PlanCardTitle>
						</PlanCardHeader>
						<PlanCardContent className="p-4">
							{holdings && holdings.length > 0 ? (
								<div className="space-y-4">
									<div className="h-32 flex items-center justify-center">
										<ResponsiveContainer width="100%" height="100%">
											<BarChart data={portfolioRoleData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
												<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
												<XAxis 
													dataKey="name" 
													tick={{ fontSize: 10 }}
													axisLine={false}
													tickLine={false}
												/>
												<YAxis 
													tick={{ fontSize: 10 }}
													axisLine={false}
													tickLine={false}
													tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
												/>
												<Tooltip 
													formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Value']}
													contentStyle={{
														backgroundColor: 'hsl(var(--card))',
														border: '1px solid hsl(var(--border))',
														borderRadius: '8px',
														boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
													}}
												/>
												{portfolioRoleData.map((entry, index) => (
													<Bar key={entry.name} dataKey="value" fill={entry.color} radius={[2, 2, 0, 0]} xAxisId={0} />
												))}
											</BarChart>
										</ResponsiveContainer>
									</div>
									
									{/* Portfolio Role Summary */}
									<div className="space-y-2">
										{portfolioRoleData.map((item, index) => (
											<div key={index} className="flex items-center justify-between text-xs">
												<div className="flex items-center gap-2">
													<div 
														className="w-2 h-2 rounded-full" 
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
							) : (
								<div className="text-center py-8 text-muted-foreground">
									<div className="text-2xl mb-2">📊</div>
									<div className="text-sm">No data to display</div>
								</div>
							)}
						</PlanCardContent>
					</PlanCard>
				</div>
			</div>

			{/* Add/Edit Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50">
					<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); resetForm(); }} />
					<div className="absolute inset-x-4 top-16 mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
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
						
						{/* Asset Class Selection - Top Row */}
						<div className="px-6 py-3 border-b border-border">
							<div className="text-center">
								<label className="block text-sm font-medium text-foreground mb-3 flex items-center justify-center gap-2">
									<BarChart3 size={16} />
									Asset Class
								</label>
								<div className="flex items-center justify-center gap-3">
									{(['Stocks', 'Mutual Funds', 'ETF', 'Gold', 'Real Estate'] as const).map(assetClass => (
										<button
											key={assetClass}
											type="button"
											onClick={() => {
												setSelectedRole(assetClass as any);
												setSelectedInstrumentType(null);
												setForm({ ...form, name: "", symbol: "" });
											}}
											className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform ${
												selectedRole === assetClass
													? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105 ring-2 ring-blue-500/30"
													: "bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-102"
											}`}
										>
											{assetClass}
										</button>
									))}
								</div>
							</div>
						</div>
						
						<div className="min-h-[300px]">
							{/* Form Column - Full Width */}
							<div className="w-full p-4">
								{selectedRole ? (
									<form onSubmit={submitForm} className="space-y-6">
										{/* Stocks Form */}
										{selectedRole === 'Stocks' && (
											<>
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Stock Name *</label>
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
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Symbol (Optional)</label>
													<input
														value={form.symbol || ''}
														onChange={(e) => setForm({ ...form, symbol: e.target.value })}
														className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
														placeholder="e.g., RELIANCE, TCS"
													/>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Units/Quantity *</label>
													<input
														type="number"
														value={form.units || ''}
														onChange={(e) => setForm({ ...form, units: e.target.value })}
														required
														className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
														placeholder="0"
														step="0.01"
													/>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Current Price per Unit *</label>
													<div className="relative">
														<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground">₹</span>
														<input
															type="number"
															value={form.price || ''}
															onChange={(e) => setForm({ ...form, price: e.target.value })}
															required
															className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
															placeholder="0.00"
															step="0.01"
														/>
													</div>
												</div>

												{/* Auto-calculated Holding Value */}
												{form.units && form.price && (
													<div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
														<div className="text-sm font-medium text-blue-700 dark:text-blue-300">Holding Value</div>
														<div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
															₹{(parseFloat(form.units) * parseFloat(form.price)).toLocaleString()}
														</div>
														<div className="text-xs text-blue-600 dark:text-blue-400">
															{form.units} units × ₹{form.price} = ₹{(parseFloat(form.units) * parseFloat(form.price)).toLocaleString()}
														</div>
													</div>
												)}
											</>
										)}

																																{/* Mutual Funds Form */}
										{selectedRole === 'Mutual Funds' && (
											<>
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Fund Name *</label>
													<div className="relative">
														<input
															value={mfSearchTerm}
															onChange={async (e) => {
																setMfSearchTerm(e.target.value);
																await filterMFOptions(e.target.value);
															}}
															onFocus={async () => await filterMFOptions(mfSearchTerm)}
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
															setForm({ ...form, name: fund.name, symbol: fund.schemeCode, price: fund.currentNAV.toString() });
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
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Investment Amount *</label>
													<div className="relative">
														<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground">₹</span>
														<input
															type="number"
															value={form.investedAmount || ''}
															onChange={(e) => setForm({ ...form, investedAmount: e.target.value })}
															required
															className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
															placeholder="0.00"
															step="0.01"
														/>
													</div>
												</div>

												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Current NAV *</label>
													<div className="relative">
														<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground">₹</span>
														<input
															type="number"
															value={form.price || ''}
															onChange={(e) => setForm({ ...form, price: e.target.value })}
															required
															className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
															placeholder="0.00"
															step="0.01"
														/>
													</div>
												</div>

												{/* Auto-calculated Units and Holding Value */}
												{form.investedAmount && form.price && (
													<div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
														<div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Calculated Details</div>
														<div className="grid grid-cols-2 gap-4 mt-2">
															<div>
																<div className="text-xs text-emerald-600 dark:text-emerald-400">Units</div>
																<div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
																	{(parseFloat(form.investedAmount) / parseFloat(form.price)).toFixed(4)}
																</div>
															</div>
															<div>
																<div className="text-xs text-emerald-600 dark:text-emerald-400">Holding Value</div>
																<div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
																	₹{parseFloat(form.investedAmount).toLocaleString()}
																</div>
															</div>
														</div>
														<div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
															₹{form.investedAmount} ÷ ₹{form.price} = {(parseFloat(form.investedAmount) / parseFloat(form.price)).toFixed(4)} units
														</div>
													</div>
												)}
											</>
										)}

										{/* ETF Form */}
										{selectedRole === 'ETF' && (
											<>
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">ETF Name *</label>
													<div className="relative">
														<input
															value={mfSearchTerm}
															onChange={async (e) => {
																setMfSearchTerm(e.target.value);
																await filterMFOptions(e.target.value);
															}}
															onFocus={async () => await filterMFOptions(mfSearchTerm)}
															className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
															placeholder="Search for ETFs..."
														/>
														{showMFDropdown && (
															<div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
																{filteredMFOptions.map((fund) => (
																	<div
																		key={fund.schemeCode}
																		onClick={() => {
																			setSelectedMF(fund);
																			setMfSearchTerm(fund.name);
																			setForm({ ...form, name: fund.name, symbol: fund.schemeCode, price: fund.currentNAV.toString() });
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
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Units *</label>
													<input
														type="number"
														value={form.units || ''}
														onChange={(e) => setForm({ ...form, units: e.target.value })}
														required
														className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
														placeholder="0"
														step="0.01"
													/>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Current Price per Unit *</label>
													<div className="relative">
														<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
														<input
															type="number"
															value={form.price || ''}
															onChange={(e) => setForm({ ...form, price: e.target.value })}
															required
															className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
															placeholder="0.00"
															step="0.01"
														/>
													</div>
												</div>

												{/* Auto-calculated Holding Value for ETF */}
												{form.units && form.price && (
													<div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
														<div className="text-sm font-medium text-purple-700 dark:text-purple-300">Holding Value</div>
														<div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
															₹{(parseFloat(form.units) * parseFloat(form.price)).toLocaleString()}
														</div>
														<div className="text-xs text-purple-600 dark:text-purple-400">
															{form.units} units × ₹{form.price} = ₹{(parseFloat(form.units) * parseFloat(form.price)).toLocaleString()}
														</div>
													</div>
												)}
											</>
										)}

										{/* Gold Form */}
										{selectedRole === 'Gold' && (
											<>
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Gold Type *</label>
													<input
														value={form.name}
														onChange={(e) => setForm({ ...form, name: e.target.value })}
														required
														className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
														placeholder="e.g., Physical Gold, Gold Coins, Gold Bars"
													/>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Quantity (grams) *</label>
													<input
														type="number"
														value={form.units || ''}
														onChange={(e) => setForm({ ...form, units: e.target.value })}
														required
														className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
														placeholder="0"
														step="0.01"
													/>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Current Price per Unit *</label>
													<div className="relative">
														<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground">₹</span>
														<input
															type="number"
															value={form.price || ''}
															onChange={(e) => setForm({ ...form, price: e.target.value })}
															required
															className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
															placeholder="0.00"
															step="0.01"
														/>
													</div>
												</div>

												{/* Auto-calculated Holding Value for Gold */}
												{form.units && form.price && (
													<div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
														<div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Holding Value</div>
														<div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
															₹{(parseFloat(form.units) * parseFloat(form.price)).toLocaleString()}
														</div>
														<div className="text-xs text-yellow-600 dark:text-yellow-400">
															{form.units} grams × ₹{form.price} = ₹{(parseFloat(form.units) * parseFloat(form.price)).toLocaleString()}
														</div>
													</div>
												)}
											</>
										)}

										{/* Real Estate Form */}
										{selectedRole === 'Real Estate' && (
											<>
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Property Name *</label>
													<input
														value={form.name}
														onChange={(e) => setForm({ ...form, name: e.target.value })}
														required
														className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
														placeholder="Enter property name"
													/>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Property Type *</label>
													<select
														value={form.propertyType || ''}
														onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
														required
														className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
													>
														<option value="">Select property type</option>
														<option value="Residential">Residential</option>
														<option value="Commercial">Commercial</option>
														<option value="Land">Land</option>
														<option value="REIT">REIT</option>
													</select>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Investment Amount *</label>
													<div className="relative">
														<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground">₹</span>
														<input
															type="number"
															value={form.investedAmount || ''}
															onChange={(e) => setForm({ ...form, investedAmount: e.target.value })}
															required
															className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
															placeholder="0.00"
															step="0.01"
														/>
													</div>
												</div>
											</>
										)}

										{/* Simple KPI-style Holding Summary */}
										{selectedRole && form.name && (
											<div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl border border-border">
												<div className="text-center">
													<div className="text-xs text-muted-foreground mb-1">Instrument</div>
													<div className="text-sm font-semibold text-foreground">{form.name}</div>
													<div className="text-xs text-muted-foreground">{selectedRole}</div>
												</div>
												<div className="text-center">
													<div className="text-xs text-muted-foreground mb-1">Value</div>
													<div className="text-lg font-bold text-foreground">
														{(() => {
															if (selectedRole === 'Stocks' && form.units && form.price) {
																return `₹${(parseFloat(form.units) * parseFloat(form.price)).toLocaleString()}`;
															} else if (selectedRole === 'Mutual Funds' && form.investedAmount) {
																return `₹${parseFloat(form.investedAmount).toLocaleString()}`;
															} else if (selectedRole === 'ETF' && form.units && form.price) {
																return `₹${(parseFloat(form.units) * parseFloat(form.price)).toLocaleString()}`;
															} else if (selectedRole === 'Gold' && form.units && form.price) {
																return `₹${(parseFloat(form.units) * parseFloat(form.price)).toLocaleString()}`;
															} else if (selectedRole === 'Real Estate' && form.investedAmount) {
																return `₹${parseFloat(form.investedAmount).toLocaleString()}`;
															}
															return '₹0';
														})()}
													</div>
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