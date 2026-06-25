# Knowledge Quality Report

Crawl index: 2026-06-25T13:32:20.957Z

This report flags source extracts that may be too thin, blocked, encoded incorrectly, or otherwise weak as reusable regulatory evidence. It is an operations backlog, not a legal conclusion.

## Summary

- Sources checked: 73
- High findings: 0
- Medium findings: 0
- Low findings: 0

## Findings

No findings.


## Remediation Pattern

1. Re-open the official source in the browser when automated fetches are shallow or blocked.
2. Save visible text and a screenshot under `data/knowledge/browser-captures/`.
3. Add or update `browser_capture_path` and `screenshot_path` in `data/knowledge/source-registry.json`.
4. Run `pnpm crawl:knowledge`, `pnpm build:knowledge-seed`, and `pnpm validate:knowledge`.
