import { NextResponse } from "next/server";
import { buildKnowledgeEvidenceBundle } from "@/lib/knowledge-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? 12);
  const productFamily = url.searchParams.get("product_family")?.trim() || undefined;
  const routeId = url.searchParams.get("route_id")?.trim() || undefined;
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 4), 24) : 12;

  return NextResponse.json(await buildKnowledgeEvidenceBundle(query, safeLimit, { productFamily, routeId }));
}
