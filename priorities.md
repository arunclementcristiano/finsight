# Prioritized Developer Task List

Each task listed with minimal acceptance criteria.

## Sprint 0 — Project Scaffolding
- **T0.1:** Create repo skeleton (frontend Next.js + backend /services folder).

- **T0.1a:** Design initial UI/UX screens for MVP (Welcome, Portfolio Overview, Allocation Builder, Success/Next Steps)
	- Welcome/onboarding with logo, tagline, and Get Started button
	- Portfolio overview with create/list portfolios
	- Allocation builder: sliders for asset classes, live pie chart, auto-normalize, lock, presets, validation, save
	- Success/confirmation screen with next steps
	- Ensure modern, friendly, and beginner-friendly look using Tailwind CSS
- **T0.2:** Setup IaC with CDK/Terraform: create Cognito, DynamoDB table (InvestApp), S3 buckets (uploads, reports), basic IAM roles.
- **T0.3:** Configure CI (GitHub Actions) to run lints & tests.

**Acceptance:** Deploys baseline infra to dev account.

## Phase 1 — Allocation Builder & Basic Data Model
- **T1.1:** Implement DynamoDB single-table items: USER, PORTFOLIO, ALLOCATION.
- **T1.2:** API: `POST /portfolios`, `GET /portfolios`, `POST /portfolios/{id}/allocations`, `GET allocation` (Lambda handlers).
- **T1.3:** Frontend: Allocation builder screen with sliders, pie chart, auto-normalize, lock toggle, presets.

**Acceptance:** Create/save allocation plan -> stored in DynamoDB. Frontend shows pie updated and validates sum=100.

## Phase 2 — Manual Transactions & Quick Add
- **T2.1:** DynamoDB TRANSACTION item format + HOLDING snapshot item design.
- **T2.2:** API: `POST /portfolios/{id}/transactions`, `GET /transactions`.
- **T2.3:** Frontend: Transaction form (desktop + quick add mobile), validation, unit/price auto-calc.
- **T2.4:** Lambda logic to update HOLDING snapshot after transaction insertion.

**Acceptance:** Add transaction -> transaction persisted -> holding snapshot updated correctly.

## Phase 3 — Instrument Metadata & Auto Stock Classification
- **T3.1:** Implement INSTRUMENT item and instrument lookup Lambda.
- **T3.2:** Integrate a market-data provider (pluginable adapter). Implement market-cap to capCategory mapping. Store marketCap & capCategory in INSTRUMENT record.
- **T3.3:** Update transaction ingestion to call instrument lookup and populate capCategory automatically for stocks.

**Acceptance:** Add stock transaction with symbol -> instrument item created/updated with capCategory auto-filled; UI shows capCategory read-only.

## Phase 4 — Bulk Import & Mapping Preview
- **T4.1:** Presigned S3 upload endpoint + ImportBatch item.
- **T4.2:** Step Function / Lambda to read first N rows and return mapping preview.
- **T4.3:** Frontend import wizard to map columns and approve import.
- **T4.4:** Full import execution: validate rows, enrich via instrument lookup, write transactions in batches, update holder snapshots.

**Acceptance:** CSV upload -> mapping preview -> confirm -> transactions written -> import status success.

## Phase 5 — Mini-dashboard + Preview
- **T5.1:** Implement holdings summary API `GET /portfolios/{id}/holdings` and `GET /summary`.
- **T5.2:** Frontend mini-dashboard: total invested, current value (from lastPrice or user-entered), allocation actual vs target, drift flags.

**Acceptance:** After adding allocation + some transactions, mini-dashboard shows correct totals and allocation.

## Phase 6 — Price Refresh & Background Tasks
- **T6.1:** Implement EventBridge scheduled price refresh Lambda; update INSTRUMENT.lastPrice & marketCap.
- **T6.2:** Implement holding recalculation after price updates.

**Acceptance:** Scheduled job runs, prices updated, holdings currentValue reflect new prices.

## Phase 7 — Rebalance Simulation, Reports & Alerts
- **T7.1:** Rebalance simulate API (Step Function) + PDF generation (Lambda -> headless Chromium or report template -> S3).
- **T7.2:** Alerts (price/SIP/drift) infrastructure (DynamoDB alerts table + EventBridge + SNS).
- **T7.3:** Tax estimation stub for STCG/LTCG (country-specific rules).

**Acceptance:** User can run simulation and get a report; alerts can be created and triggered.

---

## Implementation Tips & Traps to Avoid

- DynamoDB single table is powerful but plan access patterns first. Sketch queries you’ll need (get holdings by portfolio, get transactions by date range, get instrument by symbol). Model GSIs accordingly.
- Cache external API results (price, market cap) in DynamoDB with TTL and source field. Avoid hitting provider on each UI call.
- Batch writes when importing large files to avoid Lambda throttling / hot partitions. Use randomized partition keys where appropriate.
- Rate limits: Respect market-data API limits—use aggregating calls where possible (fetch many symbols in one request).
- Testing: Simulate heavy imports and price-refresh loads in a staging account to validate costs & throttles.