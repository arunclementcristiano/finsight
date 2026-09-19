"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Layers3, SlidersHorizontal } from "lucide-react";

export default function PortfolioModuleLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const tabs = [
		{ name: "Plan", href: "/PortfolioManagement/Portfolio/Plan", icon: SlidersHorizontal },
		{ name: "Holdings", href: "/PortfolioManagement/Portfolio/Holdings", icon: Layers3 },
		{ name: "Analysis", href: "/PortfolioManagement/Portfolio/Insights", icon: BarChart3 },
	];

	useEffect(() => {
		if (pathname === "/PortfolioManagement/Portfolio" || pathname === "/PortfolioManagement/Portfolio/") {
			router.replace("/PortfolioManagement/Portfolio/Plan");
		}
	}, [pathname, router]);

	return (
		<div className="space-y-6">
			<div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
				<div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Investments</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Portfolio</h1><p className="mt-2 text-sm text-muted-foreground">Build, track, and improve your long-term investment mix.</p></div>
				<div className="inline-flex w-fit gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-sm">
					{tabs.map(t => {
						const Icon = t.icon;
						const active = pathname?.startsWith(t.href);
						return <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium ${active ? "bg-[#10251d] text-white dark:bg-emerald-400 dark:text-emerald-950" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="h-4 w-4" />{t.name}</Link>;
					})}
				</div>
			</div>
			{children}
		</div>
	);
}
