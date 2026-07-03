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
  submitted: "제출됨",
  in_review: "검토 중",
  needs_revision: "보완 요청",
  accepted: "접수 완료"
};

export const pifTierCopy: Record<PifDocumentTier, { label: string; detail: string; tone: string }> = {
  required: {
    label: "필수",
    detail: "이 자료가 없으면 대만 화장품 PIF를 완성할 수 없습니다. 제출 전 반드시 준비하세요.",
    tone: "danger"
  },
  recommended: {
    label: "권장",
    detail: "심사 보류와 보완 요청을 줄여주는 자료입니다. 가능하면 함께 제출하세요.",
    tone: "warn"
  },
  deferrable: {
    label: "나중에 보완 가능",
    detail: "신청 후에도 보완할 수 있는 자료입니다. 준비되는 대로 추가하세요.",
    tone: "info"
  }
};

// 대만 화장품 PIF(產品資訊檔案) 구성 자료. 化粧品衛生安全管理法 및
// 化粧品產品資訊檔案管理辦法 기준의 실무 체크리스트를 고객 언어로 정리한 목록.
export const pifDocumentRequirements: PifDocumentRequirement[] = [
  {
    id: "product-basic",
    tier: "required",
    label: "제품 기본 정보",
    detail: "제품명(중문·영문), 카테고리, 제형, 사용 방법, 대만 책임업체(수입자) 정보.",
    documentType: "pif"
  },
  {
    id: "full-formula",
    tier: "required",
    label: "전성분표 (함량 포함)",
    detail: "INCI 기준 전성분과 각 성분 함량(%). 제한 성분은 함량 근거가 반드시 필요합니다.",
    documentType: "pif"
  },
  {
    id: "label-artwork",
    tier: "required",
    label: "중문 라벨 시안",
    detail: "제품명, 용도, 전성분, 용량, 제조/수입자, 원산지, 제조번호, 유통기한이 들어간 라벨 문안.",
    documentType: "label"
  },
  {
    id: "safety-assessment",
    tier: "required",
    label: "제품 안전성 평가 자료",
    detail: "안전성 평가자(서명 포함)가 작성한 안전성 평가 보고서 또는 그에 준하는 자료.",
    documentType: "pif"
  },
  {
    id: "manufacture-process",
    tier: "required",
    label: "제조방법·GMP 증빙",
    detail: "제조공정 요약과 GMP 또는 ISO 22716 인증서. 제조소가 여러 곳이면 모두 포함.",
    documentType: "certificate"
  },
  {
    id: "coa",
    tier: "recommended",
    label: "완제품 COA·시험성적서",
    detail: "미생물, 중금속 등 완제품 품질 시험 결과. 보완 요청을 크게 줄여줍니다.",
    documentType: "coa"
  },
  {
    id: "claim-evidence",
    tier: "recommended",
    label: "효능 표현 근거자료",
    detail: "라벨·광고에 쓰는 효능 문구별 근거(시험, 문헌). 의학적 표현은 사용할 수 없습니다.",
    documentType: "other"
  },
  {
    id: "stability",
    tier: "recommended",
    label: "안정성 시험 자료",
    detail: "유통기한 설정 근거가 되는 안정성 시험 결과.",
    documentType: "other"
  },
  {
    id: "adverse-sop",
    tier: "deferrable",
    label: "이상사례·회수 SOP",
    detail: "판매 후 이상사례 대응과 회수 절차 문서. 판매 개시 전까지 준비하면 됩니다.",
    documentType: "other"
  },
  {
    id: "source-flow",
    tier: "deferrable",
    label: "유통·이력 관리 기록 양식",
    detail: "수입·유통 흐름을 추적할 수 있는 기록 체계. 신청 후 보완 가능합니다.",
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
