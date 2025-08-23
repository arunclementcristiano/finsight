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
	viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#0f172a" }
	],
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "FinSight"
	},
	manifest: "/manifest.json"
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const navItems = [
		{ name: "Dashboard", href: "/PortfolioManagement/Dashboard" },
		{ name: "Portfolio", href: "/PortfolioManagement/AddHolding" },
		{ name: "Expense Tracker", href: "/ExpenseTracker" },
		{ name: "Allocation Plan", href: "/PortfolioManagement/Plan" },
		{ name: "Research", href: "/research" },
		{ name: "Insights", href: "/PortfolioManagement/Insights" },
		{ name: "Settings", href: "/PortfolioManagement/Settings" },
	];
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<ThemeProvider>
					<Navbar items={navItems} helpHref="/help" userInitials="FS" />
					<div className="min-h-screen bg-[radial-gradient(40%_60%_at_10%_10%,rgba(99,102,241,0.08),transparent),radial-gradient(30%_40%_at_90%_20%,rgba(16,185,129,0.08),transparent)] dark:bg-[radial-gradient(40%_60%_at_10%_10%,rgba(99,102,241,0.12),transparent),radial-gradient(30%_40%_at_90%_20%,rgba(16,185,129,0.12),transparent)]">
						<main className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6 pb-6 sm:pb-6">{children}</main>
					</div>
				</ThemeProvider>
			</body>
		</html>
	);
}