import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adminOpsAuthReadiness,
  checkAdminRateLimit,
  hasValidAdminOpsToken,
  readLimitedJsonBody
} from "@/lib/admin-api-security";
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
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 40_000;
const MAX_RATE_WINDOW_MS = 60_000;
const MAX_WRITES_PER_WINDOW = 30;
const MAX_DRY_RUNS_PER_WINDOW = 90;

const writeBuckets = new Map<string, { count: number; resetAt: number }>();
const dryRunBuckets = new Map<string, { count: number; resetAt: number }>();
const writeRateLimit = { maxRequests: MAX_WRITES_PER_WINDOW, windowMs: MAX_RATE_WINDOW_MS };
const dryRunRateLimit = { maxRequests: MAX_DRY_RUNS_PER_WINDOW, windowMs: MAX_RATE_WINDOW_MS };

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

export async function GET() {
  return NextResponse.json({
    ...platformOpsActionReadiness(),
    auth: adminOpsAuthReadiness({ maxBodyBytes: MAX_BODY_BYTES, writeRateLimit, dryRunRateLimit })
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const rateLimitOk = checkAdminRateLimit(request, dryRun ? dryRunBuckets : writeBuckets, dryRun ? dryRunRateLimit : writeRateLimit);
  if (!rateLimitOk) {
    return NextResponse.json({ error: dryRun ? "admin_ops_dry_run_rate_limited" : "admin_ops_rate_limited" }, { status: 429 });
  }

  if (!dryRun && !hasValidAdminOpsToken(request)) {
    return NextResponse.json({ error: "admin_ops_token_required" }, { status: 401 });
  }

  const bodyResult = await readLimitedJsonBody(request, MAX_BODY_BYTES);
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
