#
# User Story to Implementation Task Mapping

| User Story | Related Implementation Tasks |
|------------|-----------------------------|
| US-01: Risk Profile Questionnaire (Hybrid) | P-01 (Completed), P-03 (Completed), P-04 (Completed) | Completed |
| US-02: Suggested Asset Allocation          | P-04 (Completed), P-05 (In Progress)        | In Progress |
| US-03: Portfolio Tracking (Manual Add/Update) | P-01 (Completed), P-06 (Yet to Start), P-07 (Yet to Start) | Yet to Start |
| US-04: Import Statement (Stub)            | P-01 (Completed), P-07 (Yet to Start)        | Yet to Start |
| US-05: Dashboard (Current vs Target)      | P-01 (Completed), P-07 (Yet to Start)        | Yet to Start |
| US-06: Rebalancing & Insights             | P-07 (Yet to Start), P-08 (Yet to Start)        | Yet to Start |
| US-07: Settings & Persistence             | P-09 (Yet to Start), P-02 (Yet to Start)        | Yet to Start |
#
# Phase 1 Implementation Tasks

---

**P-01: Create Project Scaffolding**
Status: Completed
Create folders/files per this structure: 
- app/router.tsx
- app/store.ts
- components/{Button, Card, Chart, Progress, Table, Modal}.tsx
- domain/{models, questionnaire, allocationEngine, rebalance, parseService, priceService}.ts
- pages/Onboarding/{Intro, Questionnaire, Summary}.tsx
- pages/Portfolio/{Dashboard, AddHolding, ImportDoc}.tsx
- pages/Insights/Insights.tsx
- pages/Settings/Settings.tsx
- utils/{format, math}.ts
Use TypeScript and Tailwind. Add zustand and react-router.

**P-02: Implement Store**
Status: Yet to Start
Implement a zustand store useApp with user profile, setters for questionnaire, plan, portfolio CRUD, driftTolerancePct, emergencyMonths. Persist to localStorage key finsight-v1.

**P-03: Questionnaire Page**
Status: Completed
Build Questionnaire.tsx as a 9-step wizard with card buttons and progress indicator. On submit, call buildPlan(q) and navigate to /onboarding/summary. Preserve answers between sessions.

**P-04: Allocation Engine**
Status: Completed
Implement buildPlan(q) that: (1) maps riskScore→RiskLevel; (2) starts from a base mix per risk; (3) prunes to user’s selected interests; (4) applies liquid cash overlay (+3% if dips≥some, min 5% overall); (5) normalizes to exactly 100.00; (6) returns rationale and per-class ranges.

**P-05: Summary Page**
Status: In Progress
Donut chart and allocation table done; "Save Plan" and navigation buttons pending.
Render donut of plan buckets and grid of cards with class, pct, range. Buttons: ‘Save Plan’, ‘Add Holdings’, ‘Go to Dashboard’.

**P-06: Add Holding Page**
Status: Yet to Start
Build form with InstrumentClass select + fields. Validate: either (units & price) or (invested/currentValue) required. Show inline errors and prevent submit until valid.

**P-07: Dashboard**
Status: Yet to Start
Render (A) donut target plan; (B) grouped bars: current vs target by class; (C) rebalancing list from computeRebalance. Add CTA to add/import holdings.

**P-08: Insights**
Status: Yet to Start
Show top drift items with Increase/Reduce and ₹ amount. If all OK, show success card.

**P-09: Settings**
Status: Yet to Start
Add dark mode toggle (persist), drift tolerance slider (3–10%), emergency months (3–12).


---

## Current Status (as of 17 August 2025)

- US-01: Risk Profile Questionnaire (Hybrid): Completed
- US-02: Suggested Asset Allocation: In Progress (donut chart, allocation table done; "Save Plan" and navigation buttons pending)
- US-03: Portfolio Tracking (Manual Add/Update): Yet to Start
- US-04: Import Statement (Stub): Yet to Start
- US-05: Dashboard (Current vs Target): Yet to Start
- US-06: Rebalancing & Insights: Yet to Start
- US-07: Settings & Persistence: Yet to Start

- P-01: Create Project Scaffolding: Completed
- P-02: Implement Store: Yet to Start
- P-03: Questionnaire Page: Completed
- P-04: Allocation Engine: Completed
- P-05: Summary Page: In Progress (donut chart, table done; "Save Plan" and navigation buttons pending)
- P-06: Add Holding Page: Yet to Start
- P-07: Dashboard: Yet to Start
- P-08: Insights: Yet to Start
- P-09: Settings: Yet to Start
- P-10: Auth Guard: Yet to Start

# Phase 1 User Stories — Prioritized & Refined

## Priority Order
1. US-01: Risk Profile Questionnaire (Hybrid)
2. US-02: Suggested Asset Allocation
3. US-03: Portfolio Tracking (Manual Add/Update)
4. US-04: Import Statement (Stub)
5. US-05: Dashboard (Current vs Target)
6. US-06: Rebalancing & Insights
7. US-07: Settings & Persistence

---

## US-01: Risk Profile Questionnaire (Hybrid)
**As a new user, I want to complete a short, engaging questionnaire so that the app derives my risk profile and preferences.**

**Acceptance Criteria:**
- Max 9 steps; progress indicator shown.
- Questions: horizon, loss reaction, surplus band, equity interest, stock knowledge, include debt (y/n), include gold (y/n), include real estate/REIT (y/n), buy-the-dip (no/some/yes).
- Back/forward navigation supported; answers persist if user exits and returns.
- Works on mobile (≥360px) and desktop.
- On submit, generates RiskLevel + AllocationPlan (sum = 100%) and saves to store.

## US-02: Suggested Asset Allocation
**As a user, I want a clear recommended mix that respects my interests so that I trust the baseline plan.**

**Acceptance Criteria:**
- Plan includes only selected instruments; excluded ones are not shown.
- Liquid fund overlay: adds +3% if dip-buying selected; minimum 5% (cannot disable in P1).
- Buckets displayed with labels, %, and range; donut chart rendered.
- "Save Plan" writes to store; state persists on navigation.

## US-03: Portfolio Tracking (Manual Add/Update)
**As a user, I want to add and update holdings manually so that the dashboard shows my current allocation.**

**Acceptance Criteria:**
- Modal/page to add holding: class, name, units, price, costPerUnit, invested OR currentValue.
- Validation: either (units & price) or (invested/currentValue) must be present.
- Classes: EquityMF, DirectEquity, DebtMF, Bonds, FD, RD, Gold, REIT, Liquid, International, Cash, RealEstate.
- Holdings persisted locally; edit/delete supported.

## US-04: Import Statement (Stub)
**As a user, I want to upload a document so that the app can parse it later.**

**Acceptance Criteria:**
- File input accepts PDF/CSV.
- Stub service returns empty array but shows parsing status.
- Architecture pluggable for future server parse.

## US-05: Dashboard (Current vs Target)
**As a user, I want to see my current vs target allocation so that I understand where I’m off.**

**Acceptance Criteria:**
- Two charts: donut (target plan), grouped bars (current vs target by class).
- "Current" computed from holdings by class; totals match visible sums.
- Mobile friendly; loads within 1s on repeat visits (cached state).

## US-06: Rebalancing & Insights
**As a user, I want actionable guidance to align to my plan so that I know what to increase or reduce.**

**Acceptance Criteria:**
- Drift tolerance default 5%; items within ±5% marked "OK".
- For others, show Increase/Reduce + ₹ amount to move.
- Insight cards summarize top 3 nudges.
- No trade execution; guidance only.

## US-07: Settings & Persistence
**As a user, I want my data saved and theme toggled so that my experience persists.**

**Acceptance Criteria:**
- State persisted to localStorage (single key).
- Drift tolerance configurable in Settings (3–10%).
- Dark mode toggle persisted.