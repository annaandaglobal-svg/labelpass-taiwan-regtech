# Knowledge Quality Report

Crawl index: 2026-06-25T12:09:51.776Z

This report flags source extracts that may be too thin, blocked, encoded incorrectly, or otherwise weak as reusable regulatory evidence. It is an operations backlog, not a legal conclusion.

## Summary

- Sources checked: 73
- High findings: 7
- Medium findings: 16
- Low findings: 0

## Findings

| Severity | Source | Reason | Text chars | Priority |
| --- | --- | --- | ---: | --- |
| high | [eu-cosmetics-regulation-1223-2009](../data/knowledge/documents/eu-cosmetics-regulation-1223-2009.md) | Extract is too short to be reliable evidence | 0 | high |
| high | [eu-clp-regulation-1272-2008](../data/knowledge/documents/eu-clp-regulation-1272-2008.md) | Extract is too short to be reliable evidence | 0 | high |
| high | [eu-food-information-regulation-1169-2011](../data/knowledge/documents/eu-food-information-regulation-1169-2011.md) | Extract is too short to be reliable evidence | 0 | high |
| high | [eu-dual-use-regulation-2021-821](../data/knowledge/documents/eu-dual-use-regulation-2021-821.md) | Extract is too short to be reliable evidence | 0 | high |
| high | [eu-cosing-cosmetic-ingredients](../data/knowledge/documents/eu-cosing-cosmetic-ingredients.md) | Extract is too short to be reliable evidence | 49 | medium |
| high | [global-unece-ghs-rev11-pdf](../data/knowledge/documents/global-unece-ghs-rev11-pdf.md) | Extract is too short to be reliable evidence | 365 | high |
| high | [global-unece-ghs-rev11](../data/knowledge/documents/global-unece-ghs-rev11.md) | Extract is too short to be reliable evidence | 370 | high |
| medium | [eu-cosmetics-regulation-1223-2009](../data/knowledge/documents/eu-cosmetics-regulation-1223-2009.md) | Document contains blocked-page or unsupported-document language | 0 | high |
| medium | [eu-clp-regulation-1272-2008](../data/knowledge/documents/eu-clp-regulation-1272-2008.md) | Document contains blocked-page or unsupported-document language | 0 | high |
| medium | [eu-food-information-regulation-1169-2011](../data/knowledge/documents/eu-food-information-regulation-1169-2011.md) | Document contains blocked-page or unsupported-document language | 0 | high |
| medium | [eu-dual-use-regulation-2021-821](../data/knowledge/documents/eu-dual-use-regulation-2021-821.md) | Document contains blocked-page or unsupported-document language | 0 | high |
| medium | [global-unece-ghs-rev11-pdf](../data/knowledge/documents/global-unece-ghs-rev11-pdf.md) | Document contains blocked-page or unsupported-document language | 365 | high |
| medium | [global-unece-ghs-rev11](../data/knowledge/documents/global-unece-ghs-rev11.md) | Document contains blocked-page or unsupported-document language | 370 | high |
| medium | [us-ecfr-cosmetic-labeling-21-cfr-701](../data/knowledge/documents/us-ecfr-cosmetic-labeling-21-cfr-701.md) | High-priority source has a shallow extract | 1180 | high |
| medium | [us-ecfr-cosmetic-labeling-21-cfr-701](../data/knowledge/documents/us-ecfr-cosmetic-labeling-21-cfr-701.md) | Document contains blocked-page or unsupported-document language | 1180 | high |
| medium | [us-ecfr-food-labeling-21-cfr-101](../data/knowledge/documents/us-ecfr-food-labeling-21-cfr-101.md) | High-priority source has a shallow extract | 1180 | high |
| medium | [us-ecfr-food-labeling-21-cfr-101](../data/knowledge/documents/us-ecfr-food-labeling-21-cfr-101.md) | Document contains blocked-page or unsupported-document language | 1180 | high |
| medium | [us-ecfr-origin-marking-19-cfr-134](../data/knowledge/documents/us-ecfr-origin-marking-19-cfr-134.md) | High-priority source has a shallow extract | 1180 | high |
| medium | [us-ecfr-origin-marking-19-cfr-134](../data/knowledge/documents/us-ecfr-origin-marking-19-cfr-134.md) | Document contains blocked-page or unsupported-document language | 1180 | high |
| medium | [us-osha-hazcom-29-cfr-1910-1200](../data/knowledge/documents/us-osha-hazcom-29-cfr-1910-1200.md) | High-priority source has a shallow extract | 1180 | high |
| medium | [us-osha-hazcom-29-cfr-1910-1200](../data/knowledge/documents/us-osha-hazcom-29-cfr-1910-1200.md) | Document contains blocked-page or unsupported-document language | 1180 | high |
| medium | [jp-customs-tariff-schedule](../data/knowledge/documents/jp-customs-tariff-schedule.md) | High-priority source has a shallow extract | 1431 | high |
| medium | [cn-mofcom-export-control-portal](../data/knowledge/documents/cn-mofcom-export-control-portal.md) | High-priority source has a shallow extract | 1798 | high |


## Remediation Pattern

1. Re-open the official source in the browser when automated fetches are shallow or blocked.
2. Save visible text and a screenshot under `data/knowledge/browser-captures/`.
3. Add or update `browser_capture_path` and `screenshot_path` in `data/knowledge/source-registry.json`.
4. Run `pnpm crawl:knowledge`, `pnpm build:knowledge-seed`, and `pnpm validate:knowledge`.
