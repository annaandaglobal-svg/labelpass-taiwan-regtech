import { timingSafeEqual } from "node:crypto";

export const adminOpsAcceptedHeaders = ["Authorization: Bearer <token>", "x-labelpass-admin-ops-token"] as const;

export type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
};

export type JsonBodyResult =
  | { body: unknown; error?: undefined }
  | { body?: undefined; error: "payload_too_large" | "invalid_json" };

export function requestAdminOpsToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return request.headers.get("x-labelpass-admin-ops-token")?.trim() ?? "";
}

export function safeTokenEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function hasValidAdminOpsToken(request: Request, token = process.env.LABELPASS_ADMIN_OPS_TOKEN) {
  if (!token) return false;
  const requestToken = requestAdminOpsToken(request);
  return Boolean(requestToken) && safeTokenEquals(requestToken, token);
}

export function adminRateLimitKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.slice(0, 80) ?? "unknown-agent";
  return `${forwarded || realIp || "unknown-ip"}:${userAgent}`;
}

export function checkAdminRateLimit(request: Request, buckets: Map<string, RateLimitBucket>, options: RateLimitOptions) {
  const now = Date.now();
  const key = adminRateLimitKey(request);
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return true;
  }

  if (current.count >= options.maxRequests) return false;
  current.count += 1;
  return true;
}

export async function readLimitedJsonBody(request: Request, maxBodyBytes: number): Promise<JsonBodyResult> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    return { error: "payload_too_large" };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBodyBytes) {
    return { error: "payload_too_large" };
  }

  try {
    return { body: JSON.parse(text) };
  } catch {
    return { error: "invalid_json" };
  }
}

export function adminOpsAuthReadiness({
  maxBodyBytes,
  writeRateLimit,
  dryRunRateLimit
}: {
  maxBodyBytes: number;
  writeRateLimit: RateLimitOptions;
  dryRunRateLimit: RateLimitOptions;
}) {
  return {
    tokenRequiredForWrites: true,
    tokenConfigured: Boolean(process.env.LABELPASS_ADMIN_OPS_TOKEN),
    acceptedHeaders: adminOpsAcceptedHeaders,
    maxBodyBytes,
    writeRateLimit,
    dryRunRateLimited: true,
    dryRunRateLimit
  };
}
