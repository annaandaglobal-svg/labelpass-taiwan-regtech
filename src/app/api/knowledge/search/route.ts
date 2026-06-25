import { NextResponse } from "next/server";
import { searchKnowledgeRuntime } from "@/lib/knowledge-runtime";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? 10);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 24) : 10;

  return NextResponse.json(await searchKnowledgeRuntime(query, safeLimit));
}
