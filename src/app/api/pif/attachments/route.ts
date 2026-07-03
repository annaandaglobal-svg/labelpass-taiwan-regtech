import { NextResponse } from "next/server";
import { checkAdminRateLimit } from "@/lib/admin-api-security";
import { pifStorageReadiness, uploadPifAttachment } from "@/lib/pif-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RATE_WINDOW_MS = 60_000;
const MAX_UPLOADS_PER_WINDOW = 24;
const uploadBuckets = new Map<string, { count: number; resetAt: number }>();
const uploadRateLimit = { maxRequests: MAX_UPLOADS_PER_WINDOW, windowMs: MAX_RATE_WINDOW_MS };

function firstFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  return NextResponse.json({
    ...pifStorageReadiness(),
    rateLimit: uploadRateLimit
  });
}

export async function POST(request: Request) {
  const rateLimitOk = checkAdminRateLimit(request, uploadBuckets, uploadRateLimit);
  if (!rateLimitOk) {
    return NextResponse.json({ error: "pif_attachment_upload_rate_limited" }, { status: 429 });
  }

  const readiness = pifStorageReadiness();
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > readiness.maxFileBytes + 8_000) {
    return NextResponse.json(
      {
        ok: false,
        storage: readiness.storage,
        error: "file_too_large",
        maxFileBytes: readiness.maxFileBytes,
        warnings: readiness.warnings
      },
      { status: 413 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_multipart" }, { status: 400 });
  }

  const applicationId = firstFormValue(formData, "applicationId");
  const requirementId = firstFormValue(formData, "requirementId");
  const file = formData.get("file");

  if (!applicationId || applicationId.length > 120 || !requirementId || requirementId.length > 80 || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "invalid_pif_attachment_payload" }, { status: 400 });
  }

  const result = await uploadPifAttachment({ applicationId, requirementId, file });
  if (result.ok) return NextResponse.json(result);

  const status = result.error === "not_configured" ? 503 : result.error === "file_too_large" ? 413 : 400;
  return NextResponse.json(result, { status });
}
