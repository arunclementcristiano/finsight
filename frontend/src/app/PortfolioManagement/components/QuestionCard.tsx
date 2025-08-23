import React from "react";
import { Card, CardContent } from "../../components/Card";

interface QuestionCardProps {
	questionText: string;
	options: string[];
	selected: string | string[];
	onChange: (value: string | string[]) => void;
	multiSelect?: boolean;
}

export default function QuestionCard({ questionText, options, selected, onChange, multiSelect }: QuestionCardProps) {
	const isSelected = (option: string) => {
		if (multiSelect && Array.isArray(selected)) return selected.includes(option);
		return selected === option;
	};

	const handleClick = (option: string) => {
		if (multiSelect && Array.isArray(selected)) {
			if (selected.includes(option)) onChange(selected.filter((o: string) => o !== option));
			else onChange([...selected, option]);
		} else {
			onChange(option);
		}
	};

	return (
		<Card className="w-full">
			<CardContent className="p-6">
				<div className="mb-6 text-xl font-semibold leading-tight text-center sm:text-left">{questionText}</div>
				<div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
					{options.map(option => (
						<button
							key={option}
							className={`w-full rounded-xl p-4 sm:p-3 border transition-all font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] touch-manipulation min-h-[3rem] sm:min-h-[2.5rem] ${
								isSelected(option) 
									? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 scale-[0.98] shadow-lg" 
									: "border-border bg-card text-foreground hover:bg-muted hover:border-muted-foreground/20 active:scale-[0.99]"
							}`}
							onClick={() => handleClick(option)}
						>
							<span className="flex items-center justify-center gap-2">
								{isSelected(option) && <span className="text-emerald-600">✓</span>}
								{option}
							</span>
						</button>
					))}
				</div>
				{multiSelect && (
					<div className="mt-4 text-center text-sm text-muted-foreground">
						💡 You can select multiple options
					</div>
				)}
			</CardContent>
		</Card>
	);
}