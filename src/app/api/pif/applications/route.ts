import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adminOpsAuthReadiness,
  checkAdminRateLimit,
  hasValidAdminOpsToken,
  readLimitedJsonBody
} from "@/lib/admin-api-security";
import { applyPifRequest, pifRequestReadiness } from "@/lib/pif-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 60_000;
const MAX_RATE_WINDOW_MS = 60_000;
const MAX_WRITES_PER_WINDOW = 20;
const MAX_DRY_RUNS_PER_WINDOW = 60;

const writeBuckets = new Map<string, { count: number; resetAt: number }>();
const dryRunBuckets = new Map<string, { count: number; resetAt: number }>();
const writeRateLimit = { maxRequests: MAX_WRITES_PER_WINDOW, windowMs: MAX_RATE_WINDOW_MS };
const dryRunRateLimit = { maxRequests: MAX_DRY_RUNS_PER_WINDOW, windowMs: MAX_RATE_WINDOW_MS };

const uuidSchema = z.string().uuid();

const attachmentSchema = z.object({
  requirementId: z.string().min(1).max(80),
  fileName: z.string().min(1).max(260),
  fileSize: z.number().int().min(0).max(200_000_000),
  mimeType: z.string().max(160),
  attachedAt: z.string().datetime({ offset: true })
});

const applicationSchema = z.object({
  id: z.string().min(1).max(120),
  createdAt: z.string().datetime({ offset: true }),
  productName: z.string().min(1).max(240),
  brandName: z.string().max(240),
  productCategory: z.string().min(1).max(240),
  taiwanImporter: z.string().max(300),
  contactEmail: z.union([z.string().email().max(254), z.literal("")]),
  note: z.string().max(2_000),
  status: z.enum(["draft", "submitted", "in_review", "needs_revision", "accepted"]),
  checkedRequirements: z.array(z.string().min(1).max(80)).max(40),
  attachments: z.array(attachmentSchema).max(30),
  serverQueueState: z.enum(["queued", "preview_only", "local_only"])
});

const requestSchema = z.object({
  application: applicationSchema,
  organizationId: uuidSchema.nullish(),
  requestedBy: uuidSchema.nullish(),
  requestId: z.string().max(180).nullish()
});

export async function GET() {
  return NextResponse.json({
    ...pifRequestReadiness(),
    auth: adminOpsAuthReadiness({ maxBodyBytes: MAX_BODY_BYTES, writeRateLimit, dryRunRateLimit })
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const rateLimitOk = checkAdminRateLimit(request, dryRun ? dryRunBuckets : writeBuckets, dryRun ? dryRunRateLimit : writeRateLimit);
  if (!rateLimitOk) {
    return NextResponse.json({ error: dryRun ? "pif_request_dry_run_rate_limited" : "pif_request_rate_limited" }, { status: 429 });
  }

  if (!dryRun && !hasValidAdminOpsToken(request)) {
    return NextResponse.json({ error: "admin_ops_token_required" }, { status: 401 });
  }

  const bodyResult = await readLimitedJsonBody(request, MAX_BODY_BYTES);
  if (bodyResult.error === "payload_too_large") {
    return NextResponse.json({ error: "PIF application payload is too large" }, { status: 413 });
  }
  if (bodyResult.error === "invalid_json") {
    return NextResponse.json({ error: "Invalid PIF application JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid PIF application payload",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const result = await applyPifRequest(parsed.data, { dryRun });
  if (result.ok) return NextResponse.json(result);
  if (result.error === "database_error") return NextResponse.json(result, { status: 503 });
  return NextResponse.json(result, { status: dryRun ? 200 : 409 });
}
