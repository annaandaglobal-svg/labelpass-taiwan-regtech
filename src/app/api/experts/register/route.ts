import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adminOpsAuthReadiness,
  checkAdminRateLimit,
  hasValidAdminOpsToken,
  readLimitedJsonBody
} from "@/lib/admin-api-security";
import { expertRegistrationReadiness, submitExpertRegistration } from "@/lib/expert-registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 40_000;
const MAX_RATE_WINDOW_MS = 60_000;
const MAX_WRITES_PER_WINDOW = 12;
const MAX_DRY_RUNS_PER_WINDOW = 60;

const writeBuckets = new Map<string, { count: number; resetAt: number }>();
const dryRunBuckets = new Map<string, { count: number; resetAt: number }>();
const writeRateLimit = { maxRequests: MAX_WRITES_PER_WINDOW, windowMs: MAX_RATE_WINDOW_MS };
const dryRunRateLimit = { maxRequests: MAX_DRY_RUNS_PER_WINDOW, windowMs: MAX_RATE_WINDOW_MS };

const registrationSchema = z.object({
  id: z.string().min(1).max(120),
  createdAt: z.string().datetime({ offset: true }),
  displayName: z.string().min(1).max(120),
  companyName: z.string().max(200),
  role: z.string().max(200),
  yearsExperience: z.number().int().min(0).max(80).nullable(),
  categories: z.array(z.string().min(1).max(60)).min(1).max(12),
  languages: z.array(z.string().min(1).max(20)).max(8),
  hourlyRate: z.number().min(0).max(100_000_000).nullable(),
  currency: z.string().min(1).max(8),
  credential: z.string().max(600),
  contactEmail: z.union([z.string().email().max(254), z.literal("")]),
  bio: z.string().max(2_000)
});

const requestSchema = z.object({
  registration: registrationSchema,
  requestId: z.string().max(180).nullish()
});

export async function GET() {
  return NextResponse.json({
    ...expertRegistrationReadiness(),
    auth: adminOpsAuthReadiness({ maxBodyBytes: MAX_BODY_BYTES, writeRateLimit, dryRunRateLimit })
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const rateLimitOk = checkAdminRateLimit(request, dryRun ? dryRunBuckets : writeBuckets, dryRun ? dryRunRateLimit : writeRateLimit);
  if (!rateLimitOk) {
    return NextResponse.json({ error: dryRun ? "expert_registration_dry_run_rate_limited" : "expert_registration_rate_limited" }, { status: 429 });
  }

  if (!dryRun && !hasValidAdminOpsToken(request)) {
    return NextResponse.json({ error: "admin_ops_token_required" }, { status: 401 });
  }

  const bodyResult = await readLimitedJsonBody(request, MAX_BODY_BYTES);
  if (bodyResult.error === "payload_too_large") {
    return NextResponse.json({ error: "Expert registration payload is too large" }, { status: 413 });
  }
  if (bodyResult.error === "invalid_json") {
    return NextResponse.json({ error: "Invalid expert registration JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid expert registration payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await submitExpertRegistration(parsed.data, { dryRun });
  if (result.ok) return NextResponse.json(result);
  if (result.error === "database_error") return NextResponse.json(result, { status: 503 });
  return NextResponse.json(result, { status: dryRun ? 200 : 409 });
}
