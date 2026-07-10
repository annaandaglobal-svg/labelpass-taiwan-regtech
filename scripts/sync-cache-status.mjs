#!/usr/bin/env node
// Sync each crawl result's cache_status to what its cache_expires_at implies, so
// validate-knowledge-base.mjs does not red the build when caches expire on a date
// rollover (fresh -> stale). This does NOT fabricate freshness: it only marks an
// already-expired cache as "stale" (or, symmetrically, an unexpired one as "fresh"),
// which also feeds the regulatory-update refresh queue. Re-fetching content is a
// separate operator/crawl concern. Idempotent; safe to run before validate.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "data", "knowledge", "index.json");
const docsDir = path.join(root, "data", "knowledge", "documents");

const index = JSON.parse(readFileSync(indexPath, "utf8"));
// Reference the crawl index's own generated_at (the snapshot's "as of" time), NOT wall-clock —
// this is the SAME reference detect-regulatory-updates.mjs uses (index.generated_at), so
// cache_status, the regulatory-update queue, and validate all agree and the committed artifacts
// stay deterministic (CI regenerates identically instead of drifting as real time passes).
// Operational "is it stale right now" alerting stays real-time in audit:knowledge-ops.
const referenceNow = Date.parse(String(index.generated_at ?? ""));
const now = Number.isFinite(referenceNow) ? referenceNow : Date.now();
const flipped = [];
let docsSynced = 0;

for (const result of index.results ?? []) {
  const expiresAt = Date.parse(String(result.cache_expires_at ?? ""));
  if (!Number.isFinite(expiresAt)) continue;
  const expected = expiresAt <= now ? "stale" : "fresh";
  if (result.cache_status === expected) continue;
  result.cache_status = expected;
  flipped.push(`${result.id} -> ${expected}`);
  // keep the source document frontmatter consistent
  const docPath = path.join(docsDir, `${result.id}.md`);
  if (existsSync(docPath)) {
    const md = readFileSync(docPath, "utf8");
    const fixed = md.replace(/^cache_status: (?:fresh|stale)\s*$/m, `cache_status: ${expected}`);
    if (fixed !== md) {
      writeFileSync(docPath, fixed, "utf8");
      docsSynced += 1;
    }
  }
}

if (flipped.length) {
  writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
}

console.log(
  JSON.stringify(
    { output: "data/knowledge/index.json", flipped: flipped.length, docs_synced: docsSynced, changes: flipped },
    null,
    2
  )
);
