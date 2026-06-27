import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const paths = {
  sourceRegistry: path.join(root, "data", "knowledge", "source-registry.json"),
  crawlIndex: path.join(root, "data", "knowledge", "index.json"),
  sourceOpsMetadata: path.join(root, "data", "knowledge", "source-ops-metadata.json"),
  termIndex: path.join(root, "data", "knowledge", "term-index.json"),
  aliasQueue: path.join(root, "data", "knowledge", "alias-review-queue.json"),
  updateQueue: path.join(root, "data", "knowledge", "regulatory-update-queue.json"),
  coverage: path.join(root, "data", "knowledge", "coverage-requirements.json"),
  memory: path.join(root, "data", "knowledge", "knowledge-memory.json"),
  routing: path.join(root, "data", "knowledge", "product-routing-matrix.json"),
  templates: path.join(root, "data", "knowledge", "evidence-bundle-templates.json"),
  knowledgeSeed: path.join(root, "supabase", "knowledge-seed.sql"),
  chunkManifest: path.join(root, "supabase", "generated", "knowledge-seed-chunks", "manifest.json"),
  memoryDoc: path.join(root, "docs", "wiki", "knowledge-memory.md"),
  routingDoc: path.join(root, "docs", "wiki", "product-routing-matrix.md"),
  evidenceBundleDir: path.join(root, "docs", "wiki", "evidence-bundles")
};

const requiredCoverageGroups = [
  "tw_cosmetics_labeling_market_access",
  "tw_food_labeling_allergen",
  "tw_food_import_routing",
  "tw_health_food_claims"
];

const requiredRoutes = [
  "tw_cosmetic_label_pif",
  "tw_food_label_allergen",
  "tw_food_additive_ingredient",
  "tw_food_import_inspection",
  "tw_health_food_claims",
  "tw_food_contact_packaging",
  "tw_customs_origin_hs",
  "tw_trade_control_shtc"
];

const requiredDocs = [
  { path: paths.memoryDoc, minBytes: 10_000, label: "knowledge memory wiki" },
  { path: paths.routingDoc, minBytes: 8_000, label: "product routing wiki" },
  {
    path: path.join(paths.evidenceBundleDir, "index.md"),
    minBytes: 1_000,
    label: "evidence bundle index"
  }
];

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readOptionalJson(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

async function fileInfo(filePath) {
  try {
    const fileStat = await stat(filePath);
    return { present: true, bytes: fileStat.size };
  } catch {
    return { present: false, bytes: 0 };
  }
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function countInserts(sql, tableName) {
  const pattern = new RegExp(`insert into public\\.${tableName}\\b`, "gi");
  return sql.match(pattern)?.length ?? 0;
}

function sameTimestamp(left, right) {
  return Boolean(left && right && left === right);
}

function requireCount(label, actual, expected) {
  if (actual !== expected) fail(`${label} is ${actual}, expected ${expected}`);
}

function routeDocPath(templateId) {
  return path.join(paths.evidenceBundleDir, `${templateId.replaceAll("_", "-")}.md`);
}

const [
  registry,
  crawlIndex,
  sourceOpsMetadata,
  termIndex,
  aliasQueue,
  updateQueue,
  coverage,
  memory,
  routing,
  templates,
  knowledgeSeed,
  chunkManifest
] = await Promise.all([
  readJson(paths.sourceRegistry),
  readJson(paths.crawlIndex),
  readJson(paths.sourceOpsMetadata),
  readJson(paths.termIndex),
  readJson(paths.aliasQueue),
  readJson(paths.updateQueue),
  readJson(paths.coverage),
  readJson(paths.memory),
  readJson(paths.routing),
  readJson(paths.templates),
  readFile(paths.knowledgeSeed, "utf8"),
  readOptionalJson(paths.chunkManifest)
]);

const registrySources = registry.sources ?? [];
const crawlResults = crawlIndex.results ?? [];
const opsSources = sourceOpsMetadata.sources ?? [];
const terms = termIndex.terms ?? [];
const aliases = terms.flatMap((term) => term.aliases ?? []);
const links = termIndex.term_rule_links ?? [];
const updateItems = updateQueue.items ?? [];
const aliasItems = aliasQueue.items ?? [];
const highConfidenceAliasCollisions = aliasItems.filter((item) => item.high_confidence_collision);
const highConfidenceAliasCollisionsWithoutContext = highConfidenceAliasCollisions.filter(
  (item) =>
    !item.recommended_action ||
    !(item.terms ?? []).every((term) => String(term.notes ?? "").trim().length >= 20)
);
const coverageGroups = coverage.groups ?? [];
const routes = routing.product_routes ?? [];
const evidenceTemplates = templates.templates ?? [];

requireCount("crawl source count", crawlIndex.source_count, registrySources.length);
requireCount("crawl result count", crawlResults.length, registrySources.length);
requireCount("crawl success count", crawlIndex.success_count, crawlResults.length);
requireCount("source operations metadata count", opsSources.length, registrySources.length);

if ((crawlIndex.failure_count ?? 0) > 0) fail(`crawl has ${crawlIndex.failure_count} failed source(s)`);

const sourceIds = new Set(registrySources.map((source) => source.id));
const resultIds = new Set(crawlResults.map((result) => result.id));
const opsIds = new Set(opsSources.map((source) => source.id));

for (const source of registrySources) {
  if (!resultIds.has(source.id)) fail(`source has no crawl result: ${source.id}`);
  if (!opsIds.has(source.id)) fail(`source has no operations metadata: ${source.id}`);
}

for (const source of opsSources) {
  if (!sourceIds.has(source.id)) fail(`operations metadata references unknown source: ${source.id}`);
  for (const field of ["languages", "review_owner", "selector_strategy", "date_strategy", "refresh_strategy", "evidence_policy"]) {
    if (!source[field] || (Array.isArray(source[field]) && source[field].length === 0)) {
      fail(`operations metadata ${source.id} is missing ${field}`);
    }
  }
}

const expiredSources = crawlResults.filter((source) => {
  if (!source.cache_expires_at) return false;
  return new Date(source.cache_expires_at).getTime() < Date.now();
});
const highPriorityStaleSources = crawlResults.filter(
  (source) => source.priority === "high" && source.cache_status === "stale"
);
const manualFallbackWithoutEvidence = crawlResults.filter(
  (source) =>
    source.manual_fallback &&
    !source.browser_capture &&
    !source.browser_capture_path &&
    !source.screenshot_path
);

if (expiredSources.length > 0) fail(`knowledge crawl has ${expiredSources.length} expired source(s)`);
if (highPriorityStaleSources.length > 0) {
  fail(`knowledge crawl has ${highPriorityStaleSources.length} high-priority stale source(s)`);
}
if (manualFallbackWithoutEvidence.length > 0) {
  fail(`manual fallback backlog without browser evidence: ${manualFallbackWithoutEvidence.map((source) => source.id).join(", ")}`);
}

for (const groupId of requiredCoverageGroups) {
  const group = coverageGroups.find((candidate) => candidate.id === groupId);
  if (!group) {
    fail(`required Taiwan coverage group is missing: ${groupId}`);
    continue;
  }

  if ((group.sourceIds ?? []).length < 8) fail(`${groupId} has too few required sources`);
  if ((group.termIds ?? []).length < 5) fail(`${groupId} has too few required terms`);
  if ((group.aliases ?? []).length < 5) fail(`${groupId} has too few starter aliases`);

  for (const sourceId of group.sourceIds ?? []) {
    const source = registrySources.find((candidate) => candidate.id === sourceId);
    const result = crawlResults.find((candidate) => candidate.id === sourceId);
    if (!source) fail(`${groupId} source is missing from registry: ${sourceId}`);
    if (!result) fail(`${groupId} source is missing from crawl index: ${sourceId}`);
    if (source && source.jurisdiction !== "TW") fail(`${groupId} source is not Taiwan jurisdiction: ${sourceId}`);
    if (result && !result.document_path) fail(`${groupId} source has no document path: ${sourceId}`);
  }
}

requireCount("memory source count", memory.summary?.sources, crawlResults.length);
requireCount("memory registry source count", memory.summary?.source_registry_sources, registrySources.length);
requireCount("memory term count", memory.summary?.terms, terms.length);
requireCount("memory stored alias count", memory.summary?.stored_aliases, aliases.length);
requireCount("memory term-rule link count", memory.summary?.term_rule_links, links.length);
requireCount("memory update candidate count", memory.summary?.regulatory_update_candidates, updateItems.length);
requireCount("memory alias review item count", memory.summary?.alias_review_items, aliasItems.length);
requireCount("memory coverage group count", memory.summary?.coverage_groups, coverageGroups.length);

if (!sameTimestamp(memory.generated_at, crawlIndex.generated_at)) {
  fail("knowledge memory was not regenerated from the current crawl snapshot");
}
if (!sameTimestamp(routing.generated_at, memory.generated_at)) {
  fail("product routing matrix was not regenerated from the current knowledge memory");
}
if (!sameTimestamp(templates.generated_at, memory.generated_at)) {
  fail("evidence bundle templates were not regenerated from the current knowledge memory");
}

const routeById = new Map(routes.map((route) => [route.id, route]));
const templateById = new Map(evidenceTemplates.map((template) => [template.id, template]));

for (const routeId of requiredRoutes) {
  const route = routeById.get(routeId);
  if (!route) {
    fail(`required product route is missing: ${routeId}`);
    continue;
  }

  if (route.jurisdiction !== "TW") fail(`${routeId} must stay Taiwan-first`);
  if ((route.source_ids ?? []).length < 6) fail(`${routeId} has too few source links`);
  if ((route.term_ids ?? []).length < 5) fail(`${routeId} has too few term links`);
  if ((route.classification_inputs ?? []).length < 4) fail(`${routeId} has too few classification inputs`);
  if ((route.stop_conditions ?? []).length < 3) fail(`${routeId} has too few stop conditions`);

  for (const templateId of route.evidence_template_ids ?? []) {
    const template = templateById.get(templateId);
    if (!template) {
      fail(`${routeId} references missing evidence template: ${templateId}`);
      continue;
    }

    if (template.product_route_id !== routeId) fail(`${templateId} points to ${template.product_route_id}, expected ${routeId}`);
    if (template.generated_from_memory_at !== memory.generated_at) {
      fail(`${templateId} was not generated from the current knowledge memory`);
    }
    if ((template.required_inputs ?? []).length < 4) fail(`${templateId} has too few required inputs`);
    if ((template.required_sources ?? []).length < 5) fail(`${templateId} has too few required sources`);
    if ((template.citation_slots ?? []).length < 4) fail(`${templateId} has too few citation slots`);
    requiredDocs.push({
      path: routeDocPath(templateId),
      minBytes: 2_000,
      label: `${templateId} wiki card`
    });
  }
}

if ((aliasQueue.summary?.strict_blockers ?? 0) > 0) fail("alias review queue has strict blockers");
if ((aliasQueue.summary?.mojibake_aliases ?? 0) > 0) fail("alias review queue has mojibake aliases");
if ((aliasQueue.summary?.short_ambiguous_aliases_without_notes ?? 0) > 0) {
  fail("alias review queue has short ambiguous aliases without notes");
}
if (highConfidenceAliasCollisionsWithoutContext.length > 0) {
  warn(`${highConfidenceAliasCollisionsWithoutContext.length} high-confidence alias collision(s) need context notes`);
}
if ((updateQueue.summary?.pending_refresh ?? 0) > 0) {
  warn(`${updateQueue.summary.pending_refresh} source(s) are due soon and queued for refresh review`);
}

const seedCounts = {
  knowledge_sources: countInserts(knowledgeSeed, "knowledge_sources"),
  knowledge_snapshots: countInserts(knowledgeSeed, "knowledge_snapshots"),
  knowledge_terms: countInserts(knowledgeSeed, "knowledge_terms"),
  term_aliases: countInserts(knowledgeSeed, "term_aliases"),
  term_rule_links: countInserts(knowledgeSeed, "term_rule_links"),
  regulatory_update_candidates: countInserts(knowledgeSeed, "regulatory_update_candidates")
};

requireCount("seed knowledge source count", seedCounts.knowledge_sources, crawlResults.length);
requireCount("seed knowledge snapshot count", seedCounts.knowledge_snapshots, crawlResults.length);
requireCount("seed knowledge term count", seedCounts.knowledge_terms, terms.length);
requireCount("seed term alias count", seedCounts.term_aliases, aliases.length);
requireCount("seed term-rule link count", seedCounts.term_rule_links, links.length);
requireCount("seed regulatory update candidate count", seedCounts.regulatory_update_candidates, updateItems.length);

if (!chunkManifest) {
  warn("Supabase knowledge seed chunk manifest is not present; preflight will regenerate it before apply");
} else if (!chunkManifest.chunk_count || !chunkManifest.statement_count) {
  fail("Supabase knowledge seed chunk manifest is empty");
}

for (const doc of requiredDocs) {
  const info = await fileInfo(doc.path);
  if (!info.present) {
    fail(`${doc.label} is missing: ${path.relative(root, doc.path)}`);
    continue;
  }
  if (info.bytes < doc.minBytes) {
    fail(`${doc.label} is too small: ${info.bytes} bytes, expected at least ${doc.minBytes}`);
  }
}

for (const result of crawlResults) {
  if (result.document_path && !(await fileExists(path.join(root, result.document_path)))) {
    fail(`crawl document is missing: ${result.id} -> ${result.document_path}`);
  }
}

const summary = {
  ok: errors.length === 0,
  sources: crawlResults.length,
  highPrioritySources: crawlResults.filter((source) => source.priority === "high").length,
  manualFallbackWithoutEvidence: manualFallbackWithoutEvidence.length,
  coverageGroups: coverageGroups.length,
  routes: routes.length,
  evidenceTemplates: evidenceTemplates.length,
  terms: terms.length,
  aliases: aliases.length,
  highConfidenceAliasCollisions: highConfidenceAliasCollisions.length,
  highConfidenceAliasCollisionsWithoutContext: highConfidenceAliasCollisionsWithoutContext.length,
  seedCounts,
  warnings,
  errors
};

if (errors.length > 0) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
