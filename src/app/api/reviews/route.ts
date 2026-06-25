import { NextResponse } from "next/server";
import { z } from "zod";
import { listStoredReviews, saveStoredReview } from "@/lib/review-store";
import type { SavedReview } from "@/lib/review-types";

export const runtime = "nodejs";

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

const findingSchema = z.object({
  id: z.string(),
  status: z.enum(["pass", "warn", "fail", "needs_info"]),
  area: z.string(),
  title: z.string(),
  severity: z.union([z.string(), z.number()]).transform(String),
  why: z.string(),
  fix: z.array(z.string()),
  source: z.string(),
  sourceUrl: z.string(),
  evidence: z.string().optional()
}).passthrough();

const reviewResultSchema = z.object({
  status: z.enum(["pass", "warn", "fail", "needs_info"]),
  score: z.number(),
  generatedAt: z.string(),
  ruleVersion: z.string(),
  parsedIngredients: z.array(z.unknown()).default([]),
  findings: z.array(findingSchema),
  actionPlan: z.unknown(),
  summary: z.object({
    fail: z.number(),
    warn: z.number(),
    pass: z.number(),
    needsInfo: z.number()
  })
}).passthrough();

const savedReviewSchema = z.object({
  id: z.string().min(1).optional(),
  input: reviewInputSchema,
  result: reviewResultSchema
});

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 20);

  try {
    const result = await listStoredReviews(Number.isFinite(limit) ? limit : 20);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ storage: "unavailable", reviews: [], error: "review_archive_unavailable" });
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const body = await request.json().catch(() => null);
  const parsed = savedReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid review archive payload",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const review: SavedReview = {
    id: parsed.data.id ?? makeId(),
    input: parsed.data.input,
    result: parsed.data.result
  } as SavedReview;

  try {
    if (dryRun) {
      const state = await listStoredReviews(1);
      return NextResponse.json({ storage: state.storage, review });
    }

    const result = await saveStoredReview(review);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ storage: "unavailable", review: null, error: "review_archive_unavailable" });
  }
}
