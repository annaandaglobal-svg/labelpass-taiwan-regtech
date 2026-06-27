import postgres from "postgres";
import type { HandoffDraft } from "@/lib/handoff-drafts";

type DbClient = ReturnType<typeof postgres>;
type JsonRecord = Record<string, unknown>;

export type HandoffRequestStorage = "database" | "disabled" | "preview_disabled" | "write_disabled";

export type HandoffRequestPayload = {
  draft: HandoffDraft;
  organizationId?: string | null;
  requestedBy?: string | null;
  actorProfileId?: string | null;
  contactEmail?: string | null;
  note?: string | null;
  requestId?: string | null;
  metadata?: JsonRecord;
};

export type HandoffRequestResult =
  | {
      ok: true;
      storage: HandoffRequestStorage;
      applied: boolean;
      dryRun: boolean;
      entityIds: {
        productId: string;
        expertMatchId: string;
        chatThreadId: string;
        paymentId: string;
        shipmentRequestId: string;
      };
      existing: boolean;
      plannedRecords: ReturnType<typeof buildPlannedRecords>;
      warnings: string[];
    }
  | {
      ok: false;
      storage: HandoffRequestStorage;
      applied: false;
      dryRun: boolean;
      error: "not_configured" | "write_disabled" | "database_error";
      message: string;
      warnings: string[];
    };

const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const adminDbPreviewEnabled = process.env.LABELPASS_ENABLE_ADMIN_DB_PREVIEW === "1";
const adminDbWritesEnabled = process.env.LABELPASS_ENABLE_ADMIN_DB_WRITES === "1";
let client: DbClient | null = null;

function storageState(): HandoffRequestStorage {
  if (!databaseUrl) return "disabled";
  if (!adminDbPreviewEnabled) return "preview_disabled";
  if (!adminDbWritesEnabled) return "write_disabled";
  return "database";
}

function warningsForStorage(storage: HandoffRequestStorage) {
  if (storage === "disabled") return ["SUPABASE_DB_URL, POSTGRES_URL, DATABASE_URL 중 하나가 없어 운영 큐 DB 쓰기를 비활성화했습니다."];
  if (storage === "preview_disabled") return ["LABELPASS_ENABLE_ADMIN_DB_PREVIEW=1이 없어 운영 큐 DB 쓰기를 비활성화했습니다."];
  if (storage === "write_disabled") return ["LABELPASS_ENABLE_ADMIN_DB_WRITES=1이 없어 운영 큐 DB 쓰기를 비활성화했습니다."];
  return [];
}

function getClient() {
  if (storageState() !== "database" || !databaseUrl) return null;
  client ??= postgres(databaseUrl, {
    max: 2,
    ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") ? false : "require",
    idle_timeout: 10,
    connect_timeout: 8,
    prepare: false
  });
  return client;
}

function toJsonValue(value: unknown): postgres.JSONValue {
  return JSON.parse(JSON.stringify(value ?? {})) as postgres.JSONValue;
}

function productStatusFor(draft: HandoffDraft) {
  if (draft.status === "fail" || draft.status === "needs_info") return "needs_action";
  if (draft.status === "warn") return "in_review";
  return "submitted";
}

function pifStatusFor(draft: HandoffDraft) {
  const cosmetic = /cosmetic|화장품|化粧|pif|inci/i.test(`${draft.routeId} ${draft.routeLabel} ${draft.productType}`);
  if (!cosmetic) return "not_required";
  return draft.neededDocuments > 0 ? "required_missing" : "required_present";
}

function serviceTypeFor(draft: HandoffDraft) {
  if (draft.priority === "collect_documents") return "document_pack";
  if (draft.priority === "revise_label" || draft.status === "fail" || draft.status === "warn") return "label_correction";
  return "regulatory_review";
}

function summaryFor(draft: HandoffDraft) {
  return [
    draft.routeLabel,
    draft.nextAction,
    `score ${draft.score}`,
    `evidence ${draft.evidenceCount}`,
    draft.neededDocuments > 0 ? `needed documents ${draft.neededDocuments}` : "document gate clear"
  ].join(" / ");
}

function baseMetadata(payload: HandoffRequestPayload) {
  const draft = payload.draft;
  return {
    ...(payload.metadata ?? {}),
    source: "customer_handoff_draft",
    handoff_draft_id: draft.id,
    handoff_created_at: draft.createdAt,
    route_id: draft.routeId,
    route_label: draft.routeLabel,
    review_status: draft.status,
    review_score: draft.score,
    priority: draft.priority,
    next_action: draft.nextAction,
    evidence_count: draft.evidenceCount,
    needed_documents: draft.neededDocuments,
    contact_email: payload.contactEmail ?? null,
    note: payload.note ?? null,
    requested_at: new Date().toISOString()
  };
}

function syntheticId(prefix: string, draft: HandoffDraft) {
  return `${prefix}-${draft.id.slice(0, 18)}`;
}

function buildPlannedRecords(payload: HandoffRequestPayload) {
  const draft = payload.draft;
  const metadata = baseMetadata(payload);
  return {
    product: {
      name: draft.productName,
      category: draft.productType,
      market: "TW",
      status: productStatusFor(draft),
      pif_status: pifStatusFor(draft),
      metadata
    },
    expertMatch: {
      service_type: serviceTypeFor(draft),
      status: "requested",
      currency: "USD",
      summary: summaryFor(draft),
      metadata: {
        ...metadata,
        expert_scope: draft.expertScope,
        payment_gate: draft.paymentGate
      }
    },
    chatThread: {
      status: "payment_required",
      title: `${draft.productName} 전문가 상담`,
      metadata: {
        ...metadata,
        gate: "payment_required",
        expert_scope: draft.expertScope
      }
    },
    payment: {
      amount: 0,
      currency: "USD",
      status: "pending",
      provider: "quote_pending",
      metadata: {
        ...metadata,
        quote_pending: true,
        payment_gate: draft.paymentGate
      }
    },
    shipmentRequest: {
      origin_country: "KR",
      destination_country: "TW",
      status: "requested",
      cargo_summary: `${draft.productName} / ${draft.productType}`,
      metadata: {
        ...metadata,
        logistics_trigger: draft.logistics.trigger,
        required_documents: draft.logistics.documents
      }
    }
  };
}

function disabledResult(payload: HandoffRequestPayload, dryRun: boolean): HandoffRequestResult {
  const storage = storageState();
  return {
    ok: false,
    storage,
    applied: false,
    dryRun,
    error: storage === "write_disabled" ? "write_disabled" : "not_configured",
    message: "운영 큐 DB 쓰기가 현재 환경에서 비활성화되어 있습니다.",
    warnings: warningsForStorage(storage)
  };
}

function databaseErrorResult(payload: HandoffRequestPayload, dryRun: boolean): HandoffRequestResult {
  return {
    ok: false,
    storage: storageState(),
    applied: false,
    dryRun,
    error: "database_error",
    message: "의뢰 초안을 운영 큐로 저장하는 중 오류가 발생했습니다.",
    warnings: warningsForStorage(storageState())
  };
}

function dryRunResult(payload: HandoffRequestPayload): HandoffRequestResult {
  const draft = payload.draft;
  return {
    ok: true,
    storage: storageState(),
    applied: false,
    dryRun: true,
    entityIds: {
      productId: syntheticId("product", draft),
      expertMatchId: syntheticId("expert", draft),
      chatThreadId: syntheticId("chat", draft),
      paymentId: syntheticId("payment", draft),
      shipmentRequestId: syntheticId("shipment", draft)
    },
    existing: false,
    plannedRecords: buildPlannedRecords(payload),
    warnings: warningsForStorage(storageState())
  };
}

export function handoffRequestReadiness() {
  const storage = storageState();
  return {
    storage,
    databaseUrlPresent: Boolean(databaseUrl),
    adminDbPreviewEnabled,
    adminDbWritesEnabled,
    writesReady: storage === "database" && Boolean(process.env.LABELPASS_ADMIN_OPS_TOKEN),
    tokenRequiredForWrites: true,
    targetTables: ["products", "expert_matches", "chat_threads", "payments", "shipment_requests", "audit_logs"],
    warnings: warningsForStorage(storage)
  };
}

export async function applyHandoffRequest(payload: HandoffRequestPayload, options: { dryRun?: boolean } = {}): Promise<HandoffRequestResult> {
  const dryRun = Boolean(options.dryRun);
  if (dryRun) return dryRunResult(payload);

  const sql = getClient();
  if (!sql) return disabledResult(payload, dryRun);

  const planned = buildPlannedRecords(payload);
  const organizationId = payload.organizationId ?? null;
  const requestedBy = payload.requestedBy ?? null;

  try {
    return await sql.begin(async (tx) => {
      const [existing] = await tx<
        Array<{
          product_id: string;
          expert_match_id: string | null;
          chat_thread_id: string | null;
          payment_id: string | null;
          shipment_request_id: string | null;
        }>
      >`
        select
          p.id as product_id,
          em.id as expert_match_id,
          ct.id as chat_thread_id,
          pay.id as payment_id,
          sr.id as shipment_request_id
        from public.products p
        left join public.expert_matches em
          on em.product_id = p.id
          and em.metadata ->> 'handoff_draft_id' = ${payload.draft.id}
        left join public.chat_threads ct
          on ct.expert_match_id = em.id
          and ct.metadata ->> 'handoff_draft_id' = ${payload.draft.id}
        left join public.payments pay
          on pay.expert_match_id = em.id
          and pay.metadata ->> 'handoff_draft_id' = ${payload.draft.id}
        left join public.shipment_requests sr
          on sr.product_id = p.id
          and sr.metadata ->> 'handoff_draft_id' = ${payload.draft.id}
        where p.metadata ->> 'handoff_draft_id' = ${payload.draft.id}
        limit 1
      `;

      if (existing?.expert_match_id && existing.chat_thread_id && existing.payment_id && existing.shipment_request_id) {
        return {
          ok: true,
          storage: "database",
          applied: false,
          dryRun: false,
          entityIds: {
            productId: existing.product_id,
            expertMatchId: existing.expert_match_id,
            chatThreadId: existing.chat_thread_id,
            paymentId: existing.payment_id,
            shipmentRequestId: existing.shipment_request_id
          },
          existing: true,
          plannedRecords: planned,
          warnings: ["같은 handoff draft id로 생성된 운영 큐가 이미 있어 새 레코드를 만들지 않았습니다."]
        };
      }

      const [product] = await tx<{ id: string }[]>`
        insert into public.products (
          organization_id,
          owner_id,
          name,
          category,
          market,
          status,
          pif_status,
          metadata,
          submitted_at
        )
        values (
          ${organizationId},
          ${requestedBy},
          ${planned.product.name},
          ${planned.product.category},
          ${planned.product.market},
          ${planned.product.status},
          ${planned.product.pif_status},
          ${tx.json(toJsonValue(planned.product.metadata))}::jsonb,
          now()
        )
        returning id
      `;

      const [expertMatch] = await tx<{ id: string }[]>`
        insert into public.expert_matches (
          organization_id,
          product_id,
          requested_by,
          service_type,
          status,
          currency,
          summary,
          metadata
        )
        values (
          ${organizationId},
          ${product.id},
          ${requestedBy},
          ${planned.expertMatch.service_type},
          ${planned.expertMatch.status},
          ${planned.expertMatch.currency},
          ${planned.expertMatch.summary},
          ${tx.json(toJsonValue(planned.expertMatch.metadata))}::jsonb
        )
        returning id
      `;

      const [chatThread] = await tx<{ id: string }[]>`
        insert into public.chat_threads (
          organization_id,
          product_id,
          expert_match_id,
          status,
          title,
          metadata
        )
        values (
          ${organizationId},
          ${product.id},
          ${expertMatch.id},
          ${planned.chatThread.status},
          ${planned.chatThread.title},
          ${tx.json(toJsonValue(planned.chatThread.metadata))}::jsonb
        )
        returning id
      `;

      const [payment] = await tx<{ id: string }[]>`
        insert into public.payments (
          organization_id,
          expert_match_id,
          amount,
          currency,
          status,
          provider,
          metadata
        )
        values (
          ${organizationId},
          ${expertMatch.id},
          ${planned.payment.amount},
          ${planned.payment.currency},
          ${planned.payment.status},
          ${planned.payment.provider},
          ${tx.json(toJsonValue(planned.payment.metadata))}::jsonb
        )
        returning id
      `;

      const [shipmentRequest] = await tx<{ id: string }[]>`
        insert into public.shipment_requests (
          organization_id,
          product_id,
          requested_by,
          origin_country,
          destination_country,
          status,
          cargo_summary,
          metadata
        )
        values (
          ${organizationId},
          ${product.id},
          ${requestedBy},
          ${planned.shipmentRequest.origin_country},
          ${planned.shipmentRequest.destination_country},
          ${planned.shipmentRequest.status},
          ${planned.shipmentRequest.cargo_summary},
          ${tx.json(toJsonValue(planned.shipmentRequest.metadata))}::jsonb
        )
        returning id
      `;

      const entityIds = {
        productId: product.id,
        expertMatchId: expertMatch.id,
        chatThreadId: chatThread.id,
        paymentId: payment.id,
        shipmentRequestId: shipmentRequest.id
      };

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
          ${payload.actorProfileId ?? null},
          ${"customer_handoff_request.create"},
          ${"products"},
          ${product.id},
          ${tx.json(toJsonValue({}))}::jsonb,
          ${tx.json(toJsonValue({ ...entityIds, draft: payload.draft }))}::jsonb,
          ${tx.json(toJsonValue(baseMetadata(payload)))}::jsonb,
          ${payload.requestId ?? null}
        )
      `;

      return {
        ok: true,
        storage: "database",
        applied: true,
        dryRun: false,
        entityIds,
        existing: false,
        plannedRecords: planned,
        warnings: []
      };
    });
  } catch {
    return databaseErrorResult(payload, dryRun);
  }
}
