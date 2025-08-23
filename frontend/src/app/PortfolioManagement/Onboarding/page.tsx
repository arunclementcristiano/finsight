import Questionnaire from "./Questionnaire";

export default function PortfolioManagementOnboardingPage() {
	return (
		<div className="min-h-screen bg-background text-foreground transition-colors">
			<div className="mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-10">
				<div className="mb-8 text-center">
					<div className="text-5xl sm:text-6xl mb-4">🎯</div>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Let's Build Your Plan</h1>
					<p className="mt-3 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
						Answer a few quick questions to generate your personalized investment allocation plan tailored to your goals and risk preferences.
					</p>
				</div>
				<Questionnaire />
			</div>
		</div>
	);
}
