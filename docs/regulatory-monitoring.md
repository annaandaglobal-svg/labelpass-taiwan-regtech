# Regulatory monitoring — new/changed Taiwan rules

The knowledge base is a snapshot; Taiwan rules change. This runbook keeps it current. Monitoring
has two halves:

1. **Deterministic (repo-side):** `pnpm monitor:regulatory` refreshes the staleness queue and prints
   the authoritative sources due for a re-check, highest priority first. This always works, no web.
2. **Web-verification (LLM pass):** an agent reads that list, checks each source online for
   new/changed/upcoming rules, and any real change is fed back as a term + verdict (+ golden-set
   guard). This needs a research agent; it is not a CI script.

## Cadence

- **Weekly:** the CI `schedule` (Mondays) re-runs the full suite incl. `find:problems` — catches
  regressions, not new external rules.
- **Monthly (recommended):** run the web-verification pass below. A `CronCreate` job can prompt it,
  but that fires only while a Claude session is live and auto-expires after 7 days — so treat the
  monthly pass as "run it when you next have a session," not guaranteed unattended.

## Web-verification pass (the monitoring prompt)

Run `pnpm monitor:regulatory`, then give an agent this task (adjust the source list from the output):

> Regulatory change monitor for a Taiwan import tool (Korean exporters, food/cosmetic/health).
> Check these authoritative sources for rules that are NEW, CHANGED, or UPCOMING since the KB
> snapshot. For each: what changed / effective date / who it affects / primary URL. Report
> **[NEW]** vs **[CHANGE]**, flag anything unverified, and say explicitly if nothing is new.

## Authoritative watch-sources (primary)

| Domain | Authority | What to watch | Entry point |
|--------|-----------|---------------|-------------|
| Food additives | TFDA | 食品添加物使用範圍及限量暨規格標準 amendments | law.moj.gov.tw pcode **L0040084** |
| Food contaminants | TFDA | 食品中污染物質及毒素衛生標準 | pcode **L0040138** |
| Food general | TFDA/MOHW | 食安法, labeling/nutrition/allergen/naming 公告 | fda.gov.tw 公告 (cid=3) |
| Cosmetics | TFDA | 化粧品成分/防腐劑/防曬劑/色素/禁止 使用限制表, PIF | fda.gov.tw 化粧品 zone |
| Health food | TFDA | 健康食品 specs & permitted/prohibited food materials | fda.gov.tw 食品原料整合查詢 |
| Quarantine | 農業部 APHIA | animal/plant import conditions, pet food | aphia.gov.tw |
| Environment | 環境部 | recycling fee, microplastics, 環境用藥 | moenv.gov.tw |
| Commodity/energy | 經濟部 BSMI | 商品檢驗, 商品標示, energy label | bsmi.gov.tw |
| Alcohol/tobacco | 財政部 / HPA | 菸酒管理法·稅, 菸害防制法 (e-cig/HTP) | law.moj.gov.tw / mohw.gov.tw |
| Border rejections | TFDA | monthly 邊境查驗不合格 (what's actually stopped) | fda.gov.tw 邊境查驗 |

## When a real change is found

1. Add/adjust the term in `data/knowledge/term-registry.json` and the verdict branch in
   `src/lib/knowledge-verdicts.ts` (surface the category if it's an ingredient verdict).
2. Add a golden-set guard case in `scripts/smoke-review-api.mjs` pinning the new routing.
3. `pnpm build:terms && pnpm build:knowledge-seed && pnpm export:knowledge-playbooks`, then
   `pnpm smoke:api`, `pnpm find:problems`, `pnpm check:knowledge-drift`, commit.
