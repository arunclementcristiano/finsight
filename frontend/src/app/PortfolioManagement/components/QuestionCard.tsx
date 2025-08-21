import React from "react";
import { Card, CardContent } from "../../components/Card";
import { Info } from "lucide-react";

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
					{options.map(option => (
						<button
							key={option}
							className={`rounded-xl ${compact ? "p-3 text-sm" : "p-4"} border transition-colors font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] ${isSelected(option) ? "border-indigo-400 bg-indigo-50/70 dark:bg-indigo-900/20 text-foreground" : "border-border bg-card text-foreground hover:bg-muted"}`}
							onClick={() => handleClick(option)}
						>
							{option}
						</button>
					))}
				</div>
			</CardContent>
		</Card>
	);
}