// Guards the normalized verdict taxonomy so "허용 확인 안 됨" is never rendered as "금지".
// Run with Node type stripping: `node --experimental-strip-types`.
import { verdictForKnowledgeTerm, verdictStateLabels } from "../src/lib/knowledge-verdicts.ts";

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`Verdict state test failed: ${message}`);
    failures += 1;
  }
}

const cases = [
  // Positive-list non-listing must be a RISK, not a confirmed ban.
  { id: "potassium-glycerophosphate-food-additive", category: "food_additive", state: "restricted_risk" },
  { id: "aspergillus-oryzae-fermented-powder", category: "fermented_food_ingredient", state: "needs_check" },
  { id: "aspergillus-niger-culture", category: "fermented_food_ingredient", state: "needs_check" },
  { id: "steviol-glycosides-food-additive", category: "food_additive", state: "conditional" },
  // Real Taiwan cosmetic prohibited entry stays a confirmed ban.
  { id: "some-prohibited-term", category: "prohibited", state: "prohibited_confirmed" }
];

for (const c of cases) {
  const verdict = verdictForKnowledgeTerm({ id: c.id, canonicalName: c.id, category: c.category });
  assert(verdict, `${c.id}: expected a verdict, got null`);
  if (!verdict) continue;
  assert(verdict.state === c.state, `${c.id}: expected state ${c.state}, got ${verdict.state}`);
  assert(Boolean(verdict.uncertainty && verdict.uncertainty.length > 5), `${c.id}: missing uncertainty note`);
  assert(Boolean(verdictStateLabels[verdict.state]), `${c.id}: state has no label`);
}

// Explicit guard: the glycerophosphate case must NOT read as a confirmed prohibition.
const pg = verdictForKnowledgeTerm({
  id: "potassium-glycerophosphate-food-additive",
  canonicalName: "Potassium Glycerophosphate",
  category: "food_additive"
});
assert(pg && pg.state !== "prohibited_confirmed", "Potassium Glycerophosphate must not be prohibited_confirmed (positive-list non-listing = risk)");

if (failures) {
  process.exitCode = 1;
} else {
  console.log("Verdict state test passed: 5 states resolve correctly and non-listing != prohibition.");
}
