import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const paths = {
  termIndex: path.join(root, "data", "knowledge", "term-index.json"),
  coverage: path.join(root, "data", "knowledge", "search-alias-coverage.json")
};

function normalizeText(value) {
  const regulatoryVariantFoldMap = {
    "妆": "粧",
    "妝": "粧",
    "氢": "氫",
    "钠": "鈉",
    "钾": "鉀",
    "钙": "鈣",
    "镁": "鎂",
    "锌": "鋅",
    "铁": "鐵",
    "铜": "銅",
    "铝": "鋁",
    "苏": "蘇",
    "胶": "膠",
    "壳": "殼",
    "类": "類",
    "虾": "蝦",
    "鱼": "魚",
    "贝": "貝",
    "麦": "麥",
    "麸": "麩",
    "质": "質",
    "坚": "堅",
    "黄": "黃",
    "晒": "曬",
    "盐": "鹽",
    "亚": "亞",
    "剂": "劑",
    "标": "標",
    "签": "籤",
    "营": "營",
    "养": "養",
    "过": "過",
    "产": "產",
    "资": "資",
    "讯": "訊",
    "档": "檔",
    "录": "錄",
    "验": "驗",
    "证": "證",
    "许": "許",
    "湾": "灣",
    "臺": "台"
  };

  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[^\p{Letter}\p{Number}%.+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[妆妝氢钠钾钙镁锌铁铜铝苏胶壳类虾鱼贝麦麸质坚黄晒盐亚剂标签营养过产资讯档录验证许湾臺]/g, (character) => regulatoryVariantFoldMap[character] ?? character);
}

function foldSeparators(value) {
  return normalizeText(value).replace(/[\s._-]+/g, "");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function aliasesForTerm(term) {
  const aliases = Array.isArray(term.aliases) ? term.aliases : [];
  const identifiers = term.identifiers ?? {};
  return [
    term.canonical_name,
    ...aliases.map((alias) => alias.value),
    ...(identifiers.cas ?? []),
    ...(identifiers.inci ?? []),
    ...(identifiers.color_index ?? [])
  ].filter(Boolean);
}

function hasAlias(term, expectedAlias) {
  const expected = normalizeText(expectedAlias);
  const expectedFolded = foldSeparators(expectedAlias);
  return aliasesForTerm(term).some((alias) => {
    const normalized = normalizeText(alias);
    return normalized === expected || foldSeparators(alias) === expectedFolded;
  });
}

function scoreAlias(alias, query) {
  const target = normalizeText(alias);
  const queryNormalized = normalizeText(query);
  if (!target || !queryNormalized) return 0;
  if (target === queryNormalized) return 100;
  const targetFolded = foldSeparators(target);
  const queryFolded = foldSeparators(queryNormalized);
  const compactChemical = (value) => /^[a-z0-9.+-]{2,6}$/i.test(value) && /\d/.test(value) && /[a-z]/i.test(value);
  const casRegistryNumber = (value) => /^\d{2,7}-\d{2}-\d$/i.test(value);
  if (targetFolded === queryFolded && compactChemical(targetFolded) && compactChemical(queryFolded)) return 94;
  if (targetFolded.length > 3 && targetFolded === queryFolded) return 94;
  if (casRegistryNumber(target) && queryNormalized.replace(/^cas\s+/i, "") === target) return 94;
  if (/^[a-z0-9.+-]{2,4}$/i.test(target) && queryNormalized.split(" ").includes(target)) return 86;
  if (target.startsWith(queryNormalized)) return 88;
  if (target.includes(queryNormalized)) return 72;
  if (queryNormalized.length > 4 && queryNormalized.includes(target)) return 44;
  if (targetFolded.length > 3 && queryFolded.includes(targetFolded)) return 42;
  return 0;
}

function bestTermForQuery(terms, query) {
  return terms
    .map((term) => {
      const bestAliasScore = aliasesForTerm(term).reduce((best, alias) => Math.max(best, scoreAlias(alias, query)), 0);
      return { term, score: bestAliasScore };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.term.id.localeCompare(right.term.id))[0];
}

const termIndex = await readJson(paths.termIndex);
const coverage = await readJson(paths.coverage);
const terms = Array.isArray(termIndex.terms) ? termIndex.terms : [];
const termsById = new Map(terms.map((term) => [term.id, term]));
const failures = [];
const warnings = [];

for (const testCase of coverage.cases ?? []) {
  const term = termsById.get(testCase.expectedTermId);
  if (!term) {
    failures.push({
      id: testCase.id,
      issue: "missing-term",
      detail: `Expected term id not found: ${testCase.expectedTermId}`
    });
    continue;
  }

  const missingAliases = (testCase.requiredAliases ?? []).filter((alias) => !hasAlias(term, alias));
  if (missingAliases.length > 0) {
    failures.push({
      id: testCase.id,
      issue: "missing-required-alias",
      term: testCase.expectedTermId,
      detail: missingAliases.join(", ")
    });
  }

  const missingSources = (testCase.requiredSourceKeys ?? []).filter((sourceKey) => !(term.source_keys ?? []).includes(sourceKey));
  if (missingSources.length > 0) {
    failures.push({
      id: testCase.id,
      issue: "missing-required-source-link",
      term: testCase.expectedTermId,
      detail: missingSources.join(", ")
    });
  }

  const best = bestTermForQuery(terms, testCase.query);
  if (!best) {
    failures.push({
      id: testCase.id,
      issue: "query-not-searchable",
      term: testCase.expectedTermId,
      detail: `Query produced no alias/canonical match: ${testCase.query}`
    });
    continue;
  }

  if (best.term.id !== testCase.expectedTermId) {
    failures.push({
      id: testCase.id,
      issue: "query-ranks-wrong-term",
      term: testCase.expectedTermId,
      detail: `Query "${testCase.query}" matched ${best.term.id} (${best.term.canonical_name}) first with score ${best.score}`
    });
    continue;
  }

  if (best.score < 88) {
    warnings.push({
      id: testCase.id,
      issue: "weak-query-match",
      term: testCase.expectedTermId,
      detail: `Query "${testCase.query}" only matched with score ${best.score}`
    });
  }
}

const summary = {
  coverage_version: coverage.version ?? "unknown",
  term_index_generated_at: termIndex.generated_at ?? null,
  term_index_registry_version: termIndex.registry_version ?? null,
  cases: coverage.cases?.length ?? 0,
  terms_scanned: terms.length,
  failures: failures.length,
  warnings: warnings.length
};

console.log("Search alias coverage audit");
console.log(`- Coverage version: ${summary.coverage_version}`);
console.log(`- Cases: ${summary.cases}`);
console.log(`- Terms scanned: ${summary.terms_scanned}`);
console.log(`- Failures: ${summary.failures}`);
console.log(`- Warnings: ${summary.warnings}`);

if (failures.length > 0) {
  console.log("\nFailures");
  for (const failure of failures) {
    console.log(`- ${failure.id} | ${failure.issue} | ${failure.detail}`);
  }
}

if (warnings.length > 0) {
  console.log("\nWarnings");
  for (const warning of warnings) {
    console.log(`- ${warning.id} | ${warning.issue} | ${warning.detail}`);
  }
}

console.log(JSON.stringify({
  ...summary,
  failure_ids: unique(failures.map((failure) => failure.id)),
  warning_ids: unique(warnings.map((warning) => warning.id))
}, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
