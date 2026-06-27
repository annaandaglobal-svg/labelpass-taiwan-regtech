import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BadgeDollarSign,
  ClipboardCheck,
  FlaskConical,
  HandCoins,
  Handshake,
  MessageCircle,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  Wheat
} from "lucide-react";
import { AdminRowActionDryRun } from "@/components/admin-row-action-dry-run";
import { getPlatformOpsSnapshot } from "@/lib/platform-ops-store";

type MatchState = "requested" | "matched" | "paid" | "in_progress" | "completed" | "cancelled" | "refunded";
type ExpertDiscipline = "cosmetics" | "food" | "dual";
type QueueTone = "ready" | "blocked" | "default";
type ConsultationStageId = "scope" | "match" | "quote" | "payment" | "chat" | "close";

type ExpertProfile = {
  name: string;
  firm: string;
  base: string;
  discipline: ExpertDiscipline;
  languages: string[];
  specialties: string[];
  credential: string;
  availability: string;
  activeCases: number;
};

type MatchingCase = {
  id: string;
  displayId?: string;
  company: string;
  product: string;
  category: "화장품" | "식품";
  expert: string;
  state: MatchState;
  chatReady: string;
  payment: string;
  reviewHandoff: string;
  next: string;
  sla: string;
  queueTone: QueueTone;
};

const stateLabels: Record<MatchState, string> = {
  requested: "요청 접수",
  matched: "전문가 배정",
  paid: "결제 완료",
  in_progress: "상담 진행",
  completed: "완료",
  cancelled: "취소",
  refunded: "환불"
};

const stateOrder: MatchState[] = [
  "requested",
  "matched",
  "paid",
  "in_progress",
  "completed",
  "cancelled",
  "refunded"
];

const consultationStages: { id: ConsultationStageId; label: string; detail: string }[] = [
  { id: "scope", label: "범위 확인", detail: "질문지·자료 접근" },
  { id: "match", label: "전문가 배정", detail: "대만 화장품·식품 전문가" },
  { id: "quote", label: "견적", detail: "범위·금액 확정" },
  { id: "payment", label: "결제", detail: "상담방 잠금 해제 조건" },
  { id: "chat", label: "상담방", detail: "전문가 작업공간" },
  { id: "close", label: "완료/환불", detail: "정산·감사 trail" }
];

const fallbackExpertProfiles: ExpertProfile[] = [
  {
    name: "Dr. Mei-Lin Chen",
    firm: "Taipei Cosmetic Safety Office",
    base: "Taipei",
    discipline: "cosmetics",
    languages: ["zh-TW", "en", "ko"],
    specialties: ["PIF 준비도", "성분 제한 검토", "효능 표현 근거"],
    credential: "전 TFDA 화장품 검토 담당",
    availability: "2건 수임 가능",
    activeCases: 4
  },
  {
    name: "Jason Wu",
    firm: "Formosa Food Compliance",
    base: "Taichung",
    discipline: "food",
    languages: ["zh-TW", "en"],
    specialties: ["영양성분 표시", "첨가물 검토", "건강식품 표현 선별"],
    credential: "식품위생관리법 실무 전문가",
    availability: "대기 명단",
    activeCases: 6
  },
  {
    name: "Hana Park",
    firm: "Korea-Taiwan Market Access Desk",
    base: "Seoul / Taipei",
    discipline: "dual",
    languages: ["ko", "zh-TW", "en"],
    specialties: ["양국 증빙팩", "수입자 핸드오프", "화장품·식품 초기 분류"],
    credential: "크로스보더 dossier 리드",
    availability: "1건 수임 가능",
    activeCases: 3
  }
];

const fallbackMatchingCases: MatchingCase[] = [
  {
    id: "EXP-2418",
    company: "Annaanda Global",
    product: "Cica Barrier Cream",
    category: "화장품",
    expert: "Dr. Mei-Lin Chen",
    state: "requested",
    chatReady: "범위 확인 질문지 미완료",
    payment: "견적 전",
    reviewHandoff: "화장품 PIF와 성분 제한 검토",
    next: "전성분 파일 접근 권한과 대만 출시 희망일을 확인합니다.",
    sla: "오늘 운영자 분류 필요",
    queueTone: "blocked"
  },
  {
    id: "EXP-2420",
    company: "Bloom Lab Korea",
    product: "Tinted Sunscreen SPF50",
    category: "화장품",
    expert: "Dr. Mei-Lin Chen",
    state: "matched",
    chatReady: "소개 상담방 준비 완료",
    payment: "구매자 승인 대기 견적",
    reviewHandoff: "TFDA 선케어 표현과 INCI 검토",
    next: "구매자가 범위를 승인하면 결제 링크를 발송합니다.",
    sla: "6시간 내 구매자 follow-up",
    queueTone: "ready"
  },
  {
    id: "EXP-2422",
    company: "Green Spoon Co.",
    product: "Soy Corn Protein Bar",
    category: "식품",
    expert: "Jason Wu",
    state: "paid",
    chatReady: "증빙 체크리스트 포함 상담방 준비",
    payment: "에스크로 결제 완료, 인보이스 초안 준비",
    reviewHandoff: "식품 표시, 첨가물, 알레르겐 검토",
    next: "전문가 작업공간에 문서 체크리스트를 공개합니다.",
    sla: "영업일 1일 내 착수",
    queueTone: "ready"
  },
  {
    id: "EXP-2426",
    company: "Han River Foods",
    product: "Ginseng Jelly Stick",
    category: "식품",
    expert: "Jason Wu",
    state: "in_progress",
    chatReady: "실시간 전문가 상담방 운영 중",
    payment: "1차 milestone 지급",
    reviewHandoff: "식품 claim 위험 메모와 수입자 질문",
    next: "번역된 원료표를 운영자가 한번 더 확인합니다.",
    sla: "전문가 답변 내일 마감",
    queueTone: "default"
  },
  {
    id: "EXP-2411",
    company: "Nuri Beauty",
    product: "Low-pH Gel Cleanser",
    category: "화장품",
    expert: "Hana Park",
    state: "completed",
    chatReady: "최종 메모와 함께 상담방 보관",
    payment: "정산 승인",
    reviewHandoff: "화장품 제품 등록·통지 패키지",
    next: "완료 설문과 재사용 체크리스트를 전송합니다.",
    sla: "종료",
    queueTone: "ready"
  },
  {
    id: "EXP-2407",
    company: "Morning Farm",
    product: "Enzyme Drink",
    category: "식품",
    expert: "Hana Park",
    state: "refunded",
    chatReady: "상담방 잠금",
    payment: "환불 영수증 발송",
    reviewHandoff: "식품 claim 검토 취소",
    next: "환불 사유가 감사 trail에 붙었는지 확인합니다.",
    sla: "이번 주 재무 감사",
    queueTone: "blocked"
  }
];

function ExpertIcon({ discipline }: { discipline: ExpertDiscipline }) {
  if (discipline === "cosmetics") {
    return <FlaskConical size={18} />;
  }

  if (discipline === "food") {
    return <Wheat size={18} />;
  }

  return <BadgeCheck size={18} />;
}

function nextExpertState(state: MatchState): MatchState {
  if (state === "requested") return "matched";
  if (state === "matched") return "paid";
  if (state === "paid") return "in_progress";
  if (state === "in_progress") return "completed";
  return state;
}

function expertConsultationStage(item: Pick<MatchingCase, "state" | "payment" | "chatReady">): ConsultationStageId {
  if (item.state === "completed" || item.state === "cancelled" || item.state === "refunded") return "close";
  if (item.state === "in_progress" || item.chatReady.includes("active")) return "chat";
  if (item.state === "paid") return "chat";
  if (item.state === "matched" && item.payment.includes("승인")) return "payment";
  if (item.state === "matched") return "quote";
  return "scope";
}

function stageTone(stage: ConsultationStageId) {
  if (stage === "close") return "done";
  if (stage === "payment") return "blocked";
  if (stage === "chat") return "active";
  return "waiting";
}

function chatGateLabel(value: string) {
  if (value.includes("payment_required")) return "결제 후 상담방 열림";
  if (value.includes("active")) return "상담 진행";
  if (value.includes("archived")) return "상담방 보관";
  return value;
}

export default async function AdminExpertsPage() {
  const snapshot = await getPlatformOpsSnapshot();
  const expertProfiles = snapshot.expertProfiles;
  const matchingCases = snapshot.expertCases;
  const sourceLabel = snapshot.storage === "database" ? "Supabase 매칭 데이터" : "운영 프리뷰 데이터";
  const stateCounts = stateOrder.map((state) => ({
    state,
    count: matchingCases.filter((item) => item.state === state).length
  }));
  const chatReadyCount = matchingCases.filter((item) =>
    item.chatReady.includes("준비") || item.chatReady.includes("운영") || item.chatReady.includes("active")
  ).length;
  const paidOrActiveCount = matchingCases.filter((item) =>
    ["paid", "in_progress", "completed"].includes(item.state)
  ).length;
  const consultationStageCounts = consultationStages.map((stage) => ({
    ...stage,
    count: matchingCases.filter((item) => expertConsultationStage(item) === stage.id).length
  }));
  const paymentRequiredCount = matchingCases.filter(
    (item) => item.state === "matched" || item.chatReady.includes("payment_required") || item.payment.includes("승인 대기")
  ).length;
  const activeChatCount = matchingCases.filter((item) =>
    ["paid", "in_progress"].includes(item.state) || item.chatReady.includes("active")
  ).length;
  const closedAuditCount = matchingCases.filter((item) =>
    ["completed", "cancelled", "refunded"].includes(item.state)
  ).length;

  return (
    <>
      <header className="admin-section-hero">
        <div>
          <p>전문가 매칭·결제</p>
          <h1>대만 화장품·식품 리뷰를 전문가 상담, 결제, 채팅, 완료·환불 감사까지 한 흐름으로 관리합니다.</h1>
        </div>
        <Link className="admin-secondary-action" href="/admin/reviews">
          리뷰 큐 열기
          <ArrowRight size={16} />
        </Link>
      </header>

      <section className="admin-panel admin-panel-wide" aria-label="전문가 상담 파이프라인">
        <div className="admin-panel-head">
          <div>
            <span>상담 파이프라인</span>
            <h2>범위 확인부터 결제, 상담방, 완료·환불까지 같은 단계로 봅니다</h2>
          </div>
          <Link className="admin-secondary-action" href="/admin/payments">
            결제 게이트 보기
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="admin-pipeline-rail">
          {consultationStageCounts.map((stage) => (
            <div
              key={stage.id}
              className={`admin-pipeline-step ${stage.count > 0 ? "active" : ""} ${stage.id === "payment" && paymentRequiredCount > 0 ? "blocked" : ""}`}
            >
              <span>{stage.label}</span>
              <b>{stage.count}</b>
              <small>{stage.detail}</small>
            </div>
          ))}
        </div>
        <div className="admin-gate-grid">
          <Link className={`admin-gate-card ${paymentRequiredCount > 0 ? "blocked" : "ready"}`} href="/admin/payments">
            <span>payment_required</span>
            <b>{paymentRequiredCount}</b>
            <p>전문가 배정 후 결제가 끝나기 전까지 상담방을 잠급니다.</p>
          </Link>
          <div className="admin-gate-card ready">
            <span>chat active</span>
            <b>{activeChatCount}</b>
            <p>결제 승인 뒤 전문가와 구매자가 같은 상담방에서 작업합니다.</p>
          </div>
          <div className="admin-gate-card done">
            <span>audit close</span>
            <b>{closedAuditCount}</b>
            <p>완료·취소·환불은 정산과 감사 기록으로 닫습니다.</p>
          </div>
        </div>
      </section>

      <section className="admin-metrics" aria-label="전문가 매칭 상태 요약">
        <article className="admin-metric info">
          <span>전체 매칭</span>
          <strong>{matchingCases.length}</strong>
          <small>대만 전문가 풀 {expertProfiles.length}명과 연결된 운영 케이스</small>
        </article>
        <article className="admin-metric warn">
          <span>운영 확인 필요</span>
          <strong>{matchingCases.filter((item) => item.queueTone === "blocked").length}</strong>
          <small>범위, 환불, 감사 증빙을 사람이 확인해야 합니다.</small>
        </article>
        <article className="admin-metric good">
          <span>상담방 준비</span>
          <strong>{chatReadyCount}</strong>
          <small>구매자, 전문가, 운영자가 같은 thread에서 움직입니다.</small>
        </article>
        <article className="admin-metric good">
          <span>결제·진행중</span>
          <strong>{paidOrActiveCount}</strong>
          <small>에스크로, 진행, 완료, 정산 trail이 남는 케이스</small>
        </article>
      </section>

      <section className="admin-grid">
        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>매칭 워크벤치</span>
              <h2>전문가 케이스 파이프라인</h2>
            </div>
            <Handshake size={18} />
          </div>
          <div className="admin-table">
            <div className="admin-table-head">
              <span>케이스</span>
              <span>상태</span>
              <span>상담·결제</span>
              <span>다음 운영 작업</span>
            </div>
            {matchingCases.map((item) => (
              <div key={item.id} className="admin-table-row">
                <span>
                  <b>{item.company}</b>
                  <small>
                    {item.displayId ?? item.id} / {item.category} / {item.product}
                  </small>
                </span>
                <span>
                  <b>{stateLabels[item.state]}</b>
                  <span className={`admin-stage-chip ${stageTone(expertConsultationStage(item))}`}>
                    {consultationStages.find((stage) => stage.id === expertConsultationStage(item))?.label}
                  </span>
                  <small>{item.expert}</small>
                </span>
                <span>
                  {chatGateLabel(item.chatReady)}
                  <small>{item.payment}</small>
                  <small>{item.reviewHandoff}</small>
                </span>
                <span>
                  {item.next}
                  <small>{item.sla}</small>
                  <details className="admin-ops-disclosure">
                    <summary>운영 작업</summary>
                    <AdminRowActionDryRun
                      action="expert_match_status"
                      id={item.id}
                      status={nextExpertState(item.state)}
                      requestId={`expert-${item.id}`}
                      note={`${item.product} expert match ${item.state} to ${nextExpertState(item.state)}`}
                      fallbackUuid="00000000-0000-4000-8000-000000000101"
                    />
                  </details>
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>상태 모델</span>
              <h2>매칭 생애주기</h2>
            </div>
            <ClipboardCheck size={18} />
          </div>
          <div className="admin-chip-list">
            {stateCounts.map((item) => (
              <span key={item.state}>
                {stateLabels[item.state]}: {item.count}
              </span>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>운영 큐</span>
              <h2>상담방과 결제 준비</h2>
            </div>
            <MessageCircle size={18} />
          </div>
          <div className="admin-queue-list">
            {matchingCases
              .filter((item) => item.queueTone !== "default")
              .map((item) => (
                <div key={`${item.id}-queue`} className={`admin-queue-item ${item.queueTone}`}>
                  <span>{stateLabels[item.state]}</span>
                  <b>{item.product}</b>
                  <p>{chatGateLabel(item.chatReady)}</p>
                  <small>{item.payment}</small>
                </div>
              ))}
          </div>
          <p className="admin-note">
            현재 표시 소스: {sourceLabel}. {snapshot.warnings[0] ?? "DB preview를 켜면 expert_matches, chat_threads, payments 기준으로 갱신됩니다."}
          </p>
        </article>

        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>전문가 풀</span>
              <h2>대만 리뷰어 네트워크</h2>
            </div>
            <UserCheck size={18} />
          </div>
          <div className="admin-module-list">
            {expertProfiles.map((profile) => (
              <div key={profile.name} className="admin-module-card">
                <span>
                  <ExpertIcon discipline={profile.discipline} />
                </span>
                <div>
                  <b>{profile.name}</b>
                  <p>
                    {profile.firm} / {profile.base} / {profile.languages.join(", ")}
                  </p>
                  <small>
                    {profile.credential} / {profile.specialties.join(" / ")} / 진행 {profile.activeCases}건
                  </small>
                </div>
                <em>{profile.availability}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>결제</span>
              <h2>정산 핸드오프</h2>
            </div>
            <HandCoins size={18} />
          </div>
          <div className="admin-chip-list">
            <span>
              <BadgeDollarSign size={14} /> 견적 승인
            </span>
            <span>
              <ReceiptText size={14} /> 에스크로 영수증
            </span>
            <span>
              <ShieldCheck size={14} /> 전문가 정산 검토
            </span>
            <span>
              <RotateCcw size={14} /> 환불 감사
            </span>
          </div>
          <p className="admin-note">
            매칭을 다음 단계로 넘기기 전에 상담방, 구매자 결제, 전문가 milestone, 인보이스, 환불 증빙이 준비됐는지 운영자가 확인합니다.
          </p>
        </article>

        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>대만 규제 핸드오프</span>
              <h2>화장품·식품 리뷰 라인</h2>
            </div>
            <ShieldCheck size={18} />
          </div>
          <div className="admin-review-list">
            <div className="admin-review-card">
              <span>화장품</span>
              <b>PIF와 배합 검토</b>
              <p>성분 제한, INCI 표기, 효능 표현, 안전성 파일 준비도를 전문가가 확인합니다.</p>
              <small>추천 전문가: Dr. Mei-Lin Chen</small>
              <em>화장품 리뷰 큐로 handoff</em>
            </div>
            <div className="admin-review-card">
              <span>식품</span>
              <b>라벨과 claim 검토</b>
              <p>영양성분, 첨가물, 알레르겐, 중문 표시, 수입자 질문을 한 번에 넘깁니다.</p>
              <small>추천 전문가: Jason Wu</small>
              <em>식품 리뷰 큐로 handoff</em>
            </div>
            <div className="admin-review-card">
              <span>크로스보더</span>
              <b>양국 증빙팩</b>
              <p>한국 원문 문서, 대만 reviewer 메모, 운영 감사 기록을 같은 케이스에 묶습니다.</p>
              <small>추천 전문가: Hana Park</small>
              <em>구매자 workspace로 handoff</em>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}
