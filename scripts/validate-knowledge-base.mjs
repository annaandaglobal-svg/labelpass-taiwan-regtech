import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const paths = {
  rules: path.join(root, "data", "rules", "tw-cosmetics-rules.json"),
  registry: path.join(root, "data", "knowledge", "source-registry.json"),
  index: path.join(root, "data", "knowledge", "index.json"),
  termIndex: path.join(root, "data", "knowledge", "term-index.json"),
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

const [rulesData, registry, index, termIndex, schemaSql, seedSql] = await Promise.all([
  readJson(paths.rules),
  readJson(paths.registry),
  readJson(paths.index),
  readJson(paths.termIndex),
  readFile(paths.schema, "utf8"),
  readFile(paths.seed, "utf8")
]);

const rules = rulesData.rules ?? [];
const sources = registry.sources ?? [];
const results = index.results ?? [];
const terms = termIndex.terms ?? [];
const links = termIndex.term_rule_links ?? [];

const ruleIds = uniqueBy(rules, (rule) => rule.id, "rules");
const ruleSourceIds = new Set(rules.map((rule) => `tfda-info-${rule.source_info_id}`).filter(Boolean));
const sourceIds = uniqueBy(sources, (source) => source.id, "source-registry sources");
uniqueBy(sources, (source) => source.url, "source-registry source URLs");
const resultIds = uniqueBy(results, (result) => result.id, "knowledge crawl results");
const termIds = uniqueBy(terms, (term) => term.id, "knowledge terms");

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

  for (const companionId of source.companion_source_ids ?? []) {
    if (!sourceIds.has(companionId)) {
      fail(`source ${source.id} references missing companion_source_id: ${companionId}`);
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
  "term_rule_links"
]) {
  if (!schemaSql.includes(`public.${tableName}`)) {
    fail(`knowledge schema does not define public.${tableName}`);
  }
}

const aliasCount = terms.reduce((count, term) => count + (term.aliases?.length ?? 0), 0);
const expectedSeedInserts = {
  knowledge_sources: results.length,
  knowledge_snapshots: results.length,
  knowledge_terms: terms.length,
  term_aliases: aliasCount,
  term_rule_links: links.length
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
