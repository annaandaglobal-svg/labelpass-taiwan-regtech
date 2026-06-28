"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Play, TriangleAlert } from "lucide-react";

type AdminOpsAction =
  | "expert_match_status"
  | "payment_status"
  | "chat_thread_status"
  | "logistics_match_status"
  | "shipment_request_status"
  | "shipment_status"
  | "shipment_event";

type AdminRowActionDryRunProps = {
  action: AdminOpsAction;
  id?: string;
  shipmentId?: string;
  status?: string;
  eventType?: string;
  message?: string;
  note?: string;
  requestId: string;
  label?: string;
  fallbackUuid?: string;
};

type DryRunState = "idle" | "success" | "error";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const defaultFallbackUuid = "00000000-0000-4000-8000-000000000001";

function isUuid(value: string | undefined) {
  return Boolean(value && uuidPattern.test(value));
}

export function AdminRowActionDryRun({
  action,
  id,
  shipmentId,
  status,
  eventType = "note",
  message = "Admin dry-run check",
  note,
  requestId,
  label = "상태 dry-run",
  fallbackUuid = defaultFallbackUuid
}: AdminRowActionDryRunProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<DryRunState>("idle");
  const [summary, setSummary] = useState(isUuid(id ?? shipmentId) ? "실제 행 ID로 안전 확인" : "샘플 행은 dry-run 전용");
  const [auditNote, setAuditNote] = useState(note ?? "");
  const rawTargetId = id ?? shipmentId;
  const usingSyntheticTarget = !isUuid(rawTargetId);
  const targetId = usingSyntheticTarget ? fallbackUuid : rawTargetId ?? fallbackUuid;
  const normalizedNote = auditNote.trim() || note || `${action} ${status ?? eventType} dry-run`;

  function runDryRun() {
    startTransition(async () => {
      setState("idle");
      setSummary("확인 중");

      const basePayload = {
        action,
        requestId,
        note: normalizedNote,
        metadata: {
          source: "admin_row_action",
          syntheticTarget: usingSyntheticTarget,
          ui: "compact",
          confirmation: "operator_note_required"
        }
      };
      const payload =
        action === "shipment_event"
          ? { ...basePayload, shipmentId: targetId, eventType, status, message }
          : { ...basePayload, id: targetId, status };

      try {
        const response = await fetch("/api/admin/ops/actions?dryRun=1", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.ok === false) {
          setState("error");
          setSummary(data?.error === "not_found" ? "실제 행을 찾지 못함" : "확인 실패");
          return;
        }

        setState("success");
        setSummary(data?.storage === "database" ? "DB dry-run 통과" : "안전장치 통과");
      } catch {
        setState("error");
        setSummary("네트워크 확인 필요");
      }
    });
  }

  const Icon = isPending ? Loader2 : state === "success" ? CheckCircle2 : state === "error" ? TriangleAlert : Play;

  return (
    <details className={`admin-row-action ${state}`}>
      <summary>
        <Icon size={12} aria-hidden="true" />
        <span>{state === "idle" ? "액션 검증" : summary}</span>
      </summary>
      <label className="admin-row-action-note">
        <span>운영 메모</span>
        <input
          value={auditNote}
          onChange={(event) => setAuditNote(event.target.value)}
          maxLength={180}
          placeholder="변경 사유 또는 확인 메모"
        />
      </label>
      <div className="admin-row-action-buttons">
        <button type="button" onClick={runDryRun} disabled={isPending} aria-label={label}>
          <Icon size={13} aria-hidden="true" />
          {label}
        </button>
      </div>
      <small>{summary}. 실제 반영은 설정의 관리자 DB 쓰기 토큰을 켠 뒤 활성화됩니다.</small>
    </details>
  );
}
