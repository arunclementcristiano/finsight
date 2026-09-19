"use client";

import { RotateCcw, Settings2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/Card";
import { Button } from "../../components/Button";
import { useApp } from "../../store";

export default function SettingsPage() {
  const { driftTolerancePct, setDriftTolerancePct, emergencyMonths, setEmergencyMonths } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Preferences</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Tune the guardrails FinSight uses for guidance and rebalancing suggestions.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PreferenceCard icon={Settings2} title="Rebalancing sensitivity" description="How far an asset class can move from its target before FinSight suggests an adjustment." value={`${driftTolerancePct}%`}>
          <input aria-label="Drift tolerance" type="range" min={3} max={10} value={driftTolerancePct} onChange={(event) => setDriftTolerancePct(Number(event.target.value))} className="w-full accent-emerald-700" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>More active · 3%</span><span>More flexible · 10%</span></div>
        </PreferenceCard>

        <PreferenceCard icon={ShieldCheck} title="Emergency reserve" description="The number of essential-expense months you want to keep accessible in liquid assets." value={`${emergencyMonths} months`}>
          <input aria-label="Emergency reserve months" type="range" min={3} max={12} value={emergencyMonths} onChange={(event) => setEmergencyMonths(Number(event.target.value))} className="w-full accent-emerald-700" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>3 months</span><span>12 months</span></div>
        </PreferenceCard>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div><p className="font-semibold">Recommended defaults</p><p className="mt-1 text-sm text-muted-foreground">A balanced 5% drift tolerance and six-month emergency reserve.</p></div>
          <Button variant="outline" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => { setDriftTolerancePct(5); setEmergencyMonths(6); }}>Restore defaults</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PreferenceCard({ icon: Icon, title, description, value, children }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; value: string; children: React.ReactNode }) {
  return <Card><CardHeader><div className="flex items-start justify-between gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-emerald-700 dark:text-emerald-300"><Icon className="h-5 w-5" /></span><span className="rounded-full bg-muted px-3 py-1.5 text-sm font-semibold">{value}</span></div><CardTitle className="mt-5">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>;
}
