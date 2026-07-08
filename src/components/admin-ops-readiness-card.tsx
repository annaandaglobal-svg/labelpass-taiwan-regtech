import { AlertTriangle, CheckCircle2, Database, KeyRound, ListChecks, LockKeyhole, Route, ShieldCheck } from "lucide-react";
import { aiReviewReadiness } from "@/lib/ai-review";
import { aiIngredientFallbackReadiness } from "@/lib/ai-ingredient-fallback";
import { handoffRequestReadiness } from "@/lib/handoff-requests";
import { pifRequestReadiness } from "@/lib/pif-requests";
import { platformOpsActionReadiness } from "@/lib/platform-ops-actions";
import { portoneReadiness } from "@/lib/portone";
import { AdminOpsDryRunButton } from "./admin-ops-dry-run-button";

const storageLabels = {
  database: "DB 연결됨",
  disabled: "DB 미설정",
  preview_disabled: "DB 미리보기 꺼짐",
  write_disabled: "DB 쓰기 꺼짐"
};

export function AdminOpsReadinessCard() {
  const readiness = platformOpsActionReadiness();
  const handoffReadiness = handoffRequestReadiness();
  const aiReadiness = aiReviewReadiness();
  const ingredientFallbackReadiness = aiIngredientFallbackReadiness();
  const pifReadiness = pifRequestReadiness();
  const payments = portoneReadiness();
  const flags = [
    {
      label: "운영 DB",
      value: readiness.databaseUrlPresent ? "설정됨" : "없음",
      ready: readiness.databaseUrlPresent,
      icon: <Database size={15} />
    },
    {
      label: "관리자 미리보기",
      value: readiness.adminDbPreviewEnabled ? "켜짐" : "꺼짐",
      ready: readiness.adminDbPreviewEnabled,
      icon: <ShieldCheck size={15} />
    },
    {
      label: "운영 쓰기",
      value: readiness.adminDbWritesEnabled ? "켜짐" : "꺼짐",
      ready: readiness.adminDbWritesEnabled,
      icon: <LockKeyhole size={15} />
    },
    {
      label: "관리자 토큰",
      value: readiness.adminOpsTokenConfigured ? "있음" : "없음",
      ready: readiness.adminOpsTokenConfigured,
      icon: <KeyRound size={15} />
    }
  ];

  const supportedCount = Object.values(readiness.supportedActions).reduce((sum, actions) => sum + actions.length, 0);
  const connectionChecks = [
    {
      label: "Supabase DB 연결",
      owner: "운영 환경",
      detail: "운영 데이터가 Supabase 테이블에 저장되고 관리자 페이지에서 읽힙니다.",
      env: "SUPABASE_DB_URL 또는 POSTGRES_URL 또는 DATABASE_URL",
      ready: readiness.databaseUrlPresent
    },
    {
      label: "OpenAI 분석 API",
      owner: "AI 검토",
      detail: "규정·근거 기반 판정에 GPT 맥락 분석을 추가합니다.",
      env: "OPENAI_API_KEY + LABELPASS_ENABLE_AI_REVIEW=1",
      ready: aiReadiness.ready
    },
    {
      label: "AI 성분 폴백",
      owner: "미등록 성분",
      detail: "큐레이션 DB에 없는 성분을 AI가 '추론(미검증)'으로 분류합니다. 큐레이션 판정이 항상 우선합니다.",
      env: "OPENAI_API_KEY + LABELPASS_ENABLE_AI_INGREDIENT_FALLBACK=1",
      ready: ingredientFallbackReadiness.ready
    },
    {
      label: "관리자 DB 미리보기",
      owner: "운영 화면",
      detail: "관리자 화면이 예시 데이터 대신 Supabase 운영 데이터를 읽습니다.",
      env: "LABELPASS_ENABLE_ADMIN_DB_PREVIEW=1",
      ready: readiness.databaseUrlPresent && readiness.adminDbPreviewEnabled
    },
    {
      label: "고객 PIF DB 접수",
      owner: "고객 신청",
      detail: "고객이 제출한 PIF 신청을 products, product_documents, audit_logs에 저장합니다.",
      env: "LABELPASS_ENABLE_ADMIN_DB_WRITES=1 + LABELPASS_ENABLE_CUSTOMER_PIF_SUBMISSIONS=1",
      ready: pifReadiness.customerWritesReady
    },
    {
      label: "PIF 원본 파일 저장",
      owner: "Supabase Storage",
      detail: "PIF 첨부파일 원본을 비공개 Storage 버킷에 업로드합니다.",
      env: "SUPABASE_SERVICE_ROLE_KEY + LABELPASS_PIF_STORAGE_BUCKET",
      ready: pifReadiness.fileStorage.ready
    },
    {
      label: "관리자 상태 변경",
      owner: "운영자",
      detail: "전문가, 결제, 채팅, 물류, 선적 상태 변경을 DB에 기록합니다.",
      env: "LABELPASS_ENABLE_ADMIN_DB_WRITES=1 + LABELPASS_ADMIN_OPS_TOKEN",
      ready: readiness.writesReady
    },
    {
      label: "PortOne 결제창",
      owner: "결제",
      detail: "mock 결제 대신 실제 PortOne 결제창과 웹훅을 사용합니다.",
      env: "PORTONE_STORE_ID + PORTONE_CHANNEL_KEY + PORTONE_API_SECRET + PORTONE_WEBHOOK_SECRET",
      ready: payments.provider === "portone"
    }
  ];
  const apiChecks = [
    {
      label: "AI 검토",
      endpoint: "/api/review",
      detail: `${aiReadiness.model} 기반 보조 분석`,
      ready: aiReadiness.ready
    },
    {
      label: "고객 핸드오프",
      endpoint: "/api/handoff/requests",
      detail: "검토 결과를 전문가 상담, 결제 대기, 물류 요청으로 넘깁니다.",
      ready: handoffReadiness.writesReady
    },
    {
      label: "PIF 신청 접수",
      endpoint: "/api/pif/applications",
      detail: "고객 PIF 신청을 운영 큐로 저장합니다.",
      ready: pifReadiness.customerWritesReady
    },
    {
      label: "PIF 파일 업로드",
      endpoint: "/api/pif/attachments",
      detail: "PIF 원본 파일을 Supabase Storage에 저장합니다.",
      ready: pifReadiness.fileStorage.ready
    },
    {
      label: "관리자 상태 변경",
      endpoint: "/api/admin/ops/actions",
      detail: "운영자가 전문가, 결제, 물류 상태를 실제 DB에 반영합니다.",
      ready: readiness.writesReady
    },
    {
      label: "결제 checkout",
      endpoint: "/api/payments/checkout",
      detail: `현재 provider: ${payments.provider === "portone" ? "PortOne" : "mock demo"}`,
      ready: payments.provider === "portone"
    }
  ];
  const readyCount = connectionChecks.filter((item) => item.ready).length;
  const statusLabel = pifReadiness.customerWritesReady
    ? "고객 PIF DB 접수 가능"
    : readiness.writesReady
      ? storageLabels[readiness.storage]
      : readiness.storage === "database"
        ? "DB 연결, 일부 쓰기 대기"
        : storageLabels[readiness.storage];
  const nextHelp = !readiness.databaseUrlPresent
    ? {
        title: "Supabase DB 연결이 먼저 필요합니다.",
        detail: "Vercel Production에 Supabase pooled connection string을 넣어야 운영 데이터가 저장됩니다."
      }
    : !readiness.adminDbPreviewEnabled
      ? {
          title: "관리자 DB 미리보기를 켜야 합니다.",
          detail: "LABELPASS_ENABLE_ADMIN_DB_PREVIEW=1을 설정하면 관리자 페이지가 Supabase 데이터를 읽습니다."
        }
      : !pifReadiness.customerWritesReady
        ? {
            title: "고객 PIF 접수 쓰기를 켜야 합니다.",
            detail: "LABELPASS_ENABLE_ADMIN_DB_WRITES=1과 LABELPASS_ENABLE_CUSTOMER_PIF_SUBMISSIONS=1을 설정하면 PIF 신청이 운영 큐에 저장됩니다."
          }
        : !pifReadiness.fileStorage.ready
          ? {
              title: "파일 원본 저장 키가 필요합니다.",
              detail: "SUPABASE_SERVICE_ROLE_KEY를 설정하면 PIF 첨부 원본을 Supabase Storage에 저장할 수 있습니다."
            }
          : {
              title: "PIF 접수와 파일 저장이 준비되었습니다.",
              detail: "다음 단계는 고객 로그인, 조직 권한, 결제 실연동입니다."
            };

  return (
    <article className="admin-panel admin-ops-panel">
      <div className="admin-panel-head">
        <div>
          <span>운영 준비도</span>
          <h2>실사용 연결 상태</h2>
        </div>
        <ShieldCheck size={18} />
      </div>

      <div className={`admin-ops-status ${pifReadiness.customerWritesReady ? "ready" : "locked"}`}>
        <b>{statusLabel}</b>
        <small>
          {pifReadiness.customerWritesReady
            ? "고객 PIF 신청은 운영 DB에 저장됩니다. 파일 원본 저장은 Storage 상태를 함께 확인하세요."
            : "아직 일부 흐름은 dry-run 또는 브라우저 백업으로 동작합니다."}
        </small>
      </div>

      <div className={`admin-connection-help ${pifReadiness.customerWritesReady ? "ready" : "locked"}`}>
        <span>
          {pifReadiness.customerWritesReady ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {pifReadiness.customerWritesReady ? "접수 가능" : "다음 설정 필요"}
        </span>
        <b>{nextHelp.title}</b>
        <p>{nextHelp.detail}</p>
      </div>

      <div className="admin-connection-checklist" aria-label="운영 연결 체크리스트">
        <div className="admin-connection-checklist-head">
          <span>
            <ListChecks size={15} />
            운영 연결
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
          <span>API 상태</span>
          <em>{supportedCount}개 관리자 상태 변경 지원</em>
        </summary>

        <div className="admin-ops-flags" aria-label="운영 환경 플래그">
          {flags.map((flag) => (
            <span key={flag.label} className={flag.ready ? "ready" : "locked"}>
              {flag.icon}
              <b>{flag.label}</b>
              <small>{flag.value}</small>
            </span>
          ))}
        </div>

        <div className="admin-ops-foot">
          <span>{supportedCount}개 상태 변경 동작</span>
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
