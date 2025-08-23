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
import { RotateCcw, Save as SaveIcon, AlertTriangle, ShieldOff } from "lucide-react";
import { pruneQuestionnaire, stableAnswersSig } from "../domain/answersUtil";
import { advisorTune } from "../domain/advisorTune";

export default function PlanPage() {
	const { plan, setPlan, activePortfolioId, questionnaire, setQuestionAnswer, getCustomDraft, setCustomDraft, getCustomLocks, setCustomLocks } = useApp() as any;
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
	const [mode, setMode] = useState<'advisor'|'custom'>('advisor');
	const [customLocks, setLocalCustomLocks] = useState<Record<string, boolean>>({});

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 2200);
		return () => clearTimeout(t);
	}, [toast]);

	function makeAnswersSig(q: any): string {
		try { return stableAnswersSig(q); } catch { try { return JSON.stringify({ q }); } catch { return ""; } }
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
		const origin = (plan as any)?.origin;
		setMode(origin === 'custom' ? 'custom' : 'advisor');
		const on = !!(plan && origin === 'ai');
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
		// Load persisted custom draft/locks if in custom mode
		try {
			if (origin === 'custom' && activePortfolioId) {
				const draft = getCustomDraft(activePortfolioId);
				if (draft) setLocal(draft);
				const locks = getCustomLocks(activePortfolioId);
				if (locks) setLocalCustomLocks(locks);
			}
		} catch {}
	}, [plan]);

	function normalizeCustom(next: any, changedIndex: number, newPct: number) {
		const buckets = [...(next?.buckets||[])];
		if (!buckets[changedIndex]) return next;
		const order = buckets.map((b:any)=> b.class as string);
		// Apply new value to changed bucket
		buckets[changedIndex] = { ...buckets[changedIndex], pct: newPct };
		// Compute totals
		const lockedSet = new Set(Object.entries(customLocks).filter(([k,v])=> !!v).map(([k])=> k));
		const sumLocked = buckets.reduce((s:number,b:any)=> s + (lockedSet.has(b.class) ? (b.pct||0) : 0), 0);
		const unlockedIdx = buckets.map((b:any, i:number)=> (!lockedSet.has(b.class) && i!==changedIndex) ? i : -1).filter(i=> i>=0);
		const sumUnlockedOthers = unlockedIdx.reduce((s:number,i:number)=> s + (buckets[i].pct||0), 0);
		// Target for others
		let targetOthers = Math.max(0, 100 - newPct - sumLocked);
		if (unlockedIdx.length === 0) {
			// No adjustable others: scale changed back to fit
			const allowed = Math.max(0, 100 - sumLocked);
			buckets[changedIndex] = { ...buckets[changedIndex], pct: allowed };
			targetOthers = 100 - allowed - sumLocked;
		}
		// If sumUnlockedOthers zero but we have more than one unlocked including changed, scale all unlocked including changed
		if (sumUnlockedOthers <= 0 && unlockedIdx.length > 0) {
			const unlockedAll = buckets.map((b:any,i:number)=> (!lockedSet.has(b.class)) ? i : -1).filter(i=> i>=0);
			const sumUnlockedAll = unlockedAll.reduce((s:number,i:number)=> s + (buckets[i].pct||0), 0) || 1;
			const scaleAll = (100 - sumLocked) / sumUnlockedAll;
			for (const i of unlockedAll) buckets[i] = { ...buckets[i], pct: (buckets[i].pct||0) * scaleAll };
		}
		else if (sumUnlockedOthers > 0) {
			const scale = targetOthers / sumUnlockedOthers;
			for (const i of unlockedIdx) buckets[i] = { ...buckets[i], pct: (buckets[i].pct||0) * scale };
		}
		// Largest remainder rounding preserving locked exact integers
		const cont = buckets.map((b:any)=> ({ class: b.class as string, v: b.pct||0 }));
		const floors = cont.map((x:any)=> {
			const locked = lockedSet.has(x.class);
			const fv = locked ? Math.round(x.v) : Math.floor(x.v);
			const rem = locked ? -1 : (x.v - Math.floor(x.v));
			return { class: x.class as string, f: fv, r: rem };
		});
		let leftover = 100 - floors.reduce((s,c)=> s + c.f, 0);
		floors.sort((a,b)=> (b.r - a.r) || (order.indexOf(a.class) - order.indexOf(b.class)));
		for (let i=0;i<floors.length && leftover>0;i++){
			if (floors[i].r < 0) continue; // skip locked
			floors[i].f += 1; leftover--;
		}
		floors.sort((a,b)=> order.indexOf(a.class) - order.indexOf(b.class));
		const rounded = floors.map(x=> ({ class: x.class, pct: x.f }));
		return { ...(next||{}), buckets: rounded };
	}

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
					<div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
						<Button size="sm" variant="outline" className={`rounded-none ${mode==='advisor' ? 'bg-indigo-600 text-white border-indigo-600' : ''}`} onClick={()=>{ setMode('advisor'); setAiViewOn(false); setLocal(buildPlan(questionnaire)); }}>
							<div className="flex flex-col items-start leading-tight">
								<span>Advisor</span>
								{mode==='advisor' ? <span className="text-[10px] opacity-80">Recommended</span> : null}
							</div>
						</Button>
						<Button size="sm" variant="outline" className={`rounded-none ${mode==='custom' ? 'bg-rose-600 text-white border-rose-600' : ''}`} onClick={()=>{ setMode('custom'); setAiViewOn(false); try { if (activePortfolioId) { const draft = getCustomDraft(activePortfolioId); if (draft) setLocal(draft); const locks = getCustomLocks(activePortfolioId); if (locks) setLocalCustomLocks(locks); } } catch {} }}>
							<div className="flex flex-col items-start leading-tight">
								<div className="flex items-center gap-1">
									<span>Custom</span>
									{mode==='custom' ? <ShieldOff className="h-3.5 w-3.5" /> : null}
								</div>
								{mode==='custom' ? <span className="text-[10px] opacity-80">No guardrails</span> : null}
							</div>
						</Button>
					</div>
					<Button variant="ghost" size="sm" aria-label="Reset" onClick={()=> { 
						const snap = (plan as any)?.answersSnapshot || {}; 
						Object.keys(snap).forEach(k=> setQuestionAnswer(k, (snap as any)[k])); 
						setLocal(plan); 
						setAiViewOn(!!((plan as any)?.origin === 'ai')); 
						try { if ((plan as any)?.origin === 'ai') { const baseline = buildPlan(snap); setAiSummary(makeSummary(baseline, (plan as any)?.buckets||[])); } else { setAiSummary(undefined); } } catch { setAiSummary(undefined); } 
						setAnswersDrift(false); 
					}}>
						<RotateCcw className="h-4 w-4 text-rose-600" />
					</Button>
					<div>
						<Button variant="outline" size="sm" leftIcon={<SaveIcon className="h-4 w-4" />} onClick={async ()=>{
							const pruneAlloc = (p:any)=> ({riskLevel:p?.riskLevel, buckets:(p?.buckets||[]).map((b:any)=>({class:b.class, pct:b.pct}))});
							const snapshot = pruneQuestionnaire(questionnaire);
							const answersDirty = makeAnswersSig(snapshot) !== (((plan as any)?.answersSig) || "");
							const allocDirty = !!(local && plan && JSON.stringify(pruneAlloc(local)) !== JSON.stringify(pruneAlloc(plan)));
							const dirty = answersDirty || allocDirty || (mode === 'custom' && ((plan as any)?.origin !== 'custom'));
							if (!dirty) { setToast({ msg: 'No changes to save', type: 'info' }); return; }
							if (!activePortfolioId || !local) return;
							const origin = mode === 'custom' ? 'custom' : (aiViewOn ? 'ai' : 'engine');
							if (mode === 'custom') {
								const typed = window.prompt("Custom mode: type CONFIRM to save off‑policy allocation.", "");
								if ((typed||"").toUpperCase() !== 'CONFIRM') { setToast({ msg: 'Save cancelled', type: 'info' }); return; }
							}
							const planToSave = { ...(local||{}), origin, offPolicy: mode==='custom', mode, answersSig: makeAnswersSig(snapshot), answersSnapshot: snapshot, policyVersion: 'v1' };
							await fetch('/api/portfolio/plan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portfolioId: activePortfolioId, plan: planToSave }) });
							setPlan(planToSave);
							// persist custom draft/locks if custom
							try { if (mode==='custom' && activePortfolioId) { setCustomDraft(activePortfolioId, planToSave); setCustomLocks(activePortfolioId, customLocks || {}); } } catch {}
							setToast({ msg: 'Plan saved', type: 'success' });
						}}>
							<span className="inline-flex items-center gap-2">
								<span>Save Plan</span>
								{(() => { const pruneAlloc = (p:any)=> ({riskLevel:p?.riskLevel, buckets:(p?.buckets||[]).map((b:any)=>({class:b.class, pct:b.pct}))}); const snapshot = pruneQuestionnaire(questionnaire); const answersDirty = makeAnswersSig(snapshot) !== (((plan as any)?.answersSig) || ""); const allocDirty = !!(local && plan && JSON.stringify(pruneAlloc(local)) !== JSON.stringify(pruneAlloc(plan))); const originDirty = (mode === 'custom' && ((plan as any)?.origin !== 'custom')); const dirty = answersDirty || allocDirty || originDirty; return dirty ? (<span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">changes</span>) : null; })()}
							</span>
						</Button>
					</div>
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
							if (mode === 'advisor') {
								const allocation = buildPlan(next);
								setLocal(allocation);
								setAiInfo(null);
								setAiViewOn(false);
								setAnswersDrift(true);
							}
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
					if (!next.buckets[idx]) return;
					if (mode === 'custom') {
						const tunedCustom = normalizeCustom(next, idx, newPct);
						setLocal(tunedCustom);
						try { if (activePortfolioId) setCustomDraft(activePortfolioId, tunedCustom); } catch {}
						return;
					}
					const changedClass = next.buckets[idx].class as any;
					const baseline = buildPlan(questionnaire);
					const tuned = advisorTune(baseline as any, next as any, changedClass, newPct);
					next.buckets = tuned.buckets;
					setLocal(next);
					if (tuned.clamped) setToast({ msg: 'Adjusted to comfort band', type: 'info' });
				}}
				aiViewOn={aiViewOn}
				onToggleAiView={()=>{
					if (mode === 'custom') return;
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
				mode={mode}
				aiDisabled={mode==='custom'}
				locks={customLocks}
				onToggleLock={(cls:string)=> { setLocalCustomLocks(prev=> ({ ...(prev||{}), [cls]: !prev?.[cls] })); try { if (activePortfolioId) setCustomLocks(activePortfolioId, { [cls]: !customLocks?.[cls] }); } catch {} }}
			/>
			{toast && (
				<div className={`fixed bottom-4 right-4 z-50 rounded-md border px-3 py-2 text-sm shadow-lg ${toast.type==='success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : toast.type==='info' ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
					{toast.msg}
				</div>
			)}
		</div>
	);
}