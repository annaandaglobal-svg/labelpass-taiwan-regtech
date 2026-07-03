export const PIF_APPLICATIONS_STORAGE_KEY = "labelpass-pif-applications";
export const MAX_PIF_APPLICATIONS = 8;

export type PifDocumentTier = "required" | "recommended" | "deferrable";

export type PifDocumentRequirement = {
  id: string;
  tier: PifDocumentTier;
  label: string;
  detail: string;
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

export const pifDocumentRequirements: PifDocumentRequirement[] = [
  {
    id: "product-basic",
    tier: "required",
    label: "제품 기본정보",
    detail: "제품명, 브랜드명, 용량, 제조사, 수입자, 사용 부위와 사용 방법을 확인합니다.",
    documentType: "pif"
  },
  {
    id: "full-formula",
    tier: "required",
    label: "전성분표와 배합비",
    detail: "INCI 또는 원료명, 함량(%), 배합 목적을 포함한 전성분 자료가 필요합니다.",
    documentType: "pif"
  },
  {
    id: "label-artwork",
    tier: "required",
    label: "라벨 시안",
    detail: "제품명, 전성분, 사용법, 주의문구, 용량, 제조·수입자 표시가 보이는 라벨 파일입니다.",
    documentType: "label"
  },
  {
    id: "safety-assessment",
    tier: "required",
    label: "안전성 평가 자료",
    detail: "성분 안전성, 사용 농도, 제한 성분 여부를 설명할 수 있는 안전성 근거입니다.",
    documentType: "pif"
  },
  {
    id: "manufacture-process",
    tier: "required",
    label: "제조공정·GMP 증빙",
    detail: "제조 공정 요약, 제조소 정보, GMP 또는 ISO 22716 관련 증빙을 확인합니다.",
    documentType: "certificate"
  },
  {
    id: "coa",
    tier: "recommended",
    label: "COA·시험성적서",
    detail: "원료 또는 완제품의 주요 시험 결과, 미생물·중금속 등 품질 근거가 있으면 첨부합니다.",
    documentType: "coa"
  },
  {
    id: "claim-evidence",
    tier: "recommended",
    label: "효능·광고 표현 근거",
    detail: "보습, 진정, 미백 등 표현을 사용할 경우 시험자료나 문헌 근거가 필요할 수 있습니다.",
    documentType: "other"
  },
  {
    id: "stability",
    tier: "recommended",
    label: "안정성 자료",
    detail: "유통기한, 보관조건, 포장 적합성을 설명하는 안정성 시험 또는 내부 근거입니다.",
    documentType: "other"
  },
  {
    id: "adverse-sop",
    tier: "deferrable",
    label: "이상사례 대응 절차",
    detail: "대만 판매 후 이상사례 접수, 조사, 보고 절차를 운영 문서로 정리합니다.",
    documentType: "other"
  },
  {
    id: "source-flow",
    tier: "deferrable",
    label: "원료·공급망 추적 자료",
    detail: "원료 공급처, 제조 로트, 수입·유통 흐름을 추적할 수 있는 자료입니다.",
    documentType: "other"
  }
];

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
