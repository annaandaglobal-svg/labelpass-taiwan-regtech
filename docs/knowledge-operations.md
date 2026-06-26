# Knowledge Operations

Updated: 2026-06-26

LabelPass treats regulatory information as reusable memory, not disposable search results. Every source should be captured once, hashed, summarized into an LLM/Obsidian-friendly document, and then reused through Supabase and local JSON indexes.

## Current Coverage

- Taiwan cosmetics: TFDA restriction data, Cosmetic Hygiene and Safety Act, product notification, product registration systems, PIF management, PIF notices and guidance, QMS/adverse-event reporting, and post-market controls.
- Taiwan product labeling and food import: Commodity Labeling Act, food safety law, allergen labeling, nutrition labeling, front-of-package nutrition guidance, small-package food rules, bulk-food labeling, food-additive common names, health-food and special disease formula permit lookups, illegal advertising lookup, imported-food inspection, systematic inspection, shellfish HS 0307 health certificates, food importer registration, pesticide and veterinary drug residue limits, contaminants and toxins, microorganisms, traceability, food GHP, BSMI commodity inspection, origin/customs notices.
- Taiwan import/export controls: International Trade Administration import/export rules, SHTC notices, dual-use/common military list references.
- Global terminology: WTO TBT, WCO HS, UNECE GHS, Codex food labeling, INCI, CAS, Wassenaar.
- Comparison markets: EU, United States, Japan, Korea, China, and ASEAN official or high-trust sources.

## Refresh Commands

```bash
pnpm crawl:knowledge
pnpm detect:updates
pnpm build:knowledge-seed
pnpm validate:knowledge
pnpm audit:knowledge
```

Use the crawler when source content may have changed. Use the seed builder after curation, alias updates, or a completed crawl.
Use the update detector after crawling when you need a human-review queue for changed, stale, expiring, or high-priority watched sources. `pnpm build:knowledge-seed` runs `detect:updates` automatically.
Use the audit command after crawling to surface shallow extracts, blocked browser captures, encoding damage, and PDF parsing gaps that need manual source rescue.
Use `pnpm audit:aliases` after term edits or a seed rebuild to catch normalized alias collisions, high-confidence overlap, and short ambiguous aliases that still need notes. Add `--strict` when you want the command to fail on unnoted high-confidence collisions.

## Regulatory Update Queue

LabelPass does not automatically mutate rules just because a crawler sees a new page hash. The operating loop is:

1. `pnpm crawl:knowledge` captures source content, hashes it, and preserves freshness metadata.
2. `pnpm detect:updates` writes `data/knowledge/regulatory-update-queue.json`.
3. Operators review candidates with statuses such as `detected`, `pending_refresh`, and `watching`.
4. A reviewer approves or rejects the candidate.
5. Only approved changes should be converted into rule/term edits, Supabase seed updates, and affected product re-review tasks.

Current queue baseline:

- Update candidates: 52
- Newly detected content changes: 0
- Sources pending refresh: 16
- Watched sources: 36

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
- `data/knowledge/index.json`: crawl manifest with success/failure status, generated document paths, cache expiry, and freshness status.
- `data/knowledge/term-registry.json`: curated high-value ingredient aliases.
- `data/knowledge/term-index.json`: generated search index linking aliases to TFDA rules.
- `data/knowledge/regulatory-update-queue.json`: generated source-change and freshness candidates requiring human review before rule changes.
- `supabase/knowledge-schema.sql`: reusable knowledge tables.
- `supabase/knowledge-seed.sql`: generated Supabase data seed.
- `supabase/migrations/202606260002_public_knowledge_search.sql`: read-only public policies and RPC functions for cloud knowledge search through a Supabase publishable key.
- `supabase/migrations/202606260003_tokenized_public_source_search.sql`: token-based source search scoring so date and keyphrase queries still find official sources.
- `supabase/migrations/202606260004_public_source_candidate_limit.sql`: direct source candidate limit alignment with the app's requested result count.
- `supabase/generated/knowledge-seed-chunks/`: temporary SQL chunks created by `pnpm split:knowledge-seed` when the Supabase SQL editor cannot accept the full seed at once.
- `pnpm apply:supabase-knowledge`: applies the base schema, TFDA rules, knowledge schema, and knowledge seed directly when `SUPABASE_DB_URL`, `POSTGRES_URL`, or `DATABASE_URL` is set.
- `pnpm verify:supabase-knowledge`: compares Supabase table counts and probe aliases with the generated local knowledge base after a seed apply.
- `cache_days`, `cache_expires_at`, and `cache_status`: per-source freshness fields used to avoid unnecessary recrawls while surfacing stale official sources.

## App Retrieval Surface

- `/api/knowledge/search?q=<term>` searches canonical terms, INCI names, CAS RN, color index numbers, local-language aliases, abbreviations, and source metadata. It uses Supabase public read-only RPCs when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured, then falls back to the bundled generated cache.
- `/api/knowledge/evidence?q=<term>` packages the same reusable memory into an assistant-ready bundle with top terms, official sources, cache status, and suggested next actions.
- `/knowledge` is the operator-facing search screen for ingredient synonyms, identifiers, and linked Taiwan TFDA rules.
- Search aliases include stored `term_aliases` plus identifier aliases from CAS, INCI, and color index fields, so the UI count can be higher than the Supabase `term_aliases` row count.

## Supabase Tables

- `knowledge_sources`: canonical source registry.
- `knowledge_snapshots`: hashed crawled or captured source snapshots.
- `knowledge_terms`: canonical ingredient or regulatory terms.
- `term_aliases`: multilingual and identifier aliases for search.
- `term_rule_links`: links from normalized terms to official TFDA rule codes.
- `regulatory_update_candidates`: source freshness/content-change candidates awaiting reviewer triage or approval.
- `regulatory_sources`, `rules`, `rule_versions`: official Taiwan TFDA rule evidence used by the app.

Current generated counts:

- `knowledge_sources`: 149
- `knowledge_snapshots`: 149
- `knowledge_terms`: 1,158
- `term_aliases`: 3,754
- `term_rule_links`: 1,099
- `regulatory_update_candidates`: 52
- `rules`: 1,081

Current freshness status:

- Stale sources: 0
- Sources expiring within 3 days: 0
- Sources pending refresh within 7 days: 16
- Next scheduled source refresh: 2026-07-02 22:02 KST

## Alias Curation Rules

- Preserve INCI, CAS RN, color index, Korean, Traditional Chinese, Simplified Chinese, Japanese, and common English names as separate aliases.
- Do not collapse trade names, INCI names, and legal substance names into a single identifier. Link them with confidence and source context.
- Keep short Latin aliases such as `MI`, `MIT`, `MCI`, and `CI` behind stricter matching to reduce false positives.
- Add aliases first in `data/knowledge/term-registry.json`, then run `pnpm build:knowledge-seed`.

## Quality Gates

```bash
pnpm exec tsc --noEmit
pnpm test:rules
pnpm validate:knowledge
pnpm audit:knowledge
pnpm audit:aliases
pnpm detect:updates
pnpm build
pnpm smoke:api
```

The smoke test includes multilingual review aliases and `/api/knowledge/search` cases and must pass before deployment.
The audit command is intentionally non-blocking in CI; its high and medium findings are treated as the next source-quality backlog.
