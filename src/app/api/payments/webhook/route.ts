import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PortOne 웹훅 수신 자리.
// PORTONE_WEBHOOK_SECRET이 설정되면 서명 검증(@portone/server-sdk의
// Webhook.verify)을 붙이는 것을 전제로 한 구조만 잡아둡니다.
// 비밀값과 요청 본문은 로그로 남기지 않습니다.

export async function POST(request: Request) {
  const secretConfigured = Boolean(process.env.PORTONE_WEBHOOK_SECRET);

  if (!secretConfigured) {
    return NextResponse.json(
      { ok: false, error: "webhook_not_configured", message: "PORTONE_WEBHOOK_SECRET 설정 전이라 웹훅을 처리하지 않습니다." },
      { status: 503 }
    );
  }

  const signature = request.headers.get("webhook-signature") ?? request.headers.get("x-portone-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 401 });
  }

  // TODO(portone): @portone/server-sdk 연결 후 서명 검증과 결제 상태 반영을 여기서 수행.
  // 검증 전까지는 어떤 상태도 바꾸지 않고 수신만 확인합니다.
  return NextResponse.json({ ok: true, accepted: true, applied: false }, { status: 202 });
}
