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

const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const adminDbPreviewEnabled = process.env.LABELPASS_ENABLE_ADMIN_DB_PREVIEW === "1";
let client: DbClient | null = null;

const zeroCounts: PlatformOpsCounts = {
  organizations: 0,
  activeMembers: 0,
  reviews: 0,
  expertProfiles: 0,
  expertMatches: 0,
  logisticsCompanies: 0,
  shipmentRequests: 0,
  activeShipments: 0,
  customsHolds: 0,
  payments: 0
};

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

function emptySnapshot(storage: PlatformOpsStorage, warnings: string[]): PlatformOpsSnapshot {
  return {
    storage,
    generatedAt: new Date().toISOString(),
    warnings,
    counts: zeroCounts,
    companyRows: [],
    roleRows: [],
    reviewFlows: [],
    expertProfiles: [],
    expertCases: [],
    logisticsCompanies: [],
    shipmentRequests: [],
    activeShipments: [],
    shipmentEvents: []
  };
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

export async function getPlatformOpsSnapshot(): Promise<PlatformOpsSnapshot> {
  if (!databaseUrl) {
    return emptySnapshot("disabled", [
      "SUPABASE_DB_URL, POSTGRES_URL, DATABASE_URL 중 하나가 없어 관리자 DB 조회는 비활성화되어 있습니다."
    ]);
  }

  if (!adminDbPreviewEnabled) {
    return emptySnapshot("preview_disabled", [
      "서버 DB URL은 있지만 LABELPASS_ENABLE_ADMIN_DB_PREVIEW=1이 없어 공개 관리자 경로에서 실데이터 조회를 막았습니다."
    ]);
  }

  const sql = getClient();
  if (!sql) return emptySnapshot("disabled", ["관리자 DB 클라이언트를 만들 수 없습니다."]);

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
      shipmentEvents
    ] = await Promise.all([
      readCounts(sql),
      readCompanyRows(sql),
      readRoleRows(sql),
      readReviewFlows(sql),
      readExpertProfiles(sql),
      readExpertCases(sql),
      readLogisticsCompanies(sql),
      readShipmentRequests(sql),
      readActiveShipments(sql),
      readShipmentEvents(sql)
    ]);

    return {
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
      shipmentEvents
    };
  } catch (error) {
    return emptySnapshot("error", [
      error instanceof Error ? error.message : "관리자 운영 DB 조회 중 알 수 없는 오류가 발생했습니다."
    ]);
  }
}
