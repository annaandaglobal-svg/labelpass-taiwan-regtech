"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Handshake,
  Loader2,
  Paperclip,
  Send,
  ShieldCheck
} from "lucide-react";
import {
  MAX_PIF_APPLICATIONS,
  PIF_APPLICATIONS_STORAGE_KEY,
  derivePifDemoStatus,
  parsePifApplications,
  pifReadiness,
  pifRequirementsByTier,
  pifStatusLabels,
  pifTierCopy,
  type PifApplication,
  type PifApplicationStatus,
  type PifAttachmentMeta,
  type PifDocumentTier
} from "@/lib/pif-application";

const tierOrder: PifDocumentTier[] = ["required", "recommended", "deferrable"];

type PendingPifAttachment = PifAttachmentMeta & {
  clientId: string;
  file?: File;
};

const statusRail: Array<{ status: PifApplicationStatus; label: string }> = [
  { status: "submitted", label: "접수" },
  { status: "in_review", label: "검토" },
  { status: "needs_revision", label: "보완" },
  { status: "accepted", label: "완료" }
];

function applicationView(application: PifApplication): { status: PifApplicationStatus; revisionNotes: string[] } {
  if (application.serverQueueState === "queued") return { status: application.status, revisionNotes: [] };
  return derivePifDemoStatus(application);
}

function statusRank(status: PifApplicationStatus) {
  if (status === "submitted" || status === "draft") return 0;
  if (status === "in_review") return 1;
  if (status === "needs_revision") return 2;
  return 3;
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function publicAttachment(attachment: PendingPifAttachment): PifAttachmentMeta {
  const { clientId: _clientId, file: _file, ...rest } = attachment;
  return rest;
}

export function PifClient() {
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [taiwanImporter, setTaiwanImporter] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<PendingPifAttachment[]>([]);
  const [applications, setApplications] = useState<PifApplication[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const raw = window.localStorage.getItem(PIF_APPLICATIONS_STORAGE_KEY);
    setApplications(parsePifApplications(raw).slice(0, MAX_PIF_APPLICATIONS));
    const params = new URLSearchParams(window.location.search);
    const product = params.get("product");
    if (product?.trim()) setProductName(product.trim());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const readiness = useMemo(() => pifReadiness(checked, attachments), [checked, attachments]);
  const isBusy = isSubmitting || attachments.some((item) => item.uploadState === "uploading");

  function toggleChecked(requirementId: string) {
    setChecked((current) =>
      current.includes(requirementId) ? current.filter((id) => id !== requirementId) : [...current, requirementId]
    );
  }

  function patchAttachment(clientId: string, patch: Partial<PendingPifAttachment>) {
    setAttachments((current) => current.map((item) => (item.clientId === clientId ? { ...item, ...patch } : item)));
  }

  function attachFiles(requirementId: string, files: FileList | null) {
    if (!files?.length) return;
    const now = new Date().toISOString();
    const next = Array.from(files).map((file) => ({
      clientId: newId(),
      requirementId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      attachedAt: now,
      uploadState: "pending" as const,
      file
    }));
    setAttachments((current) => [
      ...current.filter((item) => !(item.requirementId === requirementId && next.some((n) => n.fileName === item.fileName))),
      ...next
    ]);
    const input = fileInputRefs.current[requirementId];
    if (input) input.value = "";
  }

  function removeAttachment(requirementId: string, fileName: string) {
    setAttachments((current) => current.filter((item) => !(item.requirementId === requirementId && item.fileName === fileName)));
  }

  async function uploadAttachment(applicationId: string, attachment: PendingPifAttachment): Promise<PendingPifAttachment> {
    if (!attachment.file || attachment.storagePath) return attachment;

    patchAttachment(attachment.clientId, { uploadState: "uploading", uploadError: undefined });
    const formData = new FormData();
    formData.append("applicationId", applicationId);
    formData.append("requirementId", attachment.requirementId);
    formData.append("file", attachment.file);

    try {
      const response = await fetch("/api/pif/attachments", {
        method: "POST",
        body: formData
      });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.ok) {
        const uploaded: PendingPifAttachment = {
          ...attachment,
          storageBucket: body.bucket,
          storagePath: body.storagePath,
          uploadedAt: body.uploadedAt,
          uploadState: "uploaded"
        };
        patchAttachment(attachment.clientId, uploaded);
        return uploaded;
      }

      const failed: PendingPifAttachment = {
        ...attachment,
        uploadState: response.status === 503 ? "metadata_only" : "failed",
        uploadError: body?.message || body?.error || "파일 원본 업로드가 완료되지 않았습니다."
      };
      patchAttachment(attachment.clientId, failed);
      return failed;
    } catch {
      const failed: PendingPifAttachment = {
        ...attachment,
        uploadState: "failed",
        uploadError: "파일 원본 업로드 중 네트워크 문제가 발생했습니다."
      };
      patchAttachment(attachment.clientId, failed);
      return failed;
    }
  }

  async function submitApplication() {
    if (!productName.trim()) {
      setToast("제품명을 입력해 주세요.");
      return;
    }
    if (!readiness.canSubmit) {
      setToast(`필수 자료 ${readiness.missingRequired.length}개가 아직 준비되지 않았습니다. 체크하거나 파일을 첨부해 주세요.`);
      return;
    }

    setIsSubmitting(true);
    const applicationId = newId();
    const uploadedAttachments = await Promise.all(attachments.map((attachment) => uploadAttachment(applicationId, attachment)));
    const publicAttachments = uploadedAttachments.map(publicAttachment);
    const application: PifApplication = {
      id: applicationId,
      createdAt: new Date().toISOString(),
      productName: productName.trim(),
      brandName: brandName.trim(),
      productCategory: "cosmetic / Taiwan PIF",
      taiwanImporter: taiwanImporter.trim(),
      contactEmail: contactEmail.trim(),
      note: note.trim(),
      status: "submitted",
      checkedRequirements: checked,
      attachments: publicAttachments,
      serverQueueState: "local_only"
    };

    let serverMessage = "";
    try {
      const response = await fetch("/api/pif/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ application, requestId: `pif-${application.id}` })
      });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.ok) {
        application.serverQueueState = body.applied ? "queued" : "preview_only";
        serverMessage = body.applied ? "운영 큐에 접수되었습니다." : "서버 미리보기로 확인되었습니다.";
      } else {
        const dryRun = await fetch("/api/pif/applications?dryRun=1", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ application, requestId: `pif-${application.id}` })
        });
        const dryRunBody = await dryRun.json().catch(() => null);
        if (dryRun.ok && dryRunBody?.ok) {
          application.serverQueueState = "preview_only";
          serverMessage = "운영 저장은 대기 중이라 브라우저 백업으로 보관했습니다.";
        }
      }
    } catch {
      application.serverQueueState = "local_only";
      serverMessage = "네트워크 문제로 브라우저 백업에 보관했습니다.";
    }

    const nextApplications = [application, ...applications].slice(0, MAX_PIF_APPLICATIONS);
    setApplications(nextApplications);
    window.localStorage.setItem(PIF_APPLICATIONS_STORAGE_KEY, JSON.stringify(nextApplications));
    setIsSubmitting(false);
    setToast(
      application.serverQueueState === "queued"
        ? `PIF 신청이 접수되었습니다. ${serverMessage}`
        : `PIF 신청 초안은 보관되었습니다. ${serverMessage || "Supabase 쓰기 설정을 켜면 운영 큐로 바로 들어갑니다."}`
    );
    setChecked([]);
    setAttachments([]);
    setNote("");
  }

  return (
    <section className="lp-main workspace-main pif-main">
      <header className="workspace-topbar">
        <div>
          <p>대만 화장품 PIF 신청</p>
          <h1>제품 자료를 올리면 운영자가 PIF 접수 가능 여부와 보완 항목을 확인합니다.</h1>
        </div>
        <div className="workspace-topbar-actions">
          <Link className="workspace-button" href="/workspace">
            <ClipboardCheck size={15} />
            워크스페이스
          </Link>
          <Link className="workspace-button" href="/workspace/experts">
            <Handshake size={15} />
            전문가 상담
          </Link>
        </div>
      </header>

      <div className="pif-layout">
        <section className="workspace-panel pif-checklist-panel">
          <div className="workspace-panel-head">
            <div>
              <span>서류 체크리스트</span>
              <h2>필수 {readiness.requiredReady}/{readiness.requiredTotal} 준비됨</h2>
            </div>
            <ShieldCheck size={18} />
          </div>

          {tierOrder.map((tier) => {
            const copy = pifTierCopy[tier];
            const items = pifRequirementsByTier(tier);
            return (
              <div key={tier} className={`pif-tier ${copy.tone}`}>
                <div className="pif-tier-head">
                  <b>{copy.label}</b>
                  <small>{copy.detail}</small>
                </div>
                <div className="pif-req-list">
                  {items.map((item) => {
                    const itemAttachments = attachments.filter((a) => a.requirementId === item.id);
                    const isReady = checked.includes(item.id) || itemAttachments.length > 0;
                    return (
                      <div key={item.id} className={`pif-req ${isReady ? "ready" : ""}`}>
                        <button
                          type="button"
                          className="pif-req-toggle"
                          aria-pressed={isReady}
                          onClick={() => toggleChecked(item.id)}
                        >
                          {isReady ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
                          <span>
                            <b>{item.label}</b>
                            {item.officialName && <i className="pif-req-official">{item.officialName}</i>}
                            {item.spec && (
                              <small className="pif-req-spec">
                                <i>규격</i>
                                {item.spec}
                              </small>
                            )}
                            <small>{item.detail}</small>
                          </span>
                          <em>{isReady ? "준비됨" : "필요"}</em>
                        </button>
                        <div className="pif-req-files">
                          <label className="pif-attach">
                            <input
                              ref={(node) => {
                                fileInputRefs.current[item.id] = node;
                              }}
                              type="file"
                              multiple
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*"
                              onChange={(event) => attachFiles(item.id, event.currentTarget.files)}
                            />
                            <Paperclip size={13} />
                            파일 첨부
                          </label>
                          {itemAttachments.map((file) => (
                            <span key={`${item.id}-${file.clientId}`} className="pif-file-chip">
                              <FileText size={12} />
                              {file.fileName}
                              {file.uploadState === "uploading" && " 업로드 중"}
                              {file.uploadState === "uploaded" && " 저장됨"}
                              {file.uploadState === "metadata_only" && " 메타만"}
                              {file.uploadState === "failed" && " 실패"}
                              <button type="button" aria-label={`${file.fileName} 제거`} onClick={() => removeAttachment(item.id, file.fileName)}>
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <aside className="pif-side">
          <section className="workspace-panel">
            <div className="workspace-panel-head">
              <div>
                <span>신청 정보</span>
                <h2>제품과 연락처</h2>
              </div>
              <FileText size={18} />
            </div>
            <div className="pif-form">
              <label className="lp-field">
                <span>제품명*</span>
                <input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="예: Cica Barrier Cream 50ml" />
              </label>
              <label className="lp-field">
                <span>브랜드명</span>
                <input value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder="브랜드명" />
              </label>
              <label className="lp-field">
                <span>대만 수입자</span>
                <input value={taiwanImporter} onChange={(event) => setTaiwanImporter(event.target.value)} placeholder="수입자 또는 예정 파트너" />
              </label>
              <label className="lp-field">
                <span>연락 이메일</span>
                <input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="you@company.com" />
              </label>
              <label className="lp-field">
                <span>메모</span>
                <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="일정, 수출 목적, 이미 받은 보완 요청 등을 적어 주세요." />
              </label>
              <button className="lp-button" type="button" onClick={() => void submitApplication()} disabled={isBusy}>
                {isBusy ? <Loader2 className="lp-spin" size={16} /> : <Send size={16} />}
                PIF 신청 접수
              </button>
              <small className="pif-form-note">
                원본 파일은 Supabase Storage가 설정되어 있으면 서버에 저장됩니다. 설정 전에는 파일명과 크기만 기록하고 브라우저 백업에 남깁니다.
              </small>
            </div>
          </section>

          <section className="workspace-panel">
            <div className="workspace-panel-head">
              <div>
                <span>최근 신청</span>
                <h2>PIF 신청 상태</h2>
              </div>
              <ClipboardCheck size={18} />
            </div>
            <div className="pif-app-list">
              {applications.length ? (
                applications.map((application) => {
                  const view = applicationView(application);
                  const rank = statusRank(view.status);
                  return (
                    <div key={application.id} className={`pif-app-row ${view.status}`}>
                      <b>{application.productName}</b>
                      <span>
                        {pifStatusLabels[view.status]} · 첨부 {application.attachments.length}개 ·{" "}
                        {new Date(application.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                      <div className="pif-status-rail" aria-label="신청 처리 단계">
                        {statusRail.map((step, index) => {
                          const isSkippedRevision = step.status === "needs_revision" && view.status !== "needs_revision";
                          const tone =
                            index < rank ? "done" : index === rank ? (view.status === "needs_revision" ? "hold" : "now") : "";
                          return (
                            <em key={step.status} className={`${tone} ${isSkippedRevision && index !== rank ? "optional" : ""}`}>
                              {step.label}
                            </em>
                          );
                        })}
                      </div>
                      {view.revisionNotes.map((noteText) => (
                        <small key={noteText} className="pif-revision-note">
                          {noteText}
                        </small>
                      ))}
                      <small>
                        {application.serverQueueState === "queued"
                          ? "운영 큐에 접수됨"
                          : application.serverQueueState === "preview_only"
                            ? "서버 미리보기 확인, 브라우저 백업 보관"
                            : "브라우저 백업 보관"}
                      </small>
                    </div>
                  );
                })
              ) : (
                <span className="pif-empty">아직 제출한 PIF 신청이 없습니다.</span>
              )}
            </div>
            <Link className="workspace-wide-link" href="/workspace/experts">
              <Handshake size={15} />
              PIF 전문가 상담으로 이어가기
              <ArrowRight size={14} />
            </Link>
          </section>
        </aside>
      </div>

      {toast && <div className="lp-toast">{toast}</div>}
    </section>
  );
}
