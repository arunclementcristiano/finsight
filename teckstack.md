# Tech Stack & Architecture Rationale

## Frontend
- **Framework:** Next.js (App Router) — for hybrid SSR/SSG, fast routing, and SEO. Vite + React is also supported for pure SPA use cases.
- **Styling:** Tailwind CSS (utility-first) + shadcn/ui (Radix primitives) for consistent, modern components. Optionally add DaisyUI for extra Tailwind components.
- **Charts:** recharts for dashboards; consider chart.js or nivo for advanced analytics in later phases.
- **Animation:** Framer Motion for micro-interactions.
- **Icons:** lucide-react (modern), or @mui/icons-material for MUI look.
- **Accessibility:** ARIA labels, keyboard focus states, and contrast checks are a priority.

## Backend / API
- **Language:** Node.js with TypeScript (recommended for synergy with CDK and frontend), or Python for ML/data-heavy features.
- **Serverless:** AWS Lambda for compute, API Gateway (HTTP API) for REST endpoints.
- **Auth:** Amazon Cognito (user pools + identity pools) for sign-in and social login.
- **Data Store:** DynamoDB (single-table design) with GSIs for all access patterns.
- **File Storage:** S3 for CSV/XLSX imports and PDF exports.
- **Orchestration:** AWS Step Functions for long-running workflows (bulk import, rebalancing simulation).
- **Queueing:** SQS for import/background tasks.
- **Scheduling:** EventBridge rules (cron) to refresh prices / recalc metrics.
- **Secrets & Config:** AWS Secrets Manager + Parameter Store (+ KMS for encryption).
- **Monitoring:** CloudWatch logs + X-Ray for tracing; Datadog optional for advanced needs.

## Integrations / External Data
- **Market Data:** Alpha Vantage, IEX Cloud, Yahoo Finance, or paid feeds. Use an abstraction layer for easy provider swap.
- **Mutual Fund Metadata:** CAMS, KFintech, Value Research, AMFI APIs or public sources.
- **Notifications:** Amazon SES for email, SNS or OneSignal for push.

## CI/CD & Dev Tools
- **CI/CD:** GitHub Actions for build & tests.
- **Infra as Code:** AWS CDK (TypeScript) or Terraform. Serverless Framework is also supported.
- **Local Dev:** DynamoDB Local, SAM CLI, or LocalStack for local testing.
- **Testing:** Unit tests for business logic, integration tests for import flows, contract tests for APIs.
- **Observability:** Structured logs and custom CloudWatch metrics for import success/fail, price-refresh latency, mapping failure rates.

## DynamoDB Design
- **Single-table design** with PK, SK, entityType, and GSIs for all access patterns.
- **Soft deletes:** Add a `deleted` flag for audit/history.
- **Mapping rules:** Store mapping rules and import mapping defaults as separate items.
- **Precompute holding snapshots** for fast dashboard loads.

## API Endpoints
- **RESTful endpoints** for all core features (auth, portfolios, allocations, transactions, imports, holdings, analytics, reports, alerts).
- **WebSocket API Gateway** or AWS AppSync (GraphQL) can be added for real-time updates in the future.
- **Rate limiting** at API Gateway for public endpoints.

## Security
- **Least privilege IAM** for all Lambdas.
- **API Gateway** secured with Cognito authorizer.
- **Encryption:** DynamoDB server-side, S3 SSE-KMS, Secrets Manager + KMS for API keys.
- **Audit:** CloudTrail for infra-level events, audit items in DynamoDB for app-level changes.

## Rationale
- This stack is modern, scalable, and cloud-native, with a focus on rapid development, security, and future extensibility.
- All choices are made to minimize ops burden, maximize developer productivity, and ensure a great user experience from MVP to scale.