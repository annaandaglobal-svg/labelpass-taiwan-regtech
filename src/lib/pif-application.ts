import { licensingCategoryById } from "@/lib/licensing-documents";

export const PIF_APPLICATIONS_STORAGE_KEY = "labelpass-pif-applications";
export const MAX_PIF_APPLICATIONS = 8;

export type PifDocumentTier = "required" | "recommended" | "deferrable";

export type PifDocumentRequirement = {
  id: string;
  tier: PifDocumentTier;
  label: string;
  detail: string;
  officialName?: string;
  spec?: string;
  documentType: "pif" | "label" | "coa" | "certificate" | "other";
};

export type PifAttachmentMeta = {
  requirementId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  attachedAt: string;
  storageBucket?: string;
  storagePath?: string;
  uploadedAt?: string;
  uploadState?: "pending" | "uploading" | "uploaded" | "failed" | "metadata_only";
  uploadError?: string;
};

export type PifApplicationStatus = "draft" | "submitted" | "in_review" | "needs_revision" | "accepted";

export type PifApplication = {
  id: string;
  createdAt: string;
  productName: string;
  brandName: string;
  productCategory: string;
  taiwanImporter: string;
  contactEmail: string;
  note: string;
  status: PifApplicationStatus;
  checkedRequirements: string[];
  attachments: PifAttachmentMeta[];
  serverQueueState: "queued" | "preview_only" | "local_only";
};

export const pifStatusLabels: Record<PifApplicationStatus, string> = {
  draft: "작성 중",
  submitted: "접수됨",
  in_review: "검토 중",
  needs_revision: "보완 요청",
  accepted: "접수 완료"
};

export const pifTierCopy: Record<PifDocumentTier, { label: string; detail: string; tone: string }> = {
  required: {
    label: "필수",
    detail: "대만 화장품 PIF 접수 전 먼저 갖춰야 하는 자료입니다. 빠지면 보완 요청 가능성이 높습니다.",
    tone: "danger"
  },
  recommended: {
    label: "권장",
    detail: "효능 표현, 성분 안전성, 제조 근거를 설명할 때 도움이 되는 자료입니다.",
    tone: "warn"
  },
  deferrable: {
    label: "후속 보완",
    detail: "초기 접수 뒤 운영자 또는 전문가 검토 과정에서 추가로 정리할 수 있는 자료입니다.",
    tone: "info"
  }
};

// PIF document types keyed by the shared licensing document id, so the PIF checklist and
// the /licensing reference stay in sync from one source of truth (licensing-documents.ts).
const cosmeticPifDocumentTypes: Record<string, PifDocumentRequirement["documentType"]> = {
  "product-basic": "pif",
  "full-formula": "pif",
  "chinese-label": "label",
  "safety-assessment": "pif",
  gmp: "certificate",
  "product-listing": "certificate",
  coa: "coa",
  "claim-evidence": "other",
  stability: "other",
  "adverse-sop": "other"
};

// Derived from the cosmetic-PIF licensing category so each requirement carries the
// official 中文/EN document name and 규격·형식 spec alongside the working label.
export const pifDocumentRequirements: PifDocumentRequirement[] = (licensingCategoryById("cosmetic-pif")?.documents ?? []).map(
  (document) => ({
    id: document.id,
    tier: document.tier,
    label: document.label,
    detail: document.detail,
    officialName: document.officialName,
    spec: document.spec,
    documentType: cosmeticPifDocumentTypes[document.id] ?? "other"
  })
);

export function pifRequirementsByTier(tier: PifDocumentTier) {
  return pifDocumentRequirements.filter((item) => item.tier === tier);
}

export function pifReadiness(checkedRequirements: string[], attachments: PifAttachmentMeta[]) {
  const covered = new Set([...checkedRequirements, ...attachments.map((item) => item.requirementId)]);
  const required = pifRequirementsByTier("required");
  const readyRequired = required.filter((item) => covered.has(item.id));
  return {
    requiredTotal: required.length,
    requiredReady: readyRequired.length,
    canSubmit: readyRequired.length === required.length,
    missingRequired: required.filter((item) => !covered.has(item.id))
  };
}

export function derivePifDemoStatus(
  application: PifApplication,
  now = Date.now()
): {
  status: PifApplicationStatus;
  revisionNotes: string[];
} {
  const createdAt = Date.parse(application.createdAt);
  const ageMs = Number.isFinite(createdAt) ? now - createdAt : 0;

  if (ageMs < 60_000) return { status: "submitted", revisionNotes: [] };
  if (ageMs < 180_000) return { status: "in_review", revisionNotes: [] };

  const covered = new Set([
    ...application.checkedRequirements,
    ...application.attachments.map((item) => item.requirementId)
  ]);
  const missingRequiredAttachments = pifRequirementsByTier("required").filter(
    (item) => !application.attachments.some((attachment) => attachment.requirementId === item.id)
  );
  const missingRecommended = pifRequirementsByTier("recommended").filter((item) => !covered.has(item.id));

  if (application.attachments.length === 0) {
    return {
      status: "needs_revision",
      revisionNotes: ["첨부파일이 없어 원본 자료 확인이 필요합니다. 필수 항목별 파일을 올려 주세요."]
    };
  }
  if (missingRequiredAttachments.length > 2) {
    return {
      status: "needs_revision",
      revisionNotes: [`필수 항목 ${missingRequiredAttachments.length}개에 파일 첨부가 필요합니다: ${missingRequiredAttachments.map((item) => item.label).join(", ")}`]
    };
  }
  if (missingRecommended.length >= 2) {
    return {
      status: "needs_revision",
      revisionNotes: [`권장 자료를 보강하면 검토가 빨라집니다: ${missingRecommended.map((item) => item.label).join(", ")}`]
    };
  }
  return { status: "accepted", revisionNotes: [] };
}

export const pifStatusFlow: PifApplicationStatus[] = ["submitted", "in_review", "needs_revision", "accepted"];

export function parsePifApplications(raw: string | null): PifApplication[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PifApplication => {
      return (
        item &&
        typeof item.id === "string" &&
        typeof item.productName === "string" &&
        typeof item.status === "string" &&
        Array.isArray(item.checkedRequirements) &&
        Array.isArray(item.attachments)
      );
    });
  } catch {
    return [];
  }
}
