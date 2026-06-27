import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  TriangleAlert
} from "lucide-react";
import { AdminRowActionDryRun } from "@/components/admin-row-action-dry-run";
import { getPlatformOpsSnapshot, type PlatformPaymentRow } from "@/lib/platform-ops-store";

type ConsultationStageId = "scope" | "match" | "quote" | "payment" | "chat" | "close";

const statusLabels: Record<string, string> = {
  pending: "결제 대기",
  authorized: "승인됨",
  paid: "결제 완료",
  failed: "실패",
  refunded: "환불",
  cancelled: "취소"
};

const consultationStages: { id: ConsultationStageId; label: string; detail: string }[] = [
  { id: "scope", label: "범위 확인", detail: "상담 요청과 자료 접근" },
  { id: "match", label: "전문가 배정", detail: "매칭 상태 확인" },
  { id: "quote", label: "견적", detail: "범위·금액 확정" },
  { id: "payment", label: "결제", detail: "승인·영수증·에스크로" },
  { id: "chat", label: "상담방", detail: "결제 후 작업공간" },
  { id: "close", label: "완료/환불", detail: "정산·취소 감사" }
];

const fallbackPayments: PlatformPaymentRow[] = [
  {
    id: "PAY-2420",
    company: "Bloom Lab Korea",
    product: "Tinted Sunscreen SPF50",
    expert: "Dr. Mei-Lin Chen",
    amount: "420 USD",
    status: "pending",
    provider: "Stripe quote draft",
    expertMatchState: "matched",
    chatThreadStatus: "payment_required",
    next: "구매자가 상담 범위를 승인하면 결제 링크를 보냅니다."
  },
  {
    id: "PAY-2422",
    company: "Green Spoon Co.",
    product: "Soy Corn Protein Bar",
    expert: "Jason Wu",
    amount: "580 USD",
    status: "paid",
    provider: "Stripe / pi_escrow_ready",
    expertMatchState: "paid",
    chatThreadStatus: "active",
    next: "전문가 작업공간에 식품 표시 증빙 체크리스트를 공개합니다."
  },
  {
    id: "PAY-2426",
    company: "Han River Foods",
    product: "Ginseng Jelly Stick",
    expert: "Jason Wu",
    amount: "310 USD",
    status: "authorized",
    provider: "manual invoice",
    expertMatchState: "in_progress",
    chatThreadStatus: "active",
    next: "milestone 지급 전 번역 원료표 보완 여부를 확인합니다."
  },
  {
    id: "PAY-2407",
    company: "Morning Farm",
    product: "Enzyme Drink",
    expert: "Hana Park",
    amount: "260 USD",
    status: "refunded",
    provider: "Stripe / re_refund_sent",
    expertMatchState: "refunded",
    chatThreadStatus: "archived",
    next: "환불 사유와 상담방 잠금 상태가 audit에 남았는지 확인합니다."
  }
];

function nextPaymentStatus(status: string) {
  if (status === "pending") return "authorized";
  if (status === "authorized") return "paid";
  if (status === "failed") return "cancelled";
  return status === "refunded" ? "refunded" : "paid";
}

function nextChatStatus(status: string) {
  if (status === "payment_required") return "active";
  if (status === "open") return "active";
  if (status === "active") return "closed";
  return status === "archived" ? "archived" : "active";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function paymentTone(status: string) {
  if (status === "paid" || status === "authorized") return "good";
  if (status === "pending") return "warn";
  if (status === "failed" || status === "refunded" || status === "cancelled") return "danger";
  return "info";
}

function paymentConsultationStage(payment: PlatformPaymentRow): ConsultationStageId {
  if (["refunded", "cancelled", "failed"].includes(payment.status) || payment.chatThreadStatus === "archived") return "close";
  if (payment.chatThreadStatus === "active" || ["authorized", "paid"].includes(payment.status)) return "chat";
  if (payment.chatThreadStatus === "payment_required" || payment.status === "pending") return "payment";
  if (payment.expertMatchState === "matched") return "quote";
  return "match";
}

function paymentStageTone(stage: ConsultationStageId, payment: PlatformPaymentRow) {
  if (stage === "close") return payment.status === "refunded" || payment.status === "failed" ? "blocked" : "done";
  if (payment.chatThreadStatus === "payment_required") return "blocked";
  if (stage === "chat") return "active";
  return "waiting";
}

function chatGateLabel(status: string) {
  if (status === "payment_required") return "결제 후 상담방 열림";
  if (status === "active") return "상담 진행";
  if (status === "archived") return "상담방 보관";
  if (status === "closed") return "상담 종료";
  return status;
}

export default async function AdminPaymentsPage() {
  const snapshot = await getPlatformOpsSnapshot();
  const payments = snapshot.payments;
  const sourceLabel = snapshot.storage === "database" ? "Supabase 결제 데이터" : "운영 프리뷰 데이터";
  const pendingCount = payments.filter((payment) => payment.status === "pending").length;
  const paidOrAuthorizedCount = payments.filter((payment) => ["authorized", "paid"].includes(payment.status)).length;
  const blockedChatCount = payments.filter((payment) => payment.chatThreadStatus === "payment_required").length;
  const refundCount = payments.filter((payment) => payment.status === "refunded").length;
  const consultationStageCounts = consultationStages.map((stage) => ({
    ...stage,
    count: payments.filter((payment) => paymentConsultationStage(payment) === stage.id).length
  }));
  const activeChatCount = payments.filter((payment) => payment.chatThreadStatus === "active").length;
  const auditCloseCount = payments.filter((payment) =>
    ["refunded", "cancelled", "failed"].includes(payment.status) || payment.chatThreadStatus === "archived"
  ).length;

  return (
    <>
      <header className="admin-section-hero">
        <div>
          <p>결제·상담 게이트</p>
          <h1>전문가 매칭의 견적, 결제, 상담방 접근, 정산, 환불 증빙을 한 화면에서 관리합니다.</h1>
        </div>
        <Link className="admin-primary-action" href="/admin/experts">
          전문가 매칭 보기
          <ArrowRight size={16} />
        </Link>
      </header>

      <section className="admin-panel admin-panel-wide" aria-label="결제 상담 파이프라인">
        <div className="admin-panel-head">
          <div>
            <span>상담 파이프라인</span>
            <h2>견적과 결제 상태가 상담방 접근을 어떻게 여는지 한 줄로 봅니다</h2>
          </div>
          <Link className="admin-primary-action" href="/admin/experts">
            매칭 단계 보기
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="admin-pipeline-rail">
          {consultationStageCounts.map((stage) => (
            <div
              key={stage.id}
              className={`admin-pipeline-step ${stage.count > 0 ? "active" : ""} ${stage.id === "payment" && blockedChatCount > 0 ? "blocked" : ""}`}
            >
              <span>{stage.label}</span>
              <b>{stage.count}</b>
              <small>{stage.detail}</small>
            </div>
          ))}
        </div>
        <div className="admin-gate-grid">
          <div className={`admin-gate-card ${blockedChatCount > 0 ? "blocked" : "ready"}`}>
            <span>payment_required</span>
            <b>{blockedChatCount}</b>
            <p>결제 전에는 상담방 버튼을 보여도 실제 대화는 잠금 상태로 둡니다.</p>
          </div>
          <div className="admin-gate-card ready">
            <span>chatThreadStatus active</span>
            <b>{activeChatCount}</b>
            <p>결제 승인 뒤 상담방과 전문가 작업공간을 동시에 엽니다.</p>
          </div>
          <div className="admin-gate-card done">
            <span>refund audit</span>
            <b>{auditCloseCount}</b>
            <p>환불·실패·보관된 상담방은 감사 trail로 닫습니다.</p>
          </div>
        </div>
      </section>

      <section className="admin-metrics" aria-label="결제 운영 상태 요약">
        <article className="admin-metric warn">
          <span>견적·결제 대기</span>
          <strong>{pendingCount}</strong>
          <small>구매자 승인이나 결제 링크 발송이 필요한 케이스</small>
        </article>
        <article className="admin-metric good">
          <span>승인·결제 완료</span>
          <strong>{paidOrAuthorizedCount}</strong>
          <small>전문가 상담방을 열 수 있는 상태</small>
        </article>
        <article className="admin-metric info">
          <span>상담방 게이트</span>
          <strong>{blockedChatCount}</strong>
          <small>payment_required 상태로 잠긴 상담방</small>
        </article>
        <article className="admin-metric danger">
          <span>환불·취소 확인</span>
          <strong>{refundCount}</strong>
          <small>정산 취소와 감사 trail을 확인할 항목</small>
        </article>
      </section>

      <section className="admin-grid">
        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>결제 워크벤치</span>
              <h2>매칭별 결제와 상담 접근</h2>
            </div>
            <CreditCard size={18} />
          </div>
          <div className="admin-table admin-table-payments">
            <div className="admin-table-head">
              <span>케이스</span>
              <span>결제</span>
              <span>상담방</span>
              <span>운영 작업</span>
            </div>
            {payments.map((payment) => {
              const paymentId = isUuid(payment.id) ? payment.id : undefined;
              const chatThreadId = payment.chatThreadId && isUuid(payment.chatThreadId) ? payment.chatThreadId : undefined;

              return (
                <div key={payment.id} className="admin-table-row">
                  <span>
                    <b>{payment.company}</b>
                    <small>{payment.displayId ?? payment.id} / {payment.product}</small>
                    <small>{payment.expert}</small>
                  </span>
                  <span>
                    <b>{statusLabels[payment.status] ?? payment.status}</b>
                    <small>{payment.amount}</small>
                    <small>{payment.provider}</small>
                  </span>
                  <span>
                    <b>{chatGateLabel(payment.chatThreadStatus)}</b>
                    <span className={`admin-stage-chip ${paymentStageTone(paymentConsultationStage(payment), payment)}`}>
                      {consultationStages.find((stage) => stage.id === paymentConsultationStage(payment))?.label}
                    </span>
                    <small>매칭 {payment.expertMatchState}</small>
                  </span>
                  <span>
                    {payment.next}
                    <details className="admin-ops-disclosure">
                      <summary>운영 작업</summary>
                      <AdminRowActionDryRun
                        action="payment_status"
                        id={paymentId}
                        status={nextPaymentStatus(payment.status)}
                        requestId={`payment-${payment.id}`}
                        note={`${payment.product} payment ${payment.status} to ${nextPaymentStatus(payment.status)}`}
                        fallbackUuid="00000000-0000-4000-8000-000000000201"
                      />
                      <AdminRowActionDryRun
                        action="chat_thread_status"
                        id={chatThreadId}
                        status={nextChatStatus(payment.chatThreadStatus)}
                        requestId={`chat-${payment.id}`}
                        note={`${payment.product} chat ${payment.chatThreadStatus} to ${nextChatStatus(payment.chatThreadStatus)}`}
                        label="상담방 dry-run"
                        fallbackUuid="00000000-0000-4000-8000-000000000202"
                      />
                    </details>
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>상태 분포</span>
              <h2>결제 상태</h2>
            </div>
            <BadgeDollarSign size={18} />
          </div>
          <div className="admin-chip-list">
            {["pending", "authorized", "paid", "failed", "refunded", "cancelled"].map((status) => (
              <span key={status} className={`admin-status-chip ${paymentTone(status)}`}>
                {statusLabels[status]}
                <b>{payments.filter((payment) => payment.status === status).length}</b>
              </span>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>상담 접근</span>
              <h2>결제 후 열리는 작업공간</h2>
            </div>
            <MessageCircle size={18} />
          </div>
          <div className="admin-queue-list">
            {payments
              .filter((payment) => payment.chatThreadStatus !== "active")
              .map((payment) => (
                <div key={`${payment.id}-gate`} className={`admin-queue-item ${payment.status === "refunded" ? "blocked" : "waiting"}`}>
                  <span>{chatGateLabel(payment.chatThreadStatus)}</span>
                  <b>{payment.product}</b>
                  <p>{payment.next}</p>
                  <small>{payment.amount} / {payment.provider}</small>
                </div>
              ))}
          </div>
          <p className="admin-note">
            현재 표시 소스: {sourceLabel}. {snapshot.warnings[0] ?? "DB preview를 켜면 payments, expert_matches, chat_threads 기준으로 갱신됩니다."}
          </p>
        </article>

        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>운영 체크리스트</span>
              <h2>결제 전후 확인 항목</h2>
            </div>
            <ShieldCheck size={18} />
          </div>
          <div className="admin-flow">
            <span><ReceiptText size={16} /> 견적 승인</span>
            <span><CreditCard size={16} /> 결제 확인</span>
            <span><MessageCircle size={16} /> 상담방 오픈</span>
            <span><CheckCircle2 size={16} /> milestone 정산</span>
            <span><RotateCcw size={16} /> 환불 감사</span>
            <span><TriangleAlert size={16} /> 실패 재시도</span>
          </div>
        </article>
      </section>
    </>
  );
}
