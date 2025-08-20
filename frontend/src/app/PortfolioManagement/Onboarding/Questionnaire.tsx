"use client";
import React, { useState } from "react";
import QuestionCard from "../components/QuestionCard";
import { questions } from "../domain/questionnaire";
import ProgressBar from "../components/ProgressBar";
import { buildPlan } from "../domain/allocationEngine";
import { useRouter } from "next/navigation";
import Summary from "./Summary";
import { useApp } from "../../store";
import { Button } from "../../components/Button";

export default function Questionnaire() {
	const router = useRouter();
	const { questionnaire, setQuestionAnswer, setPlan } = useApp();
	const [step, setStep] = useState(0);
	const [localPlan, setLocalPlan] = useState<any | null>(null);
	const [showSummary, setShowSummary] = useState(false);

	const handleAnswer = (key: string, value: string | string[]) => {
		setQuestionAnswer(key, value);
	};

	const nextStep = () => {
		if (step === questions.length - 1) {
			const allocation = buildPlan(questionnaire);
			setLocalPlan(allocation);
			setPlan(allocation);
			setShowSummary(true);
		} else {
			setStep(s => Math.min(questions.length - 1, s + 1));
		}
	};
	const prevStep = () => setStep(s => Math.max(0, s - 1));

	return (
		<div className="mx-auto max-w-2xl">
			<ProgressBar current={showSummary ? questions.length : step + 1} total={questions.length} />
			{showSummary && localPlan ? (
				<Summary plan={localPlan} />
			) : (
				<>
					<QuestionCard
						questionText={questions[step].text}
						options={questions[step].options}
						selected={questionnaire[questions[step].key]}
						onChange={(value) => handleAnswer(questions[step].key, value)}
						multiSelect={questions[step].key === "preferredAssets"}
						helperText={(questions[step] as any)?.helperText}
						maxSelect={(questions[step] as any)?.maxSelect}
					/>
					<div className="flex justify-between w-full mt-8 gap-3">
						<Button variant="secondary" onClick={prevStep} disabled={step === 0}>Back</Button>
						<Button onClick={nextStep} disabled={questions[step].key === "preferredAssets"
							? !questionnaire["preferredAssets"] || (Array.isArray(questionnaire["preferredAssets"]) && questionnaire["preferredAssets"].length === 0)
							: !questionnaire[questions[step].key]}>
							{step === questions.length - 1 ? "Submit" : "Next"}
						</Button>
					</div>
				</>
			)}
		</div>
	);
}
