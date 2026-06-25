# Knowledge Operations

Updated: 2026-06-25

LabelPass treats regulatory information as reusable memory, not disposable search results. Every source should be captured once, hashed, summarized into an LLM/Obsidian-friendly document, and then reused through Supabase and local JSON indexes.

## Current Coverage

- Taiwan cosmetics: TFDA restriction data, Cosmetic Hygiene and Safety Act, PIF notices and guidance.
- Taiwan product labeling: Commodity Labeling Act, food labeling, nutrition labeling, small-package food rules, bulk-food labeling, BSMI commodity inspection, origin/customs notices.
- Taiwan import/export controls: International Trade Administration import/export rules, SHTC notices, dual-use/common military list references.
- Global terminology: WTO TBT, WCO HS, UNECE GHS, Codex food labeling, INCI, CAS, Wassenaar.
- Comparison markets: EU, United States, Japan, Korea, China, and ASEAN official or high-trust sources.

## Refresh Commands

```bash
pnpm crawl:knowledge
pnpm build:knowledge-seed
```

Use the crawler when source content may have changed. Use the seed builder after curation, alias updates, or a completed crawl.

## Manual Browser Capture

Some official sites block automated collection, require a security check, or return inconsistent server errors. In those cases:

1. Open the official URL in the in-app browser.
2. Save visible text to `data/knowledge/browser-captures/<source-id>.txt`.
3. Save a screenshot to `data/knowledge/browser-captures/<source-id>.png`.
4. Add `browser_capture_path` and `screenshot_path` to `data/knowledge/source-registry.json`.
5. Re-run `pnpm crawl:knowledge`.

The crawler records whether a source used an automated fetch, manual fallback, PDF extraction, or browser capture.

## Storage Model

- `data/knowledge/source-registry.json`: source authority, URL, jurisdiction, tags, refresh cadence, and capture metadata.
- `data/knowledge/raw/`: reproducible raw cache. This is git-ignored.
- `data/knowledge/documents/*.md`: source extracts with metadata, content hash, and operational notes.
- `data/knowledge/index.json`: crawl manifest with success/failure status and generated document paths.
- `data/knowledge/term-registry.json`: curated high-value ingredient aliases.
- `data/knowledge/term-index.json`: generated search index linking aliases to TFDA rules.
- `supabase/knowledge-schema.sql`: reusable knowledge tables.
- `supabase/knowledge-seed.sql`: generated Supabase data seed.

## Supabase Tables

- `knowledge_sources`: canonical source registry.
- `knowledge_snapshots`: hashed crawled or captured source snapshots.
- `knowledge_terms`: canonical ingredient or regulatory terms.
- `term_aliases`: multilingual and identifier aliases for search.
- `term_rule_links`: links from normalized terms to official TFDA rule codes.
- `regulatory_sources`, `rules`, `rule_versions`: official Taiwan TFDA rule evidence used by the app.

Current generated counts:

- `knowledge_sources`: 57
- `knowledge_snapshots`: 57
- `knowledge_terms`: 1,074
- `term_aliases`: 2,706
- `term_rule_links`: 1,099
- `rules`: 1,081

## Alias Curation Rules

- Preserve INCI, CAS RN, color index, Korean, Traditional Chinese, Simplified Chinese, Japanese, and common English names as separate aliases.
- Do not collapse trade names, INCI names, and legal substance names into a single identifier. Link them with confidence and source context.
- Keep short Latin aliases such as `MI`, `MIT`, `MCI`, and `CI` behind stricter matching to reduce false positives.
- Add aliases first in `data/knowledge/term-registry.json`, then run `pnpm build:knowledge-seed`.

## Quality Gates

```bash
pnpm exec tsc --noEmit
pnpm test:rules
pnpm build
pnpm smoke:api
```

The smoke test includes multilingual alias cases and must pass before deployment.
