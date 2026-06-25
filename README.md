# LabelPass

LabelPass is a Taiwan-first import, export, and product-labeling compliance assistant. The current product focuses on Taiwan cosmetics review, with a reusable regulatory knowledge base for Taiwan, global terminology, and adjacent import/export labeling sources.

## What It Does

- Reviews cosmetic ingredient text against official Taiwan TFDA restriction data.
- Flags label claims that may imply drug or disease-treatment effects.
- Keeps source-backed findings with TFDA identifiers and rule versions.
- Maintains a reusable knowledge base so the system does not need to recrawl every source for every answer.
- Normalizes ingredient names across INCI, CAS, English, Korean, Traditional Chinese, Simplified Chinese, and Japanese aliases.

## Local Setup

```bash
pnpm install
pnpm dev
```

Open `http://127.0.0.1:3000`.

## Data Refresh

```bash
pnpm fetch:tfda
pnpm build:rules
pnpm test:rules
pnpm build:supabase-seed
pnpm crawl:knowledge
pnpm build:knowledge-seed
```

The TFDA raw cache is stored under `data/tfda/`. Built rule data lives in `data/rules/tw-cosmetics-rules.json`.

Reusable regulatory memory is managed through:

- `data/knowledge/source-registry.json`
- `data/knowledge/documents/`
- `data/knowledge/index.json`
- `data/knowledge/term-registry.json`
- `data/knowledge/term-index.json`
- `supabase/knowledge-schema.sql`
- `supabase/knowledge-seed.sql`

Browser-only or blocked sources are preserved with manual text captures and screenshots under `data/knowledge/browser-captures/`.

## Verification

```bash
pnpm exec tsc --noEmit
pnpm test:rules
pnpm build
pnpm smoke:api
```

`pnpm smoke:api` expects the app to be running. It checks English, Korean, Traditional Chinese, Simplified Chinese, and INCI ingredient aliases through `/api/review`.

## Deployment Files

- `supabase/schema.sql`: main regulatory rule schema.
- `supabase/seed.sql`: official Taiwan TFDA cosmetic rule seed.
- `supabase/knowledge-schema.sql`: reusable source, snapshot, term, alias, and rule-link schema.
- `supabase/knowledge-seed.sql`: generated source and term knowledge seed.
- `vercel.json`: Vercel deployment config.
- `.github/workflows/ci.yml`: typecheck, data drift checks, and production build.
- `docs/deployment-runbook.md`: GitHub, Supabase, and Vercel deployment steps.
- `docs/knowledge-operations.md`: knowledge refresh and curation process.
