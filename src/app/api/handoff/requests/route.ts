import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { applyHandoffRequest, handoffRequestReadiness } from "@/lib/handoff-requests";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 45_000;
const MAX_RATE_WINDOW_MS = 60_000;
const MAX_WRITES_PER_WINDOW = 20;

const adminOpsToken = process.env.LABELPASS_ADMIN_OPS_TOKEN;
const writeBuckets = new Map<string, { count: number; resetAt: number }>();

const uuidSchema = z.string().uuid();
const reviewStatusSchema = z.enum(["pass", "warn", "fail", "needs_info"]);
const prioritySchema = z.enum(["blocked", "collect_documents", "revise_label", "ready_to_file"]);

const handoffDraftSchema = z.object({
  id: z.string().min(1).max(120),
  createdAt: z.string().datetime({ offset: true }),
  productName: z.string().min(1).max(240),
  productType: z.string().min(1).max(240),
  routeId: z.string().min(1).max(120),
  routeLabel: z.string().min(1).max(180),
  status: reviewStatusSchema,
  score: z.number().min(0).max(100),
  priority: prioritySchema,
  nextAction: z.string().min(1).max(1_200),
  expertScope: z.array(z.string().min(1).max(500)).max(12),
  paymentGate: z.object({
    label: z.string().min(1).max(160),
    detail: z.string().min(1).max(600)
  }),
  logistics: z.object({
    trigger: z.string().min(1).max(600),
    documents: z.array(z.string().min(1).max(220)).max(12)
  }),
  evidenceCount: z.number().int().min(0).max(10_000),
  neededDocuments: z.number().int().min(0).max(100)
});

const requestSchema = z.object({
  draft: handoffDraftSchema,
  organizationId: uuidSchema.nullish(),
  requestedBy: uuidSchema.nullish(),
  actorProfileId: uuidSchema.nullish(),
  contactEmail: z.string().email().max(254).nullish(),
  note: z.string().max(1_000).nullish(),
  requestId: z.string().max(180).nullish(),
  metadata: z.record(z.unknown()).optional()
});

function requestToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return request.headers.get("x-labelpass-admin-ops-token")?.trim() ?? "";
}

function safeTokenEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function hasValidAdminOpsToken(request: Request) {
  if (!adminOpsToken) return false;
  const token = requestToken(request);
  return Boolean(token) && safeTokenEquals(token, adminOpsToken);
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

export async function GET() {
  return NextResponse.json({
    ...handoffRequestReadiness(),
    auth: {
      tokenRequiredForWrites: true,
      acceptedHeaders: ["Authorization: Bearer <token>", "x-labelpass-admin-ops-token"]
    }
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  if (!dryRun && !hasValidAdminOpsToken(request)) {
    return NextResponse.json({ error: "admin_ops_token_required" }, { status: 401 });
  }

  if (!dryRun && !checkWriteRateLimit(request)) {
    return NextResponse.json({ error: "handoff_request_rate_limited" }, { status: 429 });
  }

  const bodyResult = await readJsonBody(request);
  if (bodyResult.error === "payload_too_large") {
    return NextResponse.json({ error: "Handoff request payload is too large" }, { status: 413 });
  }
  if (bodyResult.error === "invalid_json") {
    return NextResponse.json({ error: "Invalid handoff request JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid handoff request payload",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const result = await applyHandoffRequest(parsed.data, { dryRun });
  if (result.ok) return NextResponse.json(result);
  if (result.error === "database_error") return NextResponse.json(result, { status: 503 });
  return NextResponse.json(result, { status: dryRun ? 200 : 409 });
}
