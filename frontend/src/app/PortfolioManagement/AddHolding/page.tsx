'use client';
import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

const ASSET_CLASSES = [
	{ id: 'stocks', label: 'Stocks' },
			{ id: 'mutual_funds', label: 'Mutual Funds' },
	{ id: 'debt', label: 'Debt' },
	{ id: 'liquid', label: 'Liquid' },
	{ id: 'gold', label: 'Gold' },
	{ id: 'real_estate', label: 'Real Estate' }
] as const;

type AssetClassId = typeof ASSET_CLASSES[number]['id'];

type DebtOption = 'bonds' | 'debt_mf';
type LiquidOption = 'cash' | 'liquid_mf';
type GoldOption = 'gold_etf' | 'gold_mf' | 'physical_gold';
type RealEstateOption = 'reit' | 'property';

export default function AddHolding() {
	const [selectedClass, setSelectedClass] = useState<AssetClassId>('stocks');
	const [debtType, setDebtType] = useState<DebtOption>('bonds');
	const [liquidType, setLiquidType] = useState<LiquidOption>('cash');
	const [goldType, setGoldType] = useState<GoldOption>('gold_etf');
	const [reType, setReType] = useState<RealEstateOption>('reit');

	// Shared minimal form state
	const [name, setName] = useState('');
	const [symbol, setSymbol] = useState('');
	const [investedAmount, setInvestedAmount] = useState('');
	const [currentValue, setCurrentValue] = useState('');
	const [units, setUnits] = useState('');
	const [price, setPrice] = useState('');

	// Stocks autocomplete
	const [stockSearchTerm, setStockSearchTerm] = useState('');
	const [selectedStock, setSelectedStock] = useState<{ name: string; symbol: string; currentPrice?: number } | null>(null);
	const stockOptions: { name: string; symbol: string; currentPrice: number }[] = [
		{ name: 'Reliance Industries Ltd', symbol: 'RELIANCE', currentPrice: 2720 },
		{ name: 'Tata Consultancy Services Ltd', symbol: 'TCS', currentPrice: 3850 },
		{ name: 'HDFC Bank Ltd', symbol: 'HDFCBANK', currentPrice: 1650 },
		{ name: 'Infosys Ltd', symbol: 'INFY', currentPrice: 1820 }
	];
	const [filteredStockOptions, setFilteredStockOptions] = useState<typeof stockOptions>([]);
	const [showStockDropdown, setShowStockDropdown] = useState(false);
	const [stockEntryMode, setStockEntryMode] = useState<'units'|'amount'>('units');

	function filterStockOptions(term: string) {
		if (!term.trim()) { setFilteredStockOptions([]); setShowStockDropdown(false); return; }
		const filtered = stockOptions.filter(o => o.name.toLowerCase().includes(term.toLowerCase()) || o.symbol.toLowerCase().includes(term.toLowerCase()));
		setFilteredStockOptions(filtered.slice(0, 10));
		setShowStockDropdown(filtered.length > 0);
	}

			// Mutual Funds autocomplete (Direct Plan – Growth)
	const [mfSearchTerm, setMfSearchTerm] = useState('');
	const [selectedMF, setSelectedMF] = useState<{ name: string; schemeCode: string; currentNAV?: number; fullName?: string } | null>(null);
	const [mfOptions, setMfOptions] = useState<any[]>([]);
	const [filteredMFOptions, setFilteredMFOptions] = useState<any[]>([]);
	const [showMFDropdown, setShowMFDropdown] = useState(false);
	const [mfCalculatedUnits, setMfCalculatedUnits] = useState<number | null>(null);
	const [mfCurrentValue, setMfCurrentValue] = useState<number | null>(null);
	const [mfGainLoss, setMfGainLoss] = useState<number | null>(null);
	const [mfGainLossPercent, setMfGainLossPercent] = useState<number | null>(null);

	useEffect(() => {
		async function loadMFData() {
			try {
				const res = await fetch('/navall.txt');
				const text = await res.text();
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
								funds.push({ schemeCode, name: schemeName.replace(/- Direct Plan.*Growth/i, '').trim(), fullName: schemeName, currentNAV: nav });
							}
						}
					}
				}
				funds.sort((a, b) => a.name.localeCompare(b.name));
				setMfOptions(funds);
			} catch {}
		}
		loadMFData();
	}, []);

	function filterMFOptions(term: string) {
		if (!term.trim()) { setFilteredMFOptions([]); setShowMFDropdown(false); return; }
		const filtered = mfOptions.filter(o => o.name.toLowerCase().includes(term.toLowerCase()) || (o.fullName||'').toLowerCase().includes(term.toLowerCase()));
		setFilteredMFOptions(filtered.slice(0, 10));
		setShowMFDropdown(filtered.length > 0);
	}

	useEffect(() => {
		if (selectedMF && investedAmount && selectedMF.currentNAV) {
			const amt = parseFloat(investedAmount);
			if (!isNaN(amt) && amt > 0) {
				const unitsCalc = amt / selectedMF.currentNAV;
				const currVal = unitsCalc * selectedMF.currentNAV;
				const gain = currVal - amt;
				const gainPct = (gain / amt) * 100;
				setMfCalculatedUnits(unitsCalc);
				setMfCurrentValue(currVal);
				setMfGainLoss(gain);
				setMfGainLossPercent(gainPct);
				setCurrentValue(currVal.toFixed(2));
			}
		}
	}, [selectedMF, investedAmount]);

	return (
		<div className="max-w-full space-y-4 pl-2">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="text-sm text-muted-foreground">Add Holding</div>
				</div>
			</div>

			{/* Segmented control */}
			<div className="flex flex-wrap gap-2 mb-6">
				{ASSET_CLASSES.map(opt => (
					<button key={opt.id} onClick={() => setSelectedClass(opt.id)} className={`h-9 px-3 rounded-lg text-sm transition-colors border ${selectedClass===opt.id ? 'bg-muted text-foreground border-border' : 'bg-background text-foreground border-border hover:bg-muted'}`} aria-pressed={selectedClass===opt.id}>{opt.label}</button>
				))}
			</div>

			{/* Stocks */}
			{selectedClass === 'stocks' && (
				<div className="rounded-xl border border-border bg-card p-4 space-y-4">
					<h2 className="text-sm font-medium text-foreground">Stocks</h2>
					<div className="relative">
						<label className="block text-xs text-muted-foreground mb-2">Search Stock (Name / Symbol) *</label>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
							<input value={stockSearchTerm} onChange={e => { setStockSearchTerm(e.target.value); filterStockOptions(e.target.value); }} onFocus={()=> stockSearchTerm && filterStockOptions(stockSearchTerm)} onBlur={()=> setTimeout(()=> setShowStockDropdown(false), 200)} placeholder="Start typing stock name or symbol..." className="w-full pl-10 pr-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm" />
							{showStockDropdown && filteredStockOptions.length>0 && (
								<div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
									{filteredStockOptions.map(opt => (
										<div key={opt.symbol} onClick={()=> { setSelectedStock(opt); setStockSearchTerm(opt.name); setName(opt.name); setSymbol(opt.symbol); setShowStockDropdown(false); if (!price) setPrice(String(opt.currentPrice)); }} className="px-4 py-3 cursor-pointer hover:bg-muted text-sm border-b border-border last:border-b-0 flex items-center justify-between">
											<div>
												<div className="font-medium text-foreground">{opt.name}</div>
												<div className="text-xs text-muted-foreground">({opt.symbol})</div>
											</div>
											<div className="text-right text-sm">₹{opt.currentPrice.toLocaleString()}</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
					{selectedStock && (
						<div className="rounded-xl border border-border bg-card p-4 space-y-4 mt-4">
							<div className="flex bg-muted/50 rounded-lg p-1">
								<button type="button" onClick={()=> setStockEntryMode('units')} className={`flex-1 py-2 px-4 rounded-md text-sm ${stockEntryMode==='units' ? 'bg-card text-blue-600 shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}>By Units & Buy Price</button>
								<button type="button" onClick={()=> setStockEntryMode('amount')} className={`flex-1 py-2 px-4 rounded-md text-sm ${stockEntryMode==='amount' ? 'bg-card text-blue-600 shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}>By Total Invested Amount</button>
							</div>
							{stockEntryMode==='units' ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<input placeholder="Units" type="number" value={units} onChange={e=> setUnits(e.target.value)} className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
									<input placeholder="Buy Price (₹)" type="number" value={price} onChange={e=> setPrice(e.target.value)} className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
								</div>
							) : (
								<div>
									<input placeholder="Invested Amount (₹)" type="number" value={investedAmount} onChange={e=> setInvestedAmount(e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* Mutual Funds */}
			{selectedClass === 'mutual_funds' && (
				<div className="rounded-xl border border-border bg-card p-4 space-y-4">
					<h2 className="text-sm font-medium text-foreground">Mutual Funds</h2>
					<div className="relative">
						<label className="block text-xs text-muted-foreground mb-2">Search Mutual Fund (Direct Growth) *</label>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
							<input value={mfSearchTerm} onChange={e => { setMfSearchTerm(e.target.value); filterMFOptions(e.target.value); }} onFocus={()=> mfSearchTerm && filterMFOptions(mfSearchTerm)} onBlur={()=> setTimeout(()=> setShowMFDropdown(false), 200)} placeholder="Start typing fund name..." className="w-full pl-10 pr-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm" />
							{showMFDropdown && filteredMFOptions.length>0 && (
								<div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
									{filteredMFOptions.map(opt => (
										<div key={opt.schemeCode} onClick={()=> { setSelectedMF(opt); setMfSearchTerm(opt.name); setName(opt.name); setSymbol(opt.schemeCode); setShowMFDropdown(false); }} className="px-4 py-3 cursor-pointer hover:bg-muted text-sm border-b border-border last:border-b-0 flex items-center justify-between">
											<div>
												<div className="font-medium text-foreground">{opt.name}</div>
												<div className="text-xs text-muted-foreground">Direct Plan – Growth</div>
											</div>
											<div className="text-right text-sm">₹{opt.currentNAV?.toFixed(4)}</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
					{selectedMF && (
						<div className="rounded-xl border border-border bg-card p-4 space-y-4 mt-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<input placeholder="Invested Amount (₹)" type="number" value={investedAmount} onChange={e=> setInvestedAmount(e.target.value)} className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
								<input placeholder="Investment Date (optional)" type="date" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
							</div>
							{investedAmount && mfCalculatedUnits && (
								<div className="p-4 rounded-xl border border-border bg-muted/30">
									<div className="grid grid-cols-2 gap-3 text-sm">
										<div><div className="text-xs text-muted-foreground">Units</div><div className="font-medium">{mfCalculatedUnits.toFixed(4)}</div></div>
										<div><div className="text-xs text-muted-foreground">Current Value</div><div className="font-medium">₹{mfCurrentValue?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
										<div><div className="text-xs text-muted-foreground">Gain/Loss</div><div className={`font-semibold ${Number(mfGainLoss)>=0?'text-emerald-600':'text-rose-600'}`}>{Number(mfGainLoss)>=0?'+':''}₹{mfGainLoss?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
										<div><div className="text-xs text-muted-foreground">% Return</div><div className={`font-semibold ${Number(mfGainLossPercent)>=0?'text-emerald-600':'text-rose-600'}`}>{Number(mfGainLossPercent)>=0?'+':''}{mfGainLossPercent?.toFixed(2)}%</div></div>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* Other classes minimal forms */}
			{selectedClass === 'debt' && (
				<div className="rounded-xl border border-border bg-card p-4 space-y-4">
					<h2 className="text-sm font-medium text-foreground">Debt</h2>
					<div className="inline-flex gap-2">
						<button className={`h-8 px-3 rounded-md text-sm border ${debtType==='bonds'?'bg-muted':'hover:bg-muted'}`} onClick={()=> setDebtType('bonds')}>Bonds</button>
						<button className={`h-8 px-3 rounded-md text-sm border ${debtType==='debt_mf'?'bg-muted':'hover:bg-muted'}`} onClick={()=> setDebtType('debt_mf')}>Debt MF</button>
					</div>
					{debtType==='bonds' ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<input placeholder="Bond name" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
							<input placeholder="Face value (₹)" type="number" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
							<input placeholder="Units" type="number" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
						</div>
					) : (
						<div className="space-y-2">
							<p className="text-xs text-muted-foreground">Filter NAVAll: fund_category contains "Debt" or "Fixed Income"; scheme: Direct Plan – Growth.</p>
							<input placeholder="Search Debt MF (Direct Growth)" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
						</div>
					)}
				</div>
			)}

			{selectedClass === 'liquid' && (
				<div className="rounded-xl border border-border bg-card p-4 space-y-4">
					<h2 className="text-sm font-medium text-foreground">Liquid</h2>
					<div className="inline-flex gap-2">
						<button className={`h-8 px-3 rounded-md text-sm border ${liquidType==='cash'?'bg-muted':'hover:bg-muted'}`} onClick={()=> setLiquidType('cash')}>Cash</button>
						<button className={`h-8 px-3 rounded-md text-sm border ${liquidType==='liquid_mf'?'bg-muted':'hover:bg-muted'}`} onClick={()=> setLiquidType('liquid_mf')}>Liquid MF</button>
					</div>
					{liquidType==='cash' ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<input placeholder="Amount (₹)" type="number" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
						</div>
					) : (
						<div className="space-y-2">
							<p className="text-xs text-muted-foreground">Filter NAVAll: fund_category = "Liquid Fund"; scheme: Direct Plan – Growth.</p>
							<input placeholder="Search Liquid MF (Direct Growth)" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
						</div>
					)}
				</div>
			)}

			{selectedClass === 'gold' && (
				<div className="rounded-xl border border-border bg-card p-4 space-y-4">
					<h2 className="text-sm font-medium text-foreground">Gold</h2>
					<div className="inline-flex gap-2">
						<button className={`h-8 px-3 rounded-md text-sm border ${goldType==='gold_etf'?'bg-muted':'hover:bg-muted'}`} onClick={()=> setGoldType('gold_etf')}>Gold ETF</button>
						<button className={`h-8 px-3 rounded-md text-sm border ${goldType==='gold_mf'?'bg-muted':'hover:bg-muted'}`} onClick={()=> setGoldType('gold_mf')}>Gold MF</button>
						<button className={`h-8 px-3 rounded-md text-sm border ${goldType==='physical_gold'?'bg-muted':'hover:bg-muted'}`} onClick={()=> setGoldType('physical_gold')}>Physical Gold</button>
					</div>
					{goldType==='physical_gold' ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<input placeholder="Value (₹) or grams" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
						</div>
					) : (
						<div className="space-y-2">
							<p className="text-xs text-muted-foreground">Filter NAVAll: ETF name contains "Gold" (for ETF) or fund_category = "Gold Fund" (for MF), scheme: Direct Plan – Growth.</p>
							<input placeholder="Search Gold ETF/MF (Direct Growth)" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
						</div>
					)}
				</div>
			)}

			{selectedClass === 'real_estate' && (
				<div className="rounded-xl border border-border bg-card p-4 space-y-4">
					<h2 className="text-sm font-medium text-foreground">Real Estate</h2>
					<div className="inline-flex gap-2">
						<button className={`h-8 px-3 rounded-md text-sm border ${reType==='reit'?'bg-muted':'hover:bg-muted'}`} onClick={()=> setReType('reit')}>REIT</button>
						<button className={`h-8 px-3 rounded-md text-sm border ${reType==='property'?'bg-muted':'hover:bg-muted'}`} onClick={()=> setReType('property')}>Property</button>
					</div>
					{reType==='reit' ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<select className="h-10 rounded-md border border-border bg-background px-3 text-sm">
								<option>Embassy</option>
								<option>Mindspace</option>
								<option>Brookfield</option>
								<option>Nexus</option>
							</select>
							<input placeholder="Units or Value" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<input placeholder="Property name" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
							<input placeholder="Value (₹)" type="number" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
						</div>
					)}
				</div>
			)}
		</div>
	);
}