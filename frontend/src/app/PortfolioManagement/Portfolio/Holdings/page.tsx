"use client";
import React, { useMemo, useState } from "react";
import { useApp, type Holding } from "../../../store";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
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

export default function PortfolioHoldingsPage() {
	const { holdings, addHolding, updateHolding, deleteHolding } = useApp() as any;
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
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

	const byClass = useMemo(() => {
		const map: Record<string, number> = {};
		(holdings || []).forEach((h: Holding) => { map[h.instrumentClass] = (map[h.instrumentClass] || 0) + computeHoldingValue(h); });
		return Object.entries(map).map(([k, v]) => ({ name: k as AssetClass, value: v, color: CLASS_COLORS[k as AssetClass].chart }));
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

		if (editingId) updateHolding(editingId, payload);
		else addHolding(payload);

		setIsModalOpen(false);
		resetForm();
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Holdings</h1>
						<p className="text-sm text-gray-600 dark:text-gray-400">Capture your investments and view allocation.</p>
					</div>
					<button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2">
						<Plus size={18} /> Add Holding
					</button>
				</div>

				{/* KPI + Chart */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
					<div className="col-span-1 lg:col-span-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
						<div className="text-sm text-gray-500 dark:text-gray-400">Total Value</div>
						<div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">₹{Math.round(totalValue).toLocaleString()}</div>
						<div className="text-xs text-gray-500 dark:text-gray-500 mt-2">{holdings?.length || 0} holdings</div>
					</div>
					<div className="col-span-1 lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
						<div className="flex items-center justify-between mb-3">
							<div className="font-medium text-gray-900 dark:text-gray-100">Allocation by Asset Class</div>
							<div className="text-xs text-gray-500 dark:text-gray-400">Based on current value or invested</div>
						</div>
						<div className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie data={byClass} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3} cornerRadius={6}>
										{byClass.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={entry.color} />
										))}
									</Pie>
									<Tooltip formatter={(v: any) => `₹${Math.round(v as number).toLocaleString()}`} />
									<Legend />
								</PieChart>
							</ResponsiveContainer>
						</div>
					</div>
				</div>

				{/* Table */}
				<div className="mt-8 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
					<div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
						<div className="font-medium text-gray-900 dark:text-gray-100">All Holdings</div>
						<div className="text-xs text-gray-500 dark:text-gray-400">Compact view</div>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300">
								<tr>
									<th className="text-left px-4 py-3">Name</th>
									<th className="text-left px-4 py-3">Class</th>
									<th className="text-right px-4 py-3 hidden md:table-cell">Units</th>
									<th className="text-right px-4 py-3 hidden md:table-cell">Buy Price</th>
									<th className="text-right px-4 py-3">Invested</th>
									<th className="text-right px-4 py-3">Current</th>
									<th className="text-right px-4 py-3">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 dark:divide-gray-800">
								{(holdings || []).length === 0 ? (
									<tr>
										<td colSpan={7} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No holdings yet. Click “Add Holding”.</td>
									</tr>
								) : (
									(holdings || []).map((h: Holding) => {
										const value = computeHoldingValue(h);
										const invested = typeof h.investedAmount === "number" ? h.investedAmount : (h.units && h.price ? h.units * h.price : undefined);
										const cls = CLASS_COLORS[h.instrumentClass];
										return (
											<tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
												<td className="px-4 py-3">
													<div className="font-medium text-gray-900 dark:text-gray-100">{h.name}</div>
													{h.symbol ? (<div className="text-xs text-gray-500 dark:text-gray-400">{h.symbol}</div>) : null}
												</td>
												<td className="px-4 py-3">
													<span className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${cls.bg} ${cls.text}`}>{h.instrumentClass}</span>
												</td>
												<td className="px-4 py-3 text-right hidden md:table-cell">{h.units != null ? h.units : "—"}</td>
												<td className="px-4 py-3 text-right hidden md:table-cell">{h.price != null ? `₹${h.price.toLocaleString()}` : "—"}</td>
												<td className="px-4 py-3 text-right">{invested != null ? `₹${Math.round(invested).toLocaleString()}` : "—"}</td>
												<td className="px-4 py-3 text-right">{value != null ? `₹${Math.round(value).toLocaleString()}` : "—"}</td>
												<td className="px-4 py-3 text-right">
													<div className="inline-flex items-center gap-2">
														<button onClick={() => openEdit(h)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Edit">
															<Edit2 size={16} className="text-gray-600 dark:text-gray-300" />
														</button>
														<button onClick={() => deleteHolding(h.id)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Delete">
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
				</div>
			</div>

			{/* Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50">
					<div className="absolute inset-0 bg-black/40" onClick={() => { setIsModalOpen(false); resetForm(); }} />
					<div className="absolute inset-x-0 top-10 mx-auto w-[95%] max-w-2xl rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
						<div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
							<div className="font-medium text-gray-900 dark:text-gray-100">{editingId ? "Edit Holding" : "Add Holding"}</div>
							<button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
								<X size={18} className="text-gray-600 dark:text-gray-300" />
							</button>
						</div>
						<form onSubmit={submitForm} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="col-span-1">
								<label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Asset Class</label>
								<select value={form.instrumentClass} onChange={(e) => setForm({ ...form, instrumentClass: e.target.value as AssetClass })} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
									{Object.keys(CLASS_COLORS).map((k) => (
										<option key={k} value={k}>{k}</option>
									))}
								</select>
							</div>
							<div className="col-span-1">
								<label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Name</label>
								<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
							</div>
							<div className="col-span-1">
								<label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Symbol (optional)</label>
								<input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
							</div>
							<div className="col-span-1">
								<label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Units (optional)</label>
								<input type="number" inputMode="decimal" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
							</div>
							<div className="col-span-1">
								<label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Buy Price (optional)</label>
								<input type="number" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
							</div>
							<div className="col-span-1">
								<label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Invested Amount (optional)</label>
								<input type="number" inputMode="decimal" value={form.investedAmount} onChange={(e) => setForm({ ...form, investedAmount: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
							</div>
							<div className="col-span-1">
								<label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Current Value (optional)</label>
								<input type="number" inputMode="decimal" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
							</div>

							<div className="col-span-1 md:col-span-2 flex items-center justify-end gap-3 pt-2">
								<button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
								<button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">{editingId ? "Save Changes" : "Add Holding"}</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
