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
import { RotateCcw, Save as SaveIcon, AlertTriangle } from "lucide-react";

export default function PlanPage() {
	const { plan, setPlan, activePortfolioId, questionnaire, setQuestionAnswer } = useApp() as any;
	const router = useRouter();
	const [local, setLocal] = useState<any | null>(plan || null);
	const [aiLoading, setAiLoading] = useState(false);
	const [aiInfo, setAiInfo] = useState<{ rationale?: string; confidence?: number } | null>(null);
	const [answersOpen, setAnswersOpen] = useState(false);
	const [ansStep, setAnsStep] = useState(0);
	const [editAnswers, setEditAnswers] = useState<any>({});
	const [toast, setToast] = useState<{ msg: string; type: 'success'|'info'|'error' } | null>(null);
	const [aiViewOn, setAiViewOn] = useState(false);
	const [aiCache, setAiCache] = useState<Record<string, { buckets: any[]; explanation?: string }>>({});
	const [aiSummary, setAiSummary] = useState<string | undefined>(undefined);
	const [answersDrift, setAnswersDrift] = useState(false);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 2200);
		return () => clearTimeout(t);
	}, [toast]);

	function makeAnswersSig(q: any): string {
		try { return JSON.stringify({ q }); } catch { return ""; }
	}
	function makeSummary(baseline: any, aiBuckets: any[]): string {
		try {
			const baseMap: Record<string, number> = {};
			for (const b of (baseline?.buckets||[])) baseMap[b.class] = b.pct;
			const deltas = aiBuckets.map(b=> ({ cls: b.class as string, d: Math.round((b.pct - (baseMap[b.class]||0))) }));
			const ups = deltas.filter(x=> x.d>0).sort((a,b)=> b.d - a.d).slice(0,2);
			const downs = deltas.filter(x=> x.d<0).sort((a,b)=> a.d - b.d).slice(0,2);
			const parts: string[] = [];
			if (ups.length) parts.push(`nudges up ${ups.map(x=>`${x.cls} ${x.d}%`).join(", ")}`);
			if (downs.length) parts.push(`and trims ${downs.map(x=>`${x.cls} ${Math.abs(x.d)}%`).join(", ")}`);
			return parts.length ? `AI gently ${parts.join(" ")}, keeping your risk in check.` : `AI keeps your mix steady with minor refinements.`;
		} catch { return "AI refined your mix for balance and resilience."; }
	}

	useEffect(() => {
		setLocal(plan || null);
		const on = !!(plan && (plan as any).origin === 'ai');
		setAiViewOn(on);
		const sigSaved = (plan as any)?.answersSig;
		const sigNow = makeAnswersSig(questionnaire);
		const driftNow = !!(sigSaved && sigNow && sigSaved !== sigNow);
		setAnswersDrift(driftNow);
		if (driftNow) {
			const allocation = buildPlan(questionnaire);
			setLocal(allocation);
			setAiViewOn(false);
			setAiSummary(undefined);
			return;
		}
		if (on && sigSaved && sigSaved === sigNow && (plan as any)?.buckets) {
			const baseline = buildPlan(questionnaire);
			setAiSummary(makeSummary(baseline, (plan as any).buckets));
		}
	}, [plan]);

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
				<div className="flex items-center gap-2">
					<div className="text-sm text-muted-foreground">Allocation Plan</div>
					{answersDrift ? (
						<span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[11px]">
							<span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
							<span className="text-amber-600">Profile edits not saved — plan recalculated</span>
						</span>
					) : null}
				</div>
				<div className="flex items-center gap-2">
					{(() => { const prune = (p:any)=> ({riskLevel:p?.riskLevel, buckets:(p?.buckets||[]).map((b:any)=>({class:b.class, pct:b.pct}))}); const dirty = local && plan && JSON.stringify(prune(local)) !== JSON.stringify(prune(plan)); return dirty ? (<span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Unsaved changes</span>) : null; })()}
					<Button variant="outline" leftIcon={<RotateCcw className="h-4 w-4 text-rose-600" />} onClick={()=> { 
						const snap = (plan as any)?.answersSnapshot || {}; 
						Object.keys(snap).forEach(k=> setQuestionAnswer(k, (snap as any)[k])); 
						setLocal(plan); 
						setAiViewOn(!!((plan as any)?.origin === 'ai')); 
						// Optional: recompute summary if AI view is on
						try { if ((plan as any)?.origin === 'ai') { const baseline = buildPlan(snap); setAiSummary(makeSummary(baseline, (plan as any)?.buckets||[])); } else { setAiSummary(undefined); } } catch { setAiSummary(undefined); } 
						setAnswersDrift(false); 
					}}>Reset</Button>
					<Button variant="outline" leftIcon={<SaveIcon className="h-4 w-4 text-emerald-600" />} onClick={async ()=>{
						const prune = (p:any)=> ({riskLevel:p?.riskLevel, buckets:(p?.buckets||[]).map((b:any)=>({class:b.class, pct:b.pct}))});
						const dirty = !!(local && plan && JSON.stringify(prune(local)) !== JSON.stringify(prune(plan)));
						if (!dirty) { setToast({ msg: 'No changes to save', type: 'info' }); return; }
						if (!activePortfolioId || !local) return;
						const origin = aiViewOn ? 'ai' : 'engine';
						const planToSave = { ...(local||{}), origin, answersSig: makeAnswersSig(questionnaire), answersSnapshot: questionnaire, policyVersion: 'v1' };
						await fetch('/api/portfolio/plan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portfolioId: activePortfolioId, plan: planToSave }) });
						setPlan(planToSave);
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
							setAiViewOn(false);
							setAnswersDrift(true);
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
						multiSelect={questions[ansStep].key === 'avoidAssets' || questions[ansStep].key === 'emphasizeAssets'}
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
				onBuildBaseline={()=>{ const allocation = buildPlan(questionnaire); setLocal(allocation); setAiInfo(null); setAiSummary(undefined); setAiViewOn(false); setAnswersDrift(false); }}
				onChangeBucketPct={(idx: number, newPct: number)=>{
					const next = { ...(local||{}) } as any;
					next.buckets = [...(local?.buckets||[])];
					if (next.buckets[idx]) next.buckets[idx] = { ...next.buckets[idx], pct: newPct };
					setLocal(next);
				}}
				aiViewOn={aiViewOn}
				onToggleAiView={()=>{
					const sig = makeAnswersSig(questionnaire);
					if (!aiViewOn) {
						if (sig && aiCache[sig]) {
							setLocal((prev:any)=> ({ ...(prev||{}), buckets: aiCache[sig].buckets }));
							setAiSummary(makeSummary(buildPlan(questionnaire), aiCache[sig].buckets));
							setAiViewOn(true);
							setAiInfo({ rationale: aiCache[sig].explanation, confidence: aiInfo?.confidence });
							return;
						}
						(async ()=>{
							try {
								setAiLoading(true);
								const baseline = buildPlan(questionnaire);
								const res = await fetch('/api/plan/suggest?debug=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionnaire, baseline }) });
								const data = await res.json();
								if (data?.aiPlan?.buckets) {
									setLocal((prev:any)=> ({ ...(prev||{}), buckets: data.aiPlan.buckets }));
									setAiInfo({ rationale: data.explanation || data.rationale, confidence: data.confidence });
									setAiCache((prev)=> ({ ...prev, [sig]: { buckets: data.aiPlan.buckets, explanation: data.explanation || data.rationale } }));
									setAiSummary(makeSummary(baseline, data.aiPlan.buckets));
									setAiViewOn(true);
								}
							} finally { setAiLoading(false); }
						})();
					} else {
						const allocation = buildPlan(questionnaire);
						setLocal(allocation);
						setAiSummary(undefined);
						setAiViewOn(false);
					}
				}}
				aiLoading={aiLoading}
				aiExplanation={aiInfo?.rationale as any}
				aiSummary={aiSummary as any}
			/>
			{toast && (
				<div className={`fixed bottom-4 right-4 z-50 rounded-md border px-3 py-2 text-sm shadow-lg ${toast.type==='success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : toast.type==='info' ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
					{toast.msg}
				</div>
			)}
		</div>
	);
}