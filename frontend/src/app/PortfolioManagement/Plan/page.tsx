"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Button } from "../../components/Button";
import { useRouter } from "next/navigation";
import PlanSummary from "../components/PlanSummary";
import QuestionCard from "../components/QuestionCard";
import { questions } from "../domain/questionnaire";
import { buildPlan } from "../domain/allocationEngine";
import { Sparkles } from "lucide-react";

export default function PlanPage() {
	const { plan, setPlan, activePortfolioId, questionnaire, setQuestionAnswer } = useApp() as any;
	const router = useRouter();
  const [tab, setTab] = useState<"summary"|"editor">("summary");
  const [local, setLocal] = useState<any | null>(plan || null);
  const [aiOn, setAiOn] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInfo, setAiInfo] = useState<{ rationale?: string; confidence?: number } | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [lastRefSig, setLastRefSig] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success'|'info'|'error' } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function makeRefSig(q: any, baseline: any): string {
    try {
      const buckets = Array.isArray(baseline?.buckets) ? baseline.buckets.map((b: any)=> ({ class: b.class, pct: b.pct })) : [];
      return JSON.stringify({ q, buckets });
    } catch { return ""; }
  }

  function makeAnswersSig(q: any): string {
    try {
      return JSON.stringify({ q });
    } catch { return ""; }
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
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <button onClick={()=> setTab("summary")} className={`px-4 py-2 text-sm ${tab==='summary' ? 'bg-card text-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>Summary</button>
          <button onClick={()=> setTab("editor")} className={`px-4 py-2 text-sm ${tab==='editor' ? 'bg-card text-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>Editor</button>
        </div>
        <div className="flex items-center gap-2">
          {(() => { const prune = (p:any)=> ({riskLevel:p?.riskLevel, buckets:(p?.buckets||[]).map((b:any)=>({class:b.class, pct:b.pct}))}); const dirty = local && plan && JSON.stringify(prune(local)) !== JSON.stringify(prune(plan)); return dirty ? (<span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Unsaved changes</span>) : null; })()}
          <Button variant="outline" onClick={()=> setLocal(plan)}>Reset</Button>
          <Button onClick={async ()=>{
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

      <Card>
        <CardHeader className="py-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Plan Builder</CardTitle>
              <CardDescription className="text-xs">Generate a baseline and optionally refine with AI. Use Save to persist.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={async ()=>{
                try {
                  setAiLoading(true);
                  // Ensure baseline
                  let baseline = local;
                  if (!baseline) {
                    const allocation = buildPlan(questionnaire);
                    setLocal(allocation);
                    baseline = allocation;
                  }
                  const sig = makeRefSig(questionnaire, baseline);
                  if (sig && sig === lastRefSig) { return; }
                  const res = await fetch('/api/plan/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionnaire, baseline }) });
                  const data = await res.json();
                  if (data?.aiPlan?.buckets) {
                    setLocal((prev: any)=> ({ ...(prev||{}), buckets: data.aiPlan.buckets }));
                    setAiInfo({ rationale: data.rationale, confidence: data.confidence });
                    setLastRefSig(sig);
                  }
                } finally { setAiLoading(false); }
              }}>
                <Sparkles className="h-4 w-4 mr-2"/>
                {aiLoading ? 'Refining…' : 'Refine with AI'}
              </Button>
              <Button variant="outline" onClick={()=> setGenOpen(o=>!o)}>{genOpen ? 'Hide' : 'Open'}</Button>
            </div>
          </div>
        </CardHeader>
        {genOpen && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            <QuestionCard
              questionText={questions[step].text}
              options={questions[step].options as any}
              selected={questionnaire[questions[step].key]}
              onChange={(value: any) => setQuestionAnswer(questions[step].key, value)}
              multiSelect={questions[step].key === 'preferredAssets'}
              helperText={(questions[step] as any)?.helperText}
              maxSelect={(questions[step] as any)?.maxSelect}
            />
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={()=> setStep(s=> Math.max(0, s-1))} disabled={step===0}>Back</Button>
              <div className="flex items-center gap-2">
                <Button onClick={async ()=>{
                  const allocation = buildPlan(questionnaire);
                  setLocal(allocation);
                }}>Generate Plan</Button>
                <Button variant="outline" onClick={()=> setStep(s=> Math.min(questions.length-1, s+1))} disabled={step===questions.length-1}>Next</Button>
              </div>
            </div>
            {aiInfo && (
              <div className="text-xs text-muted-foreground">{aiInfo.rationale || 'Refined based on your answers and risk profile.'} {typeof aiInfo.confidence==='number' ? `(${Math.round((aiInfo.confidence||0)*100)}%)` : ''}</div>
            )}
          </div>
        </CardContent>
        )}
      </Card>

      {tab === 'summary' ? (
        <PlanSummary plan={local} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Edit Allocation</CardTitle>
            <CardDescription>Adjust your target mix. Totals must be 100%.</CardDescription>
          </CardHeader>
          <CardContent>
            {local ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-md border border-border p-2">
                  <div className="inline-flex items-center gap-3">
                    <button type="button" onClick={async ()=>{
                      const v = !aiOn; setAiOn(v);
                      if (!v) { setAiInfo(null); return; }
                      try {
                        setAiLoading(true);
                        const q = (useApp.getState() as any).questionnaire || {};
                        const baseline = buildPlan(q);
                        const sig = makeAnswersSig(q);
                        if (sig && sig === lastRefSig) { return; }
                        const res = await fetch('/api/plan/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionnaire: q, baseline }) });
                        const data = await res.json();
                        if (data?.aiPlan?.buckets) {
                          setLocal((prev: any)=> ({ ...(prev||baseline), buckets: data.aiPlan.buckets }));
                          setAiInfo({ rationale: data.rationale, confidence: data.confidence });
                          setLastRefSig(sig);
                        }
                      } finally {
                        setAiLoading(false);
                      }
                    }} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiOn?"bg-indigo-600":"bg-muted"}`}>
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${aiOn?"translate-x-5":"translate-x-1"}`}></span>
                    </button>
                    <span className="text-sm">AI refinement</span>
                    {aiLoading && <span className="text-xs text-muted-foreground">Refining…</span>}
                  </div>
                  {aiInfo && (
                    <div className="text-xs text-muted-foreground">
                      {aiInfo.rationale || "Refined based on your answers and risk profile."} {typeof aiInfo.confidence === 'number' ? `(${Math.round((aiInfo.confidence||0)*100)}%)` : ''}
                    </div>
                  )}
                </div>
                {(local.buckets||[]).map((b: any, idx: number) => (
                  <div key={b.class} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div className="font-medium">{b.class}</div>
                    <input type="range" min={0} max={100} value={b.pct} onChange={(e)=>{
                      const v = Math.max(0, Math.min(100, Number(e.target.value)||0));
                      const next = { ...(local||{}) };
                      next.buckets = [...(local?.buckets||[])];
                      next.buckets[idx] = { ...next.buckets[idx], pct: v };
                      setLocal(next);
                    }} />
                    <div className="text-right">{b.pct}%</div>
                  </div>
                ))}
                <div className="text-sm text-muted-foreground">Tip: We can add auto-normalize and locks next.</div>
              </div>
            ) : (
              <div className="text-muted-foreground">No plan to edit.</div>
            )}
          </CardContent>
        </Card>
      )}
		{toast && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-md border px-3 py-2 text-sm shadow-lg ${toast.type==='success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : toast.type==='info' ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {toast.msg}
        </div>
      )}
		</div>
	);
}