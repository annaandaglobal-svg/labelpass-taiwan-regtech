import postgres from "postgres";
import { pifDocumentRequirements, type PifApplication } from "@/lib/pif-application";

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

const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const adminDbPreviewEnabled = process.env.LABELPASS_ENABLE_ADMIN_DB_PREVIEW === "1";
const adminDbWritesEnabled = process.env.LABELPASS_ENABLE_ADMIN_DB_WRITES === "1";
let client: DbClient | null = null;

function storageState(): PifRequestStorage {
  if (!databaseUrl) return "disabled";
  if (!adminDbPreviewEnabled) return "preview_disabled";
  if (!adminDbWritesEnabled) return "write_disabled";
  return "database";
}

function warningsForStorage(storage: PifRequestStorage) {
  if (storage === "disabled") return ["SUPABASE_DB_URL, POSTGRES_URL, DATABASE_URL 중 하나가 없어 PIF 신청 DB 저장을 비활성화했습니다."];
  if (storage === "preview_disabled") return ["LABELPASS_ENABLE_ADMIN_DB_PREVIEW=1이 없어 PIF 신청 DB 저장을 비활성화했습니다."];
  if (storage === "write_disabled") return ["LABELPASS_ENABLE_ADMIN_DB_WRITES=1이 없어 PIF 신청 DB 저장을 비활성화했습니다."];
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
  return {
    storage,
    databaseUrlPresent: Boolean(databaseUrl),
    adminDbPreviewEnabled,
    adminDbWritesEnabled,
    writesReady: storage === "database" && Boolean(process.env.LABELPASS_ADMIN_OPS_TOKEN),
    tokenRequiredForWrites: true,
    targetTables: ["products", "product_documents", "audit_logs"],
    warnings: warningsForStorage(storage)
  };
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

export async function applyPifRequest(payload: PifRequestPayload, options: { dryRun?: boolean } = {}): Promise<PifRequestResult> {
  const dryRun = Boolean(options.dryRun);
  if (dryRun) return dryRunResult(payload);

  const sql = getClient();
  if (!sql) {
    const storage = storageState();
    return {
      ok: false,
      storage,
      applied: false,
      dryRun,
      error: storage === "write_disabled" ? "write_disabled" : "not_configured",
      message: "PIF 신청 DB 저장이 현재 환경에서 비활성화되어 있습니다.",
      warnings: warningsForStorage(storage)
    };
  }

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
          warnings: ["같은 PIF 신청 id로 생성된 레코드가 이미 있어 새로 만들지 않았습니다."]
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
            ${attachment.mimeType},
            ${tx.json(toJsonValue({ ...metadata, requirement_id: attachment.requirementId, file_size: attachment.fileSize }))}::jsonb
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
      message: "PIF 신청을 저장하는 중 오류가 발생했습니다.",
      warnings: warningsForStorage(storageState())
    };
  }
}
