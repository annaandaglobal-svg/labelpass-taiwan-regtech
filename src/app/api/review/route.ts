import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAiReviewInsight } from "@/lib/ai-review";
import { evaluateReview } from "@/lib/compliance";
import { presentReviewResult } from "@/lib/review-presentation";

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

  return NextResponse.json(aiAnalysis ? { ...result, aiAnalysis } : result);
}
