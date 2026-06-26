import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const writeReport = process.argv.includes("--write-report");

const paths = {
  sourceRegistry: path.join(root, "data", "knowledge", "source-registry.json"),
  crawlIndex: path.join(root, "data", "knowledge", "index.json"),
  termIndex: path.join(root, "data", "knowledge", "term-index.json"),
  aliasQueue: path.join(root, "data", "knowledge", "alias-review-queue.json"),
  updateQueue: path.join(root, "data", "knowledge", "regulatory-update-queue.json"),
  coverage: path.join(root, "data", "knowledge", "coverage-requirements.json"),
  knowledgeSeed: path.join(root, "supabase", "knowledge-seed.sql"),
  chunkManifest: path.join(root, "supabase", "generated", "knowledge-seed-chunks", "manifest.json"),
  report: path.join(root, "docs", "knowledge-operations-report.md")
};

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("en-US");
}

function formatDate(value) {
  if (!value) return "n/a";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "invalid";
  return date.toISOString();
}

function daysUntil(value, now = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function countInserts(sql, tableName) {
  const pattern = new RegExp(`insert into public\\.${tableName}\\b`, "gi");
  return sql.match(pattern)?.length ?? 0;
}

function normalizeKnowledgeQuery(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[^\p{Letter}\p{Number}%.+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countSearchableAliases(term) {
  const aliasesForTerm = [
    ...(term.aliases ?? []).map((alias) => ({ ...alias, identifierAlias: false })),
    ...(term.identifiers?.cas ?? []).map((value) => ({
      value,
      normalized: normalizeKnowledgeQuery(value),
      type: "cas",
      language: "und",
      jurisdiction: "GLOBAL",
      identifierAlias: true
    })),
    ...(term.identifiers?.inci ?? []).map((value) => ({
      value,
      normalized: normalizeKnowledgeQuery(value),
      type: "INCI",
      language: "en",
      jurisdiction: "GLOBAL",
      identifierAlias: true
    })),
    ...(term.identifiers?.color_index ?? []).map((value) => ({
      value,
      normalized: normalizeKnowledgeQuery(value),
      type: "color_index",
      language: "en",
      jurisdiction: "GLOBAL",
      identifierAlias: true
    }))
  ];

  const seen = new Set();
  let aliases = 0;
  let identifierAliases = 0;

  for (const alias of aliasesForTerm) {
    const normalized = alias.normalized ?? normalizeKnowledgeQuery(alias.value);
    const key = `${normalized}:${alias.language ?? ""}:${alias.jurisdiction ?? ""}:${alias.type ?? ""}`;
    if (!alias.value || seen.has(key)) continue;
    seen.add(key);
    aliases += 1;
    if (alias.identifierAlias) identifierAliases += 1;
  }

  return { aliases, identifierAliases };
}

function countAliases(terms) {
  return terms.reduce((count, term) => count + (term.aliases?.length ?? 0), 0);
}

function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item) || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function topDueSources(results, limit = 12) {
  return [...results]
    .map((source) => ({
      id: source.id,
      title: source.title,
      domain: source.domain,
      priority: source.priority,
      cache_status: source.cache_status,
      cache_expires_at: source.cache_expires_at,
      days_until_refresh: daysUntil(source.cache_expires_at),
      document_path: source.document_path
    }))
    .filter((source) => source.days_until_refresh !== null)
    .sort((a, b) => a.days_until_refresh - b.days_until_refresh || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function markdownTable(rows, columns) {
  if (!rows.length) return "No rows.\n";
  const header = `| ${columns.map((column) => column.label).join(" | ")} |\n`;
  const divider = `| ${columns.map((column) => column.align === "right" ? "---:" : "---").join(" | ")} |\n`;
  const body = rows
    .map((row) => {
      return `| ${columns.map((column) => String(column.value(row) ?? "").replaceAll("|", "\\|")).join(" | ")} |`;
    })
    .join("\n");
  return `${header}${divider}${body}\n`;
}

const [registry, index, termIndex, aliasQueue, updateQueue, coverage, seedSql, chunkManifest] = await Promise.all([
  readJson(paths.sourceRegistry),
  readJson(paths.crawlIndex),
  readJson(paths.termIndex),
  readJson(paths.aliasQueue),
  readJson(paths.updateQueue),
  readJson(paths.coverage),
  readFile(paths.knowledgeSeed, "utf8"),
  readJson(paths.chunkManifest)
]);

const sources = registry.sources ?? [];
const results = index.results ?? [];
const terms = termIndex.terms ?? [];
const storedAliases = countAliases(terms);
const searchableAliasCounts = terms.reduce(
  (counts, term) => {
    const termCounts = countSearchableAliases(term);
    counts.aliases += termCounts.aliases;
    counts.identifierAliases += termCounts.identifierAliases;
    return counts;
  },
  { aliases: 0, identifierAliases: 0 }
);
const identifierAliases = searchableAliasCounts.identifierAliases;
const searchableAliases = searchableAliasCounts.aliases;
const staleSources = results.filter((source) => source.cache_status === "stale");
const dueSoonSources = results.filter((source) => {
  const days = daysUntil(source.cache_expires_at);
  return days !== null && days >= 0 && days <= 7;
});
const expiredSources = results.filter((source) => {
  const days = daysUntil(source.cache_expires_at);
  return days !== null && days < 0;
});
const highPrioritySources = results.filter((source) => source.priority === "high");
const manualFallbackSources = results.filter((source) => source.manual_fallback);
const browserCaptureSources = results.filter((source) => source.browser_capture);
const fromCacheSources = results.filter((source) => source.from_cache);
const nextRefresh = topDueSources(results, 1)[0] ?? null;

const seedCounts = {
  knowledge_sources: countInserts(seedSql, "knowledge_sources"),
  knowledge_snapshots: countInserts(seedSql, "knowledge_snapshots"),
  knowledge_terms: countInserts(seedSql, "knowledge_terms"),
  term_aliases: countInserts(seedSql, "term_aliases"),
  term_rule_links: countInserts(seedSql, "term_rule_links"),
  regulatory_update_candidates: countInserts(seedSql, "regulatory_update_candidates")
};

const health = {
  crawlComplete: index.source_count === sources.length && index.success_count === results.length && (index.failure_count ?? 0) === 0,
  aliasQueueAligned:
    aliasQueue.source?.registry_version === termIndex.registry_version &&
    aliasQueue.source?.term_index_generated_at === termIndex.generated_at &&
    aliasQueue.summary?.aliases_scanned === storedAliases,
  updateQueueAligned:
    updateQueue.source_registry_version === index.source_registry_version &&
    updateQueue.crawl_generated_at === index.generated_at,
  seedAligned:
    seedCounts.knowledge_sources === results.length &&
    seedCounts.knowledge_snapshots === results.length &&
    seedCounts.knowledge_terms === terms.length &&
    seedCounts.term_aliases === storedAliases &&
    seedCounts.term_rule_links === (termIndex.term_rule_links?.length ?? 0) &&
    seedCounts.regulatory_update_candidates === (updateQueue.items?.length ?? 0)
};

const summary = {
  generated_at: new Date().toISOString(),
  source_registry_version: registry.version,
  crawl_generated_at: index.generated_at,
  term_index_generated_at: termIndex.generated_at,
  terms: terms.length,
  stored_aliases: storedAliases,
  identifier_aliases: identifierAliases,
  searchable_aliases: searchableAliases,
  term_rule_links: termIndex.term_rule_links?.length ?? 0,
  sources: results.length,
  high_priority_sources: highPrioritySources.length,
  stale_sources: staleSources.length,
  expired_sources: expiredSources.length,
  due_within_7_days: dueSoonSources.length,
  manual_fallback_sources: manualFallbackSources.length,
  browser_capture_sources: browserCaptureSources.length,
  from_cache_sources: fromCacheSources.length,
  next_refresh_at: nextRefresh?.cache_expires_at ?? null,
  update_candidates: updateQueue.summary ?? {},
  alias_queue: aliasQueue.summary ?? {},
  coverage_groups: coverage.groups?.length ?? 0,
  seed_counts: seedCounts,
  chunk_manifest: {
    chunks: chunkManifest.chunk_count,
    statements: chunkManifest.statement_count,
    max_bytes: chunkManifest.max_bytes,
    largest_chunk_bytes: Math.max(...(chunkManifest.chunks ?? []).map((chunk) => chunk.bytes ?? 0), 0)
  },
  health
};

if (writeReport) {
  const dueRows = topDueSources(results);
  const domainRows = countBy(results, (source) => source.domain).slice(0, 12).map(([domain, count]) => ({ domain, count }));
  const priorityRows = countBy(results, (source) => source.priority).map(([priority, count]) => ({ priority, count }));
  const report = [
    "# Knowledge Operations Report",
    "",
    `Generated: ${summary.generated_at}`,
    `Crawl index: ${formatDate(summary.crawl_generated_at)}`,
    `Term index: ${formatDate(summary.term_index_generated_at)}`,
    "",
    "This file is generated from the current LabelPass knowledge artifacts. Use it to decide whether to reuse the cached memory, refresh selected official sources, rebuild Supabase seed data, or triage alias collisions.",
    "",
    "## Health Gates",
    "",
    `- Crawl complete: ${health.crawlComplete ? "yes" : "no"}`,
    `- Alias queue aligned with term index: ${health.aliasQueueAligned ? "yes" : "no"}`,
    `- Regulatory update queue aligned with crawl index: ${health.updateQueueAligned ? "yes" : "no"}`,
    `- Supabase knowledge seed aligned with generated counts: ${health.seedAligned ? "yes" : "no"}`,
    "",
    "## Current Counts",
    "",
    `- Knowledge sources: ${formatNumber(summary.sources)}`,
    `- High-priority sources: ${formatNumber(summary.high_priority_sources)}`,
    `- Knowledge terms: ${formatNumber(summary.terms)}`,
    `- Stored term aliases: ${formatNumber(summary.stored_aliases)}`,
    `- Identifier aliases: ${formatNumber(summary.identifier_aliases)}`,
    `- Searchable aliases: ${formatNumber(summary.searchable_aliases)}`,
    `- Term-rule links: ${formatNumber(summary.term_rule_links)}`,
    `- Regulatory update candidates: ${formatNumber(summary.update_candidates.total)}`,
    `- Alias review items: ${formatNumber(summary.alias_queue.review_items)}`,
    "",
    "## Freshness",
    "",
    `- Stale sources: ${formatNumber(summary.stale_sources)}`,
    `- Expired sources: ${formatNumber(summary.expired_sources)}`,
    `- Sources due within 7 days: ${formatNumber(summary.due_within_7_days)}`,
    `- Next scheduled refresh: ${formatDate(summary.next_refresh_at)}`,
    `- Manual fallback sources: ${formatNumber(summary.manual_fallback_sources)}`,
    `- Browser capture sources: ${formatNumber(summary.browser_capture_sources)}`,
    `- Reused from raw cache: ${formatNumber(summary.from_cache_sources)}`,
    "",
    "## Next Sources Due",
    "",
    markdownTable(dueRows, [
      { label: "Days", align: "right", value: (row) => row.days_until_refresh },
      { label: "Source", value: (row) => row.id },
      { label: "Domain", value: (row) => row.domain },
      { label: "Priority", value: (row) => row.priority },
      { label: "Expires", value: (row) => formatDate(row.cache_expires_at) }
    ]),
    "",
    "## Source Mix",
    "",
    markdownTable(domainRows, [
      { label: "Domain", value: (row) => row.domain },
      { label: "Sources", align: "right", value: (row) => formatNumber(row.count) }
    ]),
    "",
    markdownTable(priorityRows, [
      { label: "Priority", value: (row) => row.priority },
      { label: "Sources", align: "right", value: (row) => formatNumber(row.count) }
    ]),
    "",
    "## Queues",
    "",
    `- Update queue: ${formatNumber(summary.update_candidates.pending_refresh)} pending refresh, ${formatNumber(summary.update_candidates.watching)} watching, ${formatNumber(summary.update_candidates.detected)} detected changes.`,
    `- Alias queue: ${formatNumber(summary.alias_queue.high_confidence_collisions)} high-confidence collisions, ${formatNumber(summary.alias_queue.mojibake_aliases)} mojibake aliases, ${formatNumber(summary.alias_queue.regulated_terms_without_local_alias)} regulated terms without readable local aliases.`,
    "",
    "## Supabase Seed Readiness",
    "",
    `- Seed term aliases: ${formatNumber(seedCounts.term_aliases)}`,
    `- Seed update candidates: ${formatNumber(seedCounts.regulatory_update_candidates)}`,
    `- SQL editor chunks: ${formatNumber(summary.chunk_manifest.chunks)} chunks / ${formatNumber(summary.chunk_manifest.statements)} statements`,
    `- Largest chunk bytes: ${formatNumber(summary.chunk_manifest.largest_chunk_bytes)}`,
    "",
    "## Operating Commands",
    "",
    "```bash",
    "pnpm report:knowledge-ops",
    "pnpm crawl:knowledge",
    "pnpm build:knowledge-seed",
    "pnpm validate:knowledge",
    "pnpm validate:coverage",
    "pnpm audit:search-aliases",
    "pnpm apply:supabase-knowledge",
    "pnpm verify:supabase-knowledge",
    "```",
    ""
  ].join("\n");
  await writeFile(paths.report, report, "utf8");
}

console.log(JSON.stringify(summary, null, 2));
