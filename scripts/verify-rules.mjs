import fs from "node:fs";

const rulesPath = new URL("../data/rules/tw-cosmetics-rules.json", import.meta.url);
const manifestPath = new URL("../data/rules/manifest.json", import.meta.url);

const rulesData = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const rules = rulesData.rules;

function fail(message) {
  console.error(`Rule verification failed: ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function hasLimit(rule, expected) {
  return rule?.limit_percent_values?.some((value) => Math.abs(value - expected) < 0.0000001);
}

function findRule(predicate) {
  return rules.find(predicate);
}

assert(Array.isArray(rules), "rules payload must contain a rules array");
assert(rulesData.rule_count === 1081, `expected rulesData.rule_count 1081, got ${rulesData.rule_count}`);
assert(manifest.rule_count === 1081, `expected manifest.rule_count 1081, got ${manifest.rule_count}`);
assert(rules.length === 1081, `expected 1081 rules, got ${rules.length}`);

const mercury = findRule(
  (rule) =>
    rule.source_info_id === 203 &&
    rule.category === "prohibited" &&
    rule.ingredient_name === "Mercury and its compounds"
);
assert(mercury, "missing prohibited Mercury and its compounds rule");

const salicylic = findRule(
  (rule) =>
    rule.source_info_id === 199 &&
    rule.category === "restricted" &&
    rule.aliases?.includes("Salicylic acid")
);
assert(salicylic, "missing restricted Salicylic acid rule");
assert(hasLimit(salicylic, 2), "Salicylic acid restricted rule must include a 2% limit");

const methylisothiazolinone = findRule(
  (rule) =>
    rule.source_info_id === 201 &&
    rule.category === "preservative" &&
    rule.aliases?.includes("Methylisothiazolinone")
);
assert(methylisothiazolinone, "missing Methylisothiazolinone preservative rule");
assert(hasLimit(methylisothiazolinone, 0.0015), "Methylisothiazolinone rule must include a 0.0015% limit");

const triclosan = findRule(
  (rule) =>
    rule.source_info_id === 201 &&
    rule.category === "preservative" &&
    rule.aliases?.includes("Triclosan")
);
assert(triclosan, "missing Triclosan preservative rule");
assert(hasLimit(triclosan, 0.3), "Triclosan rule must include a 0.3% limit");
assert(hasLimit(triclosan, 0.2), "Triclosan rule must include a 0.2% limit");

if (!process.exitCode) {
  console.log(`Rule verification passed: ${rules.length} Taiwan cosmetic rules checked.`);
}
