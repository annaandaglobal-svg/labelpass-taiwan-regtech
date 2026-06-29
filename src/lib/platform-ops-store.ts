import postgres from "postgres";

type DbClient = ReturnType<typeof postgres>;

export type PlatformOpsStorage = "database" | "disabled" | "preview_disabled" | "error";

export type PlatformCompanyRow = {
  name: string;
  market: string;
  status: string;
  modules: string;
  next: string;
};

export type PlatformRoleRow = {
  role: string;
  scope: string;
  can: string;
  caution: string;
};

export type PlatformReviewFlow = {
  title: string;
  product: string;
  route: string;
  status: string;
  next: string;
  handoff: string;
};

export type PlatformExpertDiscipline = "cosmetics" | "food" | "dual";

export type PlatformExpertProfileRow = {
  name: string;
  firm: string;
  base: string;
  discipline: PlatformExpertDiscipline;
  languages: string[];
  specialties: string[];
  credential: string;
  availability: string;
  activeCases: number;
};

export type PlatformExpertMatchState =
  | "requested"
  | "matched"
  | "paid"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "refunded";

export type PlatformExpertCaseRow = {
  id: string;
  displayId?: string;
  company: string;
  product: string;
  category: "화장품" | "식품";
  expert: string;
  state: PlatformExpertMatchState;
  chatReady: string;
  payment: string;
  reviewHandoff: string;
  next: string;
  sla: string;
  queueTone: "ready" | "blocked" | "default";
};

export type PlatformRequestState =
  | "requested"
  | "quoted"
  | "accepted"
  | "booked"
  | "in_transit"
  | "customs_hold"
  | "delivered"
  | "cancelled";

export type PlatformTransportMode = "ocean" | "air";

export type PlatformLogisticsCompanyRow = {
  name: string;
  lane: string;
  modes: PlatformTransportMode[];
  strengths: string;
  sla: string;
  status: "preferred" | "quoting" | "standby";
};

export type PlatformShipmentRequestRow = {
  id: string;
  displayId?: string;
  product: string;
  importer: string;
  lane: string;
  state: PlatformRequestState;
  handoff: string;
  next: string;
};

export type PlatformShipmentRow = {
  id?: string;
  reference: string;
  product: string;
  mode: PlatformTransportMode;
  carrier: string;
  tracking: string;
  vehicle: string;
  route: string;
  state: PlatformRequestState;
  eta: string;
  customs: string;
};

export type PlatformShipmentEventRow = {
  time: string;
  title: string;
  location: string;
  detail: string;
  state: PlatformRequestState;
};

export type PlatformPaymentRow = {
  id: string;
  displayId?: string;
  company: string;
  product: string;
  expert: string;
  amount: string;
  status: string;
  provider: string;
  expertMatchState: string;
  chatThreadStatus: string;
  chatThreadId?: string;
  next: string;
};

export type PlatformSettingRow = {
  organization: string;
  billingStatus: string;
  locale: string;
  markets: string[];
  reviewArchiveEnabled: boolean;
  expertMatchingEnabled: boolean;
  logisticsMatchingEnabled: boolean;
  notifications: string[];
  next: string;
};

export type PlatformOpsCounts = {
  organizations: number;
  activeMembers: number;
  reviews: number;
  expertProfiles: number;
  expertMatches: number;
  logisticsCompanies: number;
  shipmentRequests: number;
  activeShipments: number;
  customsHolds: number;
  payments: number;
};

export type PlatformOpsSnapshot = {
  storage: PlatformOpsStorage;
  generatedAt: string;
  warnings: string[];
  counts: PlatformOpsCounts;
  companyRows: PlatformCompanyRow[];
  roleRows: PlatformRoleRow[];
  reviewFlows: PlatformReviewFlow[];
  expertProfiles: PlatformExpertProfileRow[];
  expertCases: PlatformExpertCaseRow[];
  logisticsCompanies: PlatformLogisticsCompanyRow[];
  shipmentRequests: PlatformShipmentRequestRow[];
  activeShipments: PlatformShipmentRow[];
  shipmentEvents: PlatformShipmentEventRow[];
  payments: PlatformPaymentRow[];
  settings: PlatformSettingRow[];
};

export type PlatformOpsNavBadge = {
  count: number;
  tone: "info" | "warn" | "danger";
  label: string;
};

export type PlatformOpsNavBadges = Partial<Record<string, PlatformOpsNavBadge>>;

export type PlatformOpsQueueTone = "ready" | "review" | "blocked" | "waiting";

export type PlatformOpsActionQueueItem = {
  id: string;
  href: string;
  tone: PlatformOpsQueueTone;
  label: string;
  title: string;
  detail: string;
  next: string;
  owner: string;
};

type OrganizationRow = {
  name: string;
  primary_market: string;
  status: string;
  billing_status: string;
  product_count: number | string;
  review_count: number | string;
  expert_match_count: number | string;
  shipment_request_count: number | string;
};

type RoleCountRow = {
  role: string;
  status: string;
  member_count: number | string;
};

type ReviewRow = {
  id: string;
  status: string;
  verdict: string | null;
  risk_score: string | number | null;
  summary: string | null;
  product_name: string | null;
  category: string | null;
  market: string | null;
  organization_name: string | null;
};

type ExpertProfileRow = {
  id: string;
  display_name: string;
  company_name: string | null;
  regions: unknown;
  categories: unknown;
  languages: unknown;
  hourly_rate: string | number | null;
  currency: string;
  status: string;
  metadata: Record<string, unknown> | null;
  active_cases: number | string;
};

type ExpertMatchRow = {
  id: string;
  status: PlatformExpertMatchState | string;
  service_type: string;
  summary: string | null;
  quoted_amount: string | number | null;
  currency: string;
  organization_name: string | null;
  product_name: string | null;
  category: string | null;
  expert_name: string | null;
  payment_status: string | null;
  thread_status: string | null;
};

type LogisticsCompanyDbRow = {
  name: string;
  countries: unknown;
  service_types: unknown;
  status: string;
  metadata: Record<string, unknown> | null;
};

type ShipmentRequestDbRow = {
  id: string;
  status: string;
  origin_country: string;
  destination_country: string;
  incoterms: string | null;
  cargo_summary: string | null;
  metadata: Record<string, unknown> | null;
  organization_name: string | null;
  product_name: string | null;
};

type ShipmentDbRow = {
  id: string;
  tracking_number: string | null;
  status: string;
  eta: Date | string | null;
  metadata: Record<string, unknown> | null;
  organization_name: string | null;
  product_name: string | null;
  logistics_company_name: string | null;
};

type ShipmentEventDbRow = {
  event_type: string;
  status: string | null;
  message: string | null;
  occurred_at: Date | string;
  metadata: Record<string, unknown> | null;
};

type PaymentDbRow = {
  id: string;
  amount: string | number;
  currency: string;
  status: string;
  provider: string | null;
  provider_reference: string | null;
  metadata: Record<string, unknown> | null;
  organization_name: string | null;
  product_name: string | null;
  expert_name: string | null;
  expert_match_status: string | null;
  service_type: string | null;
  chat_thread_id: string | null;
  chat_thread_status: string | null;
};

type OrganizationSettingDbRow = {
  organization_name: string;
  billing_status: string;
  default_locale: string;
  markets: unknown;
  review_archive_enabled: boolean;
  expert_matching_enabled: boolean;
  logistics_matching_enabled: boolean;
  notification_channels: unknown;
  metadata: Record<string, unknown> | null;
};

const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const adminDbPreviewEnabled = process.env.LABELPASS_ENABLE_ADMIN_DB_PREVIEW === "1";
const databasePreviewTimeoutMs = parseTimeout(process.env.LABELPASS_PLATFORM_OPS_DB_TIMEOUT_MS ?? "2500");
let client: DbClient | null = null;
let snapshotCache: { value: PlatformOpsSnapshot; expiresAt: number } | null = null;

function parseTimeout(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 500 || parsed > 10000) return 2500;
  return parsed;
}

export function isPlatformOpsDatabaseConfigured() {
  return Boolean(databaseUrl && adminDbPreviewEnabled);
}

function getClient() {
  if (!databaseUrl || !adminDbPreviewEnabled) return null;
  client ??= postgres(databaseUrl, {
    max: 2,
    ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") ? false : "require",
    idle_timeout: 10,
    connect_timeout: 8,
    prepare: false
  });
  return client;
}

function cacheSnapshot(value: PlatformOpsSnapshot) {
  snapshotCache = { value, expiresAt: Date.now() + 15_000 };
  return value;
}

function timeoutError(ms: number) {
  return new Error(`Admin DB preview timed out after ${ms}ms; using safe preview data.`);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return Promise.race([
    promise.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(timeoutError(ms)), ms);
    })
  ]);
}

function asCount(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function metadataText(metadata: Record<string, unknown> | null | undefined, key: string, fallback: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numericLabel(value: string | number | null, currency: string) {
  if (value === null || value === undefined) return "견적 미정";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "견적 미정";
  return `${amount.toLocaleString()} ${currency}`;
}

function dateLabel(value: Date | string | null | undefined) {
  if (!value) return "미정";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function productCategoryLabel(category: string | null | undefined): "화장품" | "식품" {
  return /food|식품|食品|additive|nutrition/i.test(category ?? "") ? "식품" : "화장품";
}

function logisticsState(value: string | null | undefined): PlatformRequestState {
  if (value === "quoted") return "quoted";
  if (value === "booked") return "booked";
  if (value === "in_transit") return "in_transit";
  if (value === "customs_hold") return "customs_hold";
  if (value === "delivered") return "delivered";
  if (value === "cancelled") return "cancelled";
  if (value === "requested") return "requested";
  if (value === "accepted" || value === "selected") return "accepted";
  return "requested";
}

function expertState(value: string): PlatformExpertMatchState {
  if (value === "matched") return "matched";
  if (value === "paid") return "paid";
  if (value === "in_progress") return "in_progress";
  if (value === "completed") return "completed";
  if (value === "cancelled") return "cancelled";
  if (value === "refunded") return "refunded";
  return "requested";
}

function disciplineFromCategories(categories: string[]): PlatformExpertDiscipline {
  const joined = categories.join(" ").toLowerCase();
  const food = /food|식품|食品|nutrition|additive/.test(joined);
  const cosmetics = /cosmetic|화장품|化粧|pif|inci/.test(joined);
  if (food && cosmetics) return "dual";
  if (food) return "food";
  return "cosmetics";
}

function roleScope(role: string) {
  if (role === "owner" || role === "admin") return "회사 설정";
  if (role === "expert") return "상담 스레드";
  if (role === "logistics") return "선적 요청";
  if (role === "viewer") return "읽기 전용";
  return "회사 운영";
}

function roleCan(role: string, count: number) {
  if (role === "owner" || role === "admin") return `설정, 멤버, 제품, 리뷰 관리 (${count}명)`;
  if (role === "expert") return `배정 상담과 첨부문서 확인 (${count}명)`;
  if (role === "logistics") return `운송 요청, 견적, tracking event (${count}명)`;
  if (role === "viewer") return `회사 데이터 조회 (${count}명)`;
  return `제품 등록, 문서 업로드, 리뷰 요청 (${count}명)`;
}

const previewCounts: PlatformOpsCounts = {
  organizations: 3,
  activeMembers: 9,
  reviews: 4,
  expertProfiles: 3,
  expertMatches: 6,
  logisticsCompanies: 3,
  shipmentRequests: 3,
  activeShipments: 3,
  customsHolds: 1,
  payments: 4
};

const previewCompanyRows: PlatformCompanyRow[] = [
  {
    name: "Annaanda Global",
    market: "TW",
    status: "trial / launch-readiness",
    modules: "제품 4, 리뷰 4, 전문가 매칭 3, 물류 요청 2",
    next: "Cica Barrier Cream과 Soy Corn Protein Bar의 증빙 보완을 먼저 닫습니다."
  },
  {
    name: "Expert Partner Pool",
    market: "TW / KR",
    status: "active / marketplace",
    modules: "전문가 3, 상담방 5, 결제 4, 정산 2",
    next: "화장품 PIF와 식품 표시 전문가의 수임 가능 시간을 확인합니다."
  },
  {
    name: "Logistics Partner Pool",
    market: "KR -> TW",
    status: "active / forwarding",
    modules: "물류사 3, 견적 3, 선적 3, 통관보류 1",
    next: "냉장 식품과 화장품 항공 발송의 통관 이벤트 소유자를 지정합니다."
  }
];

const previewRoleRows: PlatformRoleRow[] = [
  {
    role: "profiles.role = admin",
    scope: "플랫폼 전체",
    can: "지식 소스, 운영 큐, 결제, audit 로그를 관리",
    caution: "쓰기 권한은 관리자 토큰과 DB write flag가 모두 켜질 때만 사용"
  },
  {
    role: "organization_members.owner",
    scope: "회사 설정",
    can: "회사 설정, 멤버 초대, 제품·리뷰·문서 관리",
    caution: "청구 상태와 기능 토글 변경 전 승인 로그 필요"
  },
  {
    role: "organization_members.operator",
    scope: "회사 운영",
    can: "제품 등록, 증빙 업로드, 리뷰 요청, 물류 요청 생성",
    caution: "전문가 결제와 환불은 운영 관리자 승인이 필요"
  },
  {
    role: "organization_members.expert",
    scope: "상담 스레드",
    can: "배정된 상담과 첨부문서 검토",
    caution: "회사 전체 데이터는 볼 수 없고 배정 건만 접근"
  },
  {
    role: "organization_members.logistics",
    scope: "선적 요청",
    can: "견적, 예약, tracking event, 통관 보류 메모 입력",
    caution: "라벨 판정과 결제 정보는 읽기 제한"
  }
];

const previewReviewFlows: PlatformReviewFlow[] = [
  {
    title: "화장품 PIF 보강",
    product: "Cica Barrier Cream",
    route: "TW 화장품",
    status: "evidence_gap",
    next: "PIF 목차, GMP 증빙, INCI 대조표를 전문가에게 넘기기 전 확인",
    handoff: "Dr. Mei-Lin Chen 상담 요청"
  },
  {
    title: "자외선 차단 표시 확인",
    product: "Tinted Sunscreen SPF50",
    route: "TW 화장품",
    status: "expert_quote",
    next: "효능 표현과 특수용도 화장품 해당 여부를 결제 전 확정",
    handoff: "결제 승인 후 상담방 active"
  },
  {
    title: "식품 중문 라벨 수정",
    product: "Soy Corn Protein Bar",
    route: "TW 식품",
    status: "label_revision",
    next: "알레르겐, 영양성분, GMO/non-GMO 증빙을 Jason Wu에게 전달",
    handoff: "식품 전문가 상담 진행"
  },
  {
    title: "수입검사·물류 handoff",
    product: "Shelf-stable Tea Beverage",
    route: "TW 식품 / 통관",
    status: "customs_hold",
    next: "성분표 번역본과 첨가물 용도 설명을 통관 이벤트에 첨부",
    handoff: "Kaohsiung Trade Bridge 통관 보류 대응"
  }
];

const previewExpertProfiles: PlatformExpertProfileRow[] = [
  {
    name: "Dr. Mei-Lin Chen",
    firm: "Taipei Cosmetic Safety Office",
    base: "Taipei",
    discipline: "cosmetics",
    languages: ["zh-TW", "en", "ko"],
    specialties: ["PIF 준비도", "INCI 제한성분 대조", "효능 표현 근거"],
    credential: "전 TFDA 화장품 검토 담당",
    availability: "2건 수임 가능",
    activeCases: 4
  },
  {
    name: "Jason Wu",
    firm: "Formosa Food Compliance",
    base: "Taichung",
    discipline: "food",
    languages: ["zh-TW", "en"],
    specialties: ["영양성분 표시", "첨가물 검토", "건강식품 표현 선별"],
    credential: "식품위생관리법 실무 전문가",
    availability: "대기 명단",
    activeCases: 6
  },
  {
    name: "Hana Park",
    firm: "Korea-Taiwan Market Access Desk",
    base: "Seoul / Taipei",
    discipline: "dual",
    languages: ["ko", "zh-TW", "en"],
    specialties: ["양국 증빙팩", "수입자 handoff", "화장품·식품 초기 분류"],
    credential: "크로스보더 dossier 리드",
    availability: "1건 수임 가능",
    activeCases: 3
  }
];

const previewExpertCases: PlatformExpertCaseRow[] = [
  {
    id: "10000000-0000-4000-8000-000000000101",
    displayId: "EXP-2418",
    company: "Annaanda Global",
    product: "Cica Barrier Cream",
    category: "화장품",
    expert: "Dr. Mei-Lin Chen",
    state: "requested",
    chatReady: "범위 확인 질문지 미완료",
    payment: "견적 전",
    reviewHandoff: "PIF와 INCI 제한성분 검토",
    next: "전성분 파일 접근 권한과 대만 출시 희망일을 확인합니다.",
    sla: "오늘 운영자 배정 필요",
    queueTone: "blocked"
  },
  {
    id: "10000000-0000-4000-8000-000000000102",
    displayId: "EXP-2420",
    company: "Bloom Lab Korea",
    product: "Tinted Sunscreen SPF50",
    category: "화장품",
    expert: "Dr. Mei-Lin Chen",
    state: "matched",
    chatReady: "payment_required 상담방 준비",
    payment: "420 USD 견적 승인 대기",
    reviewHandoff: "특수용도 화장품 해당성 확인",
    next: "결제 승인 후 상담방을 active로 전환합니다.",
    sla: "6시간 내 구매자 follow-up",
    queueTone: "ready"
  },
  {
    id: "10000000-0000-4000-8000-000000000103",
    displayId: "EXP-2422",
    company: "Green Spoon Co.",
    product: "Soy Corn Protein Bar",
    category: "식품",
    expert: "Jason Wu",
    state: "paid",
    chatReady: "active 상담방",
    payment: "580 USD 결제 완료",
    reviewHandoff: "알레르겐·영양성분·첨가물 표시 검토",
    next: "전문가 작업공간에 식품 라벨 체크리스트를 공개합니다.",
    sla: "내일 1차 메모",
    queueTone: "ready"
  },
  {
    id: "10000000-0000-4000-8000-000000000104",
    displayId: "EXP-2426",
    company: "Han River Foods",
    product: "Ginseng Jelly Stick",
    category: "식품",
    expert: "Jason Wu",
    state: "in_progress",
    chatReady: "운영자·전문가 상담방 진행",
    payment: "1차 milestone 보류",
    reviewHandoff: "건강식품 claim 위험 문구 정리",
    next: "번역 원료표와 기능성 표현 근거를 보완합니다.",
    sla: "전문가 회신 오늘",
    queueTone: "default"
  },
  {
    id: "10000000-0000-4000-8000-000000000105",
    displayId: "EXP-2411",
    company: "Nuri Beauty",
    product: "Low-pH Gel Cleanser",
    category: "화장품",
    expert: "Hana Park",
    state: "completed",
    chatReady: "상담방 보관",
    payment: "정산 완료",
    reviewHandoff: "화장품 라벨·성분 검토 완료",
    next: "완료 산출물을 문서 보관함에 고정합니다.",
    sla: "종료",
    queueTone: "ready"
  },
  {
    id: "10000000-0000-4000-8000-000000000106",
    displayId: "EXP-2407",
    company: "Morning Farm",
    product: "Enzyme Drink",
    category: "식품",
    expert: "Hana Park",
    state: "refunded",
    chatReady: "상담방 잠금",
    payment: "260 USD 환불 완료",
    reviewHandoff: "식품 claim 검토 취소",
    next: "환불 사유와 재요청 trail을 audit에 남깁니다.",
    sla: "사유 확인",
    queueTone: "blocked"
  }
];

const previewPayments: PlatformPaymentRow[] = [
  {
    id: "20000000-0000-4000-8000-000000000201",
    displayId: "PAY-2420",
    company: "Bloom Lab Korea",
    product: "Tinted Sunscreen SPF50",
    expert: "Dr. Mei-Lin Chen",
    amount: "420 USD",
    status: "pending",
    provider: "Stripe quote draft",
    expertMatchState: "matched",
    chatThreadStatus: "payment_required",
    chatThreadId: "30000000-0000-4000-8000-000000000301",
    next: "구매자가 상담 범위를 승인하면 결제 링크를 보냅니다."
  },
  {
    id: "20000000-0000-4000-8000-000000000202",
    displayId: "PAY-2422",
    company: "Green Spoon Co.",
    product: "Soy Corn Protein Bar",
    expert: "Jason Wu",
    amount: "580 USD",
    status: "paid",
    provider: "Stripe / pi_escrow_ready",
    expertMatchState: "paid",
    chatThreadStatus: "active",
    chatThreadId: "30000000-0000-4000-8000-000000000302",
    next: "전문가 작업공간에 식품 표시 증빙 체크리스트를 공개합니다."
  },
  {
    id: "20000000-0000-4000-8000-000000000203",
    displayId: "PAY-2426",
    company: "Han River Foods",
    product: "Ginseng Jelly Stick",
    expert: "Jason Wu",
    amount: "310 USD",
    status: "authorized",
    provider: "manual invoice",
    expertMatchState: "in_progress",
    chatThreadStatus: "active",
    chatThreadId: "30000000-0000-4000-8000-000000000303",
    next: "milestone 지급 전 번역 원료표 보완 여부를 확인합니다."
  },
  {
    id: "20000000-0000-4000-8000-000000000204",
    displayId: "PAY-2407",
    company: "Morning Farm",
    product: "Enzyme Drink",
    expert: "Hana Park",
    amount: "260 USD",
    status: "refunded",
    provider: "Stripe / re_refund_sent",
    expertMatchState: "refunded",
    chatThreadStatus: "archived",
    chatThreadId: "30000000-0000-4000-8000-000000000304",
    next: "환불 사유와 상담방 잠금 상태가 audit에 남았는지 확인합니다."
  }
];

const previewLogisticsCompanies: PlatformLogisticsCompanyRow[] = [
  {
    name: "Formosa Cold Chain",
    lane: "KR -> TW 냉장 식품",
    modes: ["ocean", "air"],
    strengths: "TFDA 검사 슬롯, reefer handoff, 보세창고 조율",
    sla: "4시간 내 견적",
    status: "preferred"
  },
  {
    name: "Taipei Beauty Forwarding",
    lane: "KR -> TW 화장품",
    modes: ["air"],
    strengths: "PIF dossier 동봉, 화장품 통관 메모, 소량 항공",
    sla: "2시간 내 견적",
    status: "quoting"
  },
  {
    name: "Kaohsiung Trade Bridge",
    lane: "Busan -> Kaohsiung 식품",
    modes: ["ocean"],
    strengths: "CCC 코드 확인, 통관 보류 대응, 항만 창고 운송",
    sla: "반일 견적",
    status: "standby"
  }
];

const previewShipmentRequests: PlatformShipmentRequestRow[] = [
  {
    id: "40000000-0000-4000-8000-000000000401",
    displayId: "LR-2408",
    product: "Soy protein snack multipack",
    importer: "Annaanda Global",
    lane: "Incheon -> Taoyuan",
    state: "quoted",
    handoff: "식품 수입검사",
    next: "냉장 항공 견적과 일반 항공 견적을 비교합니다."
  },
  {
    id: "40000000-0000-4000-8000-000000000402",
    displayId: "LR-2411",
    product: "Cica barrier cream launch kit",
    importer: "Taipei Select Retail",
    lane: "Seoul -> Taipei",
    state: "accepted",
    handoff: "화장품 PIF + 통관 메모",
    next: "PIF 증빙을 lock한 뒤 항공 예약을 확정합니다."
  },
  {
    id: "40000000-0000-4000-8000-000000000403",
    displayId: "LR-2415",
    product: "Shelf-stable tea beverage",
    importer: "Green Market TW",
    lane: "Busan -> Kaohsiung",
    state: "customs_hold",
    handoff: "식품 첨가물 표시",
    next: "보완 요청 사유와 성분 설명서를 통관 이벤트에 첨부합니다."
  }
];

const previewActiveShipments: PlatformShipmentRow[] = [
  {
    id: "50000000-0000-4000-8000-000000000501",
    reference: "SHP-TW-8831",
    product: "Cica barrier cream launch kit",
    mode: "air",
    carrier: "Korean Air Cargo",
    tracking: "KE-771-22910463",
    vehicle: "KE691",
    route: "ICN -> TPE",
    state: "booked",
    eta: "7월 2일 09:25",
    customs: "화장품 통관 메모와 PIF handoff 완료"
  },
  {
    id: "50000000-0000-4000-8000-000000000502",
    reference: "SHP-TW-8794",
    product: "Soy protein snack multipack",
    mode: "ocean",
    carrier: "Evergreen Marine",
    tracking: "EGLV-15684022",
    vehicle: "Ever Bliss / 084E",
    route: "PUS -> KEL",
    state: "in_transit",
    eta: "7월 8일 16:00",
    customs: "TFDA 수입검사 예약 대기"
  },
  {
    id: "50000000-0000-4000-8000-000000000503",
    reference: "SHP-TW-8720",
    product: "Shelf-stable tea beverage",
    mode: "ocean",
    carrier: "Yang Ming",
    tracking: "YMLU-4409128",
    vehicle: "YM Continuity / 032S",
    route: "PUS -> KHH",
    state: "customs_hold",
    eta: "보류",
    customs: "첨가물 용도 설명과 라벨 번역본 보완 요청"
  }
];

const previewShipmentEvents: PlatformShipmentEventRow[] = [
  {
    time: "6월 27일 14:35",
    title: "통관 보류: 첨가물 용도 확인",
    location: "Kaohsiung Customs",
    detail: "운영자가 식품 성분표와 첨가물 용도 설명서를 요청했습니다.",
    state: "customs_hold"
  },
  {
    time: "6월 27일 11:20",
    title: "해상 운송 출항",
    location: "Busan Port",
    detail: "선박 출항 후 TFDA 검사 예약은 수입자 확인을 기다립니다.",
    state: "in_transit"
  },
  {
    time: "6월 26일 18:10",
    title: "항공 예약 확정",
    location: "Incheon Cargo Terminal",
    detail: "화장품 PIF handoff와 인보이스 파일을 운송사에 전달했습니다.",
    state: "booked"
  },
  {
    time: "6월 26일 09:45",
    title: "우선 물류 견적 수락",
    location: "LabelPass Admin",
    detail: "화장품 항공 shortlist에서 운영자가 운송사를 선택했습니다.",
    state: "accepted"
  }
];

const previewSettings: PlatformSettingRow[] = [
  {
    organization: "Annaanda Global",
    billingStatus: "trial",
    locale: "ko-KR",
    markets: ["TW"],
    reviewArchiveEnabled: false,
    expertMatchingEnabled: true,
    logisticsMatchingEnabled: true,
    notifications: ["email"],
    next: "Supabase DB URL 연결 후 리뷰 아카이브와 운영 데이터 저장을 켭니다."
  },
  {
    organization: "Expert Partner Pool",
    billingStatus: "active",
    locale: "zh-TW",
    markets: ["TW", "KR"],
    reviewArchiveEnabled: false,
    expertMatchingEnabled: true,
    logisticsMatchingEnabled: false,
    notifications: ["email", "dashboard"],
    next: "전문가 상담방과 정산 알림 채널을 확인합니다."
  },
  {
    organization: "Logistics Partner Pool",
    billingStatus: "active",
    locale: "zh-TW",
    markets: ["TW"],
    reviewArchiveEnabled: false,
    expertMatchingEnabled: false,
    logisticsMatchingEnabled: true,
    notifications: ["email", "webhook"],
    next: "선적 이벤트 webhook과 통관 보류 알림을 연결합니다."
  }
];

export function getPlatformOpsPreviewSnapshot(storage: PlatformOpsStorage, warnings: string[]): PlatformOpsSnapshot {
  return {
    storage,
    generatedAt: new Date().toISOString(),
    warnings,
    counts: previewCounts,
    companyRows: previewCompanyRows,
    roleRows: previewRoleRows,
    reviewFlows: previewReviewFlows,
    expertProfiles: previewExpertProfiles,
    expertCases: previewExpertCases,
    logisticsCompanies: previewLogisticsCompanies,
    shipmentRequests: previewShipmentRequests,
    activeShipments: previewActiveShipments,
    shipmentEvents: previewShipmentEvents,
    payments: previewPayments,
    settings: previewSettings
  };
}

function nonzeroBadge(count: number, tone: PlatformOpsNavBadge["tone"], label: string): PlatformOpsNavBadge | undefined {
  return count > 0 ? { count, tone, label } : undefined;
}

function isOpenReviewFlow(flow: PlatformReviewFlow) {
  return !/completed|done|closed|완료|종료/i.test(flow.status);
}

function paymentNeedsAttention(payment: PlatformPaymentRow) {
  return (
    payment.status === "pending" ||
    payment.status === "failed" ||
    payment.status === "refunded" ||
    payment.chatThreadStatus === "payment_required"
  );
}

function queuePriority(tone: PlatformOpsQueueTone) {
  if (tone === "blocked") return 0;
  if (tone === "waiting") return 1;
  if (tone === "review") return 2;
  return 3;
}

export function buildPlatformOpsActionQueue(snapshot: PlatformOpsSnapshot, limit = 6): PlatformOpsActionQueueItem[] {
  const items: PlatformOpsActionQueueItem[] = [];

  for (const [index, flow] of snapshot.reviewFlows.entries()) {
    if (!isOpenReviewFlow(flow)) continue;
    items.push({
      id: `review-${index}-${flow.product}`,
      href: "/admin/reviews",
      tone: "review",
      label: "리뷰 후속",
      title: flow.product,
      detail: `${flow.route} / ${flow.status}`,
      next: flow.next,
      owner: flow.handoff
    });
  }

  for (const item of snapshot.expertCases) {
    if (item.state !== "requested" && item.state !== "matched" && item.queueTone !== "blocked") continue;
    items.push({
      id: `expert-${item.id}`,
      href: "/admin/experts",
      tone: item.queueTone === "blocked" ? "blocked" : item.state === "requested" ? "waiting" : "ready",
      label: "전문가",
      title: item.product,
      detail: `${item.displayId ?? item.id} / ${item.company} / ${item.expert}`,
      next: item.next,
      owner: item.reviewHandoff
    });
  }

  for (const payment of snapshot.payments) {
    if (!paymentNeedsAttention(payment)) continue;
    items.push({
      id: `payment-${payment.id}`,
      href: "/admin/payments",
      tone: payment.status === "failed" || payment.status === "refunded" ? "blocked" : "waiting",
      label: "결제/상담",
      title: payment.product,
      detail: `${payment.displayId ?? payment.id} / ${payment.amount} / ${payment.provider}`,
      next: payment.next,
      owner: `${payment.expert} / ${payment.chatThreadStatus}`
    });
  }

  for (const request of snapshot.shipmentRequests) {
    if (!["requested", "quoted", "customs_hold"].includes(request.state)) continue;
    items.push({
      id: `shipment-request-${request.id}`,
      href: "/admin/logistics",
      tone: request.state === "customs_hold" ? "blocked" : request.state === "quoted" ? "review" : "waiting",
      label: "물류 요청",
      title: request.product,
      detail: `${request.displayId ?? request.id} / ${request.lane} / ${request.handoff}`,
      next: request.next,
      owner: request.importer
    });
  }

  for (const shipment of snapshot.activeShipments) {
    if (!["booked", "in_transit", "customs_hold"].includes(shipment.state)) continue;
    items.push({
      id: `shipment-${shipment.id ?? shipment.reference}`,
      href: "/admin/logistics",
      tone: shipment.state === "customs_hold" ? "blocked" : "review",
      label: shipment.state === "customs_hold" ? "통관 보류" : "선적 추적",
      title: shipment.product,
      detail: `${shipment.reference} / ${shipment.carrier} / ${shipment.tracking}`,
      next: `${shipment.route} / ETA ${shipment.eta}`,
      owner: shipment.customs
    });
  }

  if (snapshot.storage !== "database") {
    items.push({
      id: "settings-admin-db",
      href: "/admin/settings",
      tone: "blocked",
      label: "설정",
      title: "관리자 DB 연결",
      detail: "현재 관리자 데이터는 읽기 전용 preview로 표시됩니다.",
      next: snapshot.warnings[0] ?? "SUPABASE_DB_URL과 관리자 preview/write 플래그를 설정합니다.",
      owner: "보안 설정"
    });
  }

  return items
    .sort((a, b) => queuePriority(a.tone) - queuePriority(b.tone) || a.href.localeCompare(b.href) || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function buildPlatformOpsNavBadges(snapshot: PlatformOpsSnapshot): PlatformOpsNavBadges {
  const reviewQueue = snapshot.reviewFlows.filter(isOpenReviewFlow).length;
  const expertQueue = snapshot.expertCases.filter(
    (item) => item.state === "requested" || item.state === "matched" || item.queueTone === "blocked"
  ).length;
  const expertBlocked = snapshot.expertCases.filter((item) => item.queueTone === "blocked").length;
  const paymentQueue = snapshot.payments.filter(paymentNeedsAttention).length;
  const customsHolds = snapshot.activeShipments.filter((shipment) => shipment.state === "customs_hold").length;
  const logisticsQueue =
    customsHolds +
    snapshot.shipmentRequests.filter((request) => ["requested", "quoted", "customs_hold"].includes(request.state)).length;
  const settingsQueue = snapshot.storage === "database" ? 0 : snapshot.warnings.length;
  const totalQueue = reviewQueue + expertQueue + paymentQueue + logisticsQueue + settingsQueue;
  const badges: PlatformOpsNavBadges = {};

  for (const [href, badge] of [
    ["/admin", nonzeroBadge(totalQueue, totalQueue >= 8 ? "danger" : "warn", `${totalQueue}개 운영 대기`)],
    ["/admin/reviews", nonzeroBadge(reviewQueue, "warn", `${reviewQueue}개 리뷰 후속`)],
    [
      "/admin/experts",
      nonzeroBadge(
        expertQueue,
        expertBlocked > 0 ? "danger" : "warn",
        `${expertQueue}개 전문가 매칭 확인`
      )
    ],
    ["/admin/payments", nonzeroBadge(paymentQueue, paymentQueue > 1 ? "danger" : "warn", `${paymentQueue}개 결제 또는 상담방 확인`)],
    ["/admin/logistics", nonzeroBadge(logisticsQueue, customsHolds > 0 ? "danger" : "warn", `${logisticsQueue}개 물류 확인`)],
    ["/admin/settings", nonzeroBadge(settingsQueue, "info", `${settingsQueue}개 운영 설정 확인`)]
  ] as const) {
    if (badge) badges[href] = badge;
  }

  return badges;
}

async function readCounts(sql: DbClient): Promise<PlatformOpsCounts> {
  const [row] = await sql<[Record<string, string | number>]>`
    select
      (select count(*) from public.organizations) as organizations,
      (select count(*) from public.organization_members where status = 'active') as active_members,
      (select count(*) from public.reviews) as reviews,
      (select count(*) from public.expert_profiles) as expert_profiles,
      (select count(*) from public.expert_matches) as expert_matches,
      (select count(*) from public.logistics_companies) as logistics_companies,
      (select count(*) from public.shipment_requests) as shipment_requests,
      (select count(*) from public.shipments where status in ('preparing', 'booked', 'in_transit', 'customs_hold')) as active_shipments,
      (select count(*) from public.shipments where status = 'customs_hold') as customs_holds,
      (select count(*) from public.payments) as payments
  `;

  return {
    organizations: asCount(row.organizations),
    activeMembers: asCount(row.active_members),
    reviews: asCount(row.reviews),
    expertProfiles: asCount(row.expert_profiles),
    expertMatches: asCount(row.expert_matches),
    logisticsCompanies: asCount(row.logistics_companies),
    shipmentRequests: asCount(row.shipment_requests),
    activeShipments: asCount(row.active_shipments),
    customsHolds: asCount(row.customs_holds),
    payments: asCount(row.payments)
  };
}

async function readCompanyRows(sql: DbClient): Promise<PlatformCompanyRow[]> {
  const rows = await sql<OrganizationRow[]>`
    select
      o.name,
      o.primary_market,
      o.status,
      o.billing_status,
      count(distinct p.id) as product_count,
      count(distinct r.id) as review_count,
      count(distinct em.id) as expert_match_count,
      count(distinct sr.id) as shipment_request_count
    from public.organizations o
    left join public.products p on p.organization_id = o.id
    left join public.reviews r on r.product_id = p.id
    left join public.expert_matches em on em.organization_id = o.id
    left join public.shipment_requests sr on sr.organization_id = o.id
    group by o.id
    order by o.updated_at desc
    limit 12
  `;

  return rows.map((row) => ({
    name: row.name,
    market: row.primary_market,
    status: `${row.status} / ${row.billing_status}`,
    modules: `제품 ${asCount(row.product_count)}, 리뷰 ${asCount(row.review_count)}, 전문가 ${asCount(row.expert_match_count)}, 물류 ${asCount(row.shipment_request_count)}`,
    next: asCount(row.product_count) === 0 ? "제품 등록 또는 리뷰 요청 생성" : "리뷰·문서·매칭 상태 확인"
  }));
}

async function readRoleRows(sql: DbClient): Promise<PlatformRoleRow[]> {
  const rows = await sql<RoleCountRow[]>`
    select role, status, count(*) as member_count
    from public.organization_members
    group by role, status
    order by role asc, status asc
  `;

  return rows.map((row) => {
    const count = asCount(row.member_count);
    return {
      role: `organization_members.${row.role}`,
      scope: `${roleScope(row.role)} / ${row.status}`,
      can: roleCan(row.role, count),
      caution: row.status === "active" ? "활성 멤버만 운영 데이터에 접근" : "초대/정지 상태는 접근 정책 확인"
    };
  });
}

async function readReviewFlows(sql: DbClient): Promise<PlatformReviewFlow[]> {
  const rows = await sql<ReviewRow[]>`
    select
      r.id,
      r.status,
      r.verdict,
      r.risk_score,
      r.summary,
      p.name as product_name,
      p.category,
      p.market,
      o.name as organization_name
    from public.reviews r
    join public.products p on p.id = r.product_id
    left join public.organizations o on o.id = p.organization_id
    order by r.updated_at desc
    limit 9
  `;

  return rows.map((row) => {
    const category = productCategoryLabel(row.category);
    return {
      title: row.verdict === "fail" ? `${category} 보완 필요` : `${category} 리뷰 후속`,
      product: row.product_name ?? "제품명 미정",
      route: `${row.market ?? "TW"} ${category}`,
      status: row.status,
      next: row.summary ?? `risk ${row.risk_score ?? "n/a"}`,
      handoff: category === "식품" ? "식품 라벨·물류 확인" : "화장품 PIF·전문가 확인"
    };
  });
}

async function readExpertProfiles(sql: DbClient): Promise<PlatformExpertProfileRow[]> {
  const rows = await sql<ExpertProfileRow[]>`
    select
      ep.id,
      ep.display_name,
      ep.company_name,
      ep.regions,
      ep.categories,
      ep.languages,
      ep.hourly_rate,
      ep.currency,
      ep.status,
      ep.metadata,
      count(em.id) as active_cases
    from public.expert_profiles ep
    left join public.expert_matches em
      on em.expert_profile_id = ep.id
      and em.status in ('matched', 'paid', 'in_progress')
    group by ep.id
    order by ep.updated_at desc
    limit 12
  `;

  return rows.map((row) => {
    const categories = asArray(row.categories);
    return {
      name: row.display_name,
      firm: row.company_name ?? "독립 전문가",
      base: asArray(row.regions).join(" / ") || "TW",
      discipline: disciplineFromCategories(categories),
      languages: asArray(row.languages),
      specialties: categories.length ? categories : ["규제 검토"],
      credential: metadataText(row.metadata, "credential", row.status),
      availability: row.status === "active" ? numericLabel(row.hourly_rate, row.currency) : row.status,
      activeCases: asCount(row.active_cases)
    };
  });
}

async function readExpertCases(sql: DbClient): Promise<PlatformExpertCaseRow[]> {
  const rows = await sql<ExpertMatchRow[]>`
    select
      em.id,
      em.status,
      em.service_type,
      em.summary,
      em.quoted_amount,
      em.currency,
      o.name as organization_name,
      p.name as product_name,
      p.category,
      ep.display_name as expert_name,
      pay.status as payment_status,
      ct.status as thread_status
    from public.expert_matches em
    left join public.organizations o on o.id = em.organization_id
    left join public.products p on p.id = em.product_id
    left join public.expert_profiles ep on ep.id = em.expert_profile_id
    left join lateral (
      select status
      from public.payments
      where expert_match_id = em.id
      order by created_at desc
      limit 1
    ) pay on true
    left join lateral (
      select status
      from public.chat_threads
      where expert_match_id = em.id
      order by updated_at desc
      limit 1
    ) ct on true
    order by em.updated_at desc
    limit 12
  `;

  return rows.map((row) => {
    const state = expertState(row.status);
    const category = productCategoryLabel(row.category);
    return {
      id: row.id,
      displayId: row.id.slice(0, 8),
      company: row.organization_name ?? "조직 미지정",
      product: row.product_name ?? "제품 미지정",
      category,
      expert: row.expert_name ?? "전문가 배정 전",
      state,
      chatReady: row.thread_status ? `상담방 ${row.thread_status}` : "상담방 준비 전",
      payment: row.payment_status ? `결제 ${row.payment_status}` : numericLabel(row.quoted_amount, row.currency),
      reviewHandoff: row.service_type,
      next: row.summary ?? "운영자가 범위와 증빙을 확인합니다.",
      sla: state === "requested" ? "운영자 배정 필요" : "진행 상태 확인",
      queueTone: state === "requested" || state === "refunded" || state === "cancelled" ? "blocked" : "ready"
    };
  });
}

async function readLogisticsCompanies(sql: DbClient): Promise<PlatformLogisticsCompanyRow[]> {
  const rows = await sql<LogisticsCompanyDbRow[]>`
    select name, countries, service_types, status, metadata
    from public.logistics_companies
    order by updated_at desc
    limit 12
  `;

  return rows.map((row) => {
    const serviceTypes = asArray(row.service_types);
    const metadataModes = asArray(row.metadata?.modes);
    return {
      name: row.name,
      lane: metadataText(row.metadata, "lane", asArray(row.countries).join(" -> ") || "KR -> TW"),
      modes: (metadataModes.length ? metadataModes : serviceTypes).some((item) => /air|항공/i.test(item))
        ? ["air"]
        : ["ocean"],
      strengths: serviceTypes.join(", ") || metadataText(row.metadata, "strengths", "통관·운송 운영 파트너"),
      sla: metadataText(row.metadata, "sla", "견적 SLA 미정"),
      status: row.status === "active" ? "preferred" : row.status === "paused" ? "standby" : "quoting"
    };
  });
}

async function readShipmentRequests(sql: DbClient): Promise<PlatformShipmentRequestRow[]> {
  const rows = await sql<ShipmentRequestDbRow[]>`
    select
      sr.id,
      sr.status,
      sr.origin_country,
      sr.destination_country,
      sr.incoterms,
      sr.cargo_summary,
      sr.metadata,
      o.name as organization_name,
      p.name as product_name
    from public.shipment_requests sr
    left join public.organizations o on o.id = sr.organization_id
    left join public.products p on p.id = sr.product_id
    order by sr.updated_at desc
    limit 12
  `;

  return rows.map((row) => ({
    id: row.id,
    displayId: row.id.slice(0, 8),
    product: row.product_name ?? row.cargo_summary ?? "화물 정보 미정",
    importer: row.organization_name ?? "수입자 미정",
    lane: `${row.origin_country} -> ${row.destination_country}`,
    state: logisticsState(row.status),
    handoff: metadataText(row.metadata, "handoff", row.incoterms ?? "수입 증빙 확인"),
    next: metadataText(row.metadata, "next", "견적, 예약, 통관 증빙 상태를 확인합니다.")
  }));
}

async function readActiveShipments(sql: DbClient): Promise<PlatformShipmentRow[]> {
  const rows = await sql<ShipmentDbRow[]>`
    select
      s.id,
      s.tracking_number,
      s.status,
      s.eta,
      s.metadata,
      o.name as organization_name,
      p.name as product_name,
      lc.name as logistics_company_name
    from public.shipments s
    left join public.organizations o on o.id = s.organization_id
    left join public.shipment_requests sr on sr.id = s.shipment_request_id
    left join public.products p on p.id = sr.product_id
    left join public.logistics_companies lc on lc.id = s.logistics_company_id
    order by s.updated_at desc
    limit 12
  `;

  return rows.map((row) => {
    const mode = /air|flight|항공/i.test(metadataText(row.metadata, "mode", "")) ? "air" : "ocean";
    return {
      id: row.id,
      reference: row.tracking_number ?? row.id.slice(0, 8),
      product: row.product_name ?? row.organization_name ?? "선적 제품 미정",
      mode,
      carrier: metadataText(row.metadata, "carrier", row.logistics_company_name ?? "운송사 미정"),
      tracking: row.tracking_number ?? "tracking 미정",
      vehicle: metadataText(row.metadata, "vehicle", mode === "air" ? "항공편 미정" : "선박 미정"),
      route: metadataText(row.metadata, "route", "KR -> TW"),
      state: logisticsState(row.status),
      eta: dateLabel(row.eta),
      customs: metadataText(row.metadata, "customs", "통관 상태 확인 필요")
    };
  });
}

async function readShipmentEvents(sql: DbClient): Promise<PlatformShipmentEventRow[]> {
  const rows = await sql<ShipmentEventDbRow[]>`
    select event_type, status, message, occurred_at, metadata
    from public.shipment_events
    order by occurred_at desc
    limit 12
  `;

  return rows.map((row) => ({
    time: dateLabel(row.occurred_at),
    title: metadataText(row.metadata, "title", row.event_type),
    location: metadataText(row.metadata, "location", "위치 미정"),
    detail: row.message ?? metadataText(row.metadata, "detail", "상세 메시지 없음"),
    state: logisticsState(row.status ?? row.event_type)
  }));
}

async function readPayments(sql: DbClient): Promise<PlatformPaymentRow[]> {
  const rows = await sql<PaymentDbRow[]>`
    select
      pay.id,
      pay.amount,
      pay.currency,
      pay.status,
      pay.provider,
      pay.provider_reference,
      pay.metadata,
      o.name as organization_name,
      p.name as product_name,
      ep.display_name as expert_name,
      em.status as expert_match_status,
      em.service_type,
      ct.id as chat_thread_id,
      ct.status as chat_thread_status
    from public.payments pay
    left join public.organizations o on o.id = pay.organization_id
    left join public.expert_matches em on em.id = pay.expert_match_id
    left join public.products p on p.id = em.product_id
    left join public.expert_profiles ep on ep.id = em.expert_profile_id
    left join lateral (
      select id, status
      from public.chat_threads
      where expert_match_id = em.id
      order by updated_at desc
      limit 1
    ) ct on true
    order by pay.updated_at desc
    limit 14
  `;

  return rows.map((row) => ({
    id: row.id,
    displayId: row.id.slice(0, 8),
    company: row.organization_name ?? "조직 미지정",
    product: row.product_name ?? metadataText(row.metadata, "product", "전문가 상담"),
    expert: row.expert_name ?? "전문가 배정 전",
    amount: numericLabel(row.amount, row.currency),
    status: row.status,
    provider: row.provider_reference ? `${row.provider ?? "provider"} / ${row.provider_reference}` : row.provider ?? "결제 제공자 미정",
    expertMatchState: row.expert_match_status ?? "매칭 상태 미정",
    chatThreadStatus: row.chat_thread_status ?? "상담방 준비 전",
    chatThreadId: row.chat_thread_id ?? undefined,
    next: row.service_type ?? metadataText(row.metadata, "next", "결제 상태와 상담방 접근 조건을 확인합니다.")
  }));
}

async function readSettings(sql: DbClient): Promise<PlatformSettingRow[]> {
  const rows = await sql<OrganizationSettingDbRow[]>`
    select
      o.name as organization_name,
      o.billing_status,
      os.default_locale,
      os.markets,
      os.review_archive_enabled,
      os.expert_matching_enabled,
      os.logistics_matching_enabled,
      os.notification_channels,
      os.metadata
    from public.organization_settings os
    join public.organizations o on o.id = os.organization_id
    order by os.updated_at desc
    limit 14
  `;

  return rows.map((row) => ({
    organization: row.organization_name,
    billingStatus: row.billing_status,
    locale: row.default_locale,
    markets: asArray(row.markets).length ? asArray(row.markets) : ["TW"],
    reviewArchiveEnabled: row.review_archive_enabled,
    expertMatchingEnabled: row.expert_matching_enabled,
    logisticsMatchingEnabled: row.logistics_matching_enabled,
    notifications: asArray(row.notification_channels).length ? asArray(row.notification_channels) : ["email"],
    next: metadataText(row.metadata, "next", "회사별 기능 토글과 알림 채널을 운영 정책에 맞게 확인합니다.")
  }));
}

export async function getPlatformOpsSnapshot(): Promise<PlatformOpsSnapshot> {
  if (snapshotCache && snapshotCache.expiresAt > Date.now()) {
    return snapshotCache.value;
  }

  if (!databaseUrl) {
    return getPlatformOpsPreviewSnapshot("disabled", [
      "Supabase DB URL이 없어 실제 운영 DB 대신 연결된 운영 프리뷰 데이터를 표시합니다."
    ]);
  }

  if (!adminDbPreviewEnabled) {
    return getPlatformOpsPreviewSnapshot("preview_disabled", [
      "서버 DB URL은 있지만 관리자 DB 미리보기가 꺼져 있어 운영 프리뷰 데이터를 표시합니다."
    ]);
  }

  const sql = getClient();
  if (!sql) {
    return getPlatformOpsPreviewSnapshot("disabled", [
      "관리자 DB 클라이언트를 만들 수 없어 운영 프리뷰 데이터를 표시합니다."
    ]);
  }

  try {
    const [
      counts,
      companyRows,
      roleRows,
      reviewFlows,
      expertProfiles,
      expertCases,
      logisticsCompanies,
      shipmentRequests,
      activeShipments,
      shipmentEvents,
      payments,
      settings
    ] = await withTimeout(Promise.all([
      readCounts(sql),
      readCompanyRows(sql),
      readRoleRows(sql),
      readReviewFlows(sql),
      readExpertProfiles(sql),
      readExpertCases(sql),
      readLogisticsCompanies(sql),
      readShipmentRequests(sql),
      readActiveShipments(sql),
      readShipmentEvents(sql),
      readPayments(sql),
      readSettings(sql)
    ]), databasePreviewTimeoutMs);

    return cacheSnapshot({
      storage: "database",
      generatedAt: new Date().toISOString(),
      warnings: [],
      counts,
      companyRows,
      roleRows,
      reviewFlows,
      expertProfiles,
      expertCases,
      logisticsCompanies,
      shipmentRequests,
      activeShipments,
      shipmentEvents,
      payments,
      settings
    });
  } catch (error) {
    return cacheSnapshot(getPlatformOpsPreviewSnapshot("error", [
      error instanceof Error ? error.message : "관리자 운영 DB 조회 중 알 수 없는 오류가 발생했습니다.",
      "실데이터 조회 실패로 운영 프리뷰 데이터를 표시합니다."
    ]));
  }
}
