"use client";
import React, { useMemo, useState } from "react";
import { useApp, type Holding } from "../../../store";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Plus, Edit2, Trash2, X } from "lucide-react";
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

	const [chartType, setChartType] = useState<'pie'|'bar'>('pie');

	const byRole = useMemo(() => {
		const acc: Record<'Equity'|'Defensive'|'Satellite', number> = { Equity: 0, Defensive: 0, Satellite: 0 };
		(holdings || []).forEach((h: Holding) => {
			acc[getRoleForAssetClass(h.instrumentClass)] += computeHoldingValue(h);
		});
		const total = Object.values(acc).reduce((s, n) => s + n, 0) || 1;
		return (
			Object.entries(acc) as Array<["Equity"|"Defensive"|"Satellite", number]>
		).map(([role, value]) => ({ role, value, pct: (value/total)*100 }));
	}, [holdings]);

	function resetForm() {
		setForm({ instrumentClass: "Stocks", name: "", symbol: "", units: "", price: "", investedAmount: "", currentValue: "" });
		setEditingId(null);
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

		// Per-asset required validation
		const ic = form.instrumentClass;
		if ((ic === 'Gold' || ic === 'Real Estate')) {
			if (!payload.name || !(payload.investedAmount && payload.investedAmount > 0)) return;
		}
		if ((ic === 'Debt' || ic === 'Liquid')) {
			if (!payload.name || !(payload.investedAmount && payload.investedAmount > 0) || !(payload.currentValue && payload.currentValue >= 0)) return;
		}

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
							<table className="w-full text-sm">
								<thead className="bg-muted/80 supports-[backdrop-filter]:bg-muted/60 backdrop-blur text-muted-foreground text-xs uppercase tracking-wide">
									<tr>
										<th className="text-left px-4 py-2">Asset</th>
										<th className="text-left px-4 py-2">Class</th>
										<th className="text-right px-4 py-2">Invested</th>
										<th className="text-right px-4 py-2">Current</th>
										<th className="text-right px-4 py-2">P/L</th>
										<th className="text-right px-4 py-2">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{(holdings || []).length === 0 ? (
										<tr>
											<td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No holdings yet. Click “Add Holding”.</td>
										</tr>
									) : (
										(visibleHoldings || []).map((h: Holding) => {
											const value = computeHoldingValue(h);
											const invested = typeof h.investedAmount === "number" ? h.investedAmount : (h.units && h.price ? h.units * h.price : undefined);
											const cls = CLASS_COLORS[h.instrumentClass];
											return (
												<tr key={h.id} className="hover:bg-muted/60 transition-colors">
													<td className="px-4 py-2">
														<div className="font-medium text-foreground truncate max-w-[16ch]">{h.name}</div>
														{h.symbol ? (<div className="text-xs text-muted-foreground">{h.symbol}</div>) : null}
													</td>
													<td className="px-4 py-2">
														<span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] ${cls.bg} ${cls.text}`}>{h.instrumentClass}</span>
													</td>
													<td className="px-4 py-2 text-right">{invested != null ? `₹${Math.round(invested).toLocaleString()}` : "—"}</td>
													<td className="px-4 py-2 text-right">{value != null ? `₹${Math.round(value).toLocaleString()}` : "—"}</td>
													<td className="px-4 py-2 text-right">
														<div className="text-sm font-semibold {totalPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
															{(invested != null && value != null) ? `₹${Math.round((value as number) - (invested as number)).toLocaleString()}` : '—'}
														</div>
													</td>
													<td className="px-4 py-2 text-right">
														<div className="inline-flex items-center gap-2">
															<button onClick={() => openEdit(h)} className="p-1.5 rounded-md hover:bg-muted shadow-sm" aria-label="Edit">
																<Edit2 size={16} className="text-foreground/80" />
															</button>
															<button onClick={() => deleteHolding(h.id)} className="p-1.5 rounded-md hover:bg-muted shadow-sm" aria-label="Delete">
																<Trash2 size={16} className="text-rose-600" />
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
								<div className="font-medium text-foreground">Allocation</div>
								<div className="inline-flex items-center gap-1 rounded-md border border-border bg-background p-1">
									<button onClick={()=> setChartType('pie')} className={`h-8 px-3 rounded-md text-sm ${chartType==='pie' ? 'bg-muted' : ''}`}>Pie</button>
									<button onClick={()=> setChartType('bar')} className={`h-8 px-3 rounded-md text-sm ${chartType==='bar' ? 'bg-muted' : ''}`}>Bar</button>
								</div>
							</div>
							<div className="h-72">
								<ResponsiveContainer width="100%" height="100%">
									{chartType==='pie' ? (
										<PieChart>
											<Pie data={byClass} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2} cornerRadius={8}>
												{byClass.map((entry, index) => (
													<Cell key={`cell-${index}`} fill={entry.color} />
												))}
											</Pie>
											<Tooltip formatter={(v: any) => `₹${Math.round(v as number).toLocaleString()}`} contentStyle={{ borderRadius: 12, border: '1px solid rgba(148,163,184,0.2)' }} />
											<Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: 8 }} />
										</PieChart>
									) : (
										<BarChart data={byClass} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
											<CartesianGrid strokeDasharray="3 3" opacity={0.2} />
											<XAxis dataKey="name" tick={{ fontSize: 12 }} />
											<YAxis tick={{ fontSize: 12 }} />
											<Tooltip formatter={(v: any) => `₹${Math.round(v as number).toLocaleString()}`} contentStyle={{ borderRadius: 12, border: '1px solid rgba(148,163,184,0.2)' }} />
											<Bar dataKey="value" radius={[6,6,0,0]}>
												{byClass.map((entry, index) => (
													<Cell key={`bar-${index}`} fill={entry.color} />
												))}
											</Bar>
										</BarChart>
									)}
								</ResponsiveContainer>
							</div>
						</div>
						<div className="rounded-2xl border border-border bg-card/90 backdrop-blur p-5 shadow-sm">
							<div className="font-medium text-foreground mb-3">By Investment Role</div>
							<div className="space-y-3">
								{byRole.map(r => (
									<div key={r.role}>
										<div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
											<span>{r.role}</span>
											<span>{r.pct.toFixed(1)}%</span>
										</div>
										<div className="h-2 rounded-md bg-muted overflow-hidden">
											<div className={`h-full rounded-md`} style={{ width: `${r.pct}%`, backgroundColor: r.role==='Equity' ? '#3B82F6' : r.role==='Defensive' ? '#10B981' : '#F59E0B' }} />
										</div>
									</div>
								))}
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
						<form onSubmit={submitForm} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="col-span-1">
								<label className="block text-xs text-muted-foreground mb-1">Asset Class</label>
								<select value={form.instrumentClass} onChange={(e) => setForm({ ...form, instrumentClass: e.target.value as AssetClass })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
									{Object.keys(CLASS_COLORS).map((k) => (
										<option key={k} value={k}>{k}</option>
									))}
								</select>
							</div>
							<div className="col-span-1">
								<label className="block text-xs text-muted-foreground mb-1">Name</label>
								<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
								<div className="mt-1 text-[11px] text-muted-foreground">Required for all assets.</div>
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
								<label className="block text-xs text-muted-foreground mb-1">Invested Amount {form.instrumentClass==='Gold'||form.instrumentClass==='Real Estate'||form.instrumentClass==='Debt'||form.instrumentClass==='Liquid' ? '*' : ''}</label>
								<input type="number" inputMode="decimal" value={form.investedAmount} onChange={(e) => setForm({ ...form, investedAmount: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" required={form.instrumentClass==='Gold'||form.instrumentClass==='Real Estate'||form.instrumentClass==='Debt'||form.instrumentClass==='Liquid'} />
								<div className="mt-1 text-[11px] text-muted-foreground">Gold/Real Estate/Debt/Liquid require invested amount.</div>
							</div>
							<div className="col-span-1">
								<label className="block text-xs text-muted-foreground mb-1">Current Value {form.instrumentClass==='Debt'||form.instrumentClass==='Liquid' ? '*' : '(optional)'}</label>
								<input type="number" inputMode="decimal" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" required={form.instrumentClass==='Debt'||form.instrumentClass==='Liquid'} />
								<div className="mt-1 text-[11px] text-muted-foreground">Debt/Liquid require current value for accurate P/L.</div>
							</div>

							<div className="col-span-1 md:col-span-2 flex items-center justify-end gap-3 pt-2">
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
