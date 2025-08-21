"use client";
import React, { useState } from "react";
import QuestionCard from "../components/QuestionCard";
import { questions } from "../domain/questionnaire";
import ProgressBar from "../components/ProgressBar";
import { buildPlan } from "../domain/allocationEngine";
import { useRouter } from "next/navigation";
import { useApp } from "../../store";
import { Button } from "../../components/Button";

export default function Questionnaire() {
	const router = useRouter();
	const { questionnaire, setQuestionAnswer, setPlan } = useApp();
	const [step, setStep] = useState(0);
	const [localPlan, setLocalPlan] = useState<any | null>(null);

	const handleAnswer = (key: string, value: string | string[]) => {
		setQuestionAnswer(key, value);
	};

	const nextStep = async () => {
		if (step === questions.length - 1) {
			const allocation = buildPlan(questionnaire);
			setLocalPlan(allocation);
			setPlan(allocation);
			try {
				let pid = (useApp.getState() as any).activePortfolioId as string | undefined;
				if (!pid) {
					const created = await (await fetch('/api/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'My Portfolio' }) })).json();
					pid = created?.portfolioId;
					if (pid) (useApp.getState() as any).setActivePortfolio(pid);
				}
				if (pid) {
					await fetch('/api/portfolio/plan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portfolioId: pid, plan: allocation }) });
				}
			} catch {}
			router.push("/PortfolioManagement/Plan");
		} else {
			setStep(s => Math.min(questions.length - 1, s + 1));
		}
	};
	const prevStep = () => setStep(s => Math.max(0, s - 1));

	return (
		<div className="mx-auto max-w-2xl">
			<ProgressBar current={step + 1} total={questions.length} />
			<>
				<QuestionCard
					questionText={questions[step].text}
					options={questions[step].options}
					selected={questionnaire[questions[step].key]}
					onChange={(value) => handleAnswer(questions[step].key, value)}
					multiSelect={questions[step].key === 'avoidAssets' || questions[step].key === 'emphasizeAssets'}
					helperText={(questions[step] as any)?.helperText}
					maxSelect={(questions[step] as any)?.maxSelect}
				/>
				<div className="flex justify-between w-full mt-8 gap-3">
					<Button variant="secondary" onClick={prevStep} disabled={step === 0}>Back</Button>
					<Button onClick={nextStep} disabled={!questionnaire[questions[step].key] && (questions[step].key !== 'avoidAssets' && questions[step].key !== 'emphasizeAssets')}>
						{step === questions.length - 1 ? "Submit" : "Next"}
					</Button>
				</div>
			</>
		</div>
	);
}