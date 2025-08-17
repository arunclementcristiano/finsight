import Questionnaire from "./Questionnaire";

export default function PortfolioManagementOnboardingPage() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-950">
			<div className="mx-auto max-w-3xl px-4 py-10">
				<div className="mb-8 text-center">
					<h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Onboarding Questionnaire</h1>
					<p className="mt-2 text-slate-600 dark:text-slate-400">Answer a few quick questions to generate your personalized allocation plan.</p>
				</div>
				<Questionnaire />
			</div>
		</div>
	);
}
