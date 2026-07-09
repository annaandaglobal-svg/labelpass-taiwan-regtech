import { NextResponse } from "next/server";
import { consultChatReadiness, researchTopic } from "@/lib/consult-chat";
import { requestResearch } from "@/lib/learning-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// User-triggered "정밀 조사 의뢰": records the request to the learning queue (so it's prioritised for a
// verified ingestion pass) and returns an immediate AI first-pass research draft (clearly unverified).
export async function POST(request: Request) {
  let body: { topic?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 200) : "";
  if (topic.length < 2) return NextResponse.json({ error: "topic_required" }, { status: 400 });

  const nowIso = new Date().toISOString();
  await requestResearch(topic, nowIso); // best-effort queue (no-op on read-only prod fs)
  console.log("[consult-research-request]", topic);

  if (!consultChatReadiness().ready) {
    return NextResponse.json({
      queued: true,
      source: "queued-only",
      result:
        "조사 요청이 접수되었습니다. 현재 AI 조사가 비활성화되어 있어, 검증 담당이 확인 후 지식베이스에 반영합니다. 급하면 전문가 상담을 이용하세요."
    });
  }

  const result = await researchTopic(topic);
  if (!result) {
    return NextResponse.json({
      queued: true,
      source: "queued-only",
      result:
        "조사 요청이 접수되었습니다. AI 1차 조사를 생성하지 못했으니, 검증 담당 확인 후 반영합니다. 정확한 성분명(영문/CAS)·품목 범주를 알려주시면 더 정확합니다."
    });
  }
  return NextResponse.json({ queued: true, source: "ai-researched", result });
}
