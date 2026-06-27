# Knowledge Operations

Updated: 2026-06-27

LabelPass treats regulatory information as reusable memory, not disposable search results. Every source should be captured once, hashed, summarized into an LLM/Obsidian-friendly document, and then reused through Supabase and local JSON indexes.

## Current Coverage

- Taiwan cosmetics: TFDA restriction data, Cosmetic Hygiene and Safety Act, product notification, product registration systems, PIF management, PIF notices and guidance, QMS/adverse-event reporting, and post-market controls.
- Taiwan product labeling and food import: Commodity Labeling Act, food safety law, allergen labeling, nutrition labeling, front-of-package nutrition guidance, small-package food rules, bulk-food labeling, food-additive common names, health-food and special disease formula permit lookups, illegal advertising lookup, imported-food inspection, systematic inspection, shellfish HS 0307 health certificates, food importer registration, pesticide and veterinary drug residue limits, contaminants and toxins, microorganisms, traceability, food GHP, BSMI commodity inspection, origin/customs notices.
- Taiwan import/export controls: International Trade Administration import/export rules, SHTC notices, dual-use/common military list references.
- Global terminology: WTO TBT, WCO HS, UNECE GHS, Codex food labeling, INCI, CAS, Wassenaar.
- Comparison markets: EU, United States, Japan, Korea, China, and ASEAN official or high-trust sources.

## Refresh Commands

```bash
pnpm report:knowledge-ops
pnpm crawl:knowledge
pnpm build:source-ops-metadata
pnpm detect:updates
pnpm build:knowledge-seed
pnpm build:alias-queue
pnpm export:knowledge-memory
pnpm export:knowledge-playbooks
pnpm validate:knowledge
pnpm validate:coverage
pnpm audit:knowledge
pnpm audit:knowledge-ops
pnpm check:knowledge-memory
pnpm check:knowledge-playbooks
pnpm check:knowledge-drift
pnpm preflight:supabase-knowledge
```

Use `pnpm report:knowledge-ops` for a read-only operational snapshot before deciding whether a crawl or seed rebuild is actually needed. Use `pnpm report:knowledge-ops:write` when the generated Markdown report in `docs/knowledge-operations-report.md` should be refreshed for handoff or review.
Use the crawler when source content may have changed. Use `pnpm build:source-ops-metadata` after source registry edits to refresh derived language, owner, selector, evidence, refresh, and effective-date tracking policies without recrawling. Use the seed builder after curation, alias updates, or a completed crawl.
Use the update detector after crawling when you need a human-review queue for changed, stale, expiring, or high-priority watched sources. `pnpm build:knowledge-seed` runs `detect:updates` and `build:alias-queue` automatically.
Use `pnpm export:knowledge-memory` after a crawl or seed rebuild to fold the current source index, source operations metadata, term aliases, coverage groups, alias queue, and refresh queue into `data/knowledge/knowledge-memory.json` and `docs/wiki/knowledge-memory.md` for LLM/Obsidian reuse.
Use `pnpm export:knowledge-playbooks` after memory export to generate product routing and evidence bundle templates from the reusable memory. This adds workflow routing for Taiwan cosmetics, food labels, food additives, food import inspection, health food, food-contact packaging, customs/origin, and SHTC/trade controls.
Use the audit command after crawling to surface shallow extracts, blocked browser captures, encoding damage, and PDF parsing gaps that need manual source rescue.
Use `pnpm audit:knowledge-ops` as the stronger readiness gate for reusable operations. It fails when Taiwan cosmetics/food coverage groups, generated LLM/Obsidian memory, product routing, evidence bundle cards, browser-capture fallbacks, or Supabase seed row counts no longer agree.
Use `pnpm audit:aliases` after term edits or a seed rebuild to inspect normalized alias collisions, high-confidence overlap, and short ambiguous aliases that still need notes. Use `pnpm build:alias-queue` when those audit findings should be written to the persistent review queue. Add `--strict` when you want the command to fail on unnoted high-confidence collisions.
Use `pnpm check:knowledge-memory` when only the LLM/Obsidian memory layer is being checked. Use `pnpm check:knowledge-playbooks` when the routing and evidence templates are being reviewed. Use `pnpm check:knowledge-drift` before committing a knowledge update. It rebuilds source operations metadata, generated term index, update queue, alias review queue, reusable memory, product routing, evidence templates, and Supabase seed, then fails if those tracked artifacts were not committed.
Use `pnpm preflight:supabase-knowledge` before any cloud DB apply. It regenerates ignored SQL chunks, then chains knowledge validation, coverage validation, alias search audit, operations reporting, freshness gates, generated SQL format checks, target project checks, and a dry-run Supabase apply plan.

## Regulatory Update Queue

LabelPass does not automatically mutate rules just because a crawler sees a new page hash. The operating loop is:

1. `pnpm crawl:knowledge` captures source content, hashes it, and preserves freshness metadata.
2. `pnpm detect:updates` writes `data/knowledge/regulatory-update-queue.json`.
3. Operators review candidates with statuses such as `detected`, `pending_refresh`, and `watching`.
4. A reviewer approves or rejects the candidate.
5. Only approved changes should be converted into rule/term edits, Supabase seed updates, and affected product re-review tasks.

Current queue baseline:

- Update candidates: 57
- Newly detected content changes: 0
- Sources pending refresh: 16
- Watched sources: 41

## Alias Review Queue

The same ingredient or regulatory phrase can appear under different legal, local-language, ingredient, allergen, functional-class, or shipment contexts. LabelPass therefore keeps alias ambiguity as a reviewable operating queue instead of hiding it inside search scoring.

The operating loop is:

1. Curate aliases in `data/knowledge/term-registry.json` or regenerate the term index from TFDA rules.
2. Run `pnpm build:alias-queue`.
3. Review high-priority collisions first, especially shared aliases such as `casein`, `INCI`, `防腐劑`, `自用`, and `國內負責廠商`.
4. Add source-backed notes, split aliases, lower confidence, or add local names as needed.
5. Re-run `pnpm build:knowledge-seed`, `pnpm build:alias-queue`, and `pnpm validate:knowledge`.

Current alias queue baseline:

- Review items: 1,042
- High-confidence collisions: 46
- Mojibake/damaged aliases: 0
- Strict blockers: 0
- Regulated terms needing readable local aliases: 987

## Manual Browser Capture

Some official sites block automated collection, require a security check, or return inconsistent server errors. In those cases:

1. Open the official URL in the in-app browser.
2. Save visible text to `data/knowledge/browser-captures/<source-id>.txt`.
3. Save a screenshot to `data/knowledge/browser-captures/<source-id>.png`.
4. Add `browser_capture_path` and `screenshot_path` to `data/knowledge/source-registry.json`.
5. Re-run `pnpm crawl:knowledge`.

The crawler records whether a source used an automated fetch, manual fallback, PDF extraction, or browser capture. A dynamic official page may remain `manual_fallback: true` for search-quality reasons while also carrying `browser_capture: true` when a reusable browser evidence file is attached. Treat only manual fallbacks without browser evidence as capture backlog.

## Storage Model

- `data/knowledge/source-registry.json`: source authority, URL, jurisdiction, tags, refresh cadence, and capture metadata.
- `data/knowledge/source-ops-metadata.json`: generated source operations metadata for language policy, review owner queue, selector strategy, date-tracking strategy, refresh strategy, and evidence policy.
- `data/knowledge/coverage-requirements.json`: required Taiwan food/cosmetics coverage groups that must stay searchable and backed by crawled documents.
- `data/knowledge/raw/`: reproducible raw cache. This is git-ignored.
- `data/knowledge/documents/*.md`: source extracts with metadata, content hash, and operational notes.
- `data/knowledge/index.json`: crawl manifest with success/failure status, generated document paths, cache expiry, and freshness status.
- `data/knowledge/term-registry.json`: curated high-value ingredient aliases.
- `data/knowledge/term-index.json`: generated search index linking aliases to TFDA rules.
- `data/knowledge/alias-review-queue.json`: generated alias collision, damaged-text, short-alias, and missing-local-name review queue.
- `data/knowledge/regulatory-update-queue.json`: generated source-change and freshness candidates requiring human review before rule changes.
- `data/knowledge/knowledge-memory.json`: generated LLM/Obsidian retrieval memory with coverage cards, selected source cards, source owner queues, selected term cards, alias ambiguity, refresh queue, and retrieval playbooks.
- `data/knowledge/product-routing-matrix.json`: generated product and shipment routing matrix for Taiwan cosmetics, food, import, customs, and trade-control workflows.
- `data/knowledge/evidence-bundle-templates.json`: generated evidence bundle templates that define required inputs, citation slots, top terms, required sources, caveats, and stop conditions for each route.
- `docs/wiki/knowledge-memory.md`: generated human-readable memory map for operators and agent handoffs.
- `docs/wiki/product-routing-matrix.md`: generated Obsidian-friendly product routing guide.
- `docs/wiki/evidence-bundles/`: generated evidence bundle template cards.
- `supabase/knowledge-schema.sql`: reusable knowledge tables.
- `supabase/knowledge-seed.sql`: generated Supabase data seed.
- `supabase/migrations/202606260002_public_knowledge_search.sql`: read-only public policies and RPC functions for cloud knowledge search through a Supabase publishable key.
- `supabase/migrations/202606260003_tokenized_public_source_search.sql`: token-based source search scoring so date and keyphrase queries still find official sources.
- `supabase/migrations/202606260004_public_source_candidate_limit.sql`: direct source candidate limit alignment with the app's requested result count.
- `supabase/generated/knowledge-seed-chunks/`: temporary SQL chunks created by `pnpm split:knowledge-seed` when the Supabase SQL editor cannot accept the full seed at once.
- `pnpm build:source-ops-metadata`: regenerates the tracked source operations metadata file from the source registry without recrawling.
- `pnpm export:knowledge-memory`: folds existing generated knowledge artifacts into reusable memory files without recrawling.
- `pnpm export:knowledge-playbooks`: regenerates memory, product routing, and evidence bundle template files without recrawling.
- `pnpm check:knowledge-memory`: regenerates the tracked memory files and fails if they are stale.
- `pnpm check:knowledge-playbooks`: regenerates the tracked memory/playbook files and fails if they are stale.
- `pnpm audit:knowledge-ops`: fails if Taiwan cosmetics/food coverage, reusable memory, product routing, evidence bundle cards, browser captures, or Supabase seed counts are not operationally aligned.
- `pnpm check:knowledge-drift`: rebuilds tracked generated knowledge artifacts and fails if source operations metadata, `term-index`, `regulatory-update-queue`, `alias-review-queue`, reusable memory, product routing, evidence templates, or `supabase/knowledge-seed.sql` are stale.
- `pnpm preflight:supabase-knowledge`: regenerates ignored SQL chunks, validates the generated knowledge base, and dry-runs the Supabase apply plan before any DB write.
- `pnpm apply:supabase-knowledge`: runs the Supabase preflight, then applies the base schema, TFDA rules, knowledge schema, and knowledge seed directly when `SUPABASE_DB_URL`, `POSTGRES_URL`, or `DATABASE_URL` is set. Real applies require `SUPABASE_APPLY_CONFIRM=APPLY_LABELPASS_KNOWLEDGE` and the DB URL must include the expected project ref unless `SUPABASE_EXPECTED_PROJECT_REF` or `SUPABASE_ALLOW_UNKNOWN_PROJECT=1` is set intentionally.
- `pnpm verify:supabase-knowledge`: compares Supabase table counts and probe aliases with the generated local knowledge base after a seed apply.
- `pnpm report:knowledge-ops`: prints current source freshness, alias counts, update queue state, and Supabase seed readiness from generated artifacts.
- `cache_days`, `cache_expires_at`, and `cache_status`: per-source freshness fields used to avoid unnecessary recrawls while surfacing stale official sources.

## App Retrieval Surface

- `/api/knowledge/search?q=<term>` searches canonical terms, INCI names, CAS RN, color index numbers, local-language aliases, abbreviations, and source metadata. It uses Supabase public read-only RPCs when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured, then falls back to the bundled generated cache.
- `/api/knowledge/evidence?q=<term>` packages the same reusable memory into an assistant-ready bundle with top terms, official sources, cache status, and suggested next actions.
- `/api/knowledge/evidence?q=<term>&product_family=<family>&route_id=<route>` also returns generated `routeHints` when a query maps to a product workflow. These hints come from `data/knowledge/product-routing-matrix.json` and `data/knowledge/evidence-bundle-templates.json`.
- `/knowledge` is the operator-facing search screen for ingredient synonyms, identifiers, and linked Taiwan TFDA rules.
- Search aliases include stored `term_aliases` plus identifier aliases from CAS, INCI, and color index fields, so the UI/API search count can be higher than the physical Supabase `term_aliases` row count.

## Supabase Tables

- `knowledge_sources`: canonical source registry.
- `knowledge_snapshots`: hashed crawled or captured source snapshots, including source operations metadata in the `metadata` JSON for language, owner, selector, date-tracking, refresh, and evidence policies.
- `knowledge_terms`: canonical ingredient or regulatory terms.
- `term_aliases`: stored multilingual, local-language, and regulatory phrase aliases for search.
- `term_rule_links`: links from normalized terms to official TFDA rule codes.
- `regulatory_update_candidates`: source freshness/content-change candidates awaiting reviewer triage or approval.
- `regulatory_sources`, `rules`, `rule_versions`: official Taiwan TFDA rule evidence used by the app.

Current generated counts:

- `knowledge_sources`: 166
- `knowledge_snapshots`: 166
- `knowledge_terms`: 1,178
- `term_aliases`: 4,212
- `searchable_aliases`: 6,693
- `term_rule_links`: 1,082
- `regulatory_update_candidates`: 57
- `alias_review_queue`: 1,042
- `rules`: 1,081

Authoritative current counts are generated by `pnpm report:knowledge-ops`; update this section only after regenerating and reviewing `docs/knowledge-operations-report.md`.

Current freshness status:

- Stale sources: 0
- Sources expiring within 3 days: 0
- Sources pending refresh within 7 days: 16
- Next scheduled source refresh: 2026-07-02 22:02 KST

## Alias Curation Rules

- Preserve INCI, CAS RN, color index, Korean, Traditional Chinese, Simplified Chinese, Japanese, and common English names as separate aliases.
- Do not collapse trade names, INCI names, and legal substance names into a single identifier. Link them with confidence and source context.
- Generated TFDA rule aliases promote only source-backed local names. Parenthetical Traditional Chinese names in the official ingredient or alias fields become `zh-Hant` `local_name` aliases; mixed English plus regulatory-use sentences stay as official rule names, not local names.
- Keep short Latin aliases such as `MI`, `MIT`, `MCI`, and `CI` behind stricter matching to reduce false positives.
- Add aliases first in `data/knowledge/term-registry.json`, then run `pnpm build:knowledge-seed`.
- After any alias or generated-rule refresh, run `pnpm build:alias-queue`; review high-confidence collisions before assuming a search match is unambiguous.
- For damaged text or mojibake findings, recrawl the source or use manual browser capture before promoting the alias.

## Quality Gates

```bash
pnpm exec tsc --noEmit
pnpm test:rules
pnpm validate:knowledge
pnpm validate:coverage
pnpm audit:knowledge
pnpm audit:knowledge-ops
pnpm audit:aliases
pnpm build:alias-queue
pnpm detect:updates
pnpm build
pnpm smoke:api
```

The smoke test includes multilingual review aliases and `/api/knowledge/search` cases and must pass before deployment.
The coverage gate checks required Taiwan cosmetics, food labeling/allergen, food import, and health-food source IDs, term IDs, document extracts, and high-value aliases so high aggregate counts cannot hide a missing core regulatory axis.
The audit command is intentionally non-blocking in CI; its high and medium findings are treated as the next source-quality backlog.
