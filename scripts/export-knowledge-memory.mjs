import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const paths = {
  sourceRegistry: path.join(root, "data", "knowledge", "source-registry.json"),
  crawlIndex: path.join(root, "data", "knowledge", "index.json"),
  termIndex: path.join(root, "data", "knowledge", "term-index.json"),
  aliasQueue: path.join(root, "data", "knowledge", "alias-review-queue.json"),
  updateQueue: path.join(root, "data", "knowledge", "regulatory-update-queue.json"),
  coverage: path.join(root, "data", "knowledge", "coverage-requirements.json"),
  memoryJson: path.join(root, "data", "knowledge", "knowledge-memory.json"),
  memoryMarkdown: path.join(root, "docs", "wiki", "knowledge-memory.md")
};

function compareStable(left, right) {
  const a = String(left ?? "");
  const b = String(right ?? "");
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

const domainPriority = [
  "cosmetics",
  "food",
  "food_labeling",
  "food_import",
  "food_safety",
  "food_additives",
  "health_food",
  "customs",
  "trade",
  "trade_controls",
  "general_labeling",
  "chemical_labeling",
  "terminology"
];

const categoryPriority = [
  "cosmetic_compliance",
  "cosmetic_ingredient",
  "preservative",
  "colorant",
  "food_compliance",
  "food_additive",
  "food_ingredient",
  "allergen",
  "label_claim",
  "health_food",
  "customs",
  "trade_controls",
  "terminology"
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
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

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("en-US");
}

function compact(value, maxLength = 220) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function groupBy(values, keyFn) {
  const grouped = new Map();
  for (const value of values) {
    const key = keyFn(value);
    const group = grouped.get(key) ?? [];
    group.push(value);
    grouped.set(key, group);
  }
  return grouped;
}

function isReadableText(value) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 96) return false;
  if (/[\u0000-\u001f\u007f-\u009f\uE000-\uF8FF\uFFFD]/u.test(text)) return false;
  if (/[ÃÂâ�]/u.test(text)) return false;
  return true;
}

function labelFor(value) {
  const labels = {
    cosmetics: "Cosmetics",
    food: "Food",
    food_labeling: "Food labeling",
    food_import: "Food import",
    food_safety: "Food safety",
    food_additives: "Food additives",
    health_food: "Health food",
    customs: "Customs",
    trade: "Trade",
    trade_controls: "Trade controls",
    general_labeling: "General labeling",
    chemical_labeling: "Chemical labeling",
    terminology: "Terminology",
    cosmetic_compliance: "Cosmetic compliance",
    cosmetic_ingredient: "Cosmetic ingredient",
    food_compliance: "Food compliance",
    food_additive: "Food additive",
    food_ingredient: "Food ingredient",
    allergen: "Allergen",
    label_claim: "Label claim",
    preservative: "Preservative",
    colorant: "Colorant",
    law: "Law",
    regulation: "Regulation",
    notice: "Notice",
    guidance: "Guidance",
    dataset: "Dataset",
    html: "HTML",
    pdf: "PDF",
    manual: "Manual capture",
    browser_capture: "Browser capture"
  };

  return labels[value] ?? String(value ?? "unknown").replaceAll("_", " ");
}

function evidenceMode(source) {
  if (source.browser_capture || source.browser_capture_path || source.screenshot_path) return "browser_capture";
  if (source.manual_fallback) return "manual";
  if (source.from_cache) return "cache";
  return source.format ?? "source";
}

function daysUntil(value, now) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

function markdownTable(rows, columns) {
  if (!rows.length) return "No rows.\n";
  const header = `| ${columns.map((column) => column.label).join(" | ")} |\n`;
  const divider = `| ${columns.map((column) => (column.align === "right" ? "---:" : "---")).join(" | ")} |\n`;
  const body = rows
    .map((row) => `| ${columns.map((column) => String(column.value(row) ?? "").replaceAll("|", "\\|")).join(" | ")} |`)
    .join("\n");
  return `${header}${divider}${body}\n`;
}

function sortByPriority(left, right) {
  const leftPriority = left.priority === "high" ? 0 : left.priority === "medium" ? 1 : 2;
  const rightPriority = right.priority === "high" ? 0 : right.priority === "medium" ? 1 : 2;
  return leftPriority - rightPriority || compareStable(left.domain, right.domain) || compareStable(left.id, right.id);
}

function buildAliasList(term) {
  const identifiers = [
    ...(term.identifiers?.cas ?? []).map((value) => `CAS ${value}`),
    ...(term.identifiers?.inci ?? []).map((value) => `INCI ${value}`),
    ...(term.identifiers?.color_index ?? []).map((value) => `CI ${value}`)
  ];
  const aliases = (term.aliases ?? [])
    .filter((alias) => isReadableText(alias.value))
    .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0) || compareStable(left.value, right.value))
    .map((alias) => alias.value);
  return unique([...identifiers, ...aliases]).slice(0, 10);
}

function termScore(term, coverageTermIds, selectedSourceIds) {
  let score = 0;
  if (coverageTermIds.has(term.id)) score += 1_000;
  if (categoryPriority.includes(term.category)) score += 120 - categoryPriority.indexOf(term.category);
  score += (term.source_keys ?? []).filter((sourceKey) => selectedSourceIds.has(sourceKey)).length * 25;
  score += Math.min(40, (term.aliases?.length ?? 0) * 2);
  if (term.notes) score += 10;
  return score;
}

function buildTermCards(terms, coverageTermIds, selectedSourceIds) {
  const byCategory = new Map();
  const scored = terms
    .map((term) => ({ term, score: termScore(term, coverageTermIds, selectedSourceIds) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || compareStable(left.term.id, right.term.id));

  const selected = [];
  for (const item of scored) {
    const category = item.term.category ?? "unknown";
    const categoryCount = byCategory.get(category) ?? 0;
    const categoryCap = coverageTermIds.has(item.term.id) ? 18 : 10;
    if (categoryCount >= categoryCap && selected.length >= 72) continue;
    byCategory.set(category, categoryCount + 1);
    selected.push(item);
    if (selected.length >= 90) break;
  }

  return selected.map(({ term, score }) => ({
    id: term.id,
    canonical_name: term.canonical_name,
    category: term.category,
    category_label: labelFor(term.category),
    aliases: buildAliasList(term),
    source_keys: (term.source_keys ?? []).slice(0, 10),
    notes: compact(term.notes, 240),
    score
  }));
}

function renderMarkdown(memory) {
  const sourceRows = memory.source_cards.slice(0, 36);
  const dueRows = memory.refresh_queue.items.slice(0, 12);
  const aliasRows = memory.alias_review.items.slice(0, 12);
  const termGroups = groupBy(memory.term_cards, (term) => term.category_label);

  return `# LabelPass Knowledge Memory

Generated from tracked knowledge artifacts. Use this as an Obsidian/LLM working map, not as a substitute for source evidence.

## Snapshot

- Source registry version: \`${memory.generated_from.source_registry_version}\`
- Crawl snapshot: \`${memory.generated_from.crawl_generated_at}\`
- Term index: \`${memory.generated_from.term_index_generated_at}\`
- Knowledge sources: ${formatNumber(memory.summary.sources)}
- Terms: ${formatNumber(memory.summary.terms)}
- Stored aliases: ${formatNumber(memory.summary.stored_aliases)}
- Searchable aliases including identifiers: ${formatNumber(memory.summary.searchable_aliases)}
- Term-rule links: ${formatNumber(memory.summary.term_rule_links)}
- Regulatory update candidates: ${formatNumber(memory.summary.regulatory_update_candidates)}
- Alias review items: ${formatNumber(memory.summary.alias_review_items)}

## How To Use This Memory

1. Start with a product context: cosmetics, food, customs, health food, or trade controls.
2. Search by any known name: Korean, Traditional Chinese, Simplified Chinese, English, INCI, CAS RN, color index, HS, CCC, permit number, or official phrase.
3. Treat aliases as recall helpers. If a term is ambiguous, ask for product category, jurisdiction, intended use, and label/advertising context before ranking.
4. Use source cards for retrieval and evidence. Official Taiwan law, TFDA, MOEA, Customs, or BSMI sources outrank global terminology references.
5. Do not mutate rules from crawler output directly. Use the refresh queue as a human approval queue.

## Coverage Map

${markdownTable(memory.coverage_groups, [
  { label: "Coverage", value: (row) => row.label },
  { label: "Sources", align: "right", value: (row) => row.source_count },
  { label: "Terms", align: "right", value: (row) => row.term_count },
  { label: "Starter aliases", value: (row) => row.aliases.slice(0, 5).join(", ") }
])}

## Source Cards

${markdownTable(sourceRows, [
  { label: "Source", value: (row) => row.id },
  { label: "Domain", value: (row) => row.domain_label },
  { label: "Priority", value: (row) => row.priority },
  { label: "Status", value: (row) => row.cache_status },
  { label: "Evidence", value: (row) => row.evidence_mode },
  { label: "Title", value: (row) => row.title }
])}

## Term Memory Cards

${[...termGroups.entries()].map(([category, cards]) => `### ${category}

${cards.slice(0, 14).map((term) => `- **${term.canonical_name}** (\`${term.id}\`)
  - Aliases: ${term.aliases.length ? term.aliases.join("; ") : "none recorded"}
  - Sources: ${term.source_keys.slice(0, 5).map((sourceKey) => `\`${sourceKey}\``).join(", ") || "none linked"}
  - Note: ${term.notes || "n/a"}`).join("\n")}`).join("\n\n")}

## Alias Ambiguity Queue

${markdownTable(aliasRows, [
  { label: "Alias", value: (row) => row.alias },
  { label: "Issue", value: (row) => row.issue },
  { label: "Priority", value: (row) => row.priority },
  { label: "Terms", align: "right", value: (row) => row.term_count },
  { label: "Action", value: (row) => row.recommended_action }
])}

## Refresh Queue

${markdownTable(dueRows, [
  { label: "Source", value: (row) => row.source_key },
  { label: "Status", value: (row) => row.status },
  { label: "Severity", value: (row) => row.severity },
  { label: "Due in", value: (row) => row.days_until_refresh === null ? "n/a" : `${row.days_until_refresh}d` },
  { label: "Title", value: (row) => row.title }
])}

## Retrieval Playbook

${memory.search_playbook.map((item) => `- **${item.intent}**: ${item.query_examples.join(", ")} -> ${item.route}`).join("\n")}

## Generated Files

- Markdown memory: \`docs/wiki/knowledge-memory.md\`
- Structured memory: \`data/knowledge/knowledge-memory.json\`
- Source map: \`docs/wiki/labelpass-knowledge-map.md\`
- Operations report: \`docs/knowledge-operations-report.md\`
`;
}

const [registry, crawlIndex, termIndex, aliasQueue, updateQueue, coverage] = await Promise.all([
  readJson(paths.sourceRegistry),
  readJson(paths.crawlIndex),
  readJson(paths.termIndex),
  readJson(paths.aliasQueue),
  readJson(paths.updateQueue),
  readJson(paths.coverage)
]);

const sourceRegistryById = new Map((registry.sources ?? []).map((source) => [source.id, source]));
const crawlResultsById = new Map((crawlIndex.results ?? []).map((source) => [source.id, source]));
const terms = termIndex.terms ?? [];
const coverageGroups = coverage.groups ?? [];
const coverageSourceIds = new Set(coverageGroups.flatMap((group) => group.sourceIds ?? group.required_sources ?? []));
const coverageTermIds = new Set(coverageGroups.flatMap((group) => group.termIds ?? group.required_terms ?? []));
const now = new Date(crawlIndex.generated_at ?? updateQueue.generated_at ?? termIndex.generated_at ?? "2026-06-26T00:00:00.000Z");

const selectedSourceIds = new Set();
for (const source of crawlIndex.results ?? []) {
  const isTaiwan = source.jurisdiction === "TW";
  const relevantDomain = domainPriority.includes(source.domain);
  if (coverageSourceIds.has(source.id) || (isTaiwan && relevantDomain && source.priority === "high")) {
    selectedSourceIds.add(source.id);
  }
}

const sourceCards = [...selectedSourceIds]
  .map((id) => {
    const result = crawlResultsById.get(id) ?? {};
    const source = sourceRegistryById.get(id) ?? {};
    return {
      id,
      title: result.title ?? source.title ?? id,
      url: result.url ?? source.url ?? "",
      authority: result.authority ?? source.authority ?? "",
      jurisdiction: result.jurisdiction ?? source.jurisdiction ?? "",
      domain: result.domain ?? source.domain ?? "unknown",
      domain_label: labelFor(result.domain ?? source.domain),
      source_type: result.source_type ?? source.source_type ?? "",
      source_type_label: labelFor(result.source_type ?? source.source_type),
      priority: result.priority ?? source.priority ?? "medium",
      tags: unique([...(result.tags ?? []), ...(source.tags ?? [])]).slice(0, 8),
      cache_status: result.cache_status ?? "unknown",
      cache_expires_at: result.cache_expires_at ?? null,
      days_until_refresh: daysUntil(result.cache_expires_at, now),
      evidence_mode: evidenceMode(result),
      document_path: result.document_path ?? null,
      text_chars: result.text_chars ?? null,
      excerpt: compact(result.excerpt, 260)
    };
  })
  .sort(sortByPriority);

const termCards = buildTermCards(terms, coverageTermIds, selectedSourceIds);
const storedAliases = terms.reduce((count, term) => count + (term.aliases?.length ?? 0), 0);
const searchableAliasCounts = terms.reduce(
  (counts, term) => {
    const termCounts = countSearchableAliases(term);
    counts.aliases += termCounts.aliases;
    counts.identifierAliases += termCounts.identifierAliases;
    return counts;
  },
  { aliases: 0, identifierAliases: 0 }
);

const refreshItems = (updateQueue.items ?? [])
  .map((item) => ({
    candidate_key: item.candidate_key,
    source_key: item.source_key,
    title: item.title,
    status: item.status,
    severity: item.severity,
    change_type: item.change_type,
    cache_expires_at: item.cache_expires_at ?? null,
    days_until_refresh: daysUntil(item.cache_expires_at, now),
    affected_domains: item.affected_domains ?? [],
    affected_terms: (item.affected_terms ?? []).slice(0, 8).map((term) => term.canonical_name ?? term.term_key).filter(Boolean),
    next_action: item.next_action ?? null
  }))
  .sort((left, right) => {
    const leftDays = left.days_until_refresh ?? 9999;
    const rightDays = right.days_until_refresh ?? 9999;
    return leftDays - rightDays || compareStable(left.source_key, right.source_key);
  })
  .slice(0, 32);

const aliasItems = (aliasQueue.items ?? [])
  .filter((item) => item.priority === "high" || item.high_confidence_collision || item.strict_blocker)
  .slice(0, 32)
  .map((item) => ({
    id: item.id,
    alias: item.alias,
    issue: item.issue,
    priority: item.priority,
    term_count: item.term_count,
    max_confidence: item.max_confidence,
    strict_blocker: Boolean(item.strict_blocker),
    recommended_action: compact(item.recommended_action, 180),
    terms: (item.terms ?? []).slice(0, 5).map((term) => ({
      term_id: term.term_id,
      canonical_name: term.canonical_name,
      confidence: term.confidence,
      jurisdiction: term.jurisdiction,
      language: term.language
    }))
  }));

const memory = {
  schema_version: 1,
  generated_at: [termIndex.generated_at, crawlIndex.generated_at, updateQueue.generated_at, aliasQueue.generated_at]
    .filter(Boolean)
    .sort()
    .at(-1),
  generated_from: {
    source_registry_version: registry.version,
    crawl_generated_at: crawlIndex.generated_at,
    term_index_generated_at: termIndex.generated_at,
    alias_queue_generated_at: aliasQueue.generated_at,
    update_queue_generated_at: updateQueue.generated_at
  },
  summary: {
    sources: crawlIndex.results?.length ?? 0,
    source_registry_sources: registry.sources?.length ?? 0,
    terms: terms.length,
    stored_aliases: storedAliases,
    searchable_aliases: searchableAliasCounts.aliases,
    identifier_aliases: searchableAliasCounts.identifierAliases,
    term_rule_links: termIndex.term_rule_links?.length ?? 0,
    regulatory_update_candidates: updateQueue.items?.length ?? 0,
    alias_review_items: aliasQueue.items?.length ?? 0,
    coverage_groups: coverageGroups.length,
    selected_source_cards: sourceCards.length,
    selected_term_cards: termCards.length
  },
  coverage_groups: coverageGroups.map((group) => ({
    id: group.id,
    label: group.label,
    source_count: (group.sourceIds ?? group.required_sources ?? []).length,
    term_count: (group.termIds ?? group.required_terms ?? []).length,
    aliases: (group.aliases ?? []).filter(isReadableText).slice(0, 10),
    source_ids: group.sourceIds ?? group.required_sources ?? [],
    term_ids: group.termIds ?? group.required_terms ?? []
  })),
  source_cards: sourceCards,
  term_cards: termCards,
  alias_review: {
    summary: aliasQueue.summary,
    items: aliasItems
  },
  refresh_queue: {
    summary: updateQueue.summary,
    items: refreshItems
  },
  search_playbook: [
    {
      intent: "Cosmetic PIF or product registration",
      query_examples: ["PIF", "產品資訊檔案", "대만 화장품 PIF", "product registration"],
      route: "Start with cosmetics source cards, then term cards for PIF, notification, registration categories, and specific-purpose cosmetics transition."
    },
    {
      intent: "Food additive or ingredient status",
      query_examples: ["food additive", "食品添加物", "permit number", "common name"],
      route: "Search food additives and ingredient query sources before treating a common name as permitted."
    },
    {
      intent: "Allergen or nutrition labeling",
      query_examples: ["allergen labeling", "甲殼類", "nutrition labeling", "SO2"],
      route: "Use food labeling/allergen coverage first; ask for finished-product category and ingredient source when alias context is ambiguous."
    },
    {
      intent: "Import, HS/CCC, customs, origin",
      query_examples: ["HS code", "CCC code", "origin labeling", "food importer registration"],
      route: "Use customs and food import source cards; keep classification, importer registration, and labeling as separate checks."
    },
    {
      intent: "Same ingredient under many names",
      query_examples: ["INCI", "CAS RN", "Korean name", "Traditional Chinese name"],
      route: "Normalize via term aliases but confirm category and jurisdiction before final ranking when the alias review queue flags a collision."
    }
  ]
};

await mkdir(path.dirname(paths.memoryJson), { recursive: true });
await mkdir(path.dirname(paths.memoryMarkdown), { recursive: true });
await writeFile(paths.memoryJson, `${JSON.stringify(memory, null, 2)}\n`, "utf8");
await writeFile(paths.memoryMarkdown, renderMarkdown(memory), "utf8");

console.log(`Wrote ${path.relative(root, paths.memoryJson)} and ${path.relative(root, paths.memoryMarkdown)}`);
