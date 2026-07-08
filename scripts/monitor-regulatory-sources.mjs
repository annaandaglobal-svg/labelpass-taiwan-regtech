#!/usr/bin/env node
// Regulatory MONITOR (durable, repo-side). Turns the staleness queue (regulatory-update-queue.json,
// produced by detect-regulatory-updates.mjs) into a human/agent-actionable watch-list: "these
// authoritative sources are due for a re-check — go verify them on the web for new/changed rules."
//
// This is the deterministic half of regulatory monitoring. The web-verification half is an LLM
// pass (see docs/regulatory-monitoring.md) that reads this list and checks each source online.
// Run: pnpm monitor:regulatory   (add --json for machine output, --all for every jurisdiction)
import { readFile } from "node:fs/promises";

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const allJurisdictions = args.has("--all");

const queue = JSON.parse(await readFile("data/knowledge/regulatory-update-queue.json", "utf8"));
const items = queue.items ?? [];

// Sources due for a re-check: staleness ("expiring_soon"), explicit refresh, or a detected change.
const DUE = new Set(["source_expiring_soon", "source_pending_refresh", "content_changed", "detected"]);
const priorityRank = { high: 0, medium: 1, low: 2 };

let due = items.filter((i) => DUE.has(i.change_type) || i.status === "pending_refresh" || i.status === "detected");
if (!allJurisdictions) {
  // Default focus: Taiwan + global controls that affect Korean→Taiwan trade.
  due = due.filter((i) => ["TW", "GLOBAL", "KR"].includes(i.jurisdiction));
}
due.sort((a, b) =>
  (priorityRank[a.source_priority] ?? 3) - (priorityRank[b.source_priority] ?? 3) ||
  String(a.domain).localeCompare(String(b.domain)) ||
  String(a.title).localeCompare(String(b.title))
);

if (asJson) {
  console.log(JSON.stringify({ generated_at: queue.generated_at, count: due.length, sources: due }, null, 2));
} else {
  console.log(`Regulatory monitor — ${due.length} source(s) due for re-check (queue @ ${queue.generated_at})`);
  console.log("Web-verify each for new/changed/upcoming rules, then feed real changes back as terms/verdicts.\n");
  const byDomain = due.reduce((m, i) => ((m[i.domain] ??= []).push(i), m), {});
  for (const domain of Object.keys(byDomain).sort()) {
    console.log(`▸ ${domain} (${byDomain[domain].length})`);
    for (const i of byDomain[domain]) {
      console.log(`   [${i.source_priority ?? "?"}] ${i.authority ?? ""} — ${i.title}`);
      console.log(`        ${i.source_url ?? "(no url)"}  · why: ${i.change_type}`);
    }
  }
  console.log(`\nNext: run the web-verification pass in docs/regulatory-monitoring.md against the [high] sources first.`);
}
