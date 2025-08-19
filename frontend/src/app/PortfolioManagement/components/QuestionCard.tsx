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
			<CardContent>
				<div className="mb-4 text-lg font-semibold">{questionText}</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{options.map(option => (
						<button
							key={option}
							className={`rounded-xl p-4 border transition-colors font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] ${isSelected(option) ? "border-[var(--color-ring)] bg-muted/40 text-foreground" : "border-border bg-card text-foreground hover:bg-muted"}`}
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