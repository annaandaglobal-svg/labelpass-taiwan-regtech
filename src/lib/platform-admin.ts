export type AdminMetric = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "good" | "warn" | "info" | "danger";
};

export type AdminQueueItem = {
  id: string;
  title: string;
  owner: string;
  status: "ready" | "review" | "blocked" | "waiting";
  due: string;
  note: string;
};

export type PlatformModule = {
  id: string;
  label: string;
  purpose: string;
  tables: string[];
  nextAction: string;
  status: "schema_ready" | "design_ready" | "needs_integration";
};

export const adminMetrics: AdminMetric[] = [
  {
    id: "market_coverage",
    label: "대만 우선 규제 범위",
    value: "7",
    detail: "화장품, 식품, 상품표시, 통관, HS/CCC, 물류, 결제",
    tone: "good"
  },
  {
    id: "knowledge_sources",
    label: "공식 출처",
    value: "166",
    detail: "TFDA, MOJ, BSMI, Customs, global terminology",
    tone: "good"
  },
  {
    id: "ops_records",
    label: "운영 데이터",
    value: "14",
    detail: "회사, 문서, 전문가, 결제, 물류, 선적, 감사",
    tone: "info"
  },
  {
    id: "storage_status",
    label: "저장소 연결",
    value: "DB URL",
    detail: "Supabase DB URL 설정 전에는 읽기 전용 preview로 운영합니다.",
    tone: "warn"
  }
];

export const adminQueue: AdminQueueItem[] = [
  {
    id: "admin-org-setup",
    title: "회사/사용자 권한 구조 정리",
    owner: "운영 관리자",
    status: "ready",
    due: "다음 연결 대상",
    note: "플랫폼 운영 권한과 고객 회사 내부 권한을 분리해 데이터 노출 범위를 통제합니다."
  },
  {
    id: "expert-marketplace",
    title: "전문가 매칭/상담 플로우 설계",
    owner: "PM / 전문가 운영",
    status: "review",
    due: "실데이터 연동 전",
    note: "requested, matched, paid, in_progress, completed, refunded 상태를 expert_matches 기준으로 감시합니다."
  },
  {
    id: "logistics-tracking",
    title: "물류사 매칭/선적 추적 플로우",
    owner: "물류 운영",
    status: "review",
    due: "실데이터 연동 전",
    note: "shipment_requests, logistics_matches, shipments, shipment_events를 한 흐름으로 연결합니다."
  },
  {
    id: "archive-db-url",
    title: "Supabase 관리자 DB URL 연결",
    owner: "보안 설정",
    status: "waiting",
    due: "승인 후",
    note: "연결 전에는 review archive와 운영 데이터가 안전하게 읽기 전용 preview로 동작합니다."
  }
];

export const platformModules: PlatformModule[] = [
  {
    id: "organizations",
    label: "회사/사용자 관리",
    purpose: "회사 프로필, 멤버 권한, 제품/문서 접근 범위와 조직별 설정을 관리합니다.",
    tables: ["organizations", "organization_members", "organization_settings"],
    nextAction: "/admin/companies와 /admin/users를 Supabase 실데이터에 연결",
    status: "schema_ready"
  },
  {
    id: "documents",
    label: "제품 문서 관리",
    purpose: "성분표, PIF, COA, 라벨 시안, 통관/검토 증빙을 제품별로 보관하고 리뷰와 연결합니다.",
    tables: ["product_documents"],
    nextAction: "제품별 문서 상태와 라벨 검토 이력을 audit 로그에 연결",
    status: "schema_ready"
  },
  {
    id: "experts",
    label: "전문가 매칭",
    purpose: "전문가 프로필, 견적, 상담방, 완료/환불 상태를 리뷰 건별로 추적합니다.",
    tables: ["expert_profiles", "expert_matches", "chat_threads", "chat_messages", "payments"],
    nextAction: "결제 이후 상담방 접근 권한과 완료 상태 UI 연결",
    status: "schema_ready"
  },
  {
    id: "payments",
    label: "상담/결제 관리",
    purpose: "견적, 결제 승인, 상담방 접근, 정산, 환불 증빙을 한 흐름으로 관리합니다.",
    tables: ["payments", "expert_matches", "chat_threads", "audit_logs"],
    nextAction: "/admin/payments에서 결제 상태별 감사 로그 저장",
    status: "schema_ready"
  },
  {
    id: "logistics",
    label: "물류 매칭/선적 추적",
    purpose: "대만 수입 건의 물류사 추천, 견적, 선적 이벤트, 통관 handoff를 추적합니다.",
    tables: ["logistics_companies", "shipment_requests", "logistics_matches", "shipments", "shipment_events"],
    nextAction: "tracking API와 물류사별 선적 이벤트 동기화",
    status: "schema_ready"
  },
  {
    id: "settings",
    label: "조직 설정",
    purpose: "시장, 언어, 리뷰 저장, 전문가 매칭, 물류 매칭, 알림 채널을 조직 단위로 제어합니다.",
    tables: ["organization_settings", "organizations", "organization_members"],
    nextAction: "/admin/settings에서 조직별 기본값과 DB readiness 표시",
    status: "schema_ready"
  }
];

export const adminNav = [
  { href: "/admin", label: "운영" },
  { href: "/admin/companies", label: "회사" },
  { href: "/admin/users", label: "권한" },
  { href: "/admin/reviews", label: "리뷰 큐" },
  { href: "/admin/experts", label: "전문가" },
  { href: "/admin/payments", label: "결제" },
  { href: "/admin/logistics", label: "물류/선적" },
  { href: "/admin/settings", label: "설정" }
];
