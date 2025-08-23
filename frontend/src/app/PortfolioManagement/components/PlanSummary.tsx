"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Button } from "../../components/Button";
import { useApp } from "../../store";
import { computeRebalance } from "../domain/rebalance";
import { LineChart, Layers, Banknote, Coins, Home, Droplet, Edit3, RefreshCw } from "lucide-react";
import { Sparkles } from "lucide-react";

export default function PlanSummary({ plan, onChangeBucketPct, onEditAnswers, onBuildBaseline, aiViewOn, onToggleAiView, aiLoading, aiExplanation, aiSummary, mode, aiDisabled, locks, onToggleLock }: { plan: any; onChangeBucketPct?: (index: number, newPct: number) => void; onEditAnswers?: () => void; onBuildBaseline?: () => void; aiViewOn?: boolean; onToggleAiView?: () => void; aiLoading?: boolean; aiExplanation?: string; aiSummary?: string; mode?: 'advisor'|'custom'; aiDisabled?: boolean; locks?: Record<string, boolean>; onToggleLock?: (cls: string)=>void }) {
  const { holdings, driftTolerancePct, questionnaire } = useApp() as any;
  const [edgeHit, setEdgeHit] = useState<Record<string, { edge: 'min'|'max'; val: number } | null>>({});
  const [tipFor, setTipFor] = useState<string | null>(null);

  const kpis = useMemo(() => {
    if (!plan) return { equity: 0, defensive: 0, satellite: 0 };
    const byClass = new Map<string, number>();
    for (const b of (plan?.buckets||[])) byClass.set(b.class, (byClass.get(b.class) || 0) + b.pct);
    const equity = (byClass.get("Stocks") || 0) + (byClass.get("Mutual Funds") || 0);
    const defensive = (byClass.get("Debt") || 0) + (byClass.get("Liquid") || 0);
    const satellite = (byClass.get("Gold") || 0) + (byClass.get("Real Estate") || 0);
    return { equity, defensive, satellite };
  }, [plan]);

  const rebalance = useMemo(() => (plan ? computeRebalance(holdings, plan, driftTolerancePct) : { items: [], totalCurrentValue: 0 }), [holdings, plan, driftTolerancePct]);

  function displayRange(range?: [number, number]) { if (!range) return "—"; const [min, max] = range; const mi = Math.round(min); const ma = Math.round(max); return `${mi}% – ${ma}%`; }

  const avoidSet = useMemo(()=>{
    const v = (questionnaire?.avoidAssets);
    const arr = Array.isArray(v) ? v : (typeof v === 'string' && v ? [v] : []);
    return new Set(arr as string[]);
  }, [questionnaire]);

  const visibleBuckets = useMemo(()=> (mode==='custom' ? (plan?.buckets||[]) : (plan?.buckets||[]).filter((b:any)=> !avoidSet.has(b.class))), [plan, avoidSet, mode]);

  return (
    <div className="space-y-4">
      {/* Mobile-optimized KPIs */}
      <div className="grid grid-cols-3 gap-3 sm:gap-2">
        <div className="rounded-xl border border-border p-3 sm:p-2 text-center hover:shadow-sm transition-shadow">
          <div className="text-xs sm:text-[11px] text-muted-foreground mb-1">💹 Equity</div>
          <div className="text-lg sm:text-base font-bold text-indigo-600">{kpis.equity.toFixed(0)}%</div>
        </div>
        <div className="rounded-xl border border-border p-3 sm:p-2 text-center hover:shadow-sm transition-shadow">
          <div className="text-xs sm:text-[11px] text-muted-foreground mb-1">🛡️ Defensive</div>
          <div className="text-lg sm:text-base font-bold text-emerald-600">{kpis.defensive.toFixed(0)}%</div>
        </div>
        <div className="rounded-xl border border-border p-3 sm:p-2 text-center hover:shadow-sm transition-shadow">
          <div className="text-xs sm:text-[11px] text-muted-foreground mb-1">🛰️ Satellite</div>
          <div className="text-lg sm:text-base font-bold text-amber-600">{kpis.satellite.toFixed(0)}%</div>
        </div>
      </div>
      <Card>
        <CardHeader className="py-3 sm:py-2">
          {/* Mobile-first header layout */}
          <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg sm:text-base">🎯 Allocation Plan</CardTitle>
              <CardDescription className="text-sm sm:text-xs">Target mix and controls</CardDescription>
            </div>
            
            {/* Mobile-optimized controls */}
            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2">
              {mode !== 'custom' ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  leftIcon={<Edit3 className="h-4 w-4 text-sky-600" />} 
                  onClick={onEditAnswers}
                  className="w-full sm:w-auto h-10 sm:h-auto"
                >
                  <span className="sm:hidden">✏️ Adjust Risk Profile</span>
                  <span className="hidden sm:inline">Adjust Risk Profile</span>
                </Button>
              ) : null}
              
              {mode !== 'custom' ? (
                <div className="flex items-center justify-between sm:justify-start p-3 sm:p-0 rounded-lg sm:rounded-none border sm:border-none border-border sm:ml-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="text-sm sm:text-[11px] text-muted-foreground font-medium">AI Assist</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={onToggleAiView} 
                    disabled={!!aiLoading || !!aiDisabled} 
                    className={`relative inline-flex h-7 w-14 sm:h-6 sm:w-12 items-center rounded-full transition-colors touch-manipulation ${aiViewOn?"bg-gradient-to-r from-amber-500 via-fuchsia-500 to-indigo-600":"bg-muted"}`}
                  >
                    <span className={`inline-block h-6 w-6 sm:h-5 sm:w-5 transform rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${aiViewOn?"translate-x-7 sm:translate-x-6":"translate-x-1"}`}></span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {plan ? (
            <>
            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-xl border border-border overflow-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-card sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3 text-muted-foreground">Asset Class</th>
                    <th className="py-2 px-3 text-muted-foreground text-right">Allocation</th>
                    <th className="py-2 px-3 text-muted-foreground">Adjust</th>
                    <th className="py-2 px-3 text-muted-foreground">Role</th>
                    <th className="py-2 px-3 text-muted-foreground">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBuckets.map((b: any, idx: number) => (
                    <tr key={b.class} className="border-t border-border/50">
                      <td className="py-2 px-3 font-medium"><span className="inline-flex items-center">{(() => { const common = "h-4 w-4 mr-2"; if (b.class === "Stocks") return <LineChart className={common} />; if (b.class === "Mutual Funds") return <Layers className={common} />; if (b.class === "Debt") return <Banknote className={common} />; if (b.class === "Gold") return <Coins className={common} />; if (b.class === "Real Estate") return <Home className={common} />; if (b.class === "Liquid") return <Droplet className={common} />; return <LineChart className={common} />; })()}{b.class}</span></td>
                      <td className="py-2 px-3 text-right">{Math.round(b.pct)}%</td>
                      <td className="py-2 px-3">
                        <div className="group flex items-center gap-2">
                          {(() => { const maxAllowed = 100; return (
                            <>
                              {(() => { const rawBand = (Array.isArray(b.range) ? b.range as [number,number] : [0,100]); const minBound = 0; const maxBound = mode==='custom' ? maxAllowed : 100; const bandMin = Math.round(rawBand[0]||0); const bandMax = Math.round(rawBand[1]||100); const valueNow = Math.round(b.pct||0); const bandStart = Math.max(0, Math.min(100, bandMin)); const bandEnd = Math.max(0, Math.min(100, bandMax)); const cls = b.class; const isEdge = !!edgeHit?.[cls]; return (
                                <>
                                  <div className="relative w-full md:w-56">
                                    <input
                                      className={`w-full appearance-none range-line ${isEdge ? 'animate-shake' : ''}`}
                                      type="range"
                                      step={1}
                                      min={minBound}
                                      max={maxBound}
                                      value={valueNow}
                                      aria-label={`${b.class} allocation`}
                                      disabled={!!aiViewOn}
                                      style={mode!=='custom' ? ({ background: `linear-gradient(to right, rgba(120,120,120,0.18) 0%, rgba(120,120,120,0.18) ${bandStart}%, rgba(99,102,241,0.25) ${bandStart}%, rgba(99,102,241,0.25) ${bandEnd}%, rgba(120,120,120,0.18) ${bandEnd}%, rgba(120,120,120,0.18) 100%)` } as any) : undefined}
                                      onChange={(e)=>{
                                        const v = Math.round(Math.max(0, Math.min(mode==='custom' ? maxAllowed : 100, Number(e.target.value)||0)));
                                        if (mode !== 'custom' && (v < bandMin || v > bandMax)) {
                                          const edge = v < bandMin ? 'min' : 'max'; const val = v < bandMin ? bandMin : bandMax; setEdgeHit(prev => ({ ...(prev||{}), [cls]: { edge, val } })); setTimeout(()=> setEdgeHit(prev => ({ ...(prev||{}), [cls]: null }) ), 2000);
                                        }
                                        if (onChangeBucketPct) onChangeBucketPct((plan.buckets as any[]).findIndex((x:any)=> x.class===b.class), v);
                                      }}
                                    />
                                    {mode!=='custom' && edgeHit?.[cls] ? (
                                      <div className="absolute -bottom-5 right-0 text-[10px] px-2 py-0.5 rounded bg-rose-500 text-white shadow z-50">
                                        {edgeHit[cls]?.edge === 'max' ? `Max reached (${edgeHit[cls]?.val}%)` : `Min reached (${edgeHit[cls]?.val}%)`}
                                      </div>
                                    ) : null}
                                  </div>
                                  {mode==='custom' ? (
                                    (()=>{ const current = Math.round(Number(b.pct)||0); const sumOthersAll = ((plan?.buckets||[]) as any[]).reduce((s:any, x:any)=> s + (x.class !== b.class ? (Number(x.pct)||0) : 0), 0); const capValue = Math.max(0, Math.floor(100 - sumOthersAll)); const incAllowed = Math.max(0, capValue - current); return (<span className="text-[10px] text-muted-foreground whitespace-nowrap">free {Math.round(incAllowed)}%</span>); })()
                                  ) : (
                                    (()=>{ const current = Math.round(Number(b.pct)||0); const sumOthersAll = ((plan?.buckets||[]) as any[]).reduce((s:any, x:any)=> s + (x.class !== b.class ? (Number(x.pct)||0) : 0), 0); const capValue = Math.max(0, Math.floor(100 - sumOthersAll)); const incBand = Math.max(0, bandMax - current); const incByTotal = Math.max(0, capValue - current); const incAllowed = Math.max(0, Math.min(incBand, incByTotal)); return (<span className="text-[10px] text-muted-foreground whitespace-nowrap">free {Math.round(incAllowed)}% · safe {bandMin}–{bandMax}%</span>); })()
                                  )}
                                </>
                              ); })()}
                            </>
                          ); })()}
                        </div>
                      </td>
                      <td className="py-2 px-3">{b.riskCategory || (b.class === 'Stocks' || b.class === 'Mutual Funds' ? 'Core' : (b.class === 'Gold' || b.class === 'Real Estate' ? 'Satellite' : (b.class === 'Debt' || b.class === 'Liquid' ? 'Defensive' : '')))}</td>
                      <td className="py-2 px-3">{b.notes || (b.class === 'Stocks' ? 'Growth focus' : b.class === 'Mutual Funds' ? 'Diversified equity' : b.class === 'Debt' ? 'Stability & income' : b.class === 'Liquid' ? 'Emergency buffer' : b.class === 'Gold' ? 'Inflation hedge' : b.class === 'Real Estate' ? 'Long-term asset' : '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {visibleBuckets.map((b: any, idx: number) => {
                const maxAllowed = 100;
                const rawBand = (Array.isArray(b.range) ? b.range as [number,number] : [0,100]);
                const minBound = 0;
                const maxBound = mode==='custom' ? maxAllowed : 100;
                const bandMin = Math.round(rawBand[0]||0);
                const bandMax = Math.round(rawBand[1]||100);
                const valueNow = Math.round(b.pct||0);
                const bandStart = Math.max(0, Math.min(100, bandMin));
                const bandEnd = Math.max(0, Math.min(100, bandMax));
                const cls = b.class;
                const isEdge = !!edgeHit?.[cls];
                
                const getIcon = () => {
                  if (b.class === "Stocks") return "📈";
                  if (b.class === "Mutual Funds") return "📊";
                  if (b.class === "Debt") return "🏦";
                  if (b.class === "Gold") return "🥇";
                  if (b.class === "Real Estate") return "🏠";
                  if (b.class === "Liquid") return "💧";
                  return "📊";
                };
                
                return (
                  <Card key={b.class} className="border-dashed">
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getIcon()}</span>
                          <div>
                            <h3 className="font-semibold text-base">{b.class}</h3>
                            <p className="text-xs text-muted-foreground">
                              {b.riskCategory || (b.class === 'Stocks' || b.class === 'Mutual Funds' ? 'Core' : (b.class === 'Gold' || b.class === 'Real Estate' ? 'Satellite' : 'Defensive'))} asset
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-indigo-600">{Math.round(b.pct)}%</div>
                          {mode==='custom' ? (
                            <div className="text-xs text-muted-foreground">
                              {(() => {
                                const current = Math.round(Number(b.pct)||0);
                                const sumOthersAll = ((plan?.buckets||[]) as any[]).reduce((s:any, x:any)=> s + (x.class !== b.class ? (Number(x.pct)||0) : 0), 0);
                                const capValue = Math.max(0, Math.floor(100 - sumOthersAll));
                                const incAllowed = Math.max(0, capValue - current);
                                return `free ${Math.round(incAllowed)}%`;
                              })()}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              safe {bandMin}–{bandMax}%
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Adjust allocation</span>
                          <span>{valueNow}%</span>
                        </div>
                        <div className="relative">
                          <input
                            className={`w-full appearance-none range-line h-3 ${isEdge ? 'animate-shake' : ''}`}
                            type="range"
                            step={1}
                            min={minBound}
                            max={maxBound}
                            value={valueNow}
                            aria-label={`${b.class} allocation`}
                            disabled={!!aiViewOn}
                            style={mode!=='custom' ? ({ background: `linear-gradient(to right, rgba(120,120,120,0.18) 0%, rgba(120,120,120,0.18) ${bandStart}%, rgba(99,102,241,0.25) ${bandStart}%, rgba(99,102,241,0.25) ${bandEnd}%, rgba(120,120,120,0.18) ${bandEnd}%, rgba(120,120,120,0.18) 100%)` } as any) : undefined}
                            onChange={(e)=>{
                              const v = Math.round(Math.max(0, Math.min(mode==='custom' ? maxAllowed : 100, Number(e.target.value)||0)));
                              if (mode !== 'custom' && (v < bandMin || v > bandMax)) {
                                const edge = v < bandMin ? 'min' : 'max';
                                const val = v < bandMin ? bandMin : bandMax;
                                setEdgeHit(prev => ({ ...(prev||{}), [cls]: { edge, val } }));
                                setTimeout(()=> setEdgeHit(prev => ({ ...(prev||{}), [cls]: null }) ), 2000);
                              }
                              if (onChangeBucketPct) onChangeBucketPct((plan.buckets as any[]).findIndex((x:any)=> x.class===b.class), v);
                            }}
                          />
                          {mode!=='custom' && edgeHit?.[cls] ? (
                            <div className="absolute -bottom-6 right-0 text-xs px-2 py-1 rounded bg-rose-500 text-white shadow z-50">
                              {edgeHit[cls]?.edge === 'max' ? `Max reached (${edgeHit[cls]?.val}%)` : `Min reached (${edgeHit[cls]?.val}%)`}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      
                      {/* Notes */}
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground italic">
                          {b.notes || (b.class === 'Stocks' ? 'Growth focus' : b.class === 'Mutual Funds' ? 'Diversified equity' : b.class === 'Debt' ? 'Stability & income' : b.class === 'Liquid' ? 'Emergency buffer' : b.class === 'Gold' ? 'Inflation hedge' : b.class === 'Real Estate' ? 'Long-term asset' : '')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {aiViewOn ? (
              <div className="mt-3 rounded-md border border-border p-3">
                <div className="text-xs font-semibold mb-1">AI recommendation</div>
                {aiSummary ? (
                  <div className="text-xs">
                    {aiSummary}
                  </div>
                ) : null}
                {aiExplanation ? (
                  <div className="mt-1 text-[11px] text-muted-foreground">{aiExplanation}</div>
                ) : null}
              </div>
            ) : null}
            </>
          ) : (
            <div className="text-muted-foreground text-sm">No plan yet.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 sm:py-2">
          <CardTitle className="text-lg sm:text-base">⚖️ Rebalancing Suggestions</CardTitle>
          <CardDescription className="text-sm sm:text-xs">Based on drift tolerance of {driftTolerancePct}%</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {plan && rebalance.items.length > 0 ? (
            <div className="space-y-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-3 sm:space-y-0">
              {rebalance.items.map((item) => (
                <div key={item.class} className="rounded-xl border border-border p-4 sm:p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="font-semibold">{item.class}</div>
                    <div className="text-xs text-muted-foreground">{item.actualPct}% → {item.targetPct}%</div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 sm:h-2 rounded-full bg-muted w-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${item.action === 'Increase' ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                        style={{ width: `${Math.min(100, Math.max(10, Math.round((item.amount / Math.max(1, rebalance.totalCurrentValue)) * 100)))}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${item.action === 'Increase' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.action === 'Increase' ? '🟢' : '🔴'} {item.action}
                      </span>
                      <span className="text-sm font-semibold">₹{item.amount.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              {!plan ? (
                <>
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-sm">No plan yet.</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-sm font-medium">All good!</p>
                  <p className="text-xs">No rebalancing needed.</p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <style jsx>{`
        @keyframes shake { 10%, 90% { transform: translateX(-1px); } 20%, 80% { transform: translateX(2px); } 30%, 50%, 70% { transform: translateX(-4px); } 40%, 60% { transform: translateX(4px); } }
        .animate-shake { animation: shake 0.3s linear; }
        .range-line { -webkit-appearance: none; appearance: none; height: 6px; background: transparent; outline: none; }
        .range-line:focus { outline: none; }
        .range-line::-webkit-slider-runnable-track { height: 6px; background: var(--muted, rgba(120,120,120,0.18)); border-radius: 9999px; }
        .range-line::-moz-range-track { height: 6px; background: var(--muted, rgba(120,120,120,0.18)); border-radius: 9999px; }
        .range-line::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; background: #4f46e5; border-radius: 9999px; border: 2px solid white; margin-top: -5px; box-shadow: 0 0 0 1px rgba(0,0,0,0.06); }
        .range-line:disabled::-webkit-slider-thumb { background: #a1a1aa; }
        .range-line::-moz-range-thumb { width: 16px; height: 16px; background: #4f46e5; border: 2px solid white; border-radius: 9999px; box-shadow: 0 0 0 1px rgba(0,0,0,0.06); }
        .range-line:disabled::-moz-range-thumb { background: #a1a1aa; }
        .range-line:hover::-webkit-slider-thumb { background: #6366f1; }
        .range-line:hover::-moz-range-thumb { background: #6366f1; }
      `}</style>
    </div>
  );
}