# Knowledge Operations Report

Generated: 2026-06-27T04:35:42.428Z
Crawl index: 2026-06-27T00:19:40.111Z
Term index: 2026-06-25T07:47:54.729Z

This file is generated from the current LabelPass knowledge artifacts. Use it to decide whether to reuse the cached memory, refresh selected official sources, rebuild Supabase seed data, or triage alias collisions.

## Health Gates

- Crawl complete: yes
- Alias queue aligned with term index: yes
- Regulatory update queue aligned with crawl index: yes
- Supabase knowledge seed aligned with generated counts: yes

## Current Counts

- Knowledge sources: 166
- High-priority sources: 130
- Knowledge terms: 1,178
- Stored term aliases: 4,138
- Identifier aliases: 2,481
- Searchable aliases: 6,619
- Term-rule links: 1,082
- Regulatory update candidates: 57
- Alias review items: 1,092

## Freshness

- Stale sources: 0
- Expired sources: 0
- Sources due within 7 days: 16
- Next scheduled refresh: 2026-07-02T13:02:19.641Z
- Manual fallback sources: 10
- Manual fallback with browser evidence: 10
- Manual fallback without browser evidence: 0
- Browser capture sources: 12
- Reused from raw cache: 126

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

These checks make crawler operations explicit. Core fields, refresh strategy, and last verification are already covered by the registry/crawl index; language, effective-date, owner, selector strategy, and route mapping remain useful metadata-hardening backlog.

| Check | Present | Missing | Coverage |
| --- | ---: | ---: | ---: |
| Core registry fields | 166 | 0 | 100% |
| Explicit language/locale | 0 | 166 | 0% |
| Effective/amended date | 0 | 166 | 0% |
| Last verified timestamp | 166 | 0 | 100% |
| Refresh strategy | 166 | 0 | 100% |
| Internal owner | 0 | 166 | 0% |
| Selector/capture strategy | 32 | 134 | 19% |
| Mapped coverage route | 44 | 122 | 27% |


## Next Sources Due

| Days | Source | Domain | Priority | Expires |
| ---: | --- | --- | --- | --- |
| 6 | tw-customs-export-origin-packaging | customs | medium | 2026-07-02T13:02:19.641Z |
| 6 | tw-tfda-cosmetic-announcements | cosmetics | high | 2026-07-02T17:40:28.203Z |
| 6 | tw-tfda-pif-hub-zh | cosmetics | high | 2026-07-02T13:02:09.360Z |
| 7 | tw-customs-tariff-database-download | customs | high | 2026-07-03T19:43:04.752Z |
| 7 | tw-tfda-cosmetic-adverse-event-qms-platform | cosmetics | high | 2026-07-03T19:21:16.738Z |
| 7 | tw-tfda-cosmetic-product-registration-system | cosmetics | high | 2026-07-03T06:24:07.617Z |
| 7 | tw-tfda-cosmetics-law-regulations-index | cosmetics | high | 2026-07-03T07:32:31.721Z |
| 7 | tw-tfda-food-additive-permit-query | food_additives | high | 2026-07-03T19:43:04.749Z |
| 7 | tw-tfda-food-business-info-query-links | food_safety | medium | 2026-07-03T04:36:06.006Z |
| 7 | tw-tfda-food-ingredient-query-platform-direct | food_safety | high | 2026-07-03T04:36:05.584Z |
| 7 | tw-tfda-food-law-regulations-index | food_labeling | high | 2026-07-03T07:32:31.721Z |
| 7 | tw-tfda-health-food-permit-query | health_food | high | 2026-07-03T19:43:04.750Z |


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

- Update queue: 16 pending refresh, 41 watching, 0 detected changes.
- Alias triage backlog: 46 high-confidence collisions, 0 mojibake aliases, 1,037 regulated terms without readable local aliases; 0 strict blockers.
- Impact gap candidates: 3 pending/high update candidates have empty affected terms or no mapped coverage route.

### Impact Gap Candidates

| Source | Severity | Status | Terms | Products | Routes | Expires |
| --- | --- | --- | ---: | ---: | --- | --- |
| tw-tfda-inspections-law-regulations-index | medium | pending_refresh | 2 | 2 | unmapped | 2026-07-03T07:32:31.721Z |
| tw-tfda-pif-hub-zh | medium | pending_refresh | 3 | 1 | unmapped | 2026-07-02T13:02:09.360Z |
| tw-tfda-cosmetic-announcements | medium | pending_refresh | 7 | 1 | unmapped | 2026-07-02T17:40:28.203Z |


## Supabase Seed Readiness

- Seed term aliases: 4,138
- Seed update candidates: 57
- SQL editor chunks: 23 chunks / 6,793 statements
- Largest chunk bytes: 224,910

## Operating Commands

```bash
pnpm report:knowledge-ops
pnpm crawl:knowledge
pnpm build:knowledge-seed
pnpm validate:knowledge
pnpm validate:coverage
pnpm audit:search-aliases
pnpm apply:supabase-knowledge
pnpm verify:supabase-knowledge
```
