"use client";

import { useEffect, useState } from "react";
import {
  PIF_APPLICATIONS_STORAGE_KEY,
  derivePifDemoStatus,
  parsePifApplications,
  pifStatusLabels,
  type PifApplication
} from "@/lib/pif-application";
import type { PifRequestStorage } from "@/lib/pif-requests";

export function AdminPifQueue({
  initialApplications = [],
  storage = "disabled"
}: {
  initialApplications?: PifApplication[];
  storage?: PifRequestStorage;
}) {
  const [applications, setApplications] = useState<PifApplication[]>(initialApplications);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const localApplications = parsePifApplications(window.localStorage.getItem(PIF_APPLICATIONS_STORAGE_KEY));
    const merged = new Map<string, PifApplication>();
    for (const application of localApplications) merged.set(application.id, application);
    for (const application of initialApplications) merged.set(application.id, application);
    setApplications([...merged.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
    setLoaded(true);
  }, [initialApplications]);

  if (!loaded) return <p className="admin-note">PIF 신청 큐를 불러오는 중입니다.</p>;

  if (!applications.length) {
    return (
      <p className="admin-note">
        아직 접수된 PIF 신청이 없습니다. 고객이 /workspace/pif에서 제출하면 Supabase 운영 큐 또는 브라우저 백업 큐에 표시됩니다.
      </p>
    );
  }

  return (
    <div className="admin-pif-list">
      {applications.map((application) => {
        const view = application.serverQueueState === "queued" ? { status: application.status, revisionNotes: [] } : derivePifDemoStatus(application);
        const storedFiles = application.attachments.filter((item) => item.storagePath).length;
        return (
          <div key={application.id} className={`admin-pif-row ${view.status}`}>
            <div>
              <b>{application.productName}</b>
              <span>
                {application.brandName || "브랜드 미입력"} · {application.contactEmail || "연락처 미입력"} ·{" "}
                {new Date(application.createdAt).toLocaleString("ko-KR", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
              <small>
                첨부 {application.attachments.length}개
                {application.attachments.length > 0 && `: ${application.attachments.map((item) => item.fileName).slice(0, 4).join(", ")}`}
                {view.revisionNotes.length > 0 && ` · ${view.revisionNotes[0]}`}
              </small>
              <small>
                {storage === "database" && application.serverQueueState === "queued"
                  ? "Supabase 운영 큐"
                  : application.serverQueueState === "local_only"
                    ? "브라우저 임시 저장"
                    : "서버 미리보기"}
                {application.attachments.length > 0
                  ? storedFiles > 0
                    ? ` · 원본 파일 ${storedFiles}개 저장됨`
                    : " · 파일 메타데이터만 있음"
                  : ""}
              </small>
            </div>
            <em>{pifStatusLabels[view.status]}</em>
          </div>
        );
      })}
    </div>
  );
}
