# LabelPass Production Readiness

This file is the single source of truth for what is **real** versus **demo/mock** in the
customer platform flows (review, PIF, expert consult, payment, logistics). Everything below
degrades safely without secrets, and each row lists exactly what must be connected before a
paying customer relies on it. Environment variable **names** only — never commit values.

Live status is also visible to operators at `/admin/settings` (운영 액션 → Live 운영 연결 checklist).

## Boundary table

| Flow | Now (no secrets) | Needed for production | Env / gate |
|------|------------------|-----------------------|------------|
| Regulatory review + evidence | Real. Source-backed rules + term registry, deterministic verdicts | (Optional) GPT context enrichment | `OPENAI_API_KEY` + `LABELPASS_ENABLE_AI_REVIEW=1` |
| Knowledge / unified search | Real. Bundled cache; Supabase public RPC when configured | Supabase public read (optional, has fallback) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| PIF application submit | Demo. Dry-run API + localStorage; status auto-simulated | Persist to `products`/`product_documents`/`audit_logs` | `SUPABASE_DB_URL` + `LABELPASS_ENABLE_ADMIN_DB_WRITES=1` + `LABELPASS_ADMIN_OPS_TOKEN` |
| PIF file attachments | Metadata only (name/size); originals stay in browser | Upload originals to object storage | Supabase Storage bucket + `SUPABASE_SERVICE_ROLE_KEY` (server upload route — not built yet) |
| Expert matching + quote | Demo. Deterministic mock quote + named demo expert | Operator-entered quotes via ops actions | `LABELPASS_ENABLE_ADMIN_DB_WRITES=1` + `LABELPASS_ADMIN_OPS_TOKEN` |
| Expert chat | Demo. Keyword auto-reply, localStorage | Realtime two-way chat | Supabase Realtime on `chat_threads`/`chat_messages` (subscription client — not built yet) |
| Payment | Mock. `/api/payments/checkout` returns paid immediately | Real PortOne checkout window + webhook settlement | `PORTONE_STORE_ID`, `PORTONE_CHANNEL_KEY`, `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET` |
| Logistics matching + quote | Demo. Deterministic mock quote, localStorage | Operator/partner quotes via ops actions | `LABELPASS_ENABLE_ADMIN_DB_WRITES=1` + `LABELPASS_ADMIN_OPS_TOKEN` |
| Shipment map + tracking | Map is real (keyless SVG). Tracking events are preview data | Live carrier tracking feed | Carrier/forwarder tracking API (adapter — not built yet) |
| Auth / organizations | None. All customer records are per-browser localStorage | Login + org-scoped RLS | Supabase Auth + `organization_members` RLS (not built yet) |
| OCR failure / search-miss telemetry | Not persisted. Warnings returned in-response only | Store failures for data-ops review | Logging sink (not built yet) |

## Code markers

Each demo/fallback layer is intentionally isolated so the transport can be swapped without
touching UI:

- `src/lib/pif-requests.ts` — DB-first with dry-run fallback; same shape as `handoff-requests.ts`.
- `src/lib/expert-chat.ts` — quote/chat demo models mirror `chat_threads`/`chat_messages`.
- `src/lib/logistics-request-drafts.ts` — request draft mirrors `shipment_requests`.
- `src/lib/portone.ts` — `portoneReadiness()` reports presence only; `createCheckoutSession()`
  returns a mock paid session until PortOne server SDK is wired in.
- `src/app/api/payments/webhook/route.ts` — signature-gated stub; returns 503 until
  `PORTONE_WEBHOOK_SECRET` is set.

## Minimum bar before charging real customers

1. Supabase DB + auth/organizations (records must survive across devices and users).
2. Supabase Storage for PIF/logistics file originals.
3. Real PortOne checkout + webhook before any money moves.

Items 1–3 are the gate. Expert realtime chat and live carrier tracking can follow after launch
because their demo flows communicate status honestly in the meantime.
