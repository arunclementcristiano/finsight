"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, X, Sun, Moon, HelpCircle, BarChart3, PlusCircle, DollarSign, Target, TrendingUp, Settings } from "lucide-react";
import { cn } from "./utils";

export interface NavItem { name: string; href: string }

interface NavbarProps {
	items: NavItem[];
	logoSrc?: string;
	appName?: string;
	helpHref?: string;
	avatarSrc?: string;
	userInitials?: string;
}

export default function Navbar({ items, logoSrc = "/finsight-logo.png", appName = "Finsight", helpHref = "#", avatarSrc, userInitials = "FS" }: NavbarProps) {
	const pathname = usePathname();
	const { theme, resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);
	useEffect(() => setMounted(true), []);

	const isDark = (resolvedTheme || theme) === "dark";
	function toggleTheme() { if (mounted) setTheme(isDark ? "light" : "dark"); }

	function isActive(href: string) {
		if (!pathname) return false;
		// exact match or section prefix
		return pathname === href || (href !== "/" && pathname.startsWith(href));
	}

	const navItems = useMemo(() => items ?? [], [items]);

	function getNavIcon(name: string) {
		switch (name.toLowerCase()) {
			case 'dashboard': return <BarChart3 className="h-5 w-5" />;
			case 'portfolio': return <PlusCircle className="h-5 w-5" />;
			case 'expense tracker': return <DollarSign className="h-5 w-5" />;
			case 'planning': return <Target className="h-5 w-5" />;
			case 'research': return <TrendingUp className="h-5 w-5" />;
			case 'insights': return <TrendingUp className="h-5 w-5" />;
			case 'settings': return <Settings className="h-5 w-5" />;
			default: return <span className="h-5 w-5 rounded-full bg-muted" />;
		}
	}

	return (
		<nav className="sticky top-0 z-40 w-full border-b border-border bg-background text-foreground">
			<div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
				{/* Left: Logo + Name */}
				<div className="flex items-center gap-3">
					<Link href="/" className="flex items-center gap-2">
						{logoSrc ? (
							<img src={logoSrc} alt="logo" className="h-7 w-7 rounded-sm" />
						) : (
							<div className="h-7 w-7 rounded-sm bg-muted" />
						)}
						<span className="font-bold tracking-tight">{appName}</span>
					</Link>
				</div>

				{/* Center: Desktop menu */}
				<div className="hidden md:flex items-center gap-1">
					{navItems.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"px-3 py-2 text-sm rounded-md transition-colors",
								"hover:bg-muted",
								isActive(item.href) ? "text-indigo-600 dark:text-indigo-300 underline underline-offset-4" : "text-foreground"
							)}
						>
							{item.name}
						</Link>
					))}
				</div>

				{/* Right: Help, Theme, Avatar */}
				<div className="hidden md:flex items-center gap-2">
					<Link href={helpHref} className="h-9 px-3 inline-flex items-center rounded-md text-sm text-foreground hover:bg-muted transition-colors">
						<HelpCircle className="h-4 w-4 mr-2" /> Help
					</Link>
					<button aria-label="Toggle theme" onClick={toggleTheme} className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors">
						{mounted && isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
					</button>
					{avatarSrc ? (
						<img src={avatarSrc} alt="avatar" className="h-9 w-9 rounded-full object-cover border border-border" />
					) : (
						<div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold border border-border">
							{userInitials}
						</div>
					)}
				</div>

				{/* Mobile: Enhanced touch targets */}
				<div className="md:hidden flex items-center gap-1">
					<button 
						aria-label="Help" 
						className="h-11 w-11 inline-flex items-center justify-center rounded-lg hover:bg-muted transition-colors touch-manipulation active:scale-95" 
						onClick={() => (window.location.href = helpHref)}
					>
						<HelpCircle className="h-5 w-5" />
					</button>
					<button 
						aria-label="Toggle theme" 
						onClick={toggleTheme} 
						className="h-11 w-11 inline-flex items-center justify-center rounded-lg hover:bg-muted transition-all touch-manipulation active:scale-95"
					>
						{mounted && isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
					</button>
					<button 
						aria-label="Menu" 
						onClick={() => setOpen(o => !o)} 
						className="h-11 w-11 inline-flex items-center justify-center rounded-lg hover:bg-muted transition-all touch-manipulation active:scale-95"
					>
						{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</button>
				</div>
			</div>

			{/* Enhanced mobile dropdown */}
			<div className={cn(
				"md:hidden border-b border-border bg-background/95 backdrop-blur-sm",
				open ? "block animate-in slide-in-from-top-2 duration-200" : "hidden"
			)}>
				<div className="mx-auto max-w-6xl px-3 py-3 space-y-1">
					{navItems.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							onClick={() => setOpen(false)}
							className={cn(
								"flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all touch-manipulation",
								"hover:bg-muted active:scale-[0.98]",
								isActive(item.href) 
									? "text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800" 
									: "text-foreground"
							)}
						>
							<span className="mr-3">
								{getNavIcon(item.name)}
							</span>
							{item.name}
						</Link>
					))}
					
					{/* User avatar in mobile menu */}
					<div className="pt-3 mt-3 border-t border-border">
						<div className="flex items-center px-4 py-2">
							{avatarSrc ? (
								<img src={avatarSrc} alt="avatar" className="h-8 w-8 rounded-full object-cover border border-border" />
							) : (
								<div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold border border-border">
									{userInitials}
								</div>
							)}
							<span className="ml-3 text-sm text-muted-foreground">Welcome back!</span>
						</div>
					</div>
				</div>
			</div>
		</nav>
	);
}