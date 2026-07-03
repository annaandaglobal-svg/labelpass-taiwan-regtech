# LabelPass Production Readiness

This file is the single source of truth for what is real versus demo/mock in the
customer platform flows: review, PIF, expert consult, payment, logistics, and
operations. Never commit environment variable values here.

Live status is also visible to operators at `/admin/settings` and `/admin/reviews`.

## Boundary Table

| Flow | Current behavior | Needed before charging customers | Env / gate |
|---|---|---|---|
| Regulatory review + evidence | Real source-backed rules, term registry, deterministic verdicts | Optional GPT context enrichment | `OPENAI_API_KEY` + `LABELPASS_ENABLE_AI_REVIEW=1` |
| Knowledge / unified search | Real bundled cache, Supabase public RPC when configured | Keep Supabase seed verified after crawler updates | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| PIF application submit | Real when enabled. Customer submit writes `products`, `product_documents`, `audit_logs`; otherwise localStorage fallback | Auth/org ownership and operator workflow hardening | `SUPABASE_DB_URL` + `LABELPASS_ENABLE_ADMIN_DB_WRITES=1` + `LABELPASS_ENABLE_CUSTOMER_PIF_SUBMISSIONS=1` |
| PIF file attachments | Real when enabled. `/api/pif/attachments` uploads originals to Supabase Storage; otherwise metadata-only fallback | Authenticated download/signing policy and retention rules | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + optional `LABELPASS_PIF_STORAGE_BUCKET` |
| Expert matching + quote | Demo quote flow with named demo expert; ops tables are prepared | Operator-entered quotes and real expert assignment | `LABELPASS_ENABLE_ADMIN_DB_WRITES=1` + `LABELPASS_ADMIN_OPS_TOKEN` |
| Expert chat | Demo keyword auto-reply and browser storage | Supabase Realtime two-way chat | Realtime on `chat_threads` and `chat_messages` |
| Payment | Mock. `/api/payments/checkout` returns paid immediately | Real PortOne checkout window and webhook settlement | `PORTONE_STORE_ID`, `PORTONE_CHANNEL_KEY`, `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET` |
| Logistics matching + quote | Demo quote flow with browser draft storage | Operator or partner quotes through ops actions | `LABELPASS_ENABLE_ADMIN_DB_WRITES=1` + `LABELPASS_ADMIN_OPS_TOKEN` |
| Shipment map + tracking | Keyless map UI is real; tracking events are preview data | Live carrier/forwarder tracking feed | Carrier or forwarder tracking API adapter |
| Auth / organizations | Admin data model exists; customer login is not yet active | Supabase Auth, organization membership, RLS ownership | Supabase Auth + `organization_members` policies |
| OCR failure / search-miss telemetry | Returned in response only | Store misses for data-ops review | Logging or Supabase telemetry table |

## Code Markers

- `src/lib/pif-requests.ts` - DB-first PIF submission and admin queue loading with dry-run/local fallback.
- `src/lib/pif-storage.ts` - server-side Supabase Storage upload gate for PIF file originals.
- `src/app/api/pif/applications/route.ts` - customer PIF submit API. Public writes require the explicit customer submission flag.
- `src/app/api/pif/attachments/route.ts` - multipart file upload endpoint for PIF originals.
- `src/lib/handoff-requests.ts` - review-to-expert/logistics handoff records.
- `src/lib/expert-chat.ts` - quote/chat demo models that mirror future `chat_threads` and `chat_messages`.
- `src/lib/logistics-request-drafts.ts` - logistics request drafts that mirror `shipment_requests`.
- `src/lib/portone.ts` - payment readiness and mock checkout boundary.

## Minimum Bar Before Charging Real Customers

1. Supabase DB writes for PIF/customer handoff records.
2. Supabase Storage for PIF/logistics file originals.
3. Supabase Auth + organizations so records survive across devices and users with ownership.
4. Real PortOne checkout + webhook before any money moves.

Expert realtime chat and live carrier tracking can follow after launch if their demo states
remain clearly marked and the operator workflow is honest about what is manual.
