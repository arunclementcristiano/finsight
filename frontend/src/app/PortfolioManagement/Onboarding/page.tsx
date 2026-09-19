import Questionnaire from "./Questionnaire";

export default function PortfolioManagementOnboardingPage() {
	return (
		<div className="min-w-0 space-y-5">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h1 className="text-sm font-medium text-muted-foreground">Onboarding Questionnaire</h1>
				</div>
			</div>
			<Questionnaire />
		</div>
	);
}
