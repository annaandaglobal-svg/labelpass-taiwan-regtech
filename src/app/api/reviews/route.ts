import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isReviewArchiveDatabaseConfigured, listStoredReviews, saveStoredReview } from "@/lib/review-store";
import type { SavedReview } from "@/lib/review-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 200_000;
const MAX_REVIEW_TEXT_CHARS = 50_000;
const MAX_SHORT_TEXT_CHARS = 500;
const MAX_FINDINGS = 80;
const MAX_FIX_ITEMS = 6;
const MAX_RATE_WINDOW_MS = 60_000;
const MAX_WRITES_PER_WINDOW = 20;

const publicReadEnabled = process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_READ === "1";
const publicWriteEnabled = process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_WRITE === "1";
const archiveToken = process.env.LABELPASS_REVIEW_ARCHIVE_TOKEN;
const writeBuckets = new Map<string, { count: number; resetAt: number }>();

const reviewInputSchema = z.object({
  productName: z.string().max(MAX_SHORT_TEXT_CHARS).default(""),
  productType: z.string().max(MAX_SHORT_TEXT_CHARS).default(""),
  ingredientsText: z.string().max(MAX_REVIEW_TEXT_CHARS).default(""),
  labelText: z.string().max(MAX_REVIEW_TEXT_CHARS).default(""),
  origin: z.string().max(MAX_SHORT_TEXT_CHARS).default(""),
  manufacturer: z.string().max(MAX_SHORT_TEXT_CHARS).default(""),
  hsCode: z.string().max(120).optional(),
  incoterms: z.string().max(120).optional(),
  shipmentPurpose: z.string().max(MAX_SHORT_TEXT_CHARS).optional(),
  invoiceValue: z.string().max(120).optional()
});

const findingSchema = z.object({
  id: z.string().max(160),
  status: z.enum(["pass", "warn", "fail", "needs_info"]),
  area: z.string().max(120),
  title: z.string().max(500),
  severity: z.union([z.string().max(80), z.number()]).transform(String),
  why: z.string().max(3_000),
  fix: z.array(z.string().max(1_000)).max(MAX_FIX_ITEMS),
  source: z.string().max(800),
  sourceUrl: z.string().url().max(2_048),
  evidence: z.string().max(2_000).optional()
});

const reviewResultSchema = z.object({
  status: z.enum(["pass", "warn", "fail", "needs_info"]),
  score: z.number().min(0).max(100),
  generatedAt: z.string().datetime({ offset: true }),
  ruleVersion: z.string().max(160),
  parsedIngredients: z.array(z.unknown()).max(120).default([]),
  findings: z.array(findingSchema).max(MAX_FINDINGS),
  actionPlan: z.unknown(),
  summary: z.object({
    fail: z.number().int().min(0).max(1_000),
    warn: z.number().int().min(0).max(1_000),
    pass: z.number().int().min(0).max(1_000),
    needsInfo: z.number().int().min(0).max(1_000)
  })
});

const savedReviewSchema = z.object({
  id: z.string().min(1).max(160).optional(),
  input: reviewInputSchema,
  result: reviewResultSchema
});

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function requestedLimit(request: Request) {
  const url = new URL(request.url);
  const parsed = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(parsed, 1), 50);
}

function requestToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return request.headers.get("x-labelpass-archive-token")?.trim() ?? "";
}

function safeTokenEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function hasValidArchiveToken(request: Request) {
  if (!archiveToken) return false;
  const token = requestToken(request);
  return Boolean(token) && safeTokenEquals(token, archiveToken);
}

function archiveAccess(request: Request, operation: "read" | "write") {
  if (!isReviewArchiveDatabaseConfigured()) return { allowed: true, restricted: false };
  if (hasValidArchiveToken(request)) return { allowed: true, restricted: false };
  const publicOperationEnabled = operation === "read" ? publicReadEnabled : publicWriteEnabled;
  return { allowed: publicOperationEnabled, restricted: !publicOperationEnabled };
}

function rateLimitKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.slice(0, 80) ?? "unknown-agent";
  return `${forwarded || realIp || "unknown-ip"}:${userAgent}`;
}

function checkWriteRateLimit(request: Request) {
  const now = Date.now();
  const key = rateLimitKey(request);
  const current = writeBuckets.get(key);
  if (!current || current.resetAt <= now) {
    writeBuckets.set(key, { count: 1, resetAt: now + MAX_RATE_WINDOW_MS });
    return true;
  }

  if (current.count >= MAX_WRITES_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

async function readJsonBody(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { error: "payload_too_large" as const };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return { error: "payload_too_large" as const };
  }

  try {
    return { body: JSON.parse(text) };
  } catch {
    return { error: "invalid_json" as const };
  }
}

function disabledArchiveResponse(operation: "read" | "write", restricted = false) {
  return NextResponse.json({
    storage: "disabled",
    ...(operation === "read" ? { reviews: [] } : { review: null }),
    ...(restricted ? { access: "restricted" } : {})
  });
}

export async function GET(request: Request) {
  const access = archiveAccess(request, "read");
  if (!access.allowed) return disabledArchiveResponse("read", access.restricted);

  try {
    const result = await listStoredReviews(requestedLimit(request));
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ storage: "unavailable", reviews: [], error: "review_archive_unavailable" });
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const access = archiveAccess(request, "write");
  if (!access.allowed) return disabledArchiveResponse("write", access.restricted);

  if (!dryRun && !checkWriteRateLimit(request)) {
    return NextResponse.json({ error: "review_archive_rate_limited" }, { status: 429 });
  }

  const bodyResult = await readJsonBody(request);
  if (bodyResult.error === "payload_too_large") {
    return NextResponse.json({ error: "Review archive payload is too large" }, { status: 413 });
  }
  if (bodyResult.error === "invalid_json") {
    return NextResponse.json({ error: "Invalid review archive JSON" }, { status: 400 });
  }

  const parsed = savedReviewSchema.safeParse(bodyResult.body);

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
      return NextResponse.json({ storage: state.storage, reviewId: review.id, dryRun: true });
    }

    const result = await saveStoredReview(review);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ storage: "unavailable", review: null, error: "review_archive_unavailable" });
  }
}
