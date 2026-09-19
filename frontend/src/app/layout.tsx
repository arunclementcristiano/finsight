import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';
import Navbar from "./components/Navbar";
import ThemeProvider from "./providers/ThemeProvider";
import MobileGlobalNav from "./components/MobileGlobalNav";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "FinSight",
		template: "%s · FinSight",
	},
	description: "A clear view of your spending, investments, and financial goals.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const navItems = [
		{ name: "Overview", href: "/PortfolioManagement/Dashboard" },
		{ name: "Portfolio", href: "/PortfolioManagement/Portfolio/Plan" },
		{ name: "Goals", href: "/PortfolioManagement/Goals" },
		{ name: "Expenses", href: "/ExpenseTracker" },
		{ name: "Insights", href: "/PortfolioManagement/Insights" },
		{ name: "Settings", href: "/PortfolioManagement/Settings" },
	];
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<ThemeProvider>
					<Navbar items={navItems} userInitials="FS" />
					<MobileGlobalNav />

					<div className="app-shell min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] pt-[calc(4rem+env(safe-area-inset-top))] lg:pb-0 lg:pl-64 lg:pt-0">
						<main className="mx-auto min-w-0 max-w-[1480px] px-3 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10">{children}</main>
					</div>
				</ThemeProvider>
			</body>
		</html>
	);
}
