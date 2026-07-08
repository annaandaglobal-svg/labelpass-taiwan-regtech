// Safety test for the AI ingredient fallback — runs WITHOUT calling the LLM. Asserts the invariants
// that keep an unverified inference from ever presenting as a fabricated, over-confident, or
// curated-looking verdict. Wire into CI so the safety net can't silently regress.
import {
  aiIngredientFallbackReadiness,
  aiVerdictToDisplay,
  classifyUnknownIngredients,
  scrubInferredText
} from "../src/lib/ai-ingredient-fallback.ts";

let failures = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failures += 1;
    console.error("  ✗ " + msg);
  }
};

// 1) Number scrubbing — no fabricated ppm/%/mg can survive into displayed text.
for (const [input, banned] of [
  ["옥시벤존은 6% 까지 허용", "6%"],
  ["보존료 1000 ppm 이하", "1000 ppm"],
  ["비타민A 10000 IU 상한", "10000 IU"],
  ["살리실산 2.0% 제한", "2.0%"],
  ["카페인 320 mg/kg", "320 mg/kg"]
]) {
  const out = scrubInferredText(input);
  ok(!new RegExp(banned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(out), `scrub left a number: "${input}" -> "${out}"`);
}
ok(scrubInferredText("일반적으로 안전한 성분입니다").includes("안전"), "scrub must keep non-numeric text");

// 2) Display mapping — every inference is clearly flagged, never green-lit as verified.
const disp = aiVerdictToDisplay({
  name: "테스트성분",
  domain: "cosmetic",
  status: "generally_permitted",
  reason: "r",
  note: "n",
  source: "ai-inferred",
  confidence: "medium"
});
ok(disp.aiInferred === true, "display must set aiInferred:true");
ok(disp.state === "needs_check", "display state must be needs_check");
ok(disp.chips.some((c) => c.includes("미검증")), "display must carry a 미검증 chip");
ok(disp.actions.join(" ").includes("확인"), "display must tell the user to verify");
const prohibited = aiVerdictToDisplay({ name: "x", domain: "cosmetic", status: "likely_prohibited", reason: "r", note: "n", source: "ai-inferred", confidence: "medium" });
ok(prohibited.tone === "red", "likely_prohibited must be red toned");

// 3) Gating / degradation — with no key+flag the layer is a no-op.
const readiness = aiIngredientFallbackReadiness();
ok(readiness.ready === false || process.env.LABELPASS_ENABLE_AI_INGREDIENT_FALLBACK === "1", "readiness.ready must be false when not explicitly enabled");
const disabledResult = await classifyUnknownIngredients(["madeupzzz"], "화장품");
ok(Array.isArray(disabledResult), "classifyUnknownIngredients must always return an array");
if (!readiness.ready) ok(disabledResult.length === 0, "disabled fallback must return [] (never a made-up verdict)");

if (failures) {
  console.error(`\nAI fallback safety test FAILED: ${failures} assertion(s).`);
  process.exit(1);
}
console.log("AI fallback safety test passed: number-scrubbing, unverified-labelling, and disabled no-op all hold.");
