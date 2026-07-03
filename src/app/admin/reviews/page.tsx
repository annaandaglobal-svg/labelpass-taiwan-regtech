import Link from "next/link";
import { ArrowRight, ClipboardList, FileCheck2, FileWarning, Handshake, Truck } from "lucide-react";
import { AdminPifQueue } from "@/components/admin-pif-queue";
import { adminQueue } from "@/lib/platform-admin";
import { getPlatformOpsSnapshot } from "@/lib/platform-ops-store";
import { listPifApplicationsForAdmin, pifRequestReadiness } from "@/lib/pif-requests";

const fallbackReviewFlows = [
  {
    title: "화장품 PIF 보강",
    product: "Cica Barrier Cream",
    route: "대만 화장품",
    status: "서류 보완",
    next: "PIF, GMP, 제품등록 번호 확인",
    handoff: "전문가 검토"
  },
  {
    title: "식품 라벨 문안 검토",
    product: "Soy Corn Protein Bar",
    route: "대만 식품",
    status: "라벨 확인",
    next: "GMO/non-GMO 근거와 영양표시 수치 확인",
    handoff: "라벨 전문가"
  },
  {
    title: "HS/CCC와 포장재 검사 확인",
    product: "Food Contact Bottle",
    route: "포장재·용기",
    status: "자료 대기",
    next: "재질 증빙, 식품접촉 적합성, 통관 서류 확인",
    handoff: "물류·통관"
  }
];

export default async function AdminReviewsPage() {
  const snapshot = await getPlatformOpsSnapshot();
  const reviewFlows = snapshot.reviewFlows.length ? snapshot.reviewFlows : fallbackReviewFlows;
  const sourceLabel = snapshot.storage === "database" ? "Supabase 운영 데이터" : "안전한 예시 데이터";
  const pifReadiness = pifRequestReadiness();
  const pifQueue = await listPifApplicationsForAdmin();

  return (
    <>
      <header className="admin-section-hero">
        <div>
          <p>검토 운영</p>
          <h1>고객 신청, PIF 자료, 전문가 연결, 물류 후속 조치를 한곳에서 확인합니다.</h1>
        </div>
        <Link className="admin-secondary-action" href="/knowledge">
          규정 근거 확인
          <ArrowRight size={16} />
        </Link>
      </header>

      <section className="admin-grid">
        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>검토 흐름</span>
              <h2>진행 중인 주요 케이스</h2>
            </div>
            <ClipboardList size={18} />
          </div>
          <div className="admin-review-list">
            {reviewFlows.map((flow) => (
              <div key={`${flow.title}-${flow.product}`} className="admin-review-card">
                <span>{flow.route}</span>
                <b>{flow.title}</b>
                <p>{flow.product}</p>
                <small>{flow.next}</small>
                <em>
                  {flow.status} · {flow.handoff}
                </em>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>운영 알림</span>
              <h2>먼저 처리할 일</h2>
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
            현재 데이터 출처: {sourceLabel}. {snapshot.warnings[0] ?? "Supabase 운영 데이터가 정상적으로 표시되고 있습니다."}
          </p>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>PIF 신청 접수</span>
              <h2>고객 PIF 신청 큐</h2>
            </div>
            <FileCheck2 size={18} />
          </div>
          <div className="admin-health-list">
            <span>
              <b>{pifReadiness.storage === "database" ? "DB 연결" : "DB 대기"}</b>
              신청 저장 상태
            </span>
            <span>
              <b>{pifReadiness.customerWritesReady ? "고객 접수 가능" : "고객 접수 대기"}</b>
              공개 신청 API
            </span>
            <span>
              <b>{pifReadiness.fileStorage.ready ? "파일 저장 가능" : "파일 저장 대기"}</b>
              Supabase Storage
            </span>
          </div>
          <AdminPifQueue initialApplications={pifQueue.applications} storage={pifQueue.storage} />
          <p className="admin-note">
            고객 PIF 신청은 products, product_documents, audit_logs에 기록됩니다.{" "}
            {pifQueue.warnings[0] ?? pifReadiness.warnings[0] ?? "DB 접수가 활성화되어 신청이 운영 큐로 직접 들어옵니다."}
          </p>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>후속 연결</span>
              <h2>다음 운영 작업</h2>
            </div>
            <Handshake size={18} />
          </div>
          <div className="admin-chip-list">
            <span>
              <Handshake size={14} /> 전문가 매칭
            </span>
            <span>
              <Truck size={14} /> 물류 견적
            </span>
            <span>
              <ClipboardList size={14} /> 검토 체크리스트
            </span>
            <span>
              <FileWarning size={14} /> 보완 요청
            </span>
          </div>
        </article>
      </section>
    </>
  );
}
