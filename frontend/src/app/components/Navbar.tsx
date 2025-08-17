"use client";
import React, { useEffect, useState } from "react";
import { cn } from "./utils";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export default function Navbar() {
	const { theme, resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	useEffect(() => {
		if (!mounted) return;
		const html = document.documentElement;
		html.classList.toggle("dark", (resolvedTheme || theme) === "dark");
	}, [mounted, resolvedTheme, theme]);

	function toggleTheme() {
		if (!mounted) return;
		setTheme((resolvedTheme || theme) === "dark" ? "light" : "dark");
	}

	return (
		<nav className={cn("sticky top-0 z-40 w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-900/70 dark:border-slate-800")}> 
			<div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
				<div className="font-bold text-slate-900 dark:text-slate-100">Finsight</div>
				<div className="flex items-center gap-3">
					<button
						className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-slate-800 dark:border-slate-700"
						onClick={toggleTheme}
						disabled={!mounted}
					>
						{mounted && (resolvedTheme || theme) === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
						<span>{mounted ? ((resolvedTheme || theme) === "dark" ? "Light" : "Dark") : "Theme"}</span>
					</button>
				</div>
			</div>
		</nav>
	);
}