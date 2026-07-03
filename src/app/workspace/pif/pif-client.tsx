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
  parsePifApplications,
  pifReadiness,
  pifRequirementsByTier,
  pifStatusLabels,
  pifTierCopy,
  type PifApplication,
  type PifAttachmentMeta,
  type PifDocumentTier
} from "@/lib/pif-application";

const tierOrder: PifDocumentTier[] = ["required", "recommended", "deferrable"];

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PifClient() {
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [taiwanImporter, setTaiwanImporter] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<PifAttachmentMeta[]>([]);
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
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const readiness = useMemo(() => pifReadiness(checked, attachments), [checked, attachments]);

  function toggleChecked(requirementId: string) {
    setChecked((current) =>
      current.includes(requirementId) ? current.filter((id) => id !== requirementId) : [...current, requirementId]
    );
  }

  function attachFiles(requirementId: string, files: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({
      requirementId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      attachedAt: new Date().toISOString()
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

  async function submitApplication() {
    if (!productName.trim()) {
      setToast("제품명을 입력해주세요.");
      return;
    }
    if (!readiness.canSubmit) {
      setToast(`필수 자료 ${readiness.missingRequired.length}개가 아직 준비 전입니다. 준비됨 표시 또는 파일 첨부 후 제출하세요.`);
      return;
    }

    const application: PifApplication = {
      id: newId(),
      createdAt: new Date().toISOString(),
      productName: productName.trim(),
      brandName: brandName.trim(),
      productCategory: "cosmetic / Taiwan PIF",
      taiwanImporter: taiwanImporter.trim(),
      contactEmail: contactEmail.trim(),
      note: note.trim(),
      status: "submitted",
      checkedRequirements: checked,
      attachments,
      serverQueueState: "local_only"
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/pif/applications?dryRun=1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ application, requestId: `pif-${application.id}` })
      });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.ok) {
        application.serverQueueState = Array.isArray(body.warnings) && body.warnings.length > 0 ? "preview_only" : "queued";
      }
    } catch {
      application.serverQueueState = "local_only";
    }

    const nextApplications = [application, ...applications].slice(0, MAX_PIF_APPLICATIONS);
    setApplications(nextApplications);
    window.localStorage.setItem(PIF_APPLICATIONS_STORAGE_KEY, JSON.stringify(nextApplications));
    setIsSubmitting(false);
    setToast(
      application.serverQueueState === "queued"
        ? "PIF 신청이 접수됐습니다. 운영팀이 자료를 확인한 뒤 연락드립니다."
        : "PIF 신청을 저장했습니다. 지금은 데모 접수 모드라 이 브라우저와 운영 프리뷰 큐에 기록됩니다."
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
          <h1>PIF에 필요한 자료를 확인하고, 준비된 자료를 첨부해 신청하세요.</h1>
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
              <span>자료 체크리스트</span>
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
                            <small>{item.detail}</small>
                          </span>
                          <em>{isReady ? "준비됨" : "준비 전"}</em>
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
                            <span key={`${item.id}-${file.fileName}`} className="pif-file-chip">
                              <FileText size={12} />
                              {file.fileName}
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
                <h2>제품과 담당자</h2>
              </div>
              <FileText size={18} />
            </div>
            <div className="pif-form">
              <label className="lp-field">
                <span>제품명 *</span>
                <input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="예: Cica Barrier Cream 50ml" />
              </label>
              <label className="lp-field">
                <span>브랜드</span>
                <input value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder="브랜드명" />
              </label>
              <label className="lp-field">
                <span>대만 수입자·책임업체</span>
                <input value={taiwanImporter} onChange={(event) => setTaiwanImporter(event.target.value)} placeholder="미정이면 비워두세요" />
              </label>
              <label className="lp-field">
                <span>연락 이메일</span>
                <input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="you@company.com" />
              </label>
              <label className="lp-field">
                <span>요청 메모</span>
                <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="일정, 궁금한 점, 특이사항을 남겨주세요." />
              </label>
              <button className="lp-button" type="button" onClick={() => void submitApplication()} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="lp-spin" size={16} /> : <Send size={16} />}
                PIF 신청 제출
              </button>
              <small className="pif-form-note">
                첨부 파일 원본은 저장소 연결 전까지 이 브라우저에만 남고, 신청서에는 파일 이름과 목록이 기록됩니다. 제출하면
                운영팀 확인 후 이메일로 다음 단계를 안내합니다.
              </small>
            </div>
          </section>

          <section className="workspace-panel">
            <div className="workspace-panel-head">
              <div>
                <span>내 신청</span>
                <h2>PIF 신청 상태</h2>
              </div>
              <ClipboardCheck size={18} />
            </div>
            <div className="pif-app-list">
              {applications.length ? (
                applications.map((application) => (
                  <div key={application.id} className="pif-app-row">
                    <b>{application.productName}</b>
                    <span>
                      {pifStatusLabels[application.status]} · 첨부 {application.attachments.length}개 ·{" "}
                      {new Date(application.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                    <small>
                      {application.serverQueueState === "queued"
                        ? "운영 큐에 접수됨"
                        : application.serverQueueState === "preview_only"
                          ? "데모 접수 (운영 DB 연결 전)"
                          : "이 브라우저에 저장됨"}
                    </small>
                  </div>
                ))
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
