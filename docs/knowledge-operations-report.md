# Knowledge Operations Report

Generated: 2026-06-27T12:42:53.772Z
Crawl index: 2026-06-27T12:38:34.227Z
Term index: 2026-06-25T07:47:54.729Z

This file is generated from the current LabelPass knowledge artifacts. Use it to decide whether to reuse the cached memory, refresh selected official sources, rebuild Supabase seed data, or triage alias collisions.

## Health Gates

- Crawl complete: yes
- Alias queue aligned with term index: yes
- Regulatory update queue aligned with crawl index: yes
- Supabase knowledge seed aligned with generated counts: yes
- Source operations metadata aligned with registry: yes

## Current Counts

- Knowledge sources: 166
- High-priority sources: 130
- Knowledge terms: 1,178
- Stored term aliases: 4,212
- Identifier aliases: 2,481
- Searchable aliases: 6,693
- Term-rule links: 1,082
- Regulatory update candidates: 41
- Alias review items: 1,042

## Freshness

- Stale sources: 0
- Expired sources: 0
- Sources in refresh window: 0 (last 25% of cache period, max 7 days)
- Next scheduled refresh: 2026-07-04T12:38:34.227Z
- Manual fallback sources: 10
- Manual fallback with browser evidence: 10
- Manual fallback without browser evidence: 0
- Browser capture sources: 12
- Reused from raw cache: 121

## Browser Capture Evidence

Manual fallback sources are official pages that need a browser-oriented or structured extract path. All high-priority manual fallback sources should have a capture text file, and screenshot evidence is kept where the page state is visually important.

| Source | Domain | Priority | Routes | Capture | Screenshot |
| --- | --- | --- | --- | --- | --- |
| global-unece-ghs-rev11 | chemical_labeling | high | unmapped | yes | yes |
| global-unece-ghs-rev11-pdf | chemical_labeling | high | unmapped | yes | yes |
| tw-tfda-cosmetic-adverse-event-qms-platform | cosmetics | high | Taiwan cosmetics labeling, PIF and market access | yes | yes |
| tw-tfda-cosmetic-fadenbook-platform | cosmetics | high | Taiwan cosmetics labeling, PIF and market access | yes | no |
| tw-customs-tariff-database-download | customs | high | Taiwan food import inspection and regulation code routing | yes | no |
| tw-tfda-food-additive-permit-query | food_additives | high | Taiwan food import inspection and regulation code routing | yes | no |
| tw-tfda-illegal-advertising-query | food_labeling | high | Taiwan food labeling, allergens, nutrition and claims | yes | no |
| tw-tfda-health-food-permit-query | health_food | high | Taiwan health food permits, labeling and approved effect vocabulary | yes | no |
| tw-tfda-special-disease-food-permit-query | special_dietary_food | high | Taiwan health food permits, labeling and approved effect vocabulary | yes | no |
| tw-trade-ccc-import-export-regulations | trade_controls | high | Taiwan food import inspection and regulation code routing | yes | no |


## Source Metadata Quality

These checks make crawler operations explicit. Core fields, refresh strategy, and last verification are covered by the registry/crawl index; language, date-tracking, owner, and selector strategy are derived into `data/knowledge/source-ops-metadata.json` so crawler and review operations can reuse them without recrawling.

| Check | Present | Missing | Coverage |
| --- | ---: | ---: | ---: |
| Core registry fields | 166 | 0 | 100% |
| Language/locale policy | 166 | 0 | 100% |
| Effective-date tracking | 166 | 0 | 100% |
| Last verified timestamp | 166 | 0 | 100% |
| Refresh strategy | 166 | 0 | 100% |
| Internal owner queue | 166 | 0 | 100% |
| Selector/capture strategy | 166 | 0 | 100% |
| Mapped coverage route | 47 | 119 | 28% |


## Next Sources Due

| Days | Source | Domain | Priority | Expires |
| ---: | --- | --- | --- | --- |
| 7 | tw-customs-export-origin-packaging | customs | medium | 2026-07-04T12:38:34.227Z |
| 7 | tw-customs-tariff-database-download | customs | high | 2026-07-03T19:43:04.752Z |
| 7 | tw-tfda-cosmetic-adverse-event-qms-platform | cosmetics | high | 2026-07-03T19:21:16.738Z |
| 7 | tw-tfda-cosmetic-announcements | cosmetics | high | 2026-07-04T12:38:34.227Z |
| 7 | tw-tfda-cosmetic-product-registration-system | cosmetics | high | 2026-07-04T12:38:34.227Z |
| 7 | tw-tfda-cosmetics-law-regulations-index | cosmetics | high | 2026-07-04T12:38:34.227Z |
| 7 | tw-tfda-food-additive-permit-query | food_additives | high | 2026-07-03T19:43:04.749Z |
| 7 | tw-tfda-food-business-info-query-links | food_safety | medium | 2026-07-04T12:38:34.227Z |
| 7 | tw-tfda-food-ingredient-query-platform-direct | food_safety | high | 2026-07-04T12:38:34.227Z |
| 7 | tw-tfda-food-law-regulations-index | food_labeling | high | 2026-07-04T12:38:34.227Z |
| 7 | tw-tfda-health-food-permit-query | health_food | high | 2026-07-03T19:43:04.750Z |
| 7 | tw-tfda-illegal-advertising-query | food_labeling | high | 2026-07-03T19:43:04.751Z |


## Source Mix

| Domain | Sources |
| --- | ---: |
| cosmetics | 45 |
| food_labeling | 29 |
| customs | 13 |
| food_import | 13 |
| food_safety | 11 |
| export_control | 9 |
| health_food | 7 |
| trade | 7 |
| chemical_labeling | 5 |
| terminology | 5 |
| food_additives | 4 |
| food_contact_materials | 4 |


| Priority | Sources |
| --- | ---: |
| high | 130 |
| medium | 36 |


## Queues

- Update queue: 0 pending refresh, 41 watching, 0 detected changes.
- Alias triage backlog: 46 high-confidence collisions, 0 mojibake aliases, 987 regulated terms without readable local aliases; 0 strict blockers.
- Impact gap candidates: 0 pending/high update candidates have empty affected terms or no mapped coverage route.

### Impact Gap Candidates

No rows.


## Supabase Seed Readiness

- Seed term aliases: 4,212
- Seed update candidates: 41
- SQL editor chunks: 23 chunks / 6,867 statements
- Largest chunk bytes: 224,915

## Operating Commands

```bash
pnpm report:knowledge-ops
pnpm crawl:knowledge
pnpm build:source-ops-metadata
pnpm build:knowledge-seed
pnpm validate:knowledge
pnpm validate:coverage
pnpm audit:search-aliases
pnpm apply:supabase-knowledge
pnpm verify:supabase-knowledge
```
