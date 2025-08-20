import React from "react";
import { cn } from "./utils";

interface ProgressProps {
	value: number; // 0-100
	label?: string;
	className?: string;
	barClassName?: string; // optional override for the inner bar color
}

export function Progress({ value, label, className, barClassName }: ProgressProps) {
	const clamped = Math.max(0, Math.min(100, Math.round(value)));
	return (
		<div className={cn("w-full", className)}>
			<div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
				{label ? <span>{label}</span> : <span />}
				<span>{clamped}%</span>
			</div>
			<div className="h-2 w-full rounded-full bg-muted overflow-hidden">
				<div
					className={cn(
						"h-2 rounded-full transition-all",
						barClassName ? barClassName : "bg-gradient-to-r from-emerald-500 via-indigo-500 to-indigo-600"
					)}
					style={{ width: `${clamped}%` }}
				/>
			</div>
		</div>
	);
}