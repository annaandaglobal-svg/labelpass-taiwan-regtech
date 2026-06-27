import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyPlatformOpsAction,
  chatThreadStatuses,
  expertMatchStatuses,
  logisticsMatchStatuses,
  paymentStatuses,
  platformOpsActionReadiness,
  shipmentEventTypes,
  shipmentRequestStatuses,
  shipmentStatuses
} from "@/lib/platform-ops-actions";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 40_000;
const MAX_RATE_WINDOW_MS = 60_000;
const MAX_WRITES_PER_WINDOW = 30;

const adminOpsToken = process.env.LABELPASS_ADMIN_OPS_TOKEN;
const writeBuckets = new Map<string, { count: number; resetAt: number }>();

const uuidSchema = z.string().uuid();
const metadataSchema = z.record(z.unknown()).optional();
const baseActionSchema = {
  actorProfileId: uuidSchema.nullish(),
  requestId: z.string().max(180).optional(),
  note: z.string().max(1_000).optional(),
  metadata: metadataSchema
};

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    ...baseActionSchema,
    action: z.literal("expert_match_status"),
    id: uuidSchema,
    status: z.enum(expertMatchStatuses)
  }),
  z.object({
    ...baseActionSchema,
    action: z.literal("payment_status"),
    id: uuidSchema,
    status: z.enum(paymentStatuses)
  }),
  z.object({
    ...baseActionSchema,
    action: z.literal("chat_thread_status"),
    id: uuidSchema,
    status: z.enum(chatThreadStatuses)
  }),
  z.object({
    ...baseActionSchema,
    action: z.literal("logistics_match_status"),
    id: uuidSchema,
    status: z.enum(logisticsMatchStatuses)
  }),
  z.object({
    ...baseActionSchema,
    action: z.literal("shipment_request_status"),
    id: uuidSchema,
    status: z.enum(shipmentRequestStatuses)
  }),
  z.object({
    ...baseActionSchema,
    action: z.literal("shipment_status"),
    id: uuidSchema,
    status: z.enum(shipmentStatuses)
  }),
  z.object({
    ...baseActionSchema,
    action: z.literal("shipment_event"),
    shipmentId: uuidSchema,
    eventType: z.enum(shipmentEventTypes),
    status: z.enum(shipmentStatuses).optional(),
    message: z.string().min(1).max(2_000),
    occurredAt: z.string().datetime({ offset: true }).optional()
  })
]);

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
    ...platformOpsActionReadiness(),
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
    return NextResponse.json({ error: "admin_ops_rate_limited" }, { status: 429 });
  }

  const bodyResult = await readJsonBody(request);
  if (bodyResult.error === "payload_too_large") {
    return NextResponse.json({ error: "Admin operation payload is too large" }, { status: 413 });
  }
  if (bodyResult.error === "invalid_json") {
    return NextResponse.json({ error: "Invalid admin operation JSON" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid admin operation payload",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const result = await applyPlatformOpsAction(parsed.data, { dryRun });
  if (result.ok) return NextResponse.json(result);
  if (result.error === "not_found") return NextResponse.json(result, { status: 404 });
  if (result.error === "database_error") return NextResponse.json(result, { status: 503 });
  return NextResponse.json(result, { status: dryRun ? 200 : 409 });
}
