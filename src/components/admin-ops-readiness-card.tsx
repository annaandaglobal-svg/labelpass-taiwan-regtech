import { Database, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
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
        <b>{storageLabels[readiness.storage]}</b>
        <small>
          {readiness.writesReady
            ? "전문가, 결제, 채팅, 물류, 선적 상태 변경이 감사 로그와 함께 적용됩니다."
            : "실제 운영 데이터 변경은 잠겨 있고 dry-run만 가능합니다."}
        </small>
      </div>

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

      <AdminOpsDryRunButton />
    </article>
  );
}
