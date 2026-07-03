import postgres from "postgres";
import { pifDocumentRequirements, type PifApplication } from "@/lib/pif-application";
import { pifStorageReadiness } from "@/lib/pif-storage";

type DbClient = ReturnType<typeof postgres>;

export type PifRequestStorage = "database" | "disabled" | "preview_disabled" | "write_disabled";

export type PifRequestPayload = {
  application: PifApplication;
  organizationId?: string | null;
  requestedBy?: string | null;
  requestId?: string | null;
};

export type PifRequestResult =
  | {
      ok: true;
      storage: PifRequestStorage;
      applied: boolean;
      dryRun: boolean;
      entityIds: { productId: string; documentIds: string[] };
      existing: boolean;
      warnings: string[];
    }
  | {
      ok: false;
      storage: PifRequestStorage;
      applied: false;
      dryRun: boolean;
      error: "not_configured" | "write_disabled" | "database_error";
      message: string;
      warnings: string[];
    };

type PifQueueRow = {
  id: string;
  name: string;
  category: string | null;
  status: string;
  pif_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  submitted_at: string | null;
  documents: Array<{
    id: string;
    document_type: string;
    status: string;
    file_name: string | null;
    storage_path: string | null;
    mime_type: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>;
};

const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const adminDbPreviewEnabled = process.env.LABELPASS_ENABLE_ADMIN_DB_PREVIEW === "1";
const adminDbWritesEnabled = process.env.LABELPASS_ENABLE_ADMIN_DB_WRITES === "1";
const customerPifSubmissionsEnabled = process.env.LABELPASS_ENABLE_CUSTOMER_PIF_SUBMISSIONS === "1";
let client: DbClient | null = null;

function storageState(): PifRequestStorage {
  if (!databaseUrl) return "disabled";
  if (!adminDbPreviewEnabled) return "preview_disabled";
  if (!adminDbWritesEnabled) return "write_disabled";
  return "database";
}

function warningsForStorage(storage: PifRequestStorage) {
  if (storage === "disabled") return ["SUPABASE_DB_URL, POSTGRES_URL, DATABASE_URL 중 하나가 없어 PIF 신청을 DB에 저장할 수 없습니다."];
  if (storage === "preview_disabled") return ["LABELPASS_ENABLE_ADMIN_DB_PREVIEW=1이 없어 PIF 신청 큐를 DB에서 읽지 않습니다."];
  if (storage === "write_disabled") return ["LABELPASS_ENABLE_ADMIN_DB_WRITES=1이 없어 PIF 신청을 DB에 쓰지 않습니다."];
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

function getPreviewClient() {
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

function toJsonValue(value: unknown): postgres.JSONValue {
  return JSON.parse(JSON.stringify(value ?? {})) as postgres.JSONValue;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function applicationMetadata(payload: PifRequestPayload) {
  const application = payload.application;
  return {
    source: "customer_pif_application",
    pif_application_id: application.id,
    pif_created_at: application.createdAt,
    brand_name: application.brandName,
    taiwan_importer: application.taiwanImporter,
    contact_email: application.contactEmail || null,
    note: application.note || null,
    checked_requirements: application.checkedRequirements,
    attachment_count: application.attachments.length,
    requested_at: new Date().toISOString()
  };
}

export function pifRequestReadiness() {
  const storage = storageState();
  const storageReadiness = pifStorageReadiness();
  const customerWritesReady = storage === "database" && customerPifSubmissionsEnabled;
  const adminWritesReady = storage === "database" && Boolean(process.env.LABELPASS_ADMIN_OPS_TOKEN);
  return {
    storage,
    databaseUrlPresent: Boolean(databaseUrl),
    adminDbPreviewEnabled,
    adminDbWritesEnabled,
    customerPifSubmissionsEnabled,
    customerWritesReady,
    adminWritesReady,
    writesReady: customerWritesReady || adminWritesReady,
    tokenRequiredForWrites: true,
    tokenRequiredForAdminWrites: true,
    tokenRequiredForCustomerSubmissions: false,
    targetTables: ["products", "product_documents", "audit_logs"],
    fileStorage: storageReadiness,
    warnings: warningsForStorage(storage)
  };
}

export function canAcceptCustomerPifSubmission() {
  return storageState() === "database" && customerPifSubmissionsEnabled;
}

function dryRunResult(payload: PifRequestPayload): PifRequestResult {
  const application = payload.application;
  return {
    ok: true,
    storage: storageState(),
    applied: false,
    dryRun: true,
    entityIds: {
      productId: `product-${application.id.slice(0, 18)}`,
      documentIds: application.attachments.map((item, index) => `document-${application.id.slice(0, 12)}-${index}`)
    },
    existing: false,
    warnings: warningsForStorage(storageState())
  };
}

function disabledResult(dryRun: boolean): PifRequestResult {
  const storage = storageState();
  return {
    ok: false,
    storage,
    applied: false,
    dryRun,
    error: storage === "write_disabled" ? "write_disabled" : "not_configured",
    message: "PIF 신청 DB 저장이 아직 활성화되지 않았습니다.",
    warnings: warningsForStorage(storage)
  };
}

export async function applyPifRequest(payload: PifRequestPayload, options: { dryRun?: boolean } = {}): Promise<PifRequestResult> {
  const dryRun = Boolean(options.dryRun);
  if (dryRun) return dryRunResult(payload);

  const sql = getClient();
  if (!sql) return disabledResult(dryRun);

  const application = payload.application;
  const metadata = applicationMetadata(payload);
  const requirementTypeById = new Map(pifDocumentRequirements.map((item) => [item.id, item.documentType]));

  try {
    return await sql.begin(async (tx) => {
      const [existing] = await tx<Array<{ id: string }>>`
        select id from public.products
        where metadata ->> 'pif_application_id' = ${application.id}
        limit 1
      `;

      if (existing) {
        return {
          ok: true,
          storage: "database",
          applied: false,
          dryRun: false,
          entityIds: { productId: existing.id, documentIds: [] },
          existing: true,
          warnings: ["이미 같은 PIF 신청 ID가 저장되어 있어 중복 생성하지 않았습니다."]
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
          ${payload.organizationId ?? null},
          ${payload.requestedBy ?? null},
          ${application.productName},
          ${application.productCategory},
          ${"TW"},
          ${"submitted"},
          ${"required_missing"},
          ${tx.json(toJsonValue(metadata))}::jsonb,
          now()
        )
        returning id
      `;

      const documentIds: string[] = [];
      for (const attachment of application.attachments) {
        const [document] = await tx<{ id: string }[]>`
          insert into public.product_documents (
            organization_id,
            product_id,
            uploaded_by,
            document_type,
            status,
            file_name,
            storage_path,
            mime_type,
            metadata
          )
          values (
            ${payload.organizationId ?? null},
            ${product.id},
            ${payload.requestedBy ?? null},
            ${requirementTypeById.get(attachment.requirementId) ?? "other"},
            ${"submitted"},
            ${attachment.fileName},
            ${attachment.storagePath ?? null},
            ${attachment.mimeType},
            ${tx.json(
              toJsonValue({
                ...metadata,
                requirement_id: attachment.requirementId,
                file_size: attachment.fileSize,
                storage_bucket: attachment.storageBucket ?? null,
                storage_path: attachment.storagePath ?? null,
                upload_state: attachment.uploadState ?? null,
                uploaded_at: attachment.uploadedAt ?? null,
                upload_error: attachment.uploadError ?? null
              })
            )}::jsonb
          )
          returning id
        `;
        documentIds.push(document.id);
      }

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
          ${payload.requestedBy ?? null},
          ${"customer_pif_application.create"},
          ${"products"},
          ${product.id},
          ${tx.json(toJsonValue({}))}::jsonb,
          ${tx.json(toJsonValue({ productId: product.id, documentIds, application }))}::jsonb,
          ${tx.json(toJsonValue(metadata))}::jsonb,
          ${payload.requestId ?? null}
        )
      `;

      return {
        ok: true,
        storage: "database",
        applied: true,
        dryRun: false,
        entityIds: { productId: product.id, documentIds },
        existing: false,
        warnings: []
      };
    });
  } catch {
    return {
      ok: false,
      storage: storageState(),
      applied: false,
      dryRun,
      error: "database_error",
      message: "PIF 신청을 DB에 저장하는 중 오류가 발생했습니다.",
      warnings: warningsForStorage(storageState())
    };
  }
}

function queueStatusFor(row: PifQueueRow): PifApplication["status"] {
  if (row.pif_status === "accepted" || row.status === "accepted") return "accepted";
  if (row.status === "needs_action" || row.pif_status === "required_missing") return "needs_revision";
  if (row.status === "in_review") return "in_review";
  return "submitted";
}

function mapQueueRow(row: PifQueueRow): PifApplication {
  const metadata = row.metadata ?? {};
  const documents = Array.isArray(row.documents) ? row.documents : [];
  return {
    id: stringValue(metadata.pif_application_id) || row.id,
    createdAt: stringValue(metadata.pif_created_at) || row.submitted_at || row.created_at,
    productName: row.name,
    brandName: stringValue(metadata.brand_name),
    productCategory: row.category ?? "cosmetic / Taiwan PIF",
    taiwanImporter: stringValue(metadata.taiwan_importer),
    contactEmail: stringValue(metadata.contact_email),
    note: stringValue(metadata.note),
    status: queueStatusFor(row),
    checkedRequirements: Array.isArray(metadata.checked_requirements)
      ? metadata.checked_requirements.filter((item): item is string => typeof item === "string")
      : [],
    attachments: documents.map((document) => {
      const documentMetadata = document.metadata ?? {};
      return {
        requirementId: stringValue(documentMetadata.requirement_id) || document.document_type || "other",
        fileName: document.file_name ?? "attachment",
        fileSize: numberValue(documentMetadata.file_size),
        mimeType: document.mime_type ?? "application/octet-stream",
        attachedAt: document.created_at,
        storageBucket: stringValue(documentMetadata.storage_bucket) || undefined,
        storagePath: document.storage_path ?? (stringValue(documentMetadata.storage_path) || undefined),
        uploadedAt: stringValue(documentMetadata.uploaded_at) || undefined,
        uploadState: document.storage_path ? "uploaded" : "metadata_only"
      };
    }),
    serverQueueState: "queued"
  };
}

export async function listPifApplicationsForAdmin(limit = 20): Promise<{
  storage: PifRequestStorage;
  applications: PifApplication[];
  warnings: string[];
}> {
  const storage = storageState();
  if (!databaseUrl || !adminDbPreviewEnabled) {
    return { storage, applications: [], warnings: warningsForStorage(storage) };
  }

  const sql = getPreviewClient();
  if (!sql) return { storage, applications: [], warnings: warningsForStorage(storage) };

  try {
    const rows = await sql<PifQueueRow[]>`
      select
        p.id,
        p.name,
        p.category,
        p.status,
        p.pif_status,
        p.metadata,
        p.created_at::text,
        p.submitted_at::text,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', pd.id,
              'document_type', pd.document_type,
              'status', pd.status,
              'file_name', pd.file_name,
              'storage_path', pd.storage_path,
              'mime_type', pd.mime_type,
              'metadata', pd.metadata,
              'created_at', pd.created_at::text
            )
            order by pd.created_at desc
          ) filter (where pd.id is not null),
          '[]'::jsonb
        ) as documents
      from public.products p
      left join public.product_documents pd
        on pd.product_id = p.id
      where p.metadata ->> 'source' = 'customer_pif_application'
      group by p.id
      order by coalesce(p.submitted_at, p.created_at) desc
      limit ${Math.max(1, Math.min(limit, 100))}
    `;

    return { storage: "database", applications: rows.map(mapQueueRow), warnings: [] };
  } catch {
    return {
      storage,
      applications: [],
      warnings: ["PIF 신청 큐를 Supabase에서 불러오지 못했습니다."]
    };
  }
}
