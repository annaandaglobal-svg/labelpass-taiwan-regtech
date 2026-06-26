import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const paths = {
  requirements: path.join(root, "data", "knowledge", "coverage-requirements.json"),
  registry: path.join(root, "data", "knowledge", "source-registry.json"),
  index: path.join(root, "data", "knowledge", "index.json"),
  termIndex: path.join(root, "data", "knowledge", "term-index.json")
};

const errors = [];
const warnings = [];

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[^\p{Letter}\p{Number}%.+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function fail(groupId, message) {
  errors.push(`${groupId}: ${message}`);
}

function warn(groupId, message) {
  warnings.push(`${groupId}: ${message}`);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

const [requirements, registry, index, termIndex] = await Promise.all([
  readJson(paths.requirements),
  readJson(paths.registry),
  readJson(paths.index),
  readJson(paths.termIndex)
]);

const sources = registry.sources ?? [];
const results = index.results ?? [];
const terms = termIndex.terms ?? [];

const sourceById = new Map(sources.map((source) => [source.id, source]));
const resultById = new Map(results.map((result) => [result.id, result]));
const termById = new Map(terms.map((term) => [term.id, term]));
const aliasOwners = new Map();

for (const term of terms) {
  const candidates = [
    term.canonical_name,
    ...(term.aliases ?? []).map((alias) => alias.value),
    ...(term.identifiers?.cas ?? []),
    ...(term.identifiers?.inci ?? []),
    ...(term.identifiers?.color_index ?? [])
  ];

  for (const value of candidates) {
    const normalized = normalizeText(value);
    if (!normalized) continue;
    const owners = aliasOwners.get(normalized) ?? new Set();
    owners.add(term.id);
    aliasOwners.set(normalized, owners);
  }
}

const groupSummaries = [];

for (const group of requirements.groups ?? []) {
  const groupId = group.id ?? "unnamed_group";
  const sourceIds = uniqueValues(group.sourceIds ?? []);
  const termIds = uniqueValues(group.termIds ?? []);
  const aliases = uniqueValues(group.aliases ?? []);
  const minTextChars = Number(group.minTextChars ?? requirements.defaults?.minTextChars ?? 500);
  const sourceMinimums = group.sourceMinimums ?? {};
  const presentSources = [];
  const presentTerms = [];
  const presentAliases = [];

  if (!group.id) fail(groupId, "group id is required");
  if (!group.label) warn(groupId, "group label is missing");
  if (sourceIds.length === 0) fail(groupId, "group has no required sourceIds");
  if (termIds.length === 0) fail(groupId, "group has no required termIds");
  if (aliases.length === 0) fail(groupId, "group has no required aliases");

  for (const sourceId of sourceIds) {
    const source = sourceById.get(sourceId);
    const result = resultById.get(sourceId);
    const requiredChars = Number(sourceMinimums[sourceId] ?? minTextChars);

    if (!source) {
      fail(groupId, `required source is missing from source-registry: ${sourceId}`);
      continue;
    }
    presentSources.push(sourceId);

    if (!result) {
      fail(groupId, `required source has no crawl result: ${sourceId}`);
      continue;
    }

    if (result.parse_error) {
      fail(groupId, `required source has parse_error: ${sourceId}: ${result.parse_error}`);
    }

    if (!result.document_path) {
      fail(groupId, `required source has no document_path: ${sourceId}`);
    } else if (!(await fileExists(path.join(root, result.document_path)))) {
      fail(groupId, `required source document is missing: ${sourceId}: ${result.document_path}`);
    }

    const textChars = Number(result.text_chars ?? 0);
    if (!Number.isFinite(textChars) || textChars < requiredChars) {
      fail(groupId, `required source text is too short: ${sourceId} has ${textChars}, expected at least ${requiredChars}`);
    }

    if (source.jurisdiction !== "TW") {
      warn(groupId, `required source is not marked TW jurisdiction: ${sourceId} (${source.jurisdiction ?? "missing"})`);
    }
  }

  for (const termId of termIds) {
    const term = termById.get(termId);
    if (!term) {
      fail(groupId, `required term is missing from term-index: ${termId}`);
      continue;
    }
    presentTerms.push(termId);

    const aliasesForTerm = term.aliases ?? [];
    if (aliasesForTerm.length === 0) {
      fail(groupId, `required term has no aliases: ${termId}`);
    }

    const linkedRequiredSources = (term.source_keys ?? []).filter((sourceKey) => sourceIds.includes(sourceKey));
    if (linkedRequiredSources.length === 0) {
      warn(groupId, `required term does not cite a source from the same coverage group: ${termId}`);
    }
  }

  for (const alias of aliases) {
    const normalized = normalizeText(alias);
    const owners = aliasOwners.get(normalized);

    if (!owners || owners.size === 0) {
      fail(groupId, `required alias is not searchable in term-index: ${alias}`);
      continue;
    }

    const matchingTerms = [...owners].filter((termId) => termIds.includes(termId));
    if (matchingTerms.length === 0) {
      fail(groupId, `required alias is present but not attached to this coverage group terms: ${alias} -> ${[...owners].join(", ")}`);
      continue;
    }

    presentAliases.push(alias);
  }

  groupSummaries.push({
    id: groupId,
    label: group.label,
    sources: `${presentSources.length}/${sourceIds.length}`,
    terms: `${presentTerms.length}/${termIds.length}`,
    aliases: `${presentAliases.length}/${aliases.length}`
  });
}

const summary = {
  coverage_groups: groupSummaries.length,
  required_sources: groupSummaries.reduce((total, group) => total + Number(group.sources.split("/")[1] ?? 0), 0),
  required_terms: groupSummaries.reduce((total, group) => total + Number(group.terms.split("/")[1] ?? 0), 0),
  required_aliases: groupSummaries.reduce((total, group) => total + Number(group.aliases.split("/")[1] ?? 0), 0),
  warnings: warnings.length,
  errors: errors.length,
  groups: groupSummaries
};

if (warnings.length > 0) {
  console.warn(JSON.stringify({ warnings }, null, 2));
}

if (errors.length > 0) {
  console.error(JSON.stringify({ summary, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
