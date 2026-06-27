export type AdminMetric = {
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
    label: "대만 우선 워크플로",
    value: "7",
    detail: "화장품, 식품, 첨가물, 수입검사, 건강식품, 포장재, HS/CCC",
    tone: "good"
  },
  {
    label: "공식 지식 소스",
    value: "166",
    detail: "TFDA, MOJ, BSMI, Customs, global terminology",
    tone: "good"
  },
  {
    label: "운영 테이블",
    value: "14",
    detail: "조직, 문서, 전문가, 물류, 선적, 채팅, 결제",
    tone: "info"
  },
  {
    label: "남은 연결",
    value: "DB URL",
    detail: "서버 DB URL 설정 전까지 archive는 브라우저 fallback",
    tone: "warn"
  }
];

export const adminQueue: AdminQueueItem[] = [
  {
    id: "admin-org-setup",
    title: "조직/멤버 권한 모델 검수",
    owner: "운영 관리자",
    status: "ready",
    due: "이번 스프린트",
    note: "profiles.role과 organization_members.role을 분리해 플랫폼 권한과 회사 권한을 따로 관리합니다."
  },
  {
    id: "expert-marketplace",
    title: "전문가 매칭 결제 흐름",
    owner: "PM / 결제 담당",
    status: "review",
    due: "다음 조각",
    note: "requested, matched, paid, in_progress, completed, refunded 상태가 expert_matches에 준비됐습니다."
  },
  {
    id: "logistics-tracking",
    title: "물류사 매칭과 선적 이벤트",
    owner: "물류 운영",
    status: "review",
    due: "다음 조각",
    note: "shipment_requests, logistics_matches, shipments, shipment_events로 트래킹 흐름을 분리했습니다."
  },
  {
    id: "archive-db-url",
    title: "Supabase 서버 DB URL 연결",
    owner: "인프라",
    status: "waiting",
    due: "배포 설정",
    note: "연결 후 review archive와 관리자 실제 데이터 조회를 Supabase로 이동합니다."
  }
];

export const platformModules: PlatformModule[] = [
  {
    id: "organizations",
    label: "회사·사용자 관리",
    purpose: "회사별 제품, 리뷰, 문서, 설정을 분리하고 초대/권한을 관리합니다.",
    tables: ["organizations", "organization_members", "organization_settings"],
    nextAction: "/admin/companies와 /admin/users에 실제 Supabase 목록 연결",
    status: "schema_ready"
  },
  {
    id: "documents",
    label: "제품 문서 관리",
    purpose: "라벨, PIF, COA, 인보이스, 패킹리스트, 선적 서류를 제품과 리뷰에 붙입니다.",
    tables: ["product_documents"],
    nextAction: "업로드 스토리지 정책과 문서 상태 변경 audit 로그 추가",
    status: "schema_ready"
  },
  {
    id: "experts",
    label: "전문가 유료 매칭",
    purpose: "전문가 프로필, 견적, 결제, 상담 스레드를 리뷰 케이스에 연결합니다.",
    tables: ["expert_profiles", "expert_matches", "chat_threads", "chat_messages", "payments"],
    nextAction: "결제 전/후 상담 상태와 환불 상태를 UI에 연결",
    status: "schema_ready"
  },
  {
    id: "logistics",
    label: "물류사 매칭·선적 추적",
    purpose: "검토가 끝난 제품을 물류 요청, 견적, 선적, 이벤트 타임라인으로 이어줍니다.",
    tables: ["logistics_companies", "shipment_requests", "logistics_matches", "shipments", "shipment_events"],
    nextAction: "운송 요청 생성 버튼과 추적 이벤트 수집 API 연결",
    status: "schema_ready"
  }
];

export const adminNav = [
  { href: "/admin", label: "운영 홈" },
  { href: "/admin/companies", label: "회사" },
  { href: "/admin/users", label: "사용자" },
  { href: "/admin/reviews", label: "리뷰 큐" },
  { href: "/admin/experts", label: "전문가" },
  { href: "/admin/logistics", label: "물류·선적" }
];
