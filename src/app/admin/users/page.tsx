import Link from "next/link";
import { ArrowRight, ShieldCheck, UserCog, Users } from "lucide-react";

const roleRows = [
  {
    role: "profiles.role = admin",
    scope: "플랫폼 전체",
    can: "공식 소스, 지식, 모든 조직, 결제, audit 조회",
    caution: "실제 직원/운영자에게만 부여"
  },
  {
    role: "organization_members.owner",
    scope: "회사 단위",
    can: "회사 설정, 멤버 초대, 제품/문서/리뷰 관리",
    caution: "고객사 대표 또는 내부 책임자"
  },
  {
    role: "organization_members.operator",
    scope: "회사 단위",
    can: "제품 등록, 문서 업로드, 리뷰 요청, 물류 요청",
    caution: "일반 실무자 권한"
  },
  {
    role: "organization_members.expert",
    scope: "상담 스레드",
    can: "배정된 상담과 첨부문서 열람",
    caution: "회사 전체 데이터 노출 금지"
  },
  {
    role: "organization_members.logistics",
    scope: "선적 요청",
    can: "배정된 운송 요청, 견적, tracking event",
    caution: "규제 리뷰 원문 접근 제한 필요"
  }
];

export default function AdminUsersPage() {
  return (
    <>
      <header className="admin-section-hero">
        <div>
          <p>사용자·권한</p>
          <h1>플랫폼 관리자와 회사 내부 역할을 분리해 데이터 노출 범위를 제어합니다.</h1>
        </div>
        <Link className="admin-primary-action" href="/admin/reviews">
          리뷰 큐 보기
          <ArrowRight size={16} />
        </Link>
      </header>

      <section className="admin-grid">
        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>권한 매트릭스</span>
              <h2>RLS 기준 역할</h2>
            </div>
            <Users size={18} />
          </div>
          <div className="admin-table admin-table-roles">
            <div className="admin-table-head">
              <span>역할</span>
              <span>범위</span>
              <span>가능 작업</span>
              <span>주의</span>
            </div>
            {roleRows.map((row) => (
              <div key={row.role} className="admin-table-row">
                <span><b>{row.role}</b></span>
                <span>{row.scope}</span>
                <span>{row.can}</span>
                <span>{row.caution}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>보안 원칙</span>
              <h2>역할 분리</h2>
            </div>
            <ShieldCheck size={18} />
          </div>
          <p className="admin-note">
            `profiles.role`은 플랫폼 운영 권한으로만 사용하고, 고객 회사 안의 권한은 `organization_members.role`로 관리합니다.
          </p>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>다음 연결</span>
              <h2>초대 흐름</h2>
            </div>
            <UserCog size={18} />
          </div>
          <div className="admin-chip-list">
            <span>초대 이메일</span>
            <span>멤버 상태</span>
            <span>역할 변경 audit</span>
            <span>조직별 설정</span>
          </div>
        </article>
      </section>
    </>
  );
}
