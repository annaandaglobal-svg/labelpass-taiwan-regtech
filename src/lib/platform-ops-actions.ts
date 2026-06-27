import postgres from "postgres";

type DbClient = ReturnType<typeof postgres>;
type TransactionClient = postgres.TransactionSql;
type JsonRecord = Record<string, unknown>;

export const expertMatchStatuses = ["requested", "matched", "paid", "in_progress", "completed", "cancelled", "refunded"] as const;
export const paymentStatuses = ["pending", "authorized", "paid", "failed", "refunded", "cancelled"] as const;
export const chatThreadStatuses = ["open", "payment_required", "active", "closed", "archived"] as const;
export const logisticsMatchStatuses = ["recommended", "quoted", "selected", "rejected", "expired"] as const;
export const shipmentRequestStatuses = ["draft", "requested", "quoted", "booked", "cancelled"] as const;
export const shipmentStatuses = ["preparing", "booked", "in_transit", "customs_hold", "delivered", "cancelled"] as const;
export const shipmentEventTypes = ["created", "document", "pickup", "departure", "arrival", "customs", "exception", "delivery", "note"] as const;

export type ExpertMatchStatus = (typeof expertMatchStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type ChatThreadStatus = (typeof chatThreadStatuses)[number];
export type LogisticsMatchStatus = (typeof logisticsMatchStatuses)[number];
export type ShipmentRequestStatus = (typeof shipmentRequestStatuses)[number];
export type ShipmentStatus = (typeof shipmentStatuses)[number];
export type ShipmentEventType = (typeof shipmentEventTypes)[number];

export type PlatformOpsActionStorage = "database" | "disabled" | "preview_disabled" | "write_disabled";
export type PlatformOpsActionResult =
  | {
      ok: true;
      storage: PlatformOpsActionStorage;
      applied: boolean;
      dryRun: boolean;
      action: PlatformOpsAction["action"];
      entityTable: string;
      entityId: string;
      auditLogged: boolean;
      before?: JsonRecord;
      after?: JsonRecord;
      warnings: string[];
    }
  | {
      ok: false;
      storage: PlatformOpsActionStorage;
      applied: false;
      dryRun: boolean;
      action: PlatformOpsAction["action"];
      error: "not_configured" | "write_disabled" | "not_found" | "database_error";
      message: string;
      warnings: string[];
    };

type BaseAction = {
  actorProfileId?: string | null;
  requestId?: string;
  note?: string;
  metadata?: JsonRecord;
};

export type PlatformOpsAction =
  | (BaseAction & { action: "expert_match_status"; id: string; status: ExpertMatchStatus })
  | (BaseAction & { action: "payment_status"; id: string; status: PaymentStatus })
  | (BaseAction & { action: "chat_thread_status"; id: string; status: ChatThreadStatus })
  | (BaseAction & { action: "logistics_match_status"; id: string; status: LogisticsMatchStatus })
  | (BaseAction & { action: "shipment_request_status"; id: string; status: ShipmentRequestStatus })
  | (BaseAction & { action: "shipment_status"; id: string; status: ShipmentStatus })
  | (BaseAction & {
      action: "shipment_event";
      shipmentId: string;
      eventType: ShipmentEventType;
      status?: ShipmentStatus;
      message: string;
      occurredAt?: string;
    });

const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const adminDbPreviewEnabled = process.env.LABELPASS_ENABLE_ADMIN_DB_PREVIEW === "1";
const adminDbWritesEnabled = process.env.LABELPASS_ENABLE_ADMIN_DB_WRITES === "1";
let client: DbClient | null = null;

const actionLabels: Record<PlatformOpsAction["action"], string> = {
  expert_match_status: "expert_matches.status",
  payment_status: "payments.status",
  chat_thread_status: "chat_threads.status",
  logistics_match_status: "logistics_matches.status",
  shipment_request_status: "shipment_requests.status",
  shipment_status: "shipments.status",
  shipment_event: "shipment_events.insert"
};

const actionTables: Record<PlatformOpsAction["action"], string> = {
  expert_match_status: "expert_matches",
  payment_status: "payments",
  chat_thread_status: "chat_threads",
  logistics_match_status: "logistics_matches",
  shipment_request_status: "shipment_requests",
  shipment_status: "shipments",
  shipment_event: "shipment_events"
};

export function platformOpsActionReadiness() {
  const storage: PlatformOpsActionStorage = !databaseUrl
    ? "disabled"
    : !adminDbPreviewEnabled
      ? "preview_disabled"
      : !adminDbWritesEnabled
        ? "write_disabled"
        : "database";

  return {
    storage,
    databaseUrlPresent: Boolean(databaseUrl),
    adminDbPreviewEnabled,
    adminDbWritesEnabled,
    adminOpsTokenConfigured: Boolean(process.env.LABELPASS_ADMIN_OPS_TOKEN),
    writesReady: storage === "database" && Boolean(process.env.LABELPASS_ADMIN_OPS_TOKEN),
    supportedActions: {
      expert_match_status: expertMatchStatuses,
      payment_status: paymentStatuses,
      chat_thread_status: chatThreadStatuses,
      logistics_match_status: logisticsMatchStatuses,
      shipment_request_status: shipmentRequestStatuses,
      shipment_status: shipmentStatuses,
      shipment_event: shipmentEventTypes
    }
  };
}

function getClient() {
  if (!databaseUrl || !adminDbPreviewEnabled || !adminDbWritesEnabled) return null;
  client ??= postgres(databaseUrl, {
    max: 2,
    ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") ? false : "require",
    idle_timeout: 10,
    connect_timeout: 8,
    prepare: false
  });
  return client;
}

function storageState(): PlatformOpsActionStorage {
  if (!databaseUrl) return "disabled";
  if (!adminDbPreviewEnabled) return "preview_disabled";
  if (!adminDbWritesEnabled) return "write_disabled";
  return "database";
}

function warningsForStorage(storage: PlatformOpsActionStorage) {
  if (storage === "disabled") return ["SUPABASE_DB_URL, POSTGRES_URL, DATABASE_URL 중 하나가 없어 운영 액션 DB 쓰기를 비활성화했습니다."];
  if (storage === "preview_disabled") return ["LABELPASS_ENABLE_ADMIN_DB_PREVIEW=1이 없어 운영 액션 DB 쓰기를 비활성화했습니다."];
  if (storage === "write_disabled") return ["LABELPASS_ENABLE_ADMIN_DB_WRITES=1이 없어 운영 액션 DB 쓰기를 비활성화했습니다."];
  return [];
}

function actionMetadata(action: PlatformOpsAction) {
  return {
    ...(action.metadata ?? {}),
    labelpass_action: action.action,
    note: action.note ?? null,
    updated_by: "labelpass-admin-ops-api",
    updated_at: new Date().toISOString()
  };
}

function toJsonValue(value: unknown): postgres.JSONValue {
  return JSON.parse(JSON.stringify(value ?? {})) as postgres.JSONValue;
}

function rowMetadataPatch(action: PlatformOpsAction) {
  return {
    last_admin_action: action.action,
    last_admin_note: action.note ?? null,
    last_admin_request_id: action.requestId ?? null,
    last_admin_action_at: new Date().toISOString()
  };
}

async function insertAuditLog(
  tx: TransactionClient,
  action: PlatformOpsAction,
  entityTable: string,
  entityId: string,
  beforeData: JsonRecord,
  afterData: JsonRecord
) {
  await tx`
    insert into public.audit_logs (
      actor_profile_id,
      action,
      entity_table,
      entity_id,
      before_data,
      after_data,
      metadata,
      request_id
    )
    values (
      ${action.actorProfileId ?? null},
      ${actionLabels[action.action]},
      ${entityTable},
      ${entityId},
      ${tx.json(toJsonValue(beforeData))}::jsonb,
      ${tx.json(toJsonValue(afterData))}::jsonb,
      ${tx.json(toJsonValue(actionMetadata(action)))}::jsonb,
      ${action.requestId ?? null}
    )
  `;
}

function successResult(
  action: PlatformOpsAction,
  entityTable: string,
  entityId: string,
  before: JsonRecord | undefined,
  after: JsonRecord | undefined,
  dryRun: boolean
): PlatformOpsActionResult {
  return {
    ok: true,
    storage: storageState(),
    applied: !dryRun,
    dryRun,
    action: action.action,
    entityTable,
    entityId,
    auditLogged: !dryRun,
    before,
    after,
    warnings: warningsForStorage(storageState())
  };
}

function disabledResult(action: PlatformOpsAction, dryRun: boolean): PlatformOpsActionResult {
  const storage = storageState();
  return {
    ok: false,
    storage,
    applied: false,
    dryRun,
    action: action.action,
    error: storage === "write_disabled" ? "write_disabled" : "not_configured",
    message: "운영 액션 DB 쓰기가 현재 환경에서 비활성화되어 있습니다.",
    warnings: warningsForStorage(storage)
  };
}

function notFoundResult(action: PlatformOpsAction, dryRun: boolean): PlatformOpsActionResult {
  return {
    ok: false,
    storage: storageState(),
    applied: false,
    dryRun,
    action: action.action,
    error: "not_found",
    message: "대상 운영 레코드를 찾지 못했습니다.",
    warnings: warningsForStorage(storageState())
  };
}

function databaseErrorResult(action: PlatformOpsAction, dryRun: boolean): PlatformOpsActionResult {
  return {
    ok: false,
    storage: storageState(),
    applied: false,
    dryRun,
    action: action.action,
    error: "database_error",
    message: "운영 액션 DB 쓰기 중 오류가 발생했습니다.",
    warnings: warningsForStorage(storageState())
  };
}

async function updateExpertMatchStatus(tx: TransactionClient, action: Extract<PlatformOpsAction, { action: "expert_match_status" }>, dryRun: boolean) {
  const [before] = await tx<JsonRecord[]>`select id, organization_id, status, summary, metadata from public.expert_matches where id = ${action.id} limit 1`;
  if (!before) return notFoundResult(action, dryRun);
  if (dryRun) return successResult(action, "expert_matches", action.id, before, { ...before, status: action.status }, dryRun);

  const [after] = await tx<JsonRecord[]>`
    update public.expert_matches
    set status = ${action.status}, metadata = coalesce(metadata, '{}'::jsonb) || ${tx.json(toJsonValue(rowMetadataPatch(action)))}::jsonb
    where id = ${action.id}
    returning id, organization_id, status, summary, metadata
  `;
  await insertAuditLog(tx, action, "expert_matches", action.id, before, after);
  return successResult(action, "expert_matches", action.id, before, after, dryRun);
}

async function updatePaymentStatus(tx: TransactionClient, action: Extract<PlatformOpsAction, { action: "payment_status" }>, dryRun: boolean) {
  const [before] = await tx<JsonRecord[]>`select id, organization_id, expert_match_id, status, amount, currency, metadata from public.payments where id = ${action.id} limit 1`;
  if (!before) return notFoundResult(action, dryRun);
  if (dryRun) return successResult(action, "payments", action.id, before, { ...before, status: action.status }, dryRun);

  const [after] = await tx<JsonRecord[]>`
    update public.payments
    set status = ${action.status}, metadata = coalesce(metadata, '{}'::jsonb) || ${tx.json(toJsonValue(rowMetadataPatch(action)))}::jsonb
    where id = ${action.id}
    returning id, organization_id, expert_match_id, status, amount, currency, metadata
  `;
  await insertAuditLog(tx, action, "payments", action.id, before, after);
  return successResult(action, "payments", action.id, before, after, dryRun);
}

async function updateChatThreadStatus(tx: TransactionClient, action: Extract<PlatformOpsAction, { action: "chat_thread_status" }>, dryRun: boolean) {
  const [before] = await tx<JsonRecord[]>`select id, organization_id, expert_match_id, status, title, metadata from public.chat_threads where id = ${action.id} limit 1`;
  if (!before) return notFoundResult(action, dryRun);
  if (dryRun) return successResult(action, "chat_threads", action.id, before, { ...before, status: action.status }, dryRun);

  const [after] = await tx<JsonRecord[]>`
    update public.chat_threads
    set status = ${action.status}, metadata = coalesce(metadata, '{}'::jsonb) || ${tx.json(toJsonValue(rowMetadataPatch(action)))}::jsonb
    where id = ${action.id}
    returning id, organization_id, expert_match_id, status, title, metadata
  `;
  await insertAuditLog(tx, action, "chat_threads", action.id, before, after);
  return successResult(action, "chat_threads", action.id, before, after, dryRun);
}

async function updateLogisticsMatchStatus(tx: TransactionClient, action: Extract<PlatformOpsAction, { action: "logistics_match_status" }>, dryRun: boolean) {
  const [before] = await tx<JsonRecord[]>`select id, organization_id, shipment_request_id, logistics_company_id, status, metadata from public.logistics_matches where id = ${action.id} limit 1`;
  if (!before) return notFoundResult(action, dryRun);
  if (dryRun) return successResult(action, "logistics_matches", action.id, before, { ...before, status: action.status }, dryRun);

  const [after] = await tx<JsonRecord[]>`
    update public.logistics_matches
    set status = ${action.status}, metadata = coalesce(metadata, '{}'::jsonb) || ${tx.json(toJsonValue(rowMetadataPatch(action)))}::jsonb
    where id = ${action.id}
    returning id, organization_id, shipment_request_id, logistics_company_id, status, metadata
  `;
  await insertAuditLog(tx, action, "logistics_matches", action.id, before, after);
  return successResult(action, "logistics_matches", action.id, before, after, dryRun);
}

async function updateShipmentRequestStatus(tx: TransactionClient, action: Extract<PlatformOpsAction, { action: "shipment_request_status" }>, dryRun: boolean) {
  const [before] = await tx<JsonRecord[]>`select id, organization_id, product_id, review_id, status, metadata from public.shipment_requests where id = ${action.id} limit 1`;
  if (!before) return notFoundResult(action, dryRun);
  if (dryRun) return successResult(action, "shipment_requests", action.id, before, { ...before, status: action.status }, dryRun);

  const [after] = await tx<JsonRecord[]>`
    update public.shipment_requests
    set status = ${action.status}, metadata = coalesce(metadata, '{}'::jsonb) || ${tx.json(toJsonValue(rowMetadataPatch(action)))}::jsonb
    where id = ${action.id}
    returning id, organization_id, product_id, review_id, status, metadata
  `;
  await insertAuditLog(tx, action, "shipment_requests", action.id, before, after);
  return successResult(action, "shipment_requests", action.id, before, after, dryRun);
}

async function updateShipmentStatus(tx: TransactionClient, action: Extract<PlatformOpsAction, { action: "shipment_status" }>, dryRun: boolean) {
  const [before] = await tx<JsonRecord[]>`select id, organization_id, shipment_request_id, logistics_company_id, status, tracking_number, metadata from public.shipments where id = ${action.id} limit 1`;
  if (!before) return notFoundResult(action, dryRun);
  if (dryRun) return successResult(action, "shipments", action.id, before, { ...before, status: action.status }, dryRun);

  const [after] = await tx<JsonRecord[]>`
    update public.shipments
    set status = ${action.status}, metadata = coalesce(metadata, '{}'::jsonb) || ${tx.json(toJsonValue(rowMetadataPatch(action)))}::jsonb
    where id = ${action.id}
    returning id, organization_id, shipment_request_id, logistics_company_id, status, tracking_number, metadata
  `;
  await insertAuditLog(tx, action, "shipments", action.id, before, after);
  return successResult(action, "shipments", action.id, before, after, dryRun);
}

async function insertShipmentEvent(tx: TransactionClient, action: Extract<PlatformOpsAction, { action: "shipment_event" }>, dryRun: boolean) {
  const [shipment] = await tx<JsonRecord[]>`select id, organization_id, status, metadata from public.shipments where id = ${action.shipmentId} limit 1`;
  if (!shipment) return notFoundResult(action, dryRun);

  const eventPreview = {
    shipment_id: action.shipmentId,
    organization_id: shipment.organization_id,
    event_type: action.eventType,
    status: action.status ?? null,
    message: action.message,
    occurred_at: action.occurredAt ?? new Date().toISOString(),
    metadata: action.metadata ?? {}
  };

  if (dryRun) return successResult(action, "shipment_events", action.shipmentId, shipment, eventPreview, dryRun);

  const [event] = await tx<JsonRecord[]>`
    insert into public.shipment_events (
      organization_id,
      shipment_id,
      event_type,
      status,
      message,
      occurred_at,
      metadata
    )
    values (
      ${String(shipment.organization_id)},
      ${action.shipmentId},
      ${action.eventType},
      ${action.status ?? null},
      ${action.message},
      ${action.occurredAt ?? new Date().toISOString()},
      ${tx.json(toJsonValue({ ...(action.metadata ?? {}), note: action.note ?? null }))}::jsonb
    )
    returning id, organization_id, shipment_id, event_type, status, message, occurred_at, metadata
  `;

  if (action.status) {
    await tx`
      update public.shipments
      set status = ${action.status}, metadata = coalesce(metadata, '{}'::jsonb) || ${tx.json(toJsonValue(rowMetadataPatch(action)))}::jsonb
      where id = ${action.shipmentId}
    `;
  }

  await insertAuditLog(tx, action, "shipment_events", String(event.id), shipment, event);
  return successResult(action, "shipment_events", String(event.id), shipment, event, dryRun);
}

export async function applyPlatformOpsAction(action: PlatformOpsAction, options: { dryRun?: boolean } = {}): Promise<PlatformOpsActionResult> {
  const dryRun = Boolean(options.dryRun);
  const storage = storageState();

  if (dryRun && action.metadata?.syntheticTarget === true) {
    return successResult(action, actionTables[action.action], "synthetic-dry-run", undefined, undefined, true);
  }

  if (dryRun && storage !== "database") {
    return successResult(action, actionTables[action.action], "dry-run", undefined, undefined, true);
  }

  const sql = getClient();
  if (!sql) return disabledResult(action, dryRun);

  try {
    return await sql.begin(async (tx) => {
      switch (action.action) {
        case "expert_match_status":
          return updateExpertMatchStatus(tx, action, dryRun);
        case "payment_status":
          return updatePaymentStatus(tx, action, dryRun);
        case "chat_thread_status":
          return updateChatThreadStatus(tx, action, dryRun);
        case "logistics_match_status":
          return updateLogisticsMatchStatus(tx, action, dryRun);
        case "shipment_request_status":
          return updateShipmentRequestStatus(tx, action, dryRun);
        case "shipment_status":
          return updateShipmentStatus(tx, action, dryRun);
        case "shipment_event":
          return insertShipmentEvent(tx, action, dryRun);
        default:
          action satisfies never;
          return databaseErrorResult(action, dryRun);
      }
    });
  } catch {
    return databaseErrorResult(action, dryRun);
  }
}
