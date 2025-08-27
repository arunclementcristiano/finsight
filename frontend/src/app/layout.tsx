import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';
import Navbar from "./components/Navbar";
import ThemeProvider from "./providers/ThemeProvider";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Finsight",
	description: "Personal finance & allocation planner",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	// Global nav (max 6)
	const navItems = [
		{ name: "Dashboard", href: "/PortfolioManagement/Dashboard" },
		{ name: "Portfolio", href: "/PortfolioManagement/Plan" },
		{ name: "Expenses", href: "/ExpenseTracker" },
		{ name: "Transactions", href: "/PortfolioManagement/Transactions" },
		{ name: "Reports & Insights", href: "/PortfolioManagement/Insights" },
		{ name: "Settings / Profile", href: "/PortfolioManagement/Settings" },
	];
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<ThemeProvider>
					{/* Desktop top nav */}
					<div className="hidden md:block">
						<Navbar items={navItems} helpHref="/help" userInitials="FS" />
					</div>
					{/* Mobile bottom tab bar */}
					<div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background">
						<div className="grid grid-cols-4 text-xs">
							<a href="/PortfolioManagement/Dashboard" className="flex flex-col items-center justify-center py-2">🏠<span>Dashboard</span></a>
							<a href="/PortfolioManagement/Plan" className="flex flex-col items-center justify-center py-2">📊<span>Portfolio</span></a>
							<a href="/ExpenseTracker" className="flex flex-col items-center justify-center py-2">💰<span>Expenses</span></a>
							<button className="flex flex-col items-center justify-center py-2" onClick={()=>{
								const el = document.getElementById('mobile-more-drawer');
								if (el) el.classList.remove('hidden');
							}}>☰<span>More</span></button>
						</div>
					</div>
					{/* Mobile More drawer */}
					<div id="mobile-more-drawer" className="hidden fixed inset-0 z-50">
						<div className="absolute inset-0 bg-black/30" onClick={()=>{ const el = document.getElementById('mobile-more-drawer'); if (el) el.classList.add('hidden'); }} />
						<div className="absolute bottom-0 inset-x-0 rounded-t-xl border border-border bg-card p-4 space-y-2">
							<a className="block py-2" href="/PortfolioManagement/Transactions">Transactions</a>
							<a className="block py-2" href="/PortfolioManagement/Insights">Reports & Insights</a>
							<a className="block py-2" href="/PortfolioManagement/Settings">Settings / Profile</a>
							<button className="mt-2 w-full border border-border rounded-md py-2" onClick={()=>{ const el = document.getElementById('mobile-more-drawer'); if (el) el.classList.add('hidden'); }}>Close</button>
						</div>
					</div>

					<div className="min-h-screen pb-14 md:pb-0 bg-[radial-gradient(40%_60%_at_10%_10%,rgba(99,102,241,0.08),transparent),radial-gradient(30%_40%_at_90%_20%,rgba(16,185,129,0.08),transparent)] dark:bg-[radial-gradient(40%_60%_at_10%_10%,rgba(99,102,241,0.12),transparent),radial-gradient(30%_40%_at_90%_20%,rgba(16,185,129,0.12),transparent)]">
						<main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
					</div>
				</ThemeProvider>
			</body>
		</html>
	);
}