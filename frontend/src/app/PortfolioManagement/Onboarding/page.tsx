import Questionnaire from "./Questionnaire";

export default function PortfolioManagementOnboardingPage() {
	return (
		<div className="min-h-screen bg-background text-foreground transition-colors">
			<div className="mx-auto max-w-3xl px-4 py-10">
				<div className="mb-8 text-center">
					<h1 className="text-3xl font-bold tracking-tight">Onboarding Questionnaire</h1>
					<p className="mt-2 text-muted-foreground">Answer a few quick questions to generate your personalized allocation plan.</p>
				</div>
				<Questionnaire />
			</div>
		</div>
	);
}
