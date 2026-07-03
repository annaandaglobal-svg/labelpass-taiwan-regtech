// 고객이 보낸 물류사 매칭 요청의 브라우저측 데모/fallback 기록.
// 운영 DB 연결 시 shipment_requests 테이블과 같은 형태로 이관됩니다.

export const LOGISTICS_REQUESTS_STORAGE_KEY = "labelpass-logistics-requests";
export const MAX_LOGISTICS_REQUESTS = 8;

export type LogisticsTemperature = "ambient" | "chilled" | "frozen";

export type LogisticsQuote = {
  partner: string;
  amountRangeUsd: [number, number];
  transitDays: number;
  detail: string;
};

export type LogisticsRequestDraft = {
  id: string;
  createdAt: string;
  productName: string;
  originCountry: string;
  originPort: string;
  destinationPort: string;
  mode: "ocean" | "air";
  incoterms: string;
  weightKg: number;
  temperature: LogisticsTemperature;
  docsNote: string;
  note: string;
  status: "requested" | "quoted" | "booked";
  quote: LogisticsQuote | null;
};

export const logisticsRequestStatusLabels: Record<LogisticsRequestDraft["status"], string> = {
  requested: "매칭 요청됨",
  quoted: "견적 도착",
  booked: "예약 확정"
};

export const logisticsTemperatureLabels: Record<LogisticsTemperature, string> = {
  ambient: "상온",
  chilled: "냉장",
  frozen: "냉동"
};

// 데모 모드 견적: 모드·중량·온도조건 기준으로 항상 같은 결과가 나오는 mock 계산.
// 실제 운영에서는 물류사가 /admin/logistics에서 견적을 입력합니다.
export function buildDemoLogisticsQuote(request: LogisticsRequestDraft): LogisticsQuote {
  const weight = Math.max(50, request.weightKg || 200);
  const perKg = request.mode === "air" ? 3.4 : 0.55;
  const temperatureFactor = request.temperature === "frozen" ? 1.5 : request.temperature === "chilled" ? 1.3 : 1;
  const base = Math.round((weight * perKg * temperatureFactor + (request.mode === "air" ? 180 : 320)) / 10) * 10;
  return {
    partner: request.mode === "air" ? "Taipei Air Bridge (데모)" : "Formosa Ocean Line (데모)",
    amountRangeUsd: [base, Math.round((base * 1.35) / 10) * 10],
    transitDays: request.mode === "air" ? 2 : 6,
    detail: "부피·서류 확인 후 확정 견적이 나옵니다. 통관 서류 준비 상태에 따라 일정이 달라질 수 있습니다."
  };
}

// 데모 접수 건은 1분 뒤 자동으로 견적이 도착한 것으로 진행시켜
// 요청 → 견적 → 예약 흐름이 끝까지 보이게 합니다.
export function deriveLogisticsDemoRequest(request: LogisticsRequestDraft, now = Date.now()): LogisticsRequestDraft {
  if (request.status === "booked") return request;
  const createdAt = Date.parse(request.createdAt);
  const ageMs = Number.isFinite(createdAt) ? now - createdAt : 0;
  if (request.status === "requested" && ageMs >= 60_000) {
    return { ...request, status: "quoted", quote: request.quote ?? buildDemoLogisticsQuote(request) };
  }
  return request;
}

export function parseLogisticsRequests(raw: string | null): LogisticsRequestDraft[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => {
        return (
          item &&
          typeof item.id === "string" &&
          typeof item.productName === "string" &&
          typeof item.originPort === "string" &&
          typeof item.destinationPort === "string" &&
          (item.mode === "ocean" || item.mode === "air")
        );
      })
      .map((item) => ({
        originCountry: "KR",
        incoterms: "",
        weightKg: 0,
        temperature: "ambient" as LogisticsTemperature,
        docsNote: "",
        quote: null,
        ...item
      }));
  } catch {
    return [];
  }
}
