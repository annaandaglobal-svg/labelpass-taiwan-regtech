// 전문가 상담·견적·채팅의 고객측 데모/fallback 저장 모델.
// 외부 실시간 채팅 키가 없어도 동작하도록 localStorage에 기록하며,
// 같은 형태의 레코드가 Supabase chat_threads / chat_messages 테이블과
// 1:1로 대응되므로 나중에 Supabase Realtime 구독으로 교체할 수 있습니다.

export const CONSULT_CASES_STORAGE_KEY = "labelpass-consult-cases";
export const CHAT_MESSAGES_STORAGE_KEY = "labelpass-chat-messages";
export const MAX_CONSULT_CASES = 10;
export const MAX_CHAT_MESSAGES_PER_CASE = 120;

export type ConsultCaseStatus = "requested" | "quoting" | "quoted" | "payment_pending" | "in_progress" | "completed";

export type ConsultQuote = {
  feeRangeUsd: [number, number];
  scope: string[];
  leadTimeDays: number;
  detail: string;
};

export type ConsultCase = {
  id: string;
  createdAt: string;
  productName: string;
  category: string;
  scope: string[];
  status: ConsultCaseStatus;
  quote: ConsultQuote | null;
  expertName: string;
  sourceHandoffId?: string;
};

export type ChatAuthor = "customer" | "expert" | "system";

export type ChatMessage = {
  id: string;
  caseId: string;
  author: ChatAuthor;
  text: string;
  createdAt: string;
};

export const consultStatusCopy: Record<ConsultCaseStatus, { label: string; detail: string; tone: string }> = {
  requested: {
    label: "매칭 요청됨",
    tone: "info",
    detail: "요청 범위를 기준으로 대만 규제 전문가를 배정하는 중입니다."
  },
  quoting: {
    label: "견적 산정 중",
    tone: "waiting",
    detail: "상담 범위와 자료 상태를 보고 예상 비용·납기를 계산하고 있습니다."
  },
  quoted: {
    label: "견적 도착",
    tone: "review",
    detail: "예상 비용, 범위, 납기를 확인하고 진행 여부를 결정하세요."
  },
  payment_pending: {
    label: "결제 대기",
    tone: "waiting",
    detail: "견적을 수락했습니다. 결제가 확인되면 상담방이 열립니다."
  },
  in_progress: {
    label: "상담 진행 중",
    tone: "ready",
    detail: "전문가와 채팅으로 자료와 질문을 주고받을 수 있습니다."
  },
  completed: {
    label: "상담 완료",
    tone: "ready",
    detail: "상담 결과와 권고 사항이 기록으로 남아 있습니다."
  }
};

export function parseConsultCases(raw: string | null): ConsultCase[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ConsultCase => {
      return (
        item &&
        typeof item.id === "string" &&
        typeof item.productName === "string" &&
        typeof item.status === "string" &&
        Array.isArray(item.scope)
      );
    });
  } catch {
    return [];
  }
}

export function parseChatMessages(raw: string | null): ChatMessage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ChatMessage => {
      return (
        item &&
        typeof item.id === "string" &&
        typeof item.caseId === "string" &&
        typeof item.text === "string" &&
        (item.author === "customer" || item.author === "expert" || item.author === "system")
      );
    });
  } catch {
    return [];
  }
}

// 데모 모드 견적: 범위 항목 수를 기준으로 안정적으로 같은 결과가 나오게 계산합니다.
// 실제 운영에서는 전문가/운영팀이 /admin/experts에서 견적을 입력합니다.
export function buildDemoQuote(consultCase: ConsultCase): ConsultQuote {
  const scopeCount = Math.max(1, consultCase.scope.length);
  const base = 180 + scopeCount * 120;
  const cosmetic = /화장품|cosmetic|pif/i.test(`${consultCase.category} ${consultCase.scope.join(" ")}`);
  const multiplier = cosmetic ? 1.25 : 1;
  const low = Math.round((base * multiplier) / 10) * 10;
  const high = Math.round((base * multiplier * 1.6) / 10) * 10;
  return {
    feeRangeUsd: [low, high],
    scope: consultCase.scope.length ? consultCase.scope : ["1차 검토 결과 확인", "필수 증빙 목록 확정"],
    leadTimeDays: Math.min(10, 3 + scopeCount),
    detail: "예상 범위 기준 견적입니다. 자료 확인 후 확정 견적이 채팅으로 안내됩니다."
  };
}

export function buildExpertAutoReply(consultCase: ConsultCase, customerText: string): string {
  const trimmed = customerText.trim();
  if (/pif|안전성|성분/i.test(trimmed)) {
    return `${consultCase.expertName}입니다. PIF·성분 관련 문의 확인했습니다. 전성분표(함량 포함)와 라벨 시안을 첨부해주시면 제한 성분 여부를 먼저 확인해서 답드리겠습니다.`;
  }
  if (/통관|수입|검사|hs|ccc/i.test(trimmed)) {
    return `${consultCase.expertName}입니다. 수입검사·통관 문의 확인했습니다. HS/CCC 코드와 인보이스 초안을 공유해주시면 검사 보류 가능성을 미리 점검하겠습니다.`;
  }
  if (/견적|비용|가격|납기/i.test(trimmed)) {
    return `${consultCase.expertName}입니다. 견적 관련 문의 확인했습니다. 현재 범위 기준 예상 비용과 납기는 견적 카드에 정리되어 있고, 자료 확인 후 확정 견적을 드리겠습니다.`;
  }
  return `${consultCase.expertName}입니다. 남겨주신 내용 확인했습니다. 검토 결과와 자료를 보고 순서대로 답변드리겠습니다. 급한 항목이 있으면 표시해주세요.`;
}

export function demoExpertNameFor(category: string) {
  return /화장품|cosmetic|pif/i.test(category) ? "대만 화장품 인허가 전문가 (배정 예정)" : "대만 식품·수입검사 전문가 (배정 예정)";
}

// 견적 산정 시점에 데모 전문가를 배정해 "요청 → 매칭 → 견적" 단계가 눈에 보이게 합니다.
export function demoAssignedExpertFor(category: string) {
  return /화장품|cosmetic|pif/i.test(category)
    ? "Chen Yi-Ting · 대만 화장품 인허가 (데모 배정)"
    : "Lin Wei-Chen · 대만 식품·수입검사 (데모 배정)";
}

export type ExpertDomain = "cosmetic" | "food" | "customs";

export type ExpertProfile = {
  id: string;
  name: string;
  avatar: string;
  role: string;
  specialties: string[];
  handledCount: number;
  rating: number;
  responseTime: string;
  priceFrom: string;
  note: string;
  domains: ExpertDomain[];
};

// Selectable expert roster (per v5 시안) — customers choose who reviews, not auto-matching.
export const EXPERT_ROSTER: ExpertProfile[] = [
  {
    id: "kim",
    name: "김O정 · 대만 인허가 컨설턴트 (12년)",
    avatar: "👩‍💼",
    role: "대만 인허가 컨설턴트 · 12년",
    specialties: ["TFDA 등록", "PIF", "라벨 검수"],
    handledCount: 142,
    rating: 4.9,
    responseTime: "평균 2시간",
    priceFrom: "검수 ₩150,000~",
    note: "등록대행 견적 가능",
    domains: ["cosmetic"]
  },
  {
    id: "lin",
    name: "林O如 · 타이베이 현지 RA·약사",
    avatar: "👨‍⚕️",
    role: "타이베이 현지 RA · 약사",
    specialties: ["중문 라벨 감수", "광고 심의"],
    handledCount: 89,
    rating: 4.8,
    responseTime: "평균 5시간",
    priceFrom: "중문 감수 ₩200,000~",
    note: "한국어 가능",
    domains: ["cosmetic", "food"]
  },
  {
    id: "park",
    name: "박O훈 · 관세사 (식품/화장품 통관)",
    avatar: "👨‍💼",
    role: "관세사 · 식품/화장품 통관",
    specialties: ["HS코드 확정", "수출신고", "C/O"],
    handledCount: 310,
    rating: 4.7,
    responseTime: "평균 4시간",
    priceFrom: "HS코드 확정 ₩60,000",
    note: "수출신고 건당 견적",
    domains: ["customs", "food", "cosmetic"]
  }
];

export function recommendedExpertFor(category: string): ExpertProfile {
  const domain: ExpertDomain = /화장품|cosmetic|pif/i.test(category) ? "cosmetic" : "food";
  return EXPERT_ROSTER.find((expert) => expert.domains.includes(domain)) ?? EXPERT_ROSTER[0];
}

// Kmong-style service (gig) listings: each expert sells concrete, priced services with a
// tier badge, star rating + review count, from-price, and delivery time. Customers browse
// and pick a service, not just a person.
export type ExpertServiceCategory = "all" | "cosmetic-pif" | "label" | "ad" | "customs";

export type ExpertService = {
  id: string;
  expertId: string;
  category: Exclude<ExpertServiceCategory, "all">;
  categoryLabel: string;
  title: string;
  summary: string;
  priceFrom: number; // KRW
  deliveryDays: number;
  rating: number;
  reviews: number;
  orders: number;
  tier: "prime" | "top" | "new";
  includes: string[];
};

export const EXPERT_SERVICE_CATEGORIES: { id: ExpertServiceCategory; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "cosmetic-pif", label: "화장품·PIF" },
  { id: "label", label: "중문 라벨" },
  { id: "ad", label: "광고 심의" },
  { id: "customs", label: "통관·HS" }
];

export const EXPERT_SERVICES: ExpertService[] = [
  {
    id: "svc-pif",
    expertId: "kim",
    category: "cosmetic-pif",
    categoryLabel: "화장품·PIF",
    title: "대만 화장품 PIF 목차·서류 작성 대행",
    summary: "제품정보파일(PIF) 전체 목차 구성부터 필수 서류·안전성 자료 정리까지 대행합니다.",
    priceFrom: 350000,
    deliveryDays: 5,
    rating: 4.9,
    reviews: 142,
    orders: 142,
    tier: "prime",
    includes: ["PIF 목차 구성", "필수 서류 체크", "안전성 자료 정리", "책임업자 표기 확인"]
  },
  {
    id: "svc-register",
    expertId: "kim",
    category: "cosmetic-pif",
    categoryLabel: "화장품·PIF",
    title: "TFDA 제품 등록·통보 대행",
    summary: "일반/특정용도 화장품 제품 등록(통보) 절차를 대행하고 진행 상태를 공유합니다.",
    priceFrom: 250000,
    deliveryDays: 7,
    rating: 4.9,
    reviews: 142,
    orders: 96,
    tier: "prime",
    includes: ["등록 유형 판정", "제출 자료 준비", "TFDA 접수", "진행 상태 공유"]
  },
  {
    id: "svc-screen",
    expertId: "kim",
    category: "cosmetic-pif",
    categoryLabel: "화장품",
    title: "성분·라벨 규제 1차 검수 (리포트 기반)",
    summary: "검토 리포트를 바탕으로 금지·제한 성분, 효능 표현, 중문 표기를 전문가가 서면 확정합니다.",
    priceFrom: 150000,
    deliveryDays: 2,
    rating: 4.9,
    reviews: 142,
    orders: 210,
    tier: "prime",
    includes: ["성분 규제 확정", "효능 표현 검토", "중문 표기 확인", "서면 의견서"]
  },
  {
    id: "svc-label",
    expertId: "lin",
    category: "label",
    categoryLabel: "중문 라벨",
    title: "중문 라벨 감수 + 표시사항 확정",
    summary: "타이베이 현지 RA(약사)가 중문 라벨 표기·필수 기재사항을 대만 기준으로 감수합니다.",
    priceFrom: 200000,
    deliveryDays: 3,
    rating: 4.8,
    reviews: 89,
    orders: 89,
    tier: "prime",
    includes: ["중문 표기 감수", "필수 기재사항", "주의문구 확정", "한국어 상담"]
  },
  {
    id: "svc-ad",
    expertId: "lin",
    category: "ad",
    categoryLabel: "광고 심의",
    title: "화장품·식품 광고 표현 심의 대응",
    summary: "의료적·과대 표현 리스크를 점검하고 대만 광고 규정에 맞게 문구를 조정합니다.",
    priceFrom: 180000,
    deliveryDays: 4,
    rating: 4.8,
    reviews: 89,
    orders: 64,
    tier: "top",
    includes: ["표현 리스크 점검", "위반 사례 대조", "대체 문구 제안", "한국어 상담"]
  },
  {
    id: "svc-hs",
    expertId: "park",
    category: "customs",
    categoryLabel: "통관·HS",
    title: "HS/CCC 코드 확정 + 수입규정 확인",
    summary: "관세사가 11자리 CCC 코드와 輸入規定(수입규정)·세율·검역 요건을 확정해 드립니다.",
    priceFrom: 60000,
    deliveryDays: 1,
    rating: 4.7,
    reviews: 310,
    orders: 310,
    tier: "prime",
    includes: ["CCC 코드 확정", "수입규정 코드", "세율 안내", "검역 여부"]
  },
  {
    id: "svc-export",
    expertId: "park",
    category: "customs",
    categoryLabel: "통관·HS",
    title: "수출신고 + 원산지증명(C/O) 대행",
    summary: "수출신고와 원산지증명 발급을 건당으로 대행하고 통관 서류를 정리합니다.",
    priceFrom: 120000,
    deliveryDays: 2,
    rating: 4.7,
    reviews: 310,
    orders: 188,
    tier: "prime",
    includes: ["수출신고", "C/O 발급", "통관 서류 정리", "선적 연계"]
  }
];

export function expertById(id: string): ExpertProfile | undefined {
  return EXPERT_ROSTER.find((expert) => expert.id === id);
}
