'use client';
import React, { useState } from 'react';

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

	return (
		<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
			<h1 className="text-2xl font-bold text-foreground mb-4">Add Holding</h1>

			{/* Segmented control */}
			<div className="flex flex-wrap gap-2 mb-6">
				{ASSET_CLASSES.map(opt => (
					<button
						key={opt.id}
						onClick={() => setSelectedClass(opt.id)}
						className={`h-9 px-3 rounded-lg text-sm transition-colors border ${selectedClass===opt.id ? 'bg-muted text-foreground border-border' : 'bg-background text-foreground border-border hover:bg-muted'}`}
						aria-pressed={selectedClass===opt.id}
					>
						{opt.label}
					</button>
				))}
			</div>

			{/* Dynamic sections */}
			<div className="rounded-xl border border-border bg-card p-4">
				{selectedClass === 'stocks' && (
					<div>
						<h2 className="text-sm font-medium text-foreground mb-3">Stocks</h2>
						<p className="text-xs text-muted-foreground mb-3">Use existing stock autocomplete flow here.</p>
						{/* TODO: Integrate existing stock autocomplete component */}
					</div>
				)}

				{selectedClass === 'mutual_funds' && (
					<div>
						<h2 className="text-sm font-medium text-foreground mb-3">Mutual Funds</h2>
						<p className="text-xs text-muted-foreground mb-3">Use existing MF autocomplete (Direct Plan – Growth only).</p>
						{/* TODO: Integrate existing mutual fund autocomplete component with NAVAll filter */}
					</div>
				)}

				{selectedClass === 'debt' && (
					<div className="space-y-4">
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
					<div className="space-y-4">
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
					<div className="space-y-4">
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
					<div className="space-y-4">
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
		</div>
	);
}