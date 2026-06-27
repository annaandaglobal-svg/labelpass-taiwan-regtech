import Link from "next/link";
import { ArrowRight, Building2, Database, Settings2 } from "lucide-react";
import { getPlatformOpsSnapshot } from "@/lib/platform-ops-store";

const fallbackCompanyRows = [
  {
    name: "Annaanda Global",
    market: "TW",
    status: "초기 설정",
    modules: "화장품, 식품, 수입검사",
    next: "Supabase 조직 row 연결"
  },
  {
    name: "Expert Partner Pool",
    market: "TW / KR",
    status: "준비 중",
    modules: "전문가 매칭, 유료 상담",
    next: "expert_profiles onboarding"
  },
  {
    name: "Logistics Partner Pool",
    market: "KR → TW",
    status: "준비 중",
    modules: "물류 견적, 선적 추적",
    next: "logistics_companies onboarding"
  }
];

export default async function AdminCompaniesPage() {
  const snapshot = await getPlatformOpsSnapshot();
  const companyRows = snapshot.companyRows.length ? snapshot.companyRows : fallbackCompanyRows;
  const sourceLabel = snapshot.storage === "database" ? "Supabase 실데이터" : "설계 데이터";

  return (
    <>
      <header className="admin-section-hero">
        <div>
          <p>회사 관리</p>
          <h1>조직별 제품, 리뷰, 문서, 전문가·물류 매칭을 분리해서 운영합니다.</h1>
        </div>
        <Link className="admin-primary-action" href="/admin/users">
          사용자 권한 보기
          <ArrowRight size={16} />
        </Link>
      </header>

      <section className="admin-grid">
        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>조직 목록</span>
              <h2>초기 운영 테넌트</h2>
            </div>
            <Building2 size={18} />
          </div>
          <div className="admin-table">
            <div className="admin-table-head">
              <span>회사</span>
              <span>시장</span>
              <span>상태</span>
              <span>다음 작업</span>
            </div>
            {companyRows.map((row) => (
              <div key={row.name} className="admin-table-row">
                <span>
                  <b>{row.name}</b>
                  <small>{row.modules}</small>
                </span>
                <span>{row.market}</span>
                <span>{row.status}</span>
                <span>{row.next}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>DB 준비</span>
              <h2>조직 테이블</h2>
            </div>
            <Database size={18} />
          </div>
          <div className="admin-chip-list">
            <span>organizations</span>
            <span>organization_members</span>
            <span>organization_settings</span>
            <span>products.organization_id</span>
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>운영 설정</span>
              <h2>회사별 기본값</h2>
            </div>
            <Settings2 size={18} />
          </div>
          <p className="admin-note">
            현재 표시 소스: {sourceLabel}. 기본 시장, 언어, 리뷰 아카이브, 전문가 매칭, 물류 매칭, 알림 채널을 회사 단위로 분리합니다.
            {snapshot.warnings[0] ? ` ${snapshot.warnings[0]}` : ""}
          </p>
        </article>
      </section>
    </>
  );
}
