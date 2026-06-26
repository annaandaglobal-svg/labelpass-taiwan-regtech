# Knowledge Operations Report

Generated: 2026-06-26T20:10:27.995Z
Crawl index: 2026-06-26T20:07:58.580Z
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
- Knowledge terms: 1,175
- Stored term aliases: 4,013
- Identifier aliases: 2,479
- Searchable aliases: 6,492
- Term-rule links: 1,099
- Regulatory update candidates: 57
- Alias review items: 1,097

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
- Alias triage backlog: 46 high-confidence collisions, 2 mojibake aliases, 1,040 regulated terms without readable local aliases; 0 strict blockers.

## Supabase Seed Readiness

- Seed term aliases: 4,013
- Seed update candidates: 57
- SQL editor chunks: 22 chunks / 6,682 statements
- Largest chunk bytes: 224,920

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
