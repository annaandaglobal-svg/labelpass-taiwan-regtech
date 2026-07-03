"use client";

// 운영자용 PIF 신청 목록.
// 운영 DB가 연결되기 전에는 이 브라우저에서 제출된 데모 신청(localStorage)을
// 그대로 보여줘서 접수 → 검토 → 보완요청 → 완료 흐름을 운영자 화면에서도
// 확인할 수 있게 합니다. DB 연결 후에는 products/product_documents 큐로 대체됩니다.

import { useEffect, useState } from "react";
import {
  PIF_APPLICATIONS_STORAGE_KEY,
  derivePifDemoStatus,
  parsePifApplications,
  pifStatusLabels,
  type PifApplication
} from "@/lib/pif-application";

export function AdminPifQueue() {
  const [applications, setApplications] = useState<PifApplication[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setApplications(parsePifApplications(window.localStorage.getItem(PIF_APPLICATIONS_STORAGE_KEY)));
    setLoaded(true);
  }, []);

  if (!loaded) return <p className="admin-note">PIF 신청 데이터를 불러오는 중입니다.</p>;

  if (!applications.length) {
    return (
      <p className="admin-note">
        이 브라우저에서 제출된 PIF 신청이 아직 없습니다. 고객 화면 /workspace/pif 에서 제출하면 여기 큐에 나타납니다.
      </p>
    );
  }

  return (
    <div className="admin-pif-list">
      {applications.map((application) => {
        const view = application.serverQueueState === "queued" ? { status: application.status, revisionNotes: [] } : derivePifDemoStatus(application);
        return (
          <div key={application.id} className={`admin-pif-row ${view.status}`}>
            <div>
              <b>{application.productName}</b>
              <span>
                {application.brandName || "브랜드 미기재"} · {application.contactEmail || "이메일 미기재"} ·{" "}
                {new Date(application.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
              <small>
                첨부 {application.attachments.length}개
                {application.attachments.length > 0 && `: ${application.attachments.map((item) => item.fileName).slice(0, 4).join(", ")}`}
                {view.revisionNotes.length > 0 && ` · ${view.revisionNotes[0]}`}
              </small>
            </div>
            <em>{pifStatusLabels[view.status]}</em>
          </div>
        );
      })}
    </div>
  );
}
