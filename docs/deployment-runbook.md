# LabelPass Deployment Runbook

Updated: 2026-06-26

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
pnpm detect:updates
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

For an existing project that already has the base schema, the additive update-queue migration can also be applied directly:

```bash
supabase/migrations/202606260001_regulatory_update_candidates.sql
```

If the SQL editor rejects the full knowledge seed because of size, run:

```bash
pnpm split:knowledge-seed
```

Then apply every file in `supabase/generated/knowledge-seed-chunks/` in filename order after `supabase/knowledge-schema.sql`.

If a Supabase Postgres connection string is available, the browser SQL editor can be skipped:

```bash
SUPABASE_DB_URL="postgresql://..." pnpm apply:supabase-knowledge
```

The script applies the base schema, TFDA rule seed, knowledge schema, and knowledge seed in safe batches, then prints the verification counts.

After applying the seed, verify that Supabase matches the generated local knowledge base:

```bash
SUPABASE_DB_URL="postgresql://..." pnpm verify:supabase-knowledge
```

This check compares table counts and probes high-value Taiwan food aliases such as `MSG`, `味精`, `카제인나트륨`, `魷魚`, `奇異果`, `輸入食品查驗`, `HS 0307 health certificate`, `食品業者登錄`, `잔류농약 기준`, and `食品追溯追蹤`.

To validate the generated seed size before connecting to Supabase:

```bash
SUPABASE_APPLY_DRY_RUN=1 pnpm apply:supabase-knowledge
SUPABASE_VERIFY_DRY_RUN=1 pnpm verify:supabase-knowledge
```

Expected counts after the current seed:

- `rules`: 1,081
- current `rule_versions`: 1,081
- `knowledge_sources`: 100
- `knowledge_snapshots`: 100
- `knowledge_terms`: 1,127
- `term_aliases`: 3,287
- `term_rule_links`: 1,099
- `regulatory_update_candidates`: 20

Recommended verification query:

```sql
select 'rules' as table_name, count(*) from public.rules
union all select 'current_rule_versions', count(*) from public.rule_versions where is_current = true
union all select 'knowledge_sources', count(*) from public.knowledge_sources
union all select 'knowledge_snapshots', count(*) from public.knowledge_snapshots
union all select 'knowledge_terms', count(*) from public.knowledge_terms
union all select 'regulatory_update_candidates', count(*) from public.regulatory_update_candidates
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
4. Run the food import sample with HS `0307.12` and confirm findings include `food-import-inspection-docs-needed`, `food-importer-registration-needed`, and `food-import-hs0307-health-certificate-needed`.
5. Confirm findings include source identifiers and rule evidence.
6. Open `/knowledge` and confirm searches such as `輸入食品查驗`, `HS 0307 health certificate`, `食品業者登錄`, `잔류농약 기준`, `食品中污染物質及毒素`, and `食品追溯追蹤` return the expected Taiwan food-import and food-safety concepts.
