import { AlertTriangle, CheckCircle2, Database, KeyRound, ListChecks, LockKeyhole, Route, ShieldCheck } from "lucide-react";
import { aiReviewReadiness } from "@/lib/ai-review";
import { handoffRequestReadiness } from "@/lib/handoff-requests";
import { platformOpsActionReadiness } from "@/lib/platform-ops-actions";
import { AdminOpsDryRunButton } from "./admin-ops-dry-run-button";

const storageLabels = {
  database: "DB 쓰기 준비",
  disabled: "DB 미연결",
  preview_disabled: "미리보기 잠김",
  write_disabled: "쓰기 잠김"
};

export function AdminOpsReadinessCard() {
  const readiness = platformOpsActionReadiness();
  const handoffReadiness = handoffRequestReadiness();
  const aiReadiness = aiReviewReadiness();
  const flags = [
    {
      label: "운영 DB",
      value: readiness.databaseUrlPresent ? "연결값 있음" : "연결값 없음",
      ready: readiness.databaseUrlPresent,
      icon: <Database size={15} />
    },
    {
      label: "읽기 미리보기",
      value: readiness.adminDbPreviewEnabled ? "허용" : "잠김",
      ready: readiness.adminDbPreviewEnabled,
      icon: <ShieldCheck size={15} />
    },
    {
      label: "상태 변경",
      value: readiness.adminDbWritesEnabled ? "허용" : "잠김",
      ready: readiness.adminDbWritesEnabled,
      icon: <LockKeyhole size={15} />
    },
    {
      label: "운영 토큰",
      value: readiness.adminOpsTokenConfigured ? "설정됨" : "필요",
      ready: readiness.adminOpsTokenConfigured,
      icon: <KeyRound size={15} />
    }
  ];

  const supportedCount = Object.values(readiness.supportedActions).reduce((sum, actions) => sum + actions.length, 0);
  const connectionChecks = [
    {
      label: "Supabase DB 연결",
      owner: "사용자 승인",
      detail: "Vercel Production 환경변수에 운영 DB 연결값을 저장",
      env: "SUPABASE_DB_URL 또는 POSTGRES_URL 또는 DATABASE_URL",
      ready: readiness.databaseUrlPresent
    },
    {
      label: "OpenAI 분석 API",
      owner: "Vercel 설정",
      detail: "리뷰 결과에 GPT 문맥 분석을 덧붙이는 서버 전용 키",
      env: "OPENAI_API_KEY + LABELPASS_ENABLE_AI_REVIEW=1",
      ready: aiReadiness.ready
    },
    {
      label: "관리자 읽기 게이트",
      owner: "Vercel 설정",
      detail: "관리자 화면이 Supabase 운영 데이터를 읽는 단계",
      env: "LABELPASS_ENABLE_ADMIN_DB_PREVIEW=1",
      ready: readiness.databaseUrlPresent && readiness.adminDbPreviewEnabled
    },
    {
      label: "상태 변경 게이트",
      owner: "운영자 토큰",
      detail: "전문가, 결제, 채팅, 물류, 선적 상태 변경을 live로 적용",
      env: "LABELPASS_ENABLE_ADMIN_DB_WRITES=1 + LABELPASS_ADMIN_OPS_TOKEN",
      ready: readiness.writesReady
    }
  ];
  const apiChecks = [
    {
      label: "GPT 문맥 분석",
      endpoint: "/api/review",
      detail: `${aiReadiness.model} 모델로 품목·성분·서류·통관 질문을 보강`,
      ready: aiReadiness.ready
    },
    {
      label: "고객 의뢰 저장",
      endpoint: "/api/handoff/requests",
      detail: "검색 결과에서 제품, 전문가 상담, 결제 대기, 물류 요청 큐를 생성",
      ready: handoffReadiness.writesReady
    },
    {
      label: "관리자 상태 변경",
      endpoint: "/api/admin/ops/actions",
      detail: "운영자가 전문가, 결제, 채팅, 물류, 선적 상태를 변경",
      ready: readiness.writesReady
    }
  ];
  const readyCount = connectionChecks.filter((item) => item.ready).length;
  const statusLabel = readiness.writesReady
    ? storageLabels[readiness.storage]
    : readiness.storage === "database"
      ? "운영 토큰 잠김"
      : storageLabels[readiness.storage];
  const nextHelp = !readiness.databaseUrlPresent
    ? {
        title: "Supabase DB 연결값이 필요합니다",
        detail: "Supabase 프로젝트의 pooled connection string을 Vercel Production 환경변수에 저장하면 운영 데이터 읽기 준비를 시작할 수 있습니다."
      }
    : !readiness.adminDbPreviewEnabled
      ? {
          title: "관리자 읽기 미리보기를 켜야 합니다",
          detail: "DB 연결값이 들어간 뒤 LABELPASS_ENABLE_ADMIN_DB_PREVIEW=1을 추가하면 관리자 화면이 실제 운영 데이터를 읽을 수 있습니다."
        }
      : !readiness.adminOpsTokenConfigured || !readiness.adminDbWritesEnabled
        ? {
            title: "live 쓰기 승인과 관리자 토큰이 필요합니다",
            detail: "LABELPASS_ADMIN_OPS_TOKEN과 LABELPASS_ENABLE_ADMIN_DB_WRITES=1이 함께 있어야 결제, 전문가, 물류, 선적 상태 변경이 실제 DB에 기록됩니다."
          }
        : {
            title: "운영 API 연결 준비 완료",
            detail: "고객 의뢰 저장과 관리자 상태 변경 API가 live 저장 조건을 충족했습니다. 배포 후 smoke 검증만 확인하면 됩니다."
          };

  return (
    <article className="admin-panel admin-ops-panel">
      <div className="admin-panel-head">
        <div>
          <span>운영 액션</span>
          <h2>상태 변경 안전장치</h2>
        </div>
        <ShieldCheck size={18} />
      </div>

      <div className={`admin-ops-status ${readiness.writesReady ? "ready" : "locked"}`}>
        <b>{statusLabel}</b>
        <small>
          {readiness.writesReady
            ? "전문가, 결제, 채팅, 물류, 선적 상태 변경이 감사 로그와 함께 적용됩니다."
            : "실제 운영 데이터 변경은 잠겨 있고 dry-run만 가능합니다."}
        </small>
      </div>

      <div className={`admin-connection-help ${readiness.writesReady ? "ready" : "locked"}`}>
        <span>
          {readiness.writesReady ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {readiness.writesReady ? "연결 상태" : "지금 필요한 도움"}
        </span>
        <b>{nextHelp.title}</b>
        <p>{nextHelp.detail}</p>
      </div>

      <div className="admin-connection-checklist" aria-label="Supabase 운영 연결 체크리스트">
        <div className="admin-connection-checklist-head">
          <span>
            <ListChecks size={15} />
            Live 운영 연결
          </span>
          <b>{readyCount}/{connectionChecks.length}</b>
        </div>
        {connectionChecks.map((item) => (
          <span key={item.label} className={item.ready ? "ready" : "locked"}>
            <CheckCircle2 size={14} aria-hidden="true" />
            <b>
              {item.label}
              <em>{item.owner}</em>
            </b>
            <small>{item.detail}</small>
            <code>{item.env}</code>
          </span>
        ))}
      </div>

      <details className="admin-ops-disclosure">
        <summary>
          <span>세부 안전장치</span>
          <em>{supportedCount}개 상태 전환</em>
        </summary>

        <div className="admin-ops-flags" aria-label="운영 액션 준비 상태">
          {flags.map((flag) => (
            <span key={flag.label} className={flag.ready ? "ready" : "locked"}>
              {flag.icon}
              <b>{flag.label}</b>
              <small>{flag.value}</small>
            </span>
          ))}
        </div>

        <div className="admin-ops-foot">
          <span>{supportedCount}개 상태 전환 지원</span>
          <code>/api/admin/ops/actions</code>
        </div>

        <div className="admin-api-gates" aria-label="운영 API 연결 상태">
          {apiChecks.map((api) => (
            <span key={api.endpoint} className={api.ready ? "ready" : "locked"}>
              <Route size={14} />
              <b>{api.label}</b>
              <code>{api.endpoint}</code>
              <small>{api.detail}</small>
            </span>
          ))}
        </div>

        <AdminOpsDryRunButton />
      </details>
    </article>
  );
}
