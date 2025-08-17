# Development Sequence & Requirements

## Phase 1 – Core Setup & Allocation Plan
**Goal:** Let the user set a target allocation before adding investments.

### User Onboarding (Optional, but recommended for presets)
- Ask basic profile: name, currency, risk appetite, investment horizon.
- Use risk appetite + horizon to suggest allocation templates (Conservative / Balanced / Aggressive).

### Target Allocation Builder
- Add/Edit/Delete allocation buckets (Stocks, Mutual Funds, Gold, Debt/Cash, Others).
- For Stocks: allow sub-buckets Large / Mid / Small Cap (auto-filled later from API).
- **UI:**
  - Slider + numeric input for % allocation.
  - Remaining % counter.
  - Auto-normalize option.
  - Lock bucket option.
  - Pie/Donut chart for visual feedback.
- **Validation:** total must be 100%.

---

## Phase 2 – Investment Data Entry
**Goal:** Let the user record actual holdings & transactions in a structured way.

### Manual Transaction Entry (Core)
- Fields:
  - Type (Buy, Sell, Dividend, SIP, Other)
  - Date
  - Instrument Type (Stock, Mutual Fund, Gold, Bond, ETF, Cash)
  - Name/Symbol
  - Units & Price (auto-calc amount)
  - Allocation bucket (auto for stocks, manual for others)
- **Auto Stock Classification:**
  - System calls market data API → fetches market cap → assigns Large/Mid/Small Cap automatically.
  - If API fails, fallback to "Unknown" with retry.

### Quick Add (Mobile-Friendly)
- Single-line text entry (e.g., “Bought 10 RELIANCE at 2450 on 2025-08-05”).
- Parse & pre-fill form for confirmation.

### Bulk Import from CSV/XLSX
- Upload file → column mapping wizard → preview first 10 rows.
- Auto map stocks to cap category via API.
- Save mapping defaults for repeated imports.
- Duplicate detection.

---

## Phase 3 – Mapping & Reconciliation
**Goal:** Match holdings with the allocation plan.

### Auto-Mapping to Allocation Buckets
- For Stocks: auto assign to Large/Mid/Small via API.
- For Mutual Funds: use MF API (CAMS, Morningstar, Value Research) to auto classify cap type if possible.
- Show mapping preview screen so user can override.
- Save mapping rules for future transactions.

### Holdings Table View
- Show all current holdings:
  - Name, Symbol, Units, Invested Amount, Current Value, P/L, Allocation Bucket.
- Allow inline edits for quantities, prices, or mapping.

---

## Phase 4 – Basic Calculations & Mini Dashboard
**Goal:** Give the user a simple visual summary without full analytics yet.

### Basic Portfolio Summary (Mini Dashboard)
- Total Invested, Current Value, Total P/L.
- Allocation pie chart (actual vs target).
- Top gainers/losers list.
- Drift % for each bucket (actual% – target%).
- Flag drift above threshold.

---

## Phase 5 – Advanced Analytics & Features
**Goal:** Upgrade to richer insights and automation.

### Performance Over Time
- Portfolio growth line chart (daily/monthly).
- Monthly returns chart.
- CAGR display.

### Risk Metrics
- Volatility, Beta, Sharpe Ratio, Max Drawdown.
- Risk vs Return scatter plot.

### Income & Tax Tracking
- Dividend/Interest income table & summary.
- Capital Gains split (STCG/LTCG).
- Tax estimate based on slab rates.

### Rebalancing Suggestions
- If drift > threshold, suggest amounts to sell/buy.
- Show simulated tax impact before action.

### Alerts & Notifications
- SIP reminders.
- Price alerts for selected stocks/funds.
- Market news relevant to holdings.

### Benchmark Comparison
- Compare portfolio vs chosen indices (NIFTY 50, Sensex, etc.).

---

## Phase 6 – Reports & Export
**Goal:** Allow data export and sharing.

### PDF Report Export
- Snapshot of portfolio with charts.
- Performance & allocation summary.

### CSV/Excel Export
- Holdings table.
- Transactions history.
- Tax summary.

---

## Sequence Rationale
- **Phase 1 & 2** are foundational — without allocation plan and transaction capture, dashboard/analytics have nothing to work on.
- **Phase 3** ensures clean mapping so actual data aligns with the plan.
- **Phase 4** delivers a working mini-dashboard early — gives users immediate value.
- **Phase 5 & 6** add depth and polish after core features are proven.