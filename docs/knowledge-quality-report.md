# Knowledge Quality Report

Crawl index: 2026-06-25T13:06:02.680Z

This report flags source extracts that may be too thin, blocked, encoded incorrectly, or otherwise weak as reusable regulatory evidence. It is an operations backlog, not a legal conclusion.

## Summary

- Sources checked: 73
- High findings: 2
- Medium findings: 12
- Low findings: 0

## Findings

| Severity | Source | Reason | Text chars | Priority |
| --- | --- | --- | ---: | --- |
| high | [global-unece-ghs-rev11-pdf](../data/knowledge/documents/global-unece-ghs-rev11-pdf.md) | Extract is too short to be reliable evidence | 365 | high |
| high | [global-unece-ghs-rev11](../data/knowledge/documents/global-unece-ghs-rev11.md) | Extract is too short to be reliable evidence | 370 | high |
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
