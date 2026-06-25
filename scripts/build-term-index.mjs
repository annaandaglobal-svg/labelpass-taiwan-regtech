import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const rulesPath = path.join(root, "data", "rules", "tw-cosmetics-rules.json");
const registryPath = path.join(root, "data", "knowledge", "term-registry.json");
const outPath = path.join(root, "data", "knowledge", "term-index.json");

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

function slug(value) {
  const normalized = normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (normalized) return normalized.slice(0, 80);
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

function uniqueByNormalized(items, getValue) {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    const value = getValue(item);
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(item);
  }

  return output;
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function validateTerm(term) {
  if (!term.id || !term.canonical_name) {
    throw new Error(`Invalid term registry entry: ${JSON.stringify(term)}`);
  }

  for (const alias of asArray(term.aliases)) {
    if (!alias.value) {
      throw new Error(`Term ${term.id} contains an alias without value`);
    }
  }
}

function makeOfficialTerm(rule) {
  const canonical = rule.ingredient_name || rule.inci_names?.[0] || rule.cas_numbers?.[0] || rule.id;
  const identifiers = {
    cas: asArray(rule.cas_numbers),
    inci: uniqueByNormalized([rule.ingredient_name, ...asArray(rule.inci_names)].filter(Boolean), (value) => value),
    color_index: asArray(rule.color_index_numbers)
  };

  const aliases = [
    ...identifiers.inci.map((value) => ({
      value,
      type: "official_rule_name",
      language: "und",
      jurisdiction: "TW",
      confidence: 0.95,
      source: "tfda-rule"
    })),
    ...asArray(rule.aliases).map((value) => ({
      value,
      type: "official_alias",
      language: "und",
      jurisdiction: "TW",
      confidence: 0.9,
      source: "tfda-rule"
    })),
    ...identifiers.cas.map((value) => ({
      value,
      type: "cas",
      language: "und",
      jurisdiction: "GLOBAL",
      confidence: 1,
      source: "tfda-rule"
    })),
    ...identifiers.color_index.map((value) => ({
      value,
      type: "color_index",
      language: "und",
      jurisdiction: "GLOBAL",
      confidence: 1,
      source: "tfda-rule"
    }))
  ];

  return {
    id: `tfda-${slug(canonical || rule.id)}`,
    canonical_name: canonical,
    category: rule.category,
    identifiers,
    aliases,
    source_keys: [`tfda-info-${rule.source_info_id}`],
    notes: `Generated from TFDA rule ${rule.id}`
  };
}

function termMatchesRule(term, rule) {
  const termCas = new Set(asArray(term.identifiers?.cas).map(normalizeText));
  const termInci = new Set(asArray(term.identifiers?.inci).map(normalizeText));
  const termCi = new Set(asArray(term.identifiers?.color_index).map(normalizeText));
  const ruleCas = asArray(rule.cas_numbers).map(normalizeText);
  const ruleInci = [rule.ingredient_name, ...asArray(rule.inci_names), ...asArray(rule.aliases)].filter(Boolean).map(normalizeText);
  const ruleCi = asArray(rule.color_index_numbers).map(normalizeText);

  if (ruleCas.some((value) => termCas.has(value))) return "cas";
  if (ruleCi.some((value) => termCi.has(value))) return "color_index";
  if (ruleInci.some((value) => termInci.has(value))) return "inci";

  const termAliases = asArray(term.aliases).map((alias) => normalizeText(alias.value));
  if (ruleInci.some((value) => termAliases.includes(value))) return "alias";
  return null;
}

const rulesPayload = JSON.parse(await readFile(rulesPath, "utf8"));
const termRegistry = JSON.parse(await readFile(registryPath, "utf8"));
const curatedTerms = asArray(termRegistry.terms);

for (const term of curatedTerms) validateTerm(term);

const rules = asArray(rulesPayload.rules);
const generatedTerms = new Map();
const termRuleLinks = [];
const ruleAliases = [];

for (const rule of rules) {
  const matchedTerms = [];

  for (const term of curatedTerms) {
    const basis = termMatchesRule(term, rule);
    if (!basis) continue;
    matchedTerms.push({ term, basis });
    termRuleLinks.push({
      term_id: term.id,
      rule_id: rule.id,
      rule_code: rule.id,
      match_basis: basis,
      jurisdiction: rule.jurisdiction ?? "TW",
      confidence: basis === "cas" || basis === "color_index" ? 1 : 0.9
    });
  }

  if (!matchedTerms.length) {
    const generatedTerm = makeOfficialTerm(rule);
    generatedTerms.set(`${generatedTerm.id}:${rule.id}`, generatedTerm);
    matchedTerms.push({ term: generatedTerm, basis: "generated_tfda_rule" });
    termRuleLinks.push({
      term_id: generatedTerm.id,
      rule_id: rule.id,
      rule_code: rule.id,
      match_basis: "generated_tfda_rule",
      jurisdiction: "TW",
      confidence: 0.8
    });
  }

  const aliases = [];
  for (const { term, basis } of matchedTerms) {
    const registryAliases = asArray(term.aliases).map((alias) => ({
      value: alias.value,
      normalized: normalizeText(alias.value),
      type: alias.type ?? "alias",
      language: alias.language ?? "und",
      jurisdiction: alias.jurisdiction ?? "GLOBAL",
      confidence: alias.confidence ?? 0.85,
      note: alias.note ?? null,
      source: basis
    }));

    const identifierAliases = [
      ...asArray(term.identifiers?.cas).map((value) => ({
        value,
        normalized: normalizeText(value),
        type: "cas",
        language: "und",
        jurisdiction: "GLOBAL",
        confidence: 1,
        note: null,
        source: basis
      })),
      ...asArray(term.identifiers?.inci).map((value) => ({
        value,
        normalized: normalizeText(value),
        type: "INCI",
        language: "en",
        jurisdiction: "GLOBAL",
        confidence: 1,
        note: null,
        source: basis
      })),
      ...asArray(term.identifiers?.color_index).map((value) => ({
        value,
        normalized: normalizeText(value),
        type: "color_index",
        language: "und",
        jurisdiction: "GLOBAL",
        confidence: 1,
        note: null,
        source: basis
      }))
    ];

    aliases.push(...registryAliases, ...identifierAliases);
  }

  ruleAliases.push({
    rule_id: rule.id,
    term_ids: matchedTerms.map(({ term }) => term.id),
    aliases: uniqueByNormalized(aliases, (alias) => alias.value)
  });
}

const termsById = new Map();
for (const term of [...curatedTerms, ...generatedTerms.values()]) {
  const identifiers = {
    cas: uniqueByNormalized(asArray(term.identifiers?.cas), (value) => value),
    inci: uniqueByNormalized(asArray(term.identifiers?.inci), (value) => value),
    color_index: uniqueByNormalized(asArray(term.identifiers?.color_index), (value) => value)
  };
  const aliases = uniqueByNormalized(asArray(term.aliases), (alias) => alias.value).map((alias) => ({
    value: alias.value,
    normalized: normalizeText(alias.value),
    type: alias.type ?? "alias",
    language: alias.language ?? "und",
    jurisdiction: alias.jurisdiction ?? "GLOBAL",
    confidence: alias.confidence ?? 0.85,
    note: alias.note ?? null,
    source: alias.source ?? "curated"
  }));

  termsById.set(term.id, {
    id: term.id,
    canonical_name: term.canonical_name,
    category: term.category ?? "ingredient",
    identifiers,
    aliases,
    source_keys: asArray(term.source_keys),
    notes: term.notes ?? ""
  });
}

const index = {
  generated_at: rulesPayload.generated_at,
  registry_version: termRegistry.version,
  rules_generated_at: rulesPayload.generated_at,
  curated_term_count: curatedTerms.length,
  generated_term_count: generatedTerms.size,
  rule_count: rules.length,
  rule_alias_count: ruleAliases.length,
  terms: [...termsById.values()],
  term_rule_links: uniqueByNormalized(termRuleLinks, (link) => `${link.term_id}:${link.rule_code}`),
  rule_aliases: ruleAliases
};

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      output: "data/knowledge/term-index.json",
      curatedTerms: index.curated_term_count,
      generatedTerms: index.generated_term_count,
      rules: index.rule_count,
      ruleAliases: index.rule_alias_count
    },
    null,
    2
  )
);
