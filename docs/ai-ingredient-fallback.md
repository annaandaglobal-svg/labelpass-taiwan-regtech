# AI ingredient fallback — design

Closes the long tail of "recognise any ingredient". The curated knowledge base
(`data/knowledge/term-registry.json` → verdicts) classifies regulated + common ingredients
precisely and remains the source of truth. This optional layer asks an LLM to infer the *likely*
regulatory **class** for an ingredient the KB did not match, so the user gets a hint instead of
nothing — clearly labelled as an unverified AI inference.

## Where it sits

```
POST /api/review
  → evaluateReview()            (curated rules + term verdicts — SOURCE OF TRUTH)
  → presentReviewResult()       → result.ingredientVerdicts   (matched, verified)
  → [gated] AI fallback:
        unmatchedIngredients(ingredientsText, matched)         (what the KB missed)
        classifyUnknownIngredients(unmatched, productType)     (LLM, best-effort)
  → response = { ...result, aiIngredientVerdicts? }            (separate, flagged section)
```

Module: `src/lib/ai-ingredient-fallback.ts`. Route wiring: `src/app/api/review/route.ts`.

## Safety rules (enforced by prompt + schema + post-processing)

1. **Curated wins.** The fallback only runs for ingredients the KB did not match; it never
   overrides or edits a curated verdict.
2. **No fabricated numbers.** The prompt forbids specific limits/citations; the schema carries only
   a class + prose; `stripNumbers()` scrubs any ppm/%/mg the model slips in. Unverified inferences
   must never present a concrete Taiwan limit.
3. **Conservative.** Defaults to `needs_verification`; `likely_prohibited` only for well-known
   dangerous classes; confidence capped at `medium`.
4. **Clearly labelled.** Every result is `source: "ai-inferred"`, rendered as "AI 추론(미검증)" with
   a "공식 목록 확인 필요" chip so it is visually distinct from curated verdicts.
5. **Fully gated / zero-impact when off.** With the flag or key absent, the route branch is skipped
   and the response is byte-identical to today. Default = off.

## Enable

Set both (never commit secrets):
- `OPENAI_API_KEY` (or reuse the AI-review key)
- `LABELPASS_ENABLE_AI_INGREDIENT_FALLBACK=1`
- optional `OPENAI_INGREDIENT_FALLBACK_MODEL`

Status is shown on the admin ops-readiness card ("AI 성분 폴백"). Readiness:
`aiIngredientFallbackReadiness()`.

## Behaviour & cost controls

- **Batched**: one API call per review for up to 30 unmatched ingredients (not one call each).
- **Cached** in-process by `(productType, name)`.
- **Graceful**: any error / non-200 / disabled → returns `[]` (callers treat empty as
  "no fallback", never "all clear").

## Output shape

`AiIngredientVerdict { name, domain, status, reason, note, source:"ai-inferred", confidence }`
where `status ∈ generally_permitted | restricted_or_conditional | likely_prohibited |
needs_verification | unknown`. `aiVerdictToDisplay()` maps it to the shared verdict display shape
with `aiInferred: true`.

## Explicitly out of scope

- Not a substitute for the curated KB or an expert/RA. It is a hint for the tail.
- Does not assert numeric limits, approvals, or citations — always "verify against the official
  Taiwan list".

## Next steps (when enabling in production)

1. Add a golden set of known ingredients to check the fallback's class agrees with the curated
   verdict on overlap (sanity), and never emits a number (regex assert on `stripNumbers`).
2. Surface `aiIngredientVerdicts` in the review UI as a collapsed "AI 추론(미검증)" section.
3. Log/monitor which ingredients hit the fallback → feed the frequent ones back into the curated KB
   (turns unverified hints into verified verdicts over time).
