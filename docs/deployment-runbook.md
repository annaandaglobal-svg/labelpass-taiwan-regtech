# LabelPass Deployment Runbook

Updated: 2026-06-25

## Current Assets

- GitHub repository: `https://github.com/annaandaglobal-svg/labelpass-taiwan-regtech`
- Supabase project: `labeling ai`
- Supabase URL: `https://zqmpvveneqdkrojtqxhi.supabase.co`
- Vercel project target: `labelpass-taiwan-regtech`

## Pre-Deployment Checks

```bash
pnpm install
pnpm exec tsc --noEmit
pnpm test:rules
pnpm crawl:knowledge
pnpm build:knowledge-seed
pnpm validate:knowledge
pnpm build
```

With the app running, also run:

```bash
pnpm smoke:api
```

## Supabase

Apply the SQL files in this order:

1. `supabase/schema.sql`
2. `supabase/seed.sql`
3. `supabase/knowledge-schema.sql`
4. `supabase/knowledge-seed.sql`

If the SQL editor rejects the full knowledge seed because of size, run:

```bash
pnpm split:knowledge-seed
```

Then apply every file in `supabase/generated/knowledge-seed-chunks/` in filename order after `supabase/knowledge-schema.sql`.

Expected counts after the current seed:

- `rules`: 1,081
- current `rule_versions`: 1,081
- `knowledge_sources`: 57
- `knowledge_snapshots`: 57
- `knowledge_terms`: 1,074
- `term_aliases`: 2,706
- `term_rule_links`: 1,099

Recommended verification query:

```sql
select 'rules' as table_name, count(*) from public.rules
union all select 'current_rule_versions', count(*) from public.rule_versions where valid_to is null
union all select 'knowledge_sources', count(*) from public.knowledge_sources
union all select 'knowledge_snapshots', count(*) from public.knowledge_snapshots
union all select 'knowledge_terms', count(*) from public.knowledge_terms
union all select 'term_aliases', count(*) from public.term_aliases
union all select 'term_rule_links', count(*) from public.term_rule_links;
```

## GitHub

```bash
git status --short
git add .
git commit -m "Add reusable regulatory knowledge and term index"
git push
```

## Vercel

1. Import `annaandaglobal-svg/labelpass-taiwan-regtech`.
2. Use the Next.js framework preset.
3. Add this environment variable:

```text
NEXT_PUBLIC_SUPABASE_URL=https://zqmpvveneqdkrojtqxhi.supabase.co
```

The current runtime review endpoint uses local generated rule JSON, so a Supabase anon key is not required for the MVP. Add Supabase runtime credentials later when user accounts, saved reviews, or server-side synchronization are enabled.

## Post-Deployment Verification

1. Open the production URL.
2. Run a review with English ingredients such as `Triclosan`, `Methylisothiazolinone`, and `Mercury`.
3. Run a review with aliases such as `살리실산`, `水楊酸`, `水杨酸`, `Oxybenzone`, and `Phenoxyethanol`.
4. Confirm findings include source identifiers and rule evidence.
5. Open `/knowledge` and confirm searches such as `살리실산`, `水楊酸`, and `IPBC` return the expected canonical ingredient and Taiwan rule links.
