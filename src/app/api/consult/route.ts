import { NextResponse } from "next/server";
import { answerConsult, consultChatReadiness } from "@/lib/consult-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const r = consultChatReadiness();
  // Never leak the key itself — only whether it's present.
  return NextResponse.json({ ready: r.ready, enabled: r.enabled, apiKeyPresent: r.apiKeyPresent, model: r.model });
}

export async function POST(request: Request) {
  let body: { question?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (question.length < 2) {
    return NextResponse.json({ error: "question_required" }, { status: 400 });
  }
  const history = Array.isArray(body.history)
    ? body.history
        .filter((m): m is { role: "user" | "assistant"; text: string } =>
          Boolean(m) && typeof m === "object" && (m as { role?: unknown }).role !== undefined && typeof (m as { text?: unknown }).text === "string"
        )
        .map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), text: String(m.text).slice(0, 2000) }))
        .slice(-8)
    : [];

  try {
    const result = await answerConsult(question.slice(0, 2000), history);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "consult_failed" }, { status: 500 });
  }
}
