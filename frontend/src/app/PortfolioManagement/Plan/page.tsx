"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Button } from "../../components/Button";
import { useRouter } from "next/navigation";
import PlanSummary from "../components/PlanSummary";

export default function PlanPage() {
	const { plan, setPlan, activePortfolioId } = useApp() as any;
	const router = useRouter();
  const [tab, setTab] = useState<"summary"|"editor">("summary");
  const [local, setLocal] = useState<any | null>(plan || null);

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
          <Button variant="outline" onClick={()=> setLocal(plan)}>Reset</Button>
          <Button onClick={async ()=>{
            if (!activePortfolioId || !local) return;
            await fetch('/api/portfolio/plan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portfolioId: activePortfolioId, plan: local }) });
            setPlan(local);
          }}>Save</Button>
        </div>
      </div>

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
		</div>
	);
}

