import Link from "next/link";
import { ArrowRight, ClipboardList, FileWarning, Handshake, Truck } from "lucide-react";
import { adminQueue } from "@/lib/platform-admin";
import { getPlatformOpsSnapshot } from "@/lib/platform-ops-store";

const fallbackReviewFlows = [
  {
    title: "화장품 PIF 보강",
    product: "Cica Barrier Cream",
    route: "대만 화장품",
    status: "자료 회수",
    next: "PIF, GMP, 제품등록 번호 확인",
    handoff: "전문가 매칭"
  },
  {
    title: "식품 중문 라벨 수정",
    product: "Soy Corn Protein Bar",
    route: "대만 식품",
    status: "라벨 수정",
    next: "GMO/non-GMO 증빙과 알레르겐 표시 대조",
    handoff: "라벨 전문가"
  },
  {
    title: "HS/CCC·수입검사 확인",
    product: "Food Contact Bottle",
    route: "포장재·통관",
    status: "물류 준비",
    next: "인보이스, 패킹리스트, 수입자 등록 확인",
    handoff: "물류사 견적"
  }
];

export default async function AdminReviewsPage() {
  const snapshot = await getPlatformOpsSnapshot();
  const reviewFlows = snapshot.reviewFlows;
  const sourceLabel = snapshot.storage === "database" ? "Supabase 리뷰 데이터" : "운영 프리뷰 데이터";

  return (
    <>
      <header className="admin-section-hero">
        <div>
          <p>리뷰 운영 큐</p>
          <h1>라벨 검토 결과를 문서 회수, 전문가 상담, 물류 요청으로 넘기는 운영 화면입니다.</h1>
        </div>
        <Link className="admin-secondary-action" href="/knowledge">
          지식베이스 확인
          <ArrowRight size={16} />
        </Link>
      </header>

      <section className="admin-grid">
        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>케이스 큐</span>
              <h2>리뷰 후속 작업</h2>
            </div>
            <ClipboardList size={18} />
          </div>
          <div className="admin-review-list">
            {reviewFlows.map((flow) => (
              <div key={flow.title} className="admin-review-card">
                <span>{flow.route}</span>
                <b>{flow.title}</b>
                <p>{flow.product}</p>
                <small>{flow.next}</small>
                <em>{flow.status} · {flow.handoff}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>운영 작업</span>
              <h2>현재 우선순위</h2>
            </div>
            <FileWarning size={18} />
          </div>
          <div className="admin-queue-list">
            {adminQueue.slice(0, 3).map((item) => (
              <div key={item.id} className={`admin-queue-item ${item.status}`}>
                <span>{item.status}</span>
                <b>{item.title}</b>
                <p>{item.note}</p>
              </div>
            ))}
          </div>
          <p className="admin-note">
            현재 표시 소스: {sourceLabel}. {snapshot.warnings[0] ?? "리뷰 후속 작업을 실제 DB 큐와 연결할 준비가 됐습니다."}
          </p>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>연결 대상</span>
              <h2>다음 자동화</h2>
            </div>
            <Handshake size={18} />
          </div>
          <div className="admin-chip-list">
            <span><Handshake size={14} /> 전문가 배정</span>
            <span><Truck size={14} /> 물류 견적</span>
            <span><ClipboardList size={14} /> 문서 checklist</span>
            <span><FileWarning size={14} /> audit 로그</span>
          </div>
        </article>
      </section>
    </>
  );
}
