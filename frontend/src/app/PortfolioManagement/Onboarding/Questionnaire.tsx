"use client";
import React, { useState } from "react";
import QuestionCard from "../components/QuestionCard";
import { questions } from "../domain/questionnaire";
import ProgressBar from "../components/ProgressBar";
import { buildPlan } from "../domain/allocationEngine";
import { useRouter } from "next/navigation";
import Summary from "./Summary";

export default function Questionnaire() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({ preferredAssets: [] });
  const [plan, setPlan] = useState<any | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const router = useRouter();

  const handleAnswer = (key: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    if (step === questions.length - 1) {
      const allocation = buildPlan(answers);
      setPlan(allocation);
      setShowSummary(true);
      // Optionally, you can use router.push("/PortfolioManagement/Onboarding/Summary") and persist plan in a global store
    } else {
      setStep(s => Math.min(questions.length - 1, s + 1));
    }
  };
  const prevStep = () => setStep(s => Math.max(0, s - 1));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-green-100 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
        <ProgressBar current={step + 1} total={questions.length} />
        {showSummary && plan ? (
          <Summary plan={plan} />
        ) : (
          <>
            <QuestionCard
              questionText={questions[step].text}
              options={questions[step].options}
              selected={answers[questions[step].key]}
              onChange={(value) => handleAnswer(questions[step].key, value)}
              multiSelect={questions[step].key === "preferredAssets"}
            />
            <div className="flex justify-between w-full mt-8">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                onClick={prevStep}
                disabled={step === 0}
              >
                Back
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
                onClick={nextStep}
                disabled={questions[step].key === "preferredAssets"
                  ? !answers["preferredAssets"] || (Array.isArray(answers["preferredAssets"]) && answers["preferredAssets"].length === 0)
                  : !answers[questions[step].key]}
              >
                {step === questions.length - 1 ? "Submit" : "Next"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
