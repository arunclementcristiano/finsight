import React from "react";
import { cn } from "./utils";

interface ProgressProps {
	value: number; // 0-100
	label?: string;
	className?: string;
}

export function Progress({ value, label, className }: ProgressProps) {
	const clamped = Math.max(0, Math.min(100, Math.round(value)));
	return (
		<div className={cn("w-full", className)}>
			<div className="flex items-center justify-between text-sm text-gray-600 mb-1">
				{label ? <span>{label}</span> : <span />}
				<span>{clamped}%</span>
			</div>
			<div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
				<div
					className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all"
					style={{ width: `${clamped}%` }}
				/>
			</div>
		</div>
	);
}