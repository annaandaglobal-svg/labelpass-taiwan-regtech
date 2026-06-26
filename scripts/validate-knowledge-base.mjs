import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const paths = {
  rules: path.join(root, "data", "rules", "tw-cosmetics-rules.json"),
  registry: path.join(root, "data", "knowledge", "source-registry.json"),
  index: path.join(root, "data", "knowledge", "index.json"),
  termIndex: path.join(root, "data", "knowledge", "term-index.json"),
  aliasReviewQueue: path.join(root, "data", "knowledge", "alias-review-queue.json"),
  updateQueue: path.join(root, "data", "knowledge", "regulatory-update-queue.json"),
  schema: path.join(root, "supabase", "knowledge-schema.sql"),
  seed: path.join(root, "supabase", "knowledge-seed.sql")
};

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

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function uniqueBy(items, keyFn, label) {
  const seen = new Set();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) {
      fail(`${label} has an empty key`);
      continue;
    }
    if (seen.has(key)) {
      fail(`${label} has a duplicate key: ${key}`);
    }
    seen.add(key);
  }
  return seen;
}

function countInserts(sql, tableName) {
  const pattern = new RegExp(`insert into public\\.${tableName}\\b`, "gi");
  return sql.match(pattern)?.length ?? 0;
}

function isValidDate(value) {
  return Number.isFinite(Date.parse(String(value ?? "")));
}

const [rulesData, registry, index, termIndex, aliasReviewQueue, updateQueue, schemaSql, seedSql] = await Promise.all([
  readJson(paths.rules),
  readJson(paths.registry),
  readJson(paths.index),
  readJson(paths.termIndex),
  readJson(paths.aliasReviewQueue),
  readJson(paths.updateQueue),
  readFile(paths.schema, "utf8"),
  readFile(paths.seed, "utf8")
]);

const rules = rulesData.rules ?? [];
const sources = registry.sources ?? [];
const results = index.results ?? [];
const terms = termIndex.terms ?? [];
const links = termIndex.term_rule_links ?? [];
const aliasQueueItems = aliasReviewQueue.items ?? [];
const updateCandidates = updateQueue.items ?? [];
const aliasCount = terms.reduce((count, term) => count + (term.aliases?.length ?? 0), 0);

const ruleIds = uniqueBy(rules, (rule) => rule.id, "rules");
const ruleSourceIds = new Set(rules.map((rule) => `tfda-info-${rule.source_info_id}`).filter(Boolean));
const sourceIds = uniqueBy(sources, (source) => source.id, "source-registry sources");
uniqueBy(sources, (source) => source.url, "source-registry source URLs");
const resultIds = uniqueBy(results, (result) => result.id, "knowledge crawl results");
const termIds = uniqueBy(terms, (term) => term.id, "knowledge terms");
uniqueBy(updateCandidates, (candidate) => candidate.candidate_key, "regulatory update candidates");

if (rulesData.rule_count !== rules.length) {
  fail(`rules.rule_count is ${rulesData.rule_count}, but rules array has ${rules.length}`);
}

if (index.source_count !== sources.length) {
  fail(`index.source_count is ${index.source_count}, but source registry has ${sources.length}`);
}

if (index.success_count !== results.length) {
  fail(`index.success_count is ${index.success_count}, but results array has ${results.length}`);
}

if ((index.failure_count ?? 0) !== 0) {
  fail(`knowledge crawl has ${index.failure_count} failed source(s)`);
}

for (const result of results) {
  if (!sourceIds.has(result.id)) {
    fail(`crawl result has no matching source registry entry: ${result.id}`);
  }

  if (!Number.isFinite(result.cache_days) || result.cache_days <= 0) {
    fail(`crawl result has invalid cache_days for ${result.id}`);
  }

  if (!isValidDate(result.fetched_at)) {
    fail(`crawl result has invalid fetched_at for ${result.id}`);
  }

  if (!isValidDate(result.cache_expires_at)) {
    fail(`crawl result has invalid cache_expires_at for ${result.id}`);
  }

  if (!["fresh", "stale"].includes(result.cache_status)) {
    fail(`crawl result has invalid cache_status for ${result.id}: ${result.cache_status}`);
  }

  if (!result.document_path) {
    fail(`crawl result has no document path: ${result.id}`);
    continue;
  }

  if (!(await fileExists(path.join(root, result.document_path)))) {
    fail(`crawl document is missing for ${result.id}: ${result.document_path}`);
  }
}

for (const source of sources) {
  if (!resultIds.has(source.id)) {
    warn(`source is registered but not present in crawl results: ${source.id}`);
  }

  for (const field of ["title", "url", "authority", "jurisdiction", "domain", "source_type", "priority"]) {
    if (!source[field]) {
      fail(`source ${source.id} is missing ${field}`);
    }
  }

  if (source.cache_days !== undefined && (!Number.isFinite(source.cache_days) || source.cache_days <= 0)) {
    fail(`source ${source.id} has invalid cache_days`);
  }

  for (const companionId of source.companion_source_ids ?? []) {
    if (!sourceIds.has(companionId)) {
      fail(`source ${source.id} references missing companion_source_id: ${companionId}`);
    }
  }
}

if (updateQueue.source_registry_version !== index.source_registry_version) {
  fail(
    `regulatory update queue source_registry_version is ${updateQueue.source_registry_version}, but crawl index is ${index.source_registry_version}`
  );
}

if (updateQueue.crawl_generated_at !== index.generated_at) {
  fail(`regulatory update queue crawl_generated_at is ${updateQueue.crawl_generated_at}, but crawl index generated_at is ${index.generated_at}`);
}

for (const candidate of updateCandidates) {
  if (!candidate.source_key || !sourceIds.has(candidate.source_key)) {
    fail(`regulatory update candidate references missing source_key: ${candidate.candidate_key}`);
  }

  for (const field of ["title", "source_url", "domain", "change_type", "severity", "status", "detected_at", "next_action"]) {
    if (!candidate[field]) {
      fail(`regulatory update candidate ${candidate.candidate_key} is missing ${field}`);
    }
  }

  if (!isValidDate(candidate.detected_at)) {
    fail(`regulatory update candidate has invalid detected_at: ${candidate.candidate_key}`);
  }

  for (const term of candidate.affected_terms ?? []) {
    if (term.term_key && !termIds.has(term.term_key)) {
      fail(`regulatory update candidate ${candidate.candidate_key} references missing affected term: ${term.term_key}`);
    }
  }
}

for (const term of terms) {
  if (!term.canonical_name) {
    fail(`term ${term.id} is missing canonical_name`);
  }

  const aliases = term.aliases ?? [];
  if (aliases.length === 0) {
    warn(`term ${term.id} has no aliases`);
  }

  uniqueBy(
    aliases,
    (alias) =>
      [
        alias.normalized,
        alias.language ?? "und",
        alias.jurisdiction ?? "GLOBAL",
        alias.type ?? "alias"
      ].join("|"),
    `aliases for ${term.id}`
  );

  for (const alias of aliases) {
    if (!alias.value || !alias.normalized) {
      fail(`term ${term.id} has an alias without value or normalized form`);
    }
  }

  for (const sourceKey of term.source_keys ?? []) {
    if (!sourceIds.has(sourceKey) && !ruleSourceIds.has(sourceKey)) {
      fail(`term ${term.id} references missing source_key: ${sourceKey}`);
    }
  }
}

const aliasQueueSummary = aliasReviewQueue.summary ?? {};
if (aliasReviewQueue.source?.registry_version !== termIndex.registry_version) {
  fail(
    `alias review queue registry_version is ${aliasReviewQueue.source?.registry_version}, but term index is ${termIndex.registry_version}`
  );
}

if (aliasReviewQueue.source?.term_index_generated_at !== termIndex.generated_at) {
  fail(
    `alias review queue term_index_generated_at is ${aliasReviewQueue.source?.term_index_generated_at}, but term index generated_at is ${termIndex.generated_at}`
  );
}

if (aliasQueueSummary.terms_scanned !== terms.length) {
  fail(`alias review queue terms_scanned is ${aliasQueueSummary.terms_scanned}, expected ${terms.length}`);
}

if (aliasQueueSummary.aliases_scanned !== aliasCount) {
  fail(`alias review queue aliases_scanned is ${aliasQueueSummary.aliases_scanned}, expected ${aliasCount}`);
}

if (aliasQueueSummary.review_items !== aliasQueueItems.length) {
  fail(`alias review queue summary has ${aliasQueueSummary.review_items} item(s), but items array has ${aliasQueueItems.length}`);
}

if ((aliasQueueSummary.strict_blockers ?? 0) > 0) {
  fail(`alias review queue has ${aliasQueueSummary.strict_blockers} strict blocker(s)`);
}

uniqueBy(aliasQueueItems, (item) => item.id, "alias review queue items");

const aliasQueuePriorities = new Set(["blocker", "high", "medium", "low", "backlog"]);
for (const item of aliasQueueItems) {
  for (const field of ["id", "status", "issue", "priority", "alias", "recommended_action"]) {
    if (!item[field]) {
      fail(`alias review queue item ${item.id ?? "(missing id)"} is missing ${field}`);
    }
  }

  if (!aliasQueuePriorities.has(item.priority)) {
    fail(`alias review queue item ${item.id} has invalid priority: ${item.priority}`);
  }

  if (!Array.isArray(item.terms) || item.terms.length === 0) {
    fail(`alias review queue item ${item.id} has no terms`);
    continue;
  }

  if (item.term_count !== item.terms.length) {
    fail(`alias review queue item ${item.id} term_count is ${item.term_count}, expected ${item.terms.length}`);
  }

  for (const term of item.terms) {
    if (!term.term_id || !termIds.has(term.term_id)) {
      fail(`alias review queue item ${item.id} references missing term: ${term.term_id}`);
    }
    if (!term.alias_value || !term.alias_type) {
      fail(`alias review queue item ${item.id} has a term without alias_value or alias_type`);
    }
  }
}

for (const link of links) {
  if (!termIds.has(link.term_id)) {
    fail(`term_rule_link references missing term_id: ${link.term_id}`);
  }

  if (!ruleIds.has(link.rule_code)) {
    fail(`term_rule_link references missing rule_code: ${link.rule_code}`);
  }
}

for (const tableName of [
  "knowledge_sources",
  "knowledge_snapshots",
  "knowledge_terms",
  "term_aliases",
  "term_rule_links",
  "regulatory_update_candidates"
]) {
  if (!schemaSql.includes(`public.${tableName}`)) {
    fail(`knowledge schema does not define public.${tableName}`);
  }
}

const expectedSeedInserts = {
  knowledge_sources: results.length,
  knowledge_snapshots: results.length,
  knowledge_terms: terms.length,
  term_aliases: aliasCount,
  term_rule_links: links.length,
  regulatory_update_candidates: updateCandidates.length
};

for (const [tableName, expected] of Object.entries(expectedSeedInserts)) {
  const actual = countInserts(seedSql, tableName);
  if (actual !== expected) {
    fail(`knowledge seed has ${actual} ${tableName} insert(s), expected ${expected}`);
  }
}

if (!seedSql.includes("\nbegin;\n") || !seedSql.trimEnd().endsWith("commit;")) {
  fail("knowledge seed should be wrapped in begin/commit");
}

const summary = {
  rules: rules.length,
  knowledge_sources: results.length,
  knowledge_snapshots: results.length,
  knowledge_terms: terms.length,
  term_aliases: aliasCount,
  term_rule_links: links.length,
  regulatory_update_candidates: updateCandidates.length,
  alias_review_queue_items: aliasQueueItems.length,
  warnings: warnings.length,
  errors: errors.length
};

if (warnings.length > 0) {
  console.warn(JSON.stringify({ warnings }, null, 2));
}

if (errors.length > 0) {
  console.error(JSON.stringify({ summary, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
