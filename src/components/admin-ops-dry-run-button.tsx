"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, PlayCircle, TriangleAlert } from "lucide-react";

type DryRunState =
  | { status: "idle"; message: string }
  | { status: "running"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const dryRunPayload = {
  action: "expert_match_status",
  id: "00000000-0000-4000-8000-000000000001",
  status: "matched",
  requestId: "admin-dashboard-dry-run",
  note: "dashboard dry-run check"
};

export function AdminOpsDryRunButton() {
  const [state, setState] = useState<DryRunState>({
    status: "idle",
    message: "실제 데이터 변경 없이 운영 액션 API를 점검합니다."
  });
  const [isPending, startTransition] = useTransition();

  function runDryRun() {
    setState({ status: "running", message: "dry-run 요청 중입니다." });
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/ops/actions?dryRun=1", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(dryRunPayload)
        });
        const body = await response.json();

        if (!response.ok || body?.dryRun !== true || body?.applied !== false) {
          setState({ status: "error", message: "dry-run 응답이 예상과 다릅니다. 배포 점검을 확인하세요." });
          return;
        }

        setState({
          status: "success",
          message: `dry-run 정상: ${body.storage ?? "unknown"} / ${body.action ?? "admin action"}`
        });
      } catch {
        setState({ status: "error", message: "dry-run 요청에 실패했습니다. 네트워크 또는 배포 상태를 확인하세요." });
      }
    });
  }

  const Icon = state.status === "success" ? CheckCircle2 : state.status === "error" ? TriangleAlert : PlayCircle;

  return (
    <div className={`admin-ops-dry-run ${state.status}`}>
      <button type="button" onClick={runDryRun} disabled={isPending || state.status === "running"}>
        {isPending || state.status === "running" ? <Loader2 size={15} /> : <Icon size={15} />}
        Dry-run
      </button>
      <span>{state.message}</span>
    </div>
  );
}
