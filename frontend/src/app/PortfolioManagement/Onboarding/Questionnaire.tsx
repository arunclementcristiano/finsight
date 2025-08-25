"use client";
import React, { useState } from "react";
import QuestionCard from "../components/QuestionCard";
import { questions } from "../domain/questionnaire";
import ProgressBar from "../components/ProgressBar";
import { buildPlan, QuestionnaireAnswers } from "../domain/allocationEngine";
import { useRouter } from "next/navigation";
import { useApp } from "../../store";
import { Button } from "../../components/Button";

export default function Questionnaire() {
	const router = useRouter();
	const { questionnaire, setQuestionAnswer, setPlan } = useApp();
	const [step, setStep] = useState(0);
	const [localPlan, setLocalPlan] = useState<any | null>(null);

	const handleAnswer = (key: string, value: string | string[] | number) => {
		setQuestionAnswer(key, value);
	};

	const validateAnswers = (): QuestionnaireAnswers | null => {
		try {
			// Convert questionnaire answers to the expected format
			const answers: QuestionnaireAnswers = {
				// Demographics & Time Horizon
				age: questionnaire.age as QuestionnaireAnswers["age"],
				investmentHorizon: questionnaire.investmentHorizon as QuestionnaireAnswers["investmentHorizon"],
				targetRetirementAge: questionnaire.targetRetirementAge as QuestionnaireAnswers["targetRetirementAge"],
				
				// Financial Situation
				annualIncome: questionnaire.annualIncome as QuestionnaireAnswers["annualIncome"],
				investmentAmount: Number(questionnaire.investmentAmount) || 100000,
				existingInvestments: questionnaire.existingInvestments as QuestionnaireAnswers["existingInvestments"],
				emergencyFundMonths: questionnaire.emergencyFundMonths as QuestionnaireAnswers["emergencyFundMonths"],
				dependents: questionnaire.dependents as QuestionnaireAnswers["dependents"],
				monthlyObligations: questionnaire.monthlyObligations as QuestionnaireAnswers["monthlyObligations"],
				
				// Risk Tolerance
				volatilityComfort: questionnaire.volatilityComfort as QuestionnaireAnswers["volatilityComfort"],
				maxAcceptableLoss: questionnaire.maxAcceptableLoss as QuestionnaireAnswers["maxAcceptableLoss"],
				investmentKnowledge: questionnaire.investmentKnowledge as QuestionnaireAnswers["investmentKnowledge"],
				previousLosses: questionnaire.previousLosses as QuestionnaireAnswers["previousLosses"],
				
				// Goals & Objectives
				primaryGoal: questionnaire.primaryGoal as QuestionnaireAnswers["primaryGoal"],
				expectedReturn: questionnaire.expectedReturn as QuestionnaireAnswers["expectedReturn"],
				liquidityNeeds: questionnaire.liquidityNeeds as QuestionnaireAnswers["liquidityNeeds"],
				esgPreference: questionnaire.esgPreference as QuestionnaireAnswers["esgPreference"],
				
				// Additional Context
				jobStability: questionnaire.jobStability as QuestionnaireAnswers["jobStability"],
				withdrawalNext2Years: questionnaire.withdrawalNext2Years === "Yes",
				hasInsurance: questionnaire.hasInsurance === "Yes",
				avoidAssets: Array.isArray(questionnaire.avoidAssets) ? questionnaire.avoidAssets : []
			};

			// Validate required fields
			const requiredFields = [
				'age', 'investmentHorizon', 'targetRetirementAge', 'annualIncome', 'investmentAmount',
				'existingInvestments', 'emergencyFundMonths', 'dependents', 'monthlyObligations',
				'volatilityComfort', 'maxAcceptableLoss', 'investmentKnowledge', 'previousLosses',
				'primaryGoal', 'expectedReturn', 'liquidityNeeds', 'esgPreference', 'jobStability',
				'withdrawalNext2Years', 'hasInsurance'
			];

			for (const field of requiredFields) {
				const value = answers[field as keyof QuestionnaireAnswers];
				if (value === undefined || value === null || 
					(typeof value === 'number' && value === 0)) {
					console.error(`Missing required field: ${field}`);
					return null;
				}
			}

			return answers;
		} catch (error) {
			console.error("Error validating answers:", error);
			return null;
		}
	};

	const nextStep = async () => {
		if (step === questions.length - 1) {
			const validatedAnswers = validateAnswers();
			if (!validatedAnswers) {
				alert("Please complete all required questions before submitting.");
				return;
			}

			try {
				const allocation = buildPlan(validatedAnswers);
				setLocalPlan(allocation);
				setPlan(allocation);
				
				// Create portfolio if needed
				let pid = (useApp.getState() as any).activePortfolioId as string | undefined;
				if (!pid) {
					const created = await (await fetch('/api/portfolio', { 
						method: 'POST', 
						headers: { 'Content-Type': 'application/json' }, 
						body: JSON.stringify({ name: 'My Portfolio' }) 
					})).json();
					pid = created?.portfolioId;
					if (pid) (useApp.getState() as any).setActivePortfolio(pid);
				}
				
				router.push("/PortfolioManagement/Plan");
			} catch (error) {
				console.error("Error building plan:", error);
				alert("Error generating allocation plan. Please try again.");
			}
		} else {
			setStep(s => Math.min(questions.length - 1, s + 1));
		}
	};

	const prevStep = () => setStep(s => Math.max(0, s - 1));

	const isCurrentQuestionValid = () => {
		const currentQuestion = questions[step];
		const answer = questionnaire[currentQuestion.key];
		
		if (currentQuestion.optional) return true;
		if (currentQuestion.key === 'avoidAssets') return true; // Optional multi-select
		
		return answer !== undefined && answer !== null && answer !== "";
	};

	return (
		<div className="mx-auto max-w-2xl">
			<ProgressBar current={step + 1} total={questions.length} />
			<>
				<QuestionCard
					questionText={questions[step].text}
					options={questions[step].options}
					selected={questionnaire[questions[step].key]}
					onChange={(value) => handleAnswer(questions[step].key, value)}
					multiSelect={questions[step].key === 'avoidAssets'}
					helperText={questions[step].helperText}
					maxSelect={questions[step].maxSelect}
					type={questions[step].type}
				/>
				<div className="flex justify-between w-full mt-8 gap-3">
					<Button variant="secondary" onClick={prevStep} disabled={step === 0}>Back</Button>
					<Button onClick={nextStep} disabled={!isCurrentQuestionValid()}>
						{step === questions.length - 1 ? "Submit" : "Next"}
					</Button>
				</div>
			</>
		</div>
	);
}