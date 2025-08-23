import React from "react";
import { Progress } from "../../components/Progress";

interface ProgressBarProps {
	current: number;
	total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
	const percent = Math.round((current / total) * 100);
	return (
		<div className="w-full mb-8">
			<div className="flex items-center justify-between mb-3">
				<span className="text-sm font-medium text-muted-foreground">
					Question {current} of {total}
				</span>
				<span className="text-sm font-medium text-muted-foreground">
					{percent}% Complete
				</span>
			</div>
			<Progress value={percent} className="h-2 transition-all duration-300" />
			<div className="flex justify-center mt-3">
				<span className="text-xs text-muted-foreground">
					{total - current} questions remaining
				</span>
			</div>
		</div>
	);
}
