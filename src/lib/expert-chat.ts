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
