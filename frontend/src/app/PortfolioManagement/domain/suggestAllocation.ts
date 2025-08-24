export type Asset = "Stocks" | "Mutual Funds" | "Gold" | "Real Estate" | "Debt" | "Liquid";
export type Answers = {
  horizon: "Short (<3 yrs)" | "Medium (3–7 yrs)" | "Long (>7 yrs)";
  bigExpenseTimeline: "None" | "<12 months" | "12–36 months" | ">36 months";
  emergencyFundMonthsTarget: "3" | "6" | "9" | "12";
  liquidityPreference: "High" | "Medium" | "Low";
  incomeVsExpenses: "Surplus" | "Break-even" | "Deficit";
  incomeStability: "Stable" | "Variable" | "Unstable";
  dependents: "None" | "1" | "2" | "3+";
  liabilities: "None" | "Low" | "Moderate" | "High";
  financialGoal: "Wealth growth" | "Capital preservation" | "Income generation" | "Major purchase" | "Retirement";
  ageBand: "18–30" | "31–45" | "46–60" | "60+";
  riskAppetite: "Low" | "Moderate" | "High";
  volatilityComfort: "Low" | "Medium" | "High";
  maxDrawdownTolerance: "5%" | "10%" | "20%" | "30%+";
  investmentKnowledge: "Beginner" | "Intermediate" | "Advanced";
  avoidAssets: Array<"Stocks" | "Mutual Funds" | "Gold" | "Real Estate">;
  emphasizeAssets: Array<"Stocks" | "Mutual Funds" | "Gold" | "Real Estate">;
};

export type Allocation = Record<Asset, number>;

let LAST_DRIVERS: Array<{ factor: string; to?: string; effectPct: number }> = [];
export function getLastDrivers() { return Array.isArray(LAST_DRIVERS) ? [...LAST_DRIVERS] : []; }

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpTri(score: number, a0: number, a50: number, a100: number): number {
  if (score <= 50) return lerp(a0, a50, clamp(score, 0, 50) / 50);
  return lerp(a50, a100, clamp(score - 50, 0, 50) / 50);
}

function largestRemainderRound(input: Allocation): Allocation {
  const order: Asset[] = ["Stocks","Mutual Funds","Gold","Real Estate","Debt","Liquid"];
  const keys = Object.keys(input) as Asset[];
  const floors: Allocation = { Stocks: 0, "Mutual Funds": 0, Gold: 0, "Real Estate": 0, Debt: 0, Liquid: 0 };
  const remainders: Array<{ key: Asset; remainder: number }> = [];
  let totalFloor = 0;
  for (const k of keys) {
    const v = clamp(input[k], 0, 100);
    const f = Math.floor(v);
    floors[k] = f;
    totalFloor += f;
    remainders.push({ key: k, remainder: v - f });
  }
  let leftover = 100 - totalFloor;
  remainders.sort((x, y) => (y.remainder - x.remainder) || (order.indexOf(x.key) - order.indexOf(y.key)));
  for (let i = 0; i < remainders.length && leftover > 0; i++) {
    floors[remainders[i].key] += 1;
    leftover--;
  }
  return floors;
}

export function suggestAllocation(ans: Answers): Allocation {
  // Defensive normalization of array inputs (handle legacy or malformed values)
  const drivers: Array<{ factor: string; to?: string; effectPct: number }> = [];
  const log = (factor: string, effectPct: number, to?: string) => {
    if (effectPct === 0) return;
    drivers.push({ factor, to, effectPct: Math.round(effectPct) });
  };
  const avoidRaw: any = (ans as any).avoidAssets;
  const emphasizeRaw: any = (ans as any).emphasizeAssets;
  const avoidList: Array<"Stocks" | "Mutual Funds" | "Gold" | "Real Estate"> = Array.isArray(avoidRaw)
    ? avoidRaw
    : (typeof avoidRaw === 'string' && avoidRaw ? [avoidRaw] : []);
  const emphasizeList: Array<"Stocks" | "Mutual Funds" | "Gold" | "Real Estate"> = Array.isArray(emphasizeRaw)
    ? emphasizeRaw
    : (typeof emphasizeRaw === 'string' && emphasizeRaw ? [emphasizeRaw] : []);
  // 2) riskScore
  const mapRA: Record<Answers["riskAppetite"], number> = { Low: 20, Moderate: 50, High: 80 };
  const mapVol: Record<Answers["volatilityComfort"], number> = { Low: 20, Medium: 50, High: 80 } as any;
  const mapDD: Record<Answers["maxDrawdownTolerance"], number> = { "5%": 15, "10%": 35, "20%": 60, "30%+": 85 };
  const mapHor: Record<Answers["horizon"], number> = { "Short (<3 yrs)": 25, "Medium (3–7 yrs)": 55, "Long (>7 yrs)": 80 };
  const mapAge: Record<Answers["ageBand"], number> = { "18–30": 80, "31–45": 65, "46–60": 45, "60+": 25 };
  const mapInc: Record<Answers["incomeVsExpenses"], number> = { Deficit: 25, "Break-even": 50, Surplus: 70 };
  const riskScore = clamp(Math.round(
    0.30 * mapRA[ans.riskAppetite] +
    0.15 * mapVol[ans.volatilityComfort] +
    0.15 * mapDD[ans.maxDrawdownTolerance] +
    0.15 * mapHor[ans.horizon] +
    0.15 * mapAge[ans.ageBand] +
    0.10 * mapInc[ans.incomeVsExpenses]
  ), 0, 100);

  // 3) Base mix via tri-interp (percent values)
  const base: Allocation = {
    Stocks: interpTri(riskScore, 5, 20, 45),
    "Mutual Funds": interpTri(riskScore, 25, 35, 35),
    Debt: interpTri(riskScore, 50, 30, 10),
    Gold: interpTri(riskScore, 10, 7, 5),
    "Real Estate": interpTri(riskScore, 0, 3, 3),
    Liquid: interpTri(riskScore, 10, 5, 2),
  };

  // 4) Knowledge split inside equity while preserving equity sum
  const equity = base.Stocks + base["Mutual Funds"];
  const knowledgeSplit: Record<Answers["investmentKnowledge"], [number, number]> = {
    Beginner: [0.2, 0.8],
    Intermediate: [0.4, 0.6],
    Advanced: [0.6, 0.4],
  };
  const [sShare, mfShare] = knowledgeSplit[ans.investmentKnowledge];
  base.Stocks = equity * sShare;
  base["Mutual Funds"] = equity * mfShare;
  // Beginner + <30: route all equity to MF for diversification
  if (ans.investmentKnowledge === 'Beginner' && ans.ageBand === '18–30') {
    const shift = base.Stocks;
    base["Mutual Funds"] += shift; base.Stocks = 0;
    log('Beginner MF routing', +Math.round(shift), 'Mutual Funds');
  }

  // Age tilt within equity: younger → slightly more Stocks; older → slightly more MF
  (function ageSplitTilt(){
    const eq = base.Stocks + base["Mutual Funds"]; if (eq <= 0) return;
    let tilt = 0;
    if (ans.ageBand === "18–30") tilt = 0.04; // 4% of equity to Stocks
    else if (ans.ageBand === "31–45") tilt = 0.02;
    else if (ans.ageBand === "46–60") tilt = -0.02; // toward MF
    else if (ans.ageBand === "60+") tilt = -0.04;
    const shift = eq * Math.abs(tilt);
    if (tilt > 0) { // Stocks up, MF down
      const move = Math.min(shift, base["Mutual Funds"]);
      base.Stocks += move; base["Mutual Funds"] -= move; log('Age tilt', +Math.round(move), 'Stocks');
    } else if (tilt < 0) {
      const move = Math.min(shift, base.Stocks);
      base.Stocks -= move; base["Mutual Funds"] += move; log('Age tilt', -Math.round(move), 'Stocks');
    }
  })();

  // Helper redistributors
  const takeFrom = (pool: Array<Asset>, want: number): number => {
    let remaining = want;
    for (const k of pool) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, base[k]);
      base[k] -= take;
      remaining -= take;
    }
    return want - remaining;
  };
  const giveTo = (k: Asset, amt: number) => { base[k] += amt; };

  // RULE HIERARCHY: Goals (near-term) overrides first → Liabilities/Capacity → Appetite (already in base)
  // Near-term override proxy: horizon short OR big expense within 36 months OR major purchase goal
  (function nearTermOverride(){ return; })();

  // 5) Liquidity: EF progressive mapping + bumps
  const bumpByLiq: Record<Answers["liquidityPreference"], number> = { High: 2, Medium: 1, Low: 0 } as any;
  const bumpByExpense: Record<Answers["bigExpenseTimeline"], number> = { "<12 months": 5, "12–36 months": 3, ">36 months": 0, None: 0 } as any;
  const efYes = ans.emergencyFundMonthsTarget === '6';
  let efBase = efYes ? 2 : 11; // Yes: 0–3 -> ~2; No: 10–12 -> ~11
  let liqMin = efBase + bumpByLiq[ans.liquidityPreference] + bumpByExpense[ans.bigExpenseTimeline];
  // Lower Liquid floor for EF present & no near-term withdrawal in high-capacity profiles
  const hasEF = ans.emergencyFundMonthsTarget === "6";
  const noNearTerm = ans.bigExpenseTimeline === "None";
  const ageYoung = ans.ageBand === "18–30" || ans.ageBand === "31–45" || ans.ageBand === "46–60";
  const longHor = ans.horizon === "Long (>7 yrs)";
  const highCapacity = ans.riskAppetite === "High" && ageYoung && longHor && ans.liabilities !== "High" && ans.dependents !== "3+";
  // Extra liquid for near-term expense when liabilities are moderate/high (term-based effect)
  const nearExpense = ans.bigExpenseTimeline === "<12 months" || ans.bigExpenseTimeline === "12–36 months";
  if (nearExpense && (ans.liabilities === "Moderate" || ans.liabilities === "High")) {
    liqMin += (ans.liabilities === "High" ? 3 : 2);
  }
  if (hasEF && noNearTerm && highCapacity) {
    liqMin = Math.min(liqMin, 6);
  }
  if (base.Liquid < liqMin) {
    const need = liqMin - base.Liquid;
    let moved = 0;
    moved += takeFrom(["Debt"], need - moved);
    // From equity pro-rata: implement as S then MF sequentially with proportional targets
    if (moved < need) {
      const eqBefore = base.Stocks + base["Mutual Funds"];
      if (eqBefore > 0) {
        const sTarget = ((base.Stocks / eqBefore) * (need - moved));
        const gotS = takeFrom(["Stocks"], sTarget); moved += gotS;
        if (moved < need) { const gotMF = takeFrom(["Mutual Funds"], need - moved); moved += gotMF; }
      }
    }
    if (moved < need) { const gotG = takeFrom(["Gold"], need - moved); moved += gotG; }
    if (moved < need) { const gotRE = takeFrom(["Real Estate"], need - moved); moved += gotRE; }
    giveTo("Liquid", moved); log('EF buffer', +Math.round(moved), 'Liquid');
  }

  // 6) Equity cap by drawdown tolerance, capacity and horizon ceiling
  const capByDD: Record<Answers["maxDrawdownTolerance"], number> = { "5%": 30, "10%": 45, "20%": 65, "30%+": 90 };
  const capByAge: Record<Answers["ageBand"], number> = { "18–30": 60, "31–45": 58, "46–60": 55, "60+": 50 };
  const horizonCap = ans.horizon === 'Short (<3 yrs)' ? 20 : (ans.horizon === 'Medium (3–7 yrs)' ? 40 : 70);
  // Capacity caps by liabilities/dependents (term-aware capacity dampener)
  const capByLiab: Record<Answers["liabilities"], number> = { None: 75, Low: 70, Moderate: 60, High: 55 };
  const capByDeps: Record<Answers["dependents"], number> = { "None": 100, "1": 95, "2": 90, "3+": 85 };
  const eqCapDD = capByDD[ans.maxDrawdownTolerance];
  const eqCapAge = capByAge[ans.ageBand];
  const eqCapCapac = Math.min(capByLiab[ans.liabilities], capByDeps[ans.dependents]);
  const eqCap = Math.min(eqCapDD, eqCapAge, horizonCap, eqCapCapac);
  let eqNow = base.Stocks + base["Mutual Funds"];
  if (eqNow > eqCap) {
    const reduce = eqNow - eqCap;
    const sFrac = base.Stocks / eqNow || 0;
    const mfFrac = base["Mutual Funds"] / eqNow || 0;
    base.Stocks -= reduce * sFrac;
    base["Mutual Funds"] -= reduce * mfFrac;
    base.Debt += reduce; log('Equity cap', -Math.round(reduce), 'Equity');
    eqNow = eqCap;
  }

  // 7) Nudges (horizon) + age nudges
  if (ans.horizon === "Short (<3 yrs)") {
    const take = 5;
    const sFrac = base.Stocks / (base.Stocks + base["Mutual Funds"] || 1);
    base.Stocks -= take * sFrac;
    base["Mutual Funds"] -= take * (1 - sFrac);
    base.Debt += take; log('Short horizon nudge', +take, 'Debt');
  } else if (ans.horizon === "Long (>7 yrs)") {
    const add = 5;
    const sFrac = base.Stocks / (base.Stocks + base["Mutual Funds"] || 1);
    base.Stocks += add * sFrac;
    base["Mutual Funds"] += add * (1 - sFrac);
    base.Debt -= add; log('Long horizon nudge', -add, 'Debt');
  }
  // Glide path for retirement: progressively reduce equity as age increases for Retirement goal
  (function retirementGlidePath(){
    if (ans.financialGoal !== "Retirement") return;
    // Base glide by age band
    const glideByAge: Record<Answers["ageBand"], number> = { "18–30": 0, "31–45": 2, "46–60": 5, "60+": 8 };
    let cut = glideByAge[ans.ageBand];
    // Add small adjustment by horizon (medium vs long)
    if (ans.horizon === "Medium (3–7 yrs)") cut += 2; else if (ans.horizon === "Short (<3 yrs)") cut += 4;
    if (cut <= 0) return;
    const eq = base.Stocks + base["Mutual Funds"]; if (eq <= 0) return;
    const sFrac = base.Stocks / eq || 0.5;
    const reduce = Math.min(cut, eq);
    base.Stocks -= reduce * sFrac; base["Mutual Funds"] -= reduce * (1 - sFrac); base.Debt += reduce; log('Retirement glide', +reduce, 'Debt');
  })();
  // Age nudges beyond cap: small shifts if room
  (function ageNudge(){
    const younger = ans.ageBand === "18–30" || ans.ageBand === "31–45";
    const older = ans.ageBand === "46–60" || ans.ageBand === "60+";
    if (younger) {
      // Do not override risk-lowering signals
      if (ans.incomeStability !== "Stable" || ans.liabilities !== "None" || ans.dependents !== "None") return;
      let room = Math.max(0, eqCap - (base.Stocks + base["Mutual Funds"]));
      const add = Math.min(3, room);
      if (add > 0) { base.Debt = Math.max(0, base.Debt - add); const eq = base.Stocks + base["Mutual Funds"]; const sFrac = eq > 0 ? (base.Stocks / eq) : 0.5; base.Stocks += add * sFrac; base["Mutual Funds"] += add * (1 - sFrac); log('Young capacity nudge', -add, 'Debt'); }
    } else if (older) {
      const take = 3;
      const eq = base.Stocks + base["Mutual Funds"]; const sFrac = eq > 0 ? (base.Stocks / eq) : 0.5; base.Stocks = Math.max(0, base.Stocks - take * sFrac); base["Mutual Funds"] = Math.max(0, base["Mutual Funds"] - take * (1 - sFrac)); base.Debt += take; log('Older safety nudge', +take, 'Debt');
    }
  })();

  // 8) Bounds for Gold/RE
  const clampAsset = (k: Asset, min: number, max: number) => {
    const before = base[k];
    base[k] = clamp(base[k], min, max);
    const delta = base[k] - before;
    if (delta > 0) base.Debt -= delta; // pull from Debt
    else if (delta < 0) base.Debt += -delta; // excess to Debt
  };
  clampAsset("Gold", 3, 10);
  clampAsset("Real Estate", 0, 7);

  // 9) Avoid / Emphasize
  const avoidSet = new Set(avoidList);
  const avoidables: Asset[] = ["Stocks", "Mutual Funds", "Gold", "Real Estate"];
  avoidables.forEach((k: Asset) => {
    if (avoidSet.has(k as any)) {
      const val = base[k as Asset];
      base[k as Asset] = 0;
      let remaining = val;
      if (k === "Real Estate") {
        // Reallocate RE: Equity up to 60, then Gold up to 12, then Debt
        let eqNow2 = base.Stocks + base["Mutual Funds"];
        const eqRoom = Math.max(0, 60 - eqNow2);
        if (eqRoom > 0 && remaining > 0) {
          const addEq = Math.min(remaining, eqRoom);
          const eqTotal = base.Stocks + base["Mutual Funds"];
          const sFracEq = eqTotal > 0 ? (base.Stocks / eqTotal) : 0.5;
          base.Stocks += addEq * sFracEq;
          base["Mutual Funds"] += addEq * (1 - sFracEq);
          remaining -= addEq;
          eqNow2 += addEq;
        }
        if (remaining > 0) {
          const goldRoom = Math.max(0, 12 - base.Gold);
          const addGold = Math.min(remaining, goldRoom);
          base.Gold += addGold;
          remaining -= addGold;
        }
        if (remaining > 0) {
          base.Debt += remaining;
          remaining = 0;
        }
      } else {
        base.Debt += remaining;
        remaining = 0;
      }
    }
  });
  // Emphasize: up to +3% each, max +7% combined, from Debt then non-emphasized equity pro-rata
  const emphasize = (emphasizeList || []).filter(k => !avoidSet.has(k)) as Asset[];
  const tiltPer = 3;
  const maxTotalTilt = 7;
  let remainingTilt = Math.min(maxTotalTilt, emphasize.length * tiltPer);
  for (const k of emphasize) {
    if (remainingTilt <= 0) break;
    // Per-asset cap by corridor/headroom
    let wanted = Math.min(tiltPer, remainingTilt);
    if (k === "Gold") wanted = Math.min(wanted, Math.max(0, 12 - base.Gold));
    if (k === "Real Estate") wanted = Math.min(wanted, Math.max(0, 7 - base["Real Estate"]));
    if (k === "Stocks" || k === "Mutual Funds") {
      const eqCapRoom = Math.max(0, 60 - (base.Stocks + base["Mutual Funds"]));
      wanted = Math.min(wanted, eqCapRoom);
    }
    if (wanted <= 0) continue;
    let moved = 0;
    // from Debt first but keep floor
    const minDebtFloor = (ans.liabilities === "High" || ans.dependents === "3+") ? 20 : 15;
    const debtAvail = Math.max(0, base.Debt - minDebtFloor);
    if (debtAvail > 0) {
      const take = Math.min(wanted - moved, debtAvail);
      base.Debt -= take; moved += take;
    }
    if (moved < wanted) {
      // from non-emphasized equity pro-rata
      const nonEmphEq = ["Stocks", "Mutual Funds"].filter(x => (x !== k && !emphasize.includes(x as Asset))) as Asset[];
      const total = nonEmphEq.reduce((s, x) => s + base[x], 0);
      for (const x of nonEmphEq) {
        if (moved >= wanted) break;
        const share = total > 0 ? ((base[x] / total) * (wanted - moved)) : 0;
        const got = takeFrom([x], share);
        moved += got;
      }
    }
    base[k] += moved;
    remainingTilt -= moved;
  }

  // 10b) Gold tilt from Debt under conservative signals (cumulative cap +4%)
  (function goldTilt() {
    // Skip if near-term expense (keep gold near floor)
    if (ans.bigExpenseTimeline !== "None") return;
    let desired = 0;
    if (ans.volatilityComfort === "Low" || ans.riskAppetite === "Low") desired += 2;
    if (ans.liabilities === "Moderate") desired += 1; else if (ans.liabilities === "High") desired += 2;
    if (ans.dependents === "3+") desired += 2;
    if (ans.financialGoal === "Capital preservation" || ans.financialGoal === "Retirement") desired += 1;
    desired = Math.min(desired, 4);
    if (desired <= 0) return;
    const goldRoom = Math.max(0, 10 - base.Gold);
    if (goldRoom <= 0) return;
    const debtFloor = (ans.liabilities === "High" || ans.dependents === "3+") ? 20 : 15;
    const fromDebt = Math.max(0, base.Debt - debtFloor);
    let move = Math.min(desired, goldRoom, fromDebt);
    if (move > 0) {
      base.Debt -= move;
      base.Gold += move; log('Gold tilt', +Math.round(move), 'Gold');
    }
  })();

  // 10c) High-capacity growth profiles: gently bias away from Gold
  (function highCapacityGoldReduce() {
    const hasEF = ans.emergencyFundMonthsTarget === "6";
    const noNearTerm2 = ans.bigExpenseTimeline === "None";
    const ageYoung = ans.ageBand === "18–30" || ans.ageBand === "31–45" || ans.ageBand === "46–60";
    const longHor = ans.horizon === "Long (>7 yrs)";
    const highCapacity = ans.riskAppetite === "High" && ageYoung && longHor && ans.liabilities !== "High" && ans.dependents !== "3+";
    if (!(hasEF && noNearTerm2 && highCapacity)) return;
    const targetFloor = 6;
    const reducible = Math.max(0, base.Gold - targetFloor);
    let reduce = Math.min(2, reducible);
    if (reduce <= 0) return;
    base.Gold -= reduce;
    // Prefer adding to equity up to cap, else to Debt
    let eqNow2 = base.Stocks + base["Mutual Funds"];
    const eqRoom = Math.max(0, 60 - eqNow2);
    if (eqRoom > 0) {
      const addEq = Math.min(reduce, eqRoom);
      const eqTotal = base.Stocks + base["Mutual Funds"];
      const sFracEq = eqTotal > 0 ? (base.Stocks / eqTotal) : 0.5;
      base.Stocks += addEq * sFracEq;
      base["Mutual Funds"] += addEq * (1 - sFracEq);
      reduce -= addEq;
    }
    if (reduce > 0) base.Debt += reduce;
  })();

  // 11) Global safety caps
  let equityNow = base.Stocks + base["Mutual Funds"];
  if (equityNow > 60) {
    const reduce = equityNow - 60;
    const sFrac = base.Stocks / equityNow || 0;
    base.Stocks -= reduce * sFrac;
    base["Mutual Funds"] -= reduce * (1 - sFrac);
    base.Debt += reduce; log('Global equity cap', -Math.round(reduce), 'Equity');
    equityNow = 60;
  }
  if (base.Debt > 70) {
    const excess = base.Debt - 70;
    base.Debt -= excess;
    base.Liquid += excess; log('Debt clamp->Liquid', +Math.round(excess), 'Liquid');
  }

  // Debt minimums: ensure safety floor
  (function enforceDebtMin(){
    const minDebt = (ans.liabilities === "High" || ans.dependents === "3+") ? 20 : 15;
    if (base.Debt < minDebt) {
      let need = minDebt - base.Debt;
      // take from equity first proportionally
      const eq = base.Stocks + base["Mutual Funds"]; if (eq > 0 && need > 0) {
        const sTake = Math.min(need * (base.Stocks / eq), base.Stocks); base.Stocks -= sTake; base.Debt += sTake; need -= sTake; log('Debt minimum', +Math.round(sTake), 'Debt');
        const mfTake = Math.min(need, base["Mutual Funds"]); base["Mutual Funds"] -= mfTake; base.Debt += mfTake; need -= mfTake; log('Debt minimum', +Math.round(mfTake), 'Debt');
      }
      // then from Liquid
      if (need > 0) { const liqTake = Math.min(need, Math.max(0, base.Liquid - 5)); base.Liquid -= liqTake; base.Debt += liqTake; need -= liqTake; log('Debt minimum', +Math.round(liqTake), 'Debt'); }
      // then from Gold (respect floor 3)
      if (need > 0) { const goldTake = Math.min(need, Math.max(0, base.Gold - 3)); base.Gold -= goldTake; base.Debt += goldTake; need -= goldTake; log('Debt minimum', +Math.round(goldTake), 'Debt'); }
    }
  })();

  // Equity floor by age+horizon (unless capital preservation)
  (function equityFloorClamp(){
    if (ans.financialGoal === 'Capital preservation') return;
    const eq = base.Stocks + base["Mutual Funds"]; const before = eq;
    let floor = 0;
    if (ans.horizon !== 'Short (<3 yrs)') {
      if (ans.ageBand === '18–30') floor = 25; else if (ans.ageBand === '31–45') floor = 22; else if (ans.ageBand === '46–60') floor = 20; else floor = 18;
    }
    if (eq < floor) {
      let need = floor - eq;
      // pull from Debt then Liquid
      const dTake = Math.min(need, Math.max(0, base.Debt - 15)); base.Debt -= dTake; need -= dTake;
      if (need > 0) { const lTake = Math.min(need, Math.max(0, base.Liquid - 3)); base.Liquid -= lTake; need -= lTake; }
      // assign primarily to Mutual Funds (especially if younger/beginner)
      base["Mutual Funds"] += (floor - before);
      log('Equity floor', +(floor - before), 'Mutual Funds');
    }
  })();

  clampAsset("Gold", 3, 10);
  clampAsset("Real Estate", 0, 7);

  const sum = Object.values(base).reduce((a, b) => a + b, 0) || 1;
  const normalized: Allocation = {
    Stocks: (base.Stocks * 100) / sum,
    "Mutual Funds": (base["Mutual Funds"] * 100) / sum,
    Gold: (base.Gold * 100) / sum,
    "Real Estate": (base["Real Estate"] * 100) / sum,
    Debt: (base.Debt * 100) / sum,
    Liquid: (base.Liquid * 100) / sum,
  };
  const rounded = largestRemainderRound(normalized);
  // Store drivers for external explainability
  try { LAST_DRIVERS = (drivers||[]).map(d=> ({ factor: String(d.factor||'engine'), to: d.to, effectPct: Number.isFinite(Number(d.effectPct)) ? Math.round(Number(d.effectPct)) : 0 })); } catch { LAST_DRIVERS = []; }
  return rounded;
}

