"use client";
import React, { useEffect, useState } from "react";
import { useApp } from "../../store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Button } from "../../components/Button";
import { useRouter } from "next/navigation";
import PlanSummary from "../components/PlanSummary";
import QuestionCard from "../components/QuestionCard";
import { questions } from "../domain/questionnaire";
import { buildPlan } from "../domain/allocationEngine";
import { Modal } from "../../components/Modal";
import { RotateCcw, Save as SaveIcon } from "lucide-react";

export default function PlanPage() {
	const { plan, setPlan, activePortfolioId, questionnaire, setQuestionAnswer } = useApp() as any;
	const router = useRouter();
	const [local, setLocal] = useState<any | null>(plan || null);
	const [aiLoading, setAiLoading] = useState(false);
	const [aiInfo, setAiInfo] = useState<{ rationale?: string; confidence?: number } | null>(null);
	const [answersOpen, setAnswersOpen] = useState(false);
	const [ansStep, setAnsStep] = useState(0);
	const [editAnswers, setEditAnswers] = useState<any>({});
	const [lastRefSig, setLastRefSig] = useState<string | null>(null);
	const [toast, setToast] = useState<{ msg: string; type: 'success'|'info'|'error' } | null>(null);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 2200);
		return () => clearTimeout(t);
	}, [toast]);

	function makeAnswersSig(q: any): string {
		try { return JSON.stringify({ q }); } catch { return ""; }
	}

	useEffect(() => { setLocal(plan || null); }, [plan]);

	if (!plan) {
		return (
			<div className="max-w-3xl mx-auto">
				<Card>
					<CardHeader>
						<CardTitle>No Saved Allocation Plan</CardTitle>
						<CardDescription>Complete a short questionnaire to generate a personalized allocation plan.</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={() => router.push("/PortfolioManagement/Onboarding")}>
							Start Questionnaire
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto space-y-4">
			<div className="flex items-center justify-between">
				<div className="text-sm text-muted-foreground">Allocation Plan</div>
				<div className="flex items-center gap-2">
					{(() => { const prune = (p:any)=> ({riskLevel:p?.riskLevel, buckets:(p?.buckets||[]).map((b:any)=>({class:b.class, pct:b.pct}))}); const dirty = local && plan && JSON.stringify(prune(local)) !== JSON.stringify(prune(plan)); return dirty ? (<span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Unsaved changes</span>) : null; })()}
					<Button variant="outline" leftIcon={<RotateCcw className="h-4 w-4 text-rose-600" />} onClick={()=> setLocal(plan)}>Reset</Button>
					<Button variant="outline" leftIcon={<SaveIcon className="h-4 w-4 text-emerald-600" />} onClick={async ()=>{
						const prune = (p:any)=> ({riskLevel:p?.riskLevel, buckets:(p?.buckets||[]).map((b:any)=>({class:b.class, pct:b.pct}))});
						const dirty = !!(local && plan && JSON.stringify(prune(local)) !== JSON.stringify(prune(plan)));
						if (!dirty) { setToast({ msg: 'No changes to save', type: 'info' }); return; }
						if (!activePortfolioId || !local) return;
						await fetch('/api/portfolio/plan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portfolioId: activePortfolioId, plan: local }) });
						setPlan(local);
						setToast({ msg: 'Plan saved', type: 'success' });
					}}>Save Plan</Button>
				</div>
			</div>

			{/* Edit Answers Modal */}
			<Modal open={answersOpen} onClose={()=> setAnswersOpen(false)} title="Edit Answers" footer={(
				<>
					<Button variant="outline" onClick={()=> setAnswersOpen(false)}>Cancel</Button>
					<Button variant="outline" onClick={()=>{
						const prev = questionnaire || {};
						const next = editAnswers || {};
						const changed = JSON.stringify(prev) !== JSON.stringify(next);
						if (changed) {
							const keys = Object.keys(next);
							for (const k of keys) setQuestionAnswer(k, next[k]);
							const allocation = buildPlan(next);
							setLocal(allocation);
							setAiInfo(null);
							setLastRefSig(null);
						}
						setAnswersOpen(false);
					}}>Done</Button>
				</>
			)}>
				<div className="space-y-3">
					<QuestionCard
						questionText={questions[ansStep].text}
						options={questions[ansStep].options as any}
						selected={editAnswers[questions[ansStep].key]}
						onChange={(value: any) => setEditAnswers((prev:any)=> ({ ...(prev||{}), [questions[ansStep].key]: value }))}
						multiSelect={questions[ansStep].key === 'preferredAssets'}
						helperText={(questions[ansStep] as any)?.helperText}
						maxSelect={(questions[ansStep] as any)?.maxSelect}
						compact
					/>
					<div className="flex items-center justify-between">
						<Button variant="outline" onClick={()=> setAnsStep(s=> Math.max(0, s-1))} disabled={ansStep===0}>Back</Button>
						<div className="flex items-center gap-2">
							<Button variant="outline" onClick={()=> setAnsStep(s=> Math.min(questions.length-1, s+1))} disabled={ansStep===questions.length-1}>Next</Button>
						</div>
					</div>
				</div>
			</Modal>

			<PlanSummary
				plan={local}
				onEditAnswers={()=>{ setEditAnswers({ ...(questionnaire||{}) }); setAnsStep(0); setAnswersOpen(true); }}
				onBuildBaseline={()=>{ const allocation = buildPlan(questionnaire); setLocal(allocation); setAiInfo(null); }}
				onRefine={async ()=>{
					try {
						setAiLoading(true);
						const baseline = buildPlan(questionnaire);
						const sig = makeAnswersSig(questionnaire);
						if (sig && sig === lastRefSig) { return; }
						const res = await fetch('/api/plan/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionnaire, baseline }) });
						const data = await res.json();
						if (data?.aiPlan?.buckets) {
							setLocal((prev: any)=> ({ ...(prev||{}), buckets: data.aiPlan.buckets }));
							setAiInfo({ rationale: data.rationale, confidence: data.confidence });
							setLastRefSig(sig);
						}
					} finally { setAiLoading(false); }
				}}
				onChangeBucketPct={(idx: number, newPct: number)=>{
					const next = { ...(local||{}) } as any;
					next.buckets = [...(local?.buckets||[])];
					if (next.buckets[idx]) next.buckets[idx] = { ...next.buckets[idx], pct: newPct };
					setLocal(next);
				}}
			/>
			{toast && (
				<div className={`fixed bottom-4 right-4 z-50 rounded-md border px-3 py-2 text-sm shadow-lg ${toast.type==='success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : toast.type==='info' ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
					{toast.msg}
				</div>
			)}
		</div>
	);
}