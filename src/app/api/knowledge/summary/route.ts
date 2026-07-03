import { NextResponse } from "next/server";
import { searchKnowledge } from "@/lib/knowledge-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the same bundled knowledge totals the /knowledge page renders, so the
// review home stat grid stays in sync with unified search instead of drifting
// from a hardcoded snapshot.
export function GET() {
  const { totals } = searchKnowledge("");
  return NextResponse.json({ totals });
}
