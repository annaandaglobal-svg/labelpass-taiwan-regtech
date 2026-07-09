// Verification-status report: how much of the KB is primary-source verified vs inferred (haiku-only),
// and which inferred terms are the next targets for a sonnet primary-source pass.
// Usage: pnpm verify:status
import { readFileSync } from "node:fs";

const reg = JSON.parse(readFileSync("data/knowledge/term-registry.json", "utf8"));
let verified = 0, inferred = 0, unstamped = 0;
const inferredTerms = [];
for (const t of reg.terms) {
  if (t.verification === "verified") verified++;
  else if (t.verification === "inferred") { inferred++; inferredTerms.push(t); }
  else unstamped++;
}

console.log(`KB verification status (${reg.terms.length} terms):`);
console.log(`  ✓ verified (primary source): ${verified}`);
console.log(`  ~ inferred (unverified, next target): ${inferred}`);
console.log(`  · unstamped (legacy / not flagged): ${unstamped}`);

if (inferredTerms.length) {
  // Group next-verification targets by category for efficient batching.
  const byCat = {};
  for (const t of inferredTerms) (byCat[t.category] ||= []).push(t.canonical_name);
  console.log(`\n▶ Next verification targets (${inferred}), by category:`);
  for (const [cat, names] of Object.entries(byCat).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  [${cat}] ${names.length}: ${names.slice(0, 8).join(", ")}${names.length > 8 ? " …" : ""}`);
  }
}
