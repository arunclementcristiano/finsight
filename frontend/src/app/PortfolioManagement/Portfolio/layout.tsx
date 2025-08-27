"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PortfolioModuleLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const tabs = [
		{ name: "Overview", href: "/PortfolioManagement/Portfolio/Overview" },
		{ name: "Plan", href: "/PortfolioManagement/Portfolio/Plan" },
		{ name: "Holdings", href: "/PortfolioManagement/Portfolio/Holdings" },
		{ name: "Rebalance", href: "/PortfolioManagement/Portfolio/Rebalance" },
		{ name: "Insights", href: "/PortfolioManagement/Portfolio/Insights" },
	];
	return (
		<div className="space-y-4">
			{/* Module subnav */}
			<div className="border-b border-border">
				<div className="flex gap-2 overflow-x-auto">
					{tabs.map(t => (
						<Link key={t.href} href={t.href} className={`px-3 py-2 text-sm rounded-t-md ${pathname?.startsWith(t.href)?'bg-muted font-medium':'text-foreground hover:bg-muted'}`}>{t.name}</Link>
					))}
				</div>
			</div>
			{children}
		</div>
	);
}