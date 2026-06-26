# LabelPass

LabelPass is a Taiwan-first import, export, and product-labeling compliance assistant. The current product focuses on Taiwan cosmetics review, Taiwan food-label first-pass checks, and food-import document triage, with a reusable regulatory knowledge base for Taiwan, global terminology, and adjacent import/export labeling sources.

## What It Does

- Reviews cosmetic ingredient text against official Taiwan TFDA restriction data.
- Screens Taiwan prepackaged food labels for core label items, nutrition labeling, and TFDA allergen warning risks.
- Reviews Taiwan food-import inspection packets for inspection application documents, product information sheets, import declarations, importer registration, product-liability insurance, CCC batch consistency, systematic-inspection signals, and HS 0307 health-certificate gaps.
- Flags label claims that may imply drug or disease-treatment effects.
- Keeps source-backed findings with TFDA identifiers and rule versions.
- Returns a structured action plan with owner summary, document checklist, evidence pack, and next operational step for each review.
- Maintains a reusable knowledge base so the system does not need to recrawl every source for every answer.
- Uses Supabase public read-only knowledge RPCs when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured, with a bundled local cache fallback.
- Normalizes ingredient names across INCI, CAS, English, Korean, Traditional Chinese, Simplified Chinese, and Japanese aliases.
- Provides `/knowledge`, a searchable term and official-source explorer for aliases, identifiers, and TFDA rule links.
- Generates a regulatory update queue so source changes, stale caches, and high-priority Taiwan notices require human approval before rules are changed.
- Archives review history through `/api/reviews` only when a server DB URL and `LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE=1` are configured; otherwise the app keeps an immediate browser-side review archive.

## Local Setup

```bash
pnpm install
pnpm dev
```

Open `http://127.0.0.1:3000`.

Use `http://127.0.0.1:3000/knowledge` to search the reusable term/source memory directly.

## Data Refresh

```bash
pnpm fetch:tfda
pnpm build:rules
pnpm test:rules
pnpm build:supabase-seed
pnpm crawl:knowledge
pnpm detect:updates
pnpm build:knowledge-seed
```

The TFDA raw cache is stored under `data/tfda/`. Built rule data lives in `data/rules/tw-cosmetics-rules.json`.

Reusable regulatory memory is managed through:

- `data/knowledge/source-registry.json`
- `data/knowledge/documents/`
- `data/knowledge/index.json`
- `data/knowledge/term-registry.json`
- `data/knowledge/term-index.json`
- `data/knowledge/regulatory-update-queue.json`
- `data/knowledge/alias-review-queue.json`
- `supabase/knowledge-schema.sql`
- `supabase/knowledge-seed.sql`

Runtime knowledge search can use Supabase without a database password when these public environment variables are set:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Before deploying a knowledge update, run:

```bash
pnpm check:knowledge-drift
pnpm preflight:supabase-knowledge
```

`preflight:deploy` includes both gates, plus type checks, rule verification, build, and production API checks.

Persistent review history is deliberately opt-in. A database URL plus the archive flag only makes the server capable of database storage; read/write access still needs either a server-side archive token for checks or explicit public demo flags:

```bash
SUPABASE_DB_URL=
LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE=1
LABELPASS_REVIEW_ARCHIVE_TOKEN=

# Demo/public archive mode only, not recommended for production customer data:
LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_READ=1
LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_WRITE=1
```

Browser-only or blocked sources are preserved with manual text captures and screenshots under `data/knowledge/browser-captures/`.

## Verification

```bash
pnpm exec tsc --noEmit
pnpm test:rules
pnpm build
pnpm audit:production-env
pnpm smoke:api
```

`pnpm audit:production-env` checks production API readiness without printing secrets. `pnpm smoke:api` expects the app to be running. It checks 28 review cases, 109 multilingual knowledge cases, 2 ambiguity cases, 66 source probes, 3 reusable evidence-bundle probes, plus review archive list/save probes through `/api/reviews`.

## Deployment Files

- `supabase/schema.sql`: main regulatory rule schema.
- `supabase/seed.sql`: official Taiwan TFDA cosmetic rule seed.
- `supabase/knowledge-schema.sql`: reusable source, snapshot, term, alias, and rule-link schema.
- `supabase/knowledge-seed.sql`: generated source and term knowledge seed.
- `vercel.json`: Vercel deployment config.
- `.github/workflows/ci.yml`: typecheck, data drift checks, and production build.
- `scripts/audit-production-env.mjs`: no-secret production readiness audit for Vercel/Supabase/archive storage.
- `docs/deployment-runbook.md`: GitHub, Supabase, and Vercel deployment steps.
- `docs/knowledge-operations.md`: knowledge refresh and curation process.
