"use client";

import Link from "next/link";
import { CreditCard, Handshake, PackageCheck, Truck } from "lucide-react";
import { HANDOFF_DRAFTS_STORAGE_KEY, parseHandoffDrafts, type HandoffDraft } from "@/lib/handoff-drafts";
import { useEffect, useState } from "react";

function priorityLabel(priority: HandoffDraft["priority"]) {
  if (priority === "blocked") return "출시 보류";
  if (priority === "collect_documents") return "자료 필요";
  if (priority === "revise_label") return "라벨 수정";
  return "보관";
}

export function WorkspaceHandoffDrafts() {
  const [drafts, setDrafts] = useState<HandoffDraft[]>([]);

  useEffect(() => {
    const parsed = parseHandoffDrafts(window.localStorage.getItem(HANDOFF_DRAFTS_STORAGE_KEY));
    setDrafts(parsed.slice(0, 4));
  }, []);

  return (
    <article className="workspace-panel workspace-draft-panel" aria-label="저장된 의뢰 초안">
      <div className="workspace-panel-head">
        <div>
          <span>의뢰 초안</span>
          <h2>검토 결과에서 저장한 상담·결제·물류 요청</h2>
        </div>
        <PackageCheck size={18} />
      </div>

      {drafts.length ? (
        <div className="workspace-draft-list">
          {drafts.map((draft) => (
            <section key={draft.id} className={`workspace-draft-row ${draft.priority}`}>
              <span>{priorityLabel(draft.priority)}</span>
              <div>
                <b>{draft.productName}</b>
                <small>{draft.routeLabel} / {draft.score}점 / 증빙 {draft.neededDocuments}개</small>
              </div>
              <p>{draft.nextAction}</p>
              <div className="workspace-draft-tags">
                {draft.expertScope.slice(0, 3).map((scope) => (
                  <em key={`${draft.id}-${scope}`}>{scope}</em>
                ))}
              </div>
              <div className="workspace-draft-actions">
                <Link href="/workspace#expert-cases">
                  <Handshake size={13} />
                  상담
                </Link>
                <Link href="/workspace#expert-cases">
                  <CreditCard size={13} />
                  결제
                </Link>
                <Link href="/workspace#shipment-events">
                  <Truck size={13} />
                  물류
                </Link>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="workspace-draft-empty">
          <b>아직 저장된 의뢰 초안이 없습니다.</b>
          <span>검토 결과에서 초안을 저장하면 상담 범위, 결제 gate, 물류 증빙이 이곳에 정리됩니다.</span>
        </div>
      )}
    </article>
  );
}
