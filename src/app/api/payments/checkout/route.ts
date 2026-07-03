import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAdminRateLimit, readLimitedJsonBody } from "@/lib/admin-api-security";
import { createCheckoutSession, portoneReadiness } from "@/lib/portone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const rateLimit = { maxRequests: 30, windowMs: 60_000 };

const checkoutSchema = z.object({
  caseId: z.string().min(1).max(120),
  title: z.string().min(1).max(240),
  amountUsd: z.number().min(0).max(100_000)
});

export async function GET() {
  return NextResponse.json(portoneReadiness());
}

export async function POST(request: Request) {
  if (!checkAdminRateLimit(request, rateBuckets, rateLimit)) {
    return NextResponse.json({ error: "checkout_rate_limited" }, { status: 429 });
  }

  const bodyResult = await readLimitedJsonBody(request, MAX_BODY_BYTES);
  if (bodyResult.error === "payload_too_large") {
    return NextResponse.json({ error: "Checkout payload is too large" }, { status: 413 });
  }
  if (bodyResult.error === "invalid_json") {
    return NextResponse.json({ error: "Invalid checkout JSON" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const session = createCheckoutSession(parsed.data);
  return NextResponse.json({ ...session, readiness: portoneReadiness() });
}
