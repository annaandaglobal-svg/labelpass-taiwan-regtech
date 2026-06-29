import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const paths = {
  termIndex: path.join(root, "data", "knowledge", "term-index.json"),
  coverage: path.join(root, "data", "knowledge", "search-alias-coverage.json")
};

const coveredCategories = new Set([
  "prohibited",
  "restricted",
  "preservative",
  "colorant",
  "sunscreen",
  "ph_adjuster",
  "cosmetic_ingredient_restriction",
  "colorant_uv_filter",
  "uv_filter",
  "oxidizing_agent",
  "skin_lightening_agent",
  "hair_dye_ingredient",
  "food_additive",
  "food_allergen",
  "food_allergen_advisory",
  "fermented_food_ingredient",
  "health_food",
  "health_food_claim",
  "health_food_labeling",
  "food_labeling",
  "food_import",
  "cosmetic_compliance",
  "cosmetic_ingredient",
  "botanical_ingredient",
  "food_ingredient",
  "food_cosmetic_ingredient",
  "special_dietary_food",
  "customs_trade",
  "trade_control"
]);

const coveredTermOverrides = new Set([
  "potassium-glycerophosphate-food-additive",
  "aspergillus-oryzae-fermented-powder",
  "aspergillus-niger-culture",
  "steviol-glycosides-food-additive"
]);

const mustStayExplicit = [
  {
    id: "potassium-glycerophosphate-food-additive",
    phrases: ["not permitted", "positive-list", "not listed"]
  },
  {
    id: "aspergillus-oryzae-fermented-powder",
    phrases: ["species", "strain", "Taiwan food-ingredient"]
  },
  {
    id: "aspergillus-niger-culture",
    phrases: ["strain", "viable", "Taiwan food-ingredient"]
  },
  {
    id: "steviol-glycosides-food-additive",
    phrases: ["sweetener", "additive", "Stevia"]
  }
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function hasVerdictCoverage(term) {
  return coveredTermOverrides.has(term.id) || coveredCategories.has(term.category);
}

function includesAllPhrases(value, phrases) {
  const normalized = String(value ?? "").toLowerCase();
  return phrases.every((phrase) => normalized.includes(phrase.toLowerCase()));
}

const [termIndex, coverage] = await Promise.all([readJson(paths.termIndex), readJson(paths.coverage)]);
const terms = termIndex.terms ?? [];
const termsById = new Map(terms.map((term) => [term.id, term]));
const failures = [];
const warnings = [];

for (const testCase of coverage.cases ?? []) {
  const term = termsById.get(testCase.expectedTermId);
  if (!term) continue;

  if (!hasVerdictCoverage(term)) {
    failures.push({
      id: testCase.id,
      issue: "missing-verdict-coverage",
      term: term.id,
      category: term.category ?? "uncategorized"
    });
  }
}

for (const rule of mustStayExplicit) {
  const term = termsById.get(rule.id);
  if (!term) {
    failures.push({ id: rule.id, issue: "missing-critical-term", category: "critical" });
    continue;
  }

  if (!includesAllPhrases(term.notes, rule.phrases)) {
    failures.push({
      id: rule.id,
      issue: "weak-critical-verdict-note",
      category: term.category ?? "uncategorized"
    });
  }
}

const criticalTerms = terms.filter((term) => hasVerdictCoverage(term));
const weakNotes = criticalTerms.filter((term) => String(term.notes ?? "").trim().length < 20);
if (weakNotes.length > 0) {
  warnings.push({
    issue: "weak-verdict-term-notes",
    count: weakNotes.length,
    examples: weakNotes.slice(0, 10).map((term) => term.id)
  });
}

const summary = {
  coverage_version: coverage.version ?? "unknown",
  terms_scanned: terms.length,
  coverage_cases: coverage.cases?.length ?? 0,
  covered_categories: coveredCategories.size,
  covered_overrides: coveredTermOverrides.size,
  failures: failures.length,
  warnings: warnings.length
};

console.log("Knowledge verdict audit");
console.log(`- Coverage version: ${summary.coverage_version}`);
console.log(`- Coverage cases: ${summary.coverage_cases}`);
console.log(`- Terms scanned: ${summary.terms_scanned}`);
console.log(`- Failures: ${summary.failures}`);
console.log(`- Warnings: ${summary.warnings}`);

if (failures.length > 0) {
  console.log("\nFailures");
  for (const failure of failures.slice(0, 50)) {
    console.log(`- ${failure.id} | ${failure.issue} | ${failure.term ?? ""} | ${failure.category}`);
  }
}

if (warnings.length > 0) {
  console.log("\nWarnings");
  for (const warning of warnings) {
    console.log(`- ${warning.issue} | ${warning.count ?? ""} | ${(warning.examples ?? []).join(", ")}`);
  }
}

console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
