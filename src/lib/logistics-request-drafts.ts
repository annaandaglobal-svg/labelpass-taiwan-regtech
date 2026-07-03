// 고객이 보낸 물류사 매칭 요청의 브라우저측 데모/fallback 기록.
// 운영 DB 연결 시 shipment_requests 테이블과 같은 형태로 이관됩니다.

export const LOGISTICS_REQUESTS_STORAGE_KEY = "labelpass-logistics-requests";
export const MAX_LOGISTICS_REQUESTS = 8;

export type LogisticsRequestDraft = {
  id: string;
  createdAt: string;
  productName: string;
  originPort: string;
  destinationPort: string;
  mode: "ocean" | "air";
  note: string;
  status: "requested" | "quoted" | "booked";
};

export const logisticsRequestStatusLabels: Record<LogisticsRequestDraft["status"], string> = {
  requested: "매칭 요청됨",
  quoted: "견적 도착",
  booked: "예약 완료"
};

export function parseLogisticsRequests(raw: string | null): LogisticsRequestDraft[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is LogisticsRequestDraft => {
      return (
        item &&
        typeof item.id === "string" &&
        typeof item.productName === "string" &&
        typeof item.originPort === "string" &&
        typeof item.destinationPort === "string" &&
        (item.mode === "ocean" || item.mode === "air")
      );
    });
  } catch {
    return [];
  }
}
