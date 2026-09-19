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

					<div className="min-h-screen pb-20 pt-16 md:pb-0 md:pl-64 md:pt-0">
						<main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 md:py-8 lg:px-10">{children}</main>
					</div>
				</ThemeProvider>
			</body>
		</html>
	);
}
