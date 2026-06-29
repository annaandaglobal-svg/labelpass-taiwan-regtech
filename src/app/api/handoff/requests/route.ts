import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adminOpsAuthReadiness,
  checkAdminRateLimit,
  hasValidAdminOpsToken,
  readLimitedJsonBody
} from "@/lib/admin-api-security";
import { applyHandoffRequest, handoffRequestReadiness } from "@/lib/handoff-requests";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 45_000;
const MAX_RATE_WINDOW_MS = 60_000;
const MAX_WRITES_PER_WINDOW = 20;
const MAX_DRY_RUNS_PER_WINDOW = 60;

const writeBuckets = new Map<string, { count: number; resetAt: number }>();
const dryRunBuckets = new Map<string, { count: number; resetAt: number }>();
const writeRateLimit = { maxRequests: MAX_WRITES_PER_WINDOW, windowMs: MAX_RATE_WINDOW_MS };
const dryRunRateLimit = { maxRequests: MAX_DRY_RUNS_PER_WINDOW, windowMs: MAX_RATE_WINDOW_MS };

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

export async function GET() {
  return NextResponse.json({
    ...handoffRequestReadiness(),
    auth: adminOpsAuthReadiness({ maxBodyBytes: MAX_BODY_BYTES, writeRateLimit, dryRunRateLimit })
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const rateLimitOk = checkAdminRateLimit(request, dryRun ? dryRunBuckets : writeBuckets, dryRun ? dryRunRateLimit : writeRateLimit);
  if (!rateLimitOk) {
    return NextResponse.json({ error: dryRun ? "handoff_request_dry_run_rate_limited" : "handoff_request_rate_limited" }, { status: 429 });
  }

  if (!dryRun && !hasValidAdminOpsToken(request)) {
    return NextResponse.json({ error: "admin_ops_token_required" }, { status: 401 });
  }

  const bodyResult = await readLimitedJsonBody(request, MAX_BODY_BYTES);
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
