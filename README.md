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
- Archives review history through `/api/reviews` when `SUPABASE_DB_URL`, `POSTGRES_URL`, or `DATABASE_URL` is configured; otherwise the app keeps an immediate browser-side review archive.

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
- `supabase/knowledge-schema.sql`
- `supabase/knowledge-seed.sql`

Runtime knowledge search can use Supabase without a database password when these public environment variables are set:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Browser-only or blocked sources are preserved with manual text captures and screenshots under `data/knowledge/browser-captures/`.

## Verification

```bash
pnpm exec tsc --noEmit
pnpm test:rules
pnpm build
pnpm smoke:api
```

`pnpm smoke:api` expects the app to be running. It checks 14 review cases covering English, Korean, Traditional Chinese, Simplified Chinese, INCI, and separator-folded ingredient aliases through `/api/review`, Taiwan food allergen/additive/nutrition/import-document action plans, 71 multilingual term lookups and 40 source-retrieval probes through `/api/knowledge/search`, 3 reusable evidence-bundle probes through `/api/knowledge/evidence`, plus review archive list/save probes through `/api/reviews`.

## Deployment Files

- `supabase/schema.sql`: main regulatory rule schema.
- `supabase/seed.sql`: official Taiwan TFDA cosmetic rule seed.
- `supabase/knowledge-schema.sql`: reusable source, snapshot, term, alias, and rule-link schema.
- `supabase/knowledge-seed.sql`: generated source and term knowledge seed.
- `vercel.json`: Vercel deployment config.
- `.github/workflows/ci.yml`: typecheck, data drift checks, and production build.
- `docs/deployment-runbook.md`: GitHub, Supabase, and Vercel deployment steps.
- `docs/knowledge-operations.md`: knowledge refresh and curation process.
