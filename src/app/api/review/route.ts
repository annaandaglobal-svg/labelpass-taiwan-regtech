import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAiReviewInsight } from "@/lib/ai-review";
import { aiIngredientFallbackReadiness, classifyUnknownIngredients } from "@/lib/ai-ingredient-fallback";
import { evaluateReview } from "@/lib/compliance";
import { searchKnowledge } from "@/lib/knowledge-search";
import { presentReviewResult } from "@/lib/review-presentation";

// Score above which the curated KB is considered to already KNOW an ingredient (so the AI fallback
// should NOT run for it, even if its category is not surfaced as a review verdict).
const KB_KNOWN_SCORE = 70;

// Ingredients TRULY unknown to the curated KB — the only candidates for the optional AI fallback.
// Two filters: not already surfaced as a review verdict, AND the bundled search index has no
// confident match (so curated-but-unsurfaced ingredients like glycerin are excluded, not re-inferred).
function unmatchedIngredients(ingredientsText: string, matchedTexts: string[]): string[] {
  const matched = matchedTexts.map((m) => m.toLowerCase()).filter(Boolean);
  const seen = new Set<string>();
  return ingredientsText
    .split(/[,;\n·、/()[\]{}|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && /[a-z가-힣]/i.test(s))
    .filter((s) => {
      const lower = s.toLowerCase();
      return !matched.some((m) => lower.includes(m) || m.includes(lower));
    })
    .filter((s) => (seen.has(s.toLowerCase()) ? false : (seen.add(s.toLowerCase()), true)))
    .filter((s) => {
      try {
        return (searchKnowledge(s, 1).terms[0]?.score ?? 0) < KB_KNOWN_SCORE;
      } catch {
        return true;
      }
    })
    .slice(0, 30);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reviewInputSchema = z.object({
  productName: z.string().default(""),
  productType: z.string().default(""),
  ingredientsText: z.string().default(""),
  labelText: z.string().default(""),
  origin: z.string().default(""),
  manufacturer: z.string().default(""),
  hsCode: z.string().optional(),
  incoterms: z.string().optional(),
  shipmentPurpose: z.string().optional(),
  invoiceValue: z.string().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reviewInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid review input",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const result = presentReviewResult(parsed.data, evaluateReview(parsed.data));
  const aiAnalysis = await generateAiReviewInsight(parsed.data, result);

  // Optional AI fallback for ingredients the curated KB didn't recognise. Fully gated: with the
  // flag/key off this branch is skipped and the response is byte-identical to before.
  let aiIngredientVerdicts: Awaited<ReturnType<typeof classifyUnknownIngredients>> = [];
  if (aiIngredientFallbackReadiness().ready) {
    const unmatched = unmatchedIngredients(
      parsed.data.ingredientsText,
      result.ingredientVerdicts.map((v) => v.matchedText)
    );
    if (unmatched.length) {
      aiIngredientVerdicts = await classifyUnknownIngredients(unmatched, parsed.data.productType);
    }
  }

  return NextResponse.json({
    ...result,
    ...(aiAnalysis ? { aiAnalysis } : {}),
    ...(aiIngredientVerdicts.length ? { aiIngredientVerdicts } : {})
  });
}
