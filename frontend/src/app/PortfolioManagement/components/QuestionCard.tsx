import React from "react";
import { Card, CardContent } from "../../components/Card";
import { Info, Check } from "lucide-react";

interface QuestionCardProps {
	questionText: string;
	options: string[];
	selected: string | string[];
	onChange: (value: string | string[]) => void;
	multiSelect?: boolean;
	helperText?: string;
	maxSelect?: number;
  compact?: boolean;
}

export default function QuestionCard({ questionText, options, selected, onChange, multiSelect, helperText, maxSelect, compact }: QuestionCardProps) {
	const isSelected = (option: string) => {
		if (multiSelect && Array.isArray(selected)) return selected.includes(option);
		return selected === option;
	};

	const handleClick = (option: string) => {
		if (multiSelect && Array.isArray(selected)) {
			if (selected.includes(option)) onChange(selected.filter((o: string) => o !== option));
			else {
				if (maxSelect && selected.length >= maxSelect) return;
				onChange([...selected, option]);
			}
		} else {
			onChange(option);
		}
	};

	return (
		<Card className="w-full">
			<CardContent>
				<div className={`${compact ? "mb-1 text-base" : "mb-2 text-lg"} font-semibold`}>{questionText}</div>
				{helperText && (
					<div className={`inline-flex items-center gap-1 ${compact ? "mb-2 text-[11px]" : "mb-4 text-xs"} text-muted-foreground`}><Info className="h-3.5 w-3.5"/>{helperText}</div>
				)}
				<div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? "gap-2" : "gap-3"}`}>
					{options.map(option => {
						const active = isSelected(option);
						return (
							<button
								key={option}
								onClick={() => handleClick(option)}
								className={`group rounded-xl ${compact ? "p-3 text-sm" : "p-4"} border font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-all duration-200 ${active ? "border-transparent bg-gradient-to-r from-indigo-500 to-emerald-500 text-white shadow-[0_0_0_3px_rgba(99,102,241,0.2)]" : "border-border bg-card text-foreground hover:bg-muted"}`}
							>
								<span className="inline-flex items-center gap-2">
									{active ? <Check className="h-4 w-4" /> : null}
									{option}
								</span>
							</button>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}