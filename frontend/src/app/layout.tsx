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
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-slate-950`}>
				<ThemeProvider>
					<Navbar />
					<main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
				</ThemeProvider>
			</body>
		</html>
	);
}
