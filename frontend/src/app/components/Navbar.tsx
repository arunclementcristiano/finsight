"use client";
import React, { useEffect, useState } from "react";
import { cn } from "./utils";

export default function Navbar() {
	const [dark, setDark] = useState(false);

	useEffect(() => {
		const saved = localStorage.getItem("theme-dark") === "1";
		setDark(saved);
		document.documentElement.classList.toggle("dark", saved);
	}, []);

	function toggleTheme() {
		const next = !dark;
		setDark(next);
		localStorage.setItem("theme-dark", next ? "1" : "0");
		document.documentElement.classList.toggle("dark", next);
	}

	return (
		<nav className={cn("sticky top-0 z-40 w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-900/70 dark:border-slate-800")}> 
			<div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
				<div className="font-bold text-slate-900 dark:text-slate-100">Finsight</div>
				<div className="flex items-center gap-3">
					<button
						className="inline-flex h-9 items-center rounded-md border px-3 text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-slate-800 dark:border-slate-700"
						onClick={toggleTheme}
					>
						{dark ? "Light" : "Dark"}
					</button>
				</div>
			</div>
		</nav>
	);
}