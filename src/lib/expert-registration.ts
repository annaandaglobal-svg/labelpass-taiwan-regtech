import postgres from "postgres";
import type { ExpertRegistrationInput, ExpertRegistrationPayload } from "@/lib/expert-registration-shared";

export type { ExpertRegistrationInput, ExpertRegistrationPayload } from "@/lib/expert-registration-shared";
export { EXPERT_SERVICE_OPTIONS, EXPERT_LANGUAGE_OPTIONS } from "@/lib/expert-registration-shared";

type DbClient = ReturnType<typeof postgres>;

export type ExpertRegistrationStorage = "database" | "disabled" | "preview_disabled" | "write_disabled";

export type ExpertRegistrationResult =
  | {
      ok: true;
      storage: ExpertRegistrationStorage;
      applied: boolean;
      dryRun: boolean;
      expertProfileId: string;
      warnings: string[];
    }
  | {
      ok: false;
      storage: ExpertRegistrationStorage;
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

function storageState(): ExpertRegistrationStorage {
  if (!databaseUrl) return "disabled";
  if (!adminDbPreviewEnabled) return "preview_disabled";
  if (!adminDbWritesEnabled) return "write_disabled";
  return "database";
}

function warningsForStorage(storage: ExpertRegistrationStorage) {
  if (storage === "disabled") return ["SUPABASE_DB_URL, POSTGRES_URL, DATABASE_URL 중 하나가 없어 전문가 등록을 DB에 저장할 수 없습니다."];
  if (storage === "preview_disabled") return ["LABELPASS_ENABLE_ADMIN_DB_PREVIEW=1이 없어 전문가 등록 큐를 DB에서 읽지 않습니다."];
  if (storage === "write_disabled") return ["LABELPASS_ENABLE_ADMIN_DB_WRITES=1이 없어 전문가 등록을 DB에 쓰지 않습니다."];
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

function registrationMetadata(registration: ExpertRegistrationInput) {
  return {
    source: "expert_self_registration",
    registration_id: registration.id,
    registration_created_at: registration.createdAt,
    role: registration.role || null,
    years_experience: registration.yearsExperience,
    credential: registration.credential || null,
    contact_email: registration.contactEmail || null,
    bio: registration.bio || null,
    onboarding_status: "pending_review",
    submitted_at: new Date().toISOString()
  };
}

export function expertRegistrationReadiness() {
  const storage = storageState();
  return {
    storage,
    databaseUrlPresent: Boolean(databaseUrl),
    adminDbPreviewEnabled,
    adminDbWritesEnabled,
    writesReady: storage === "database" && Boolean(process.env.LABELPASS_ADMIN_OPS_TOKEN),
    tokenRequiredForWrites: true,
    targetTables: ["expert_profiles", "audit_logs"],
    warnings: warningsForStorage(storage)
  };
}

function dryRunResult(payload: ExpertRegistrationPayload): ExpertRegistrationResult {
  return {
    ok: true,
    storage: storageState(),
    applied: false,
    dryRun: true,
    expertProfileId: `expert-${payload.registration.id.slice(0, 18)}`,
    warnings: warningsForStorage(storageState())
  };
}

function disabledResult(dryRun: boolean): ExpertRegistrationResult {
  const storage = storageState();
  return {
    ok: false,
    storage,
    applied: false,
    dryRun,
    error: storage === "write_disabled" ? "write_disabled" : "not_configured",
    message: "전문가 등록 DB 저장이 아직 활성화되지 않았습니다.",
    warnings: warningsForStorage(storage)
  };
}

export async function submitExpertRegistration(
  payload: ExpertRegistrationPayload,
  options: { dryRun?: boolean } = {}
): Promise<ExpertRegistrationResult> {
  const dryRun = Boolean(options.dryRun);
  if (dryRun) return dryRunResult(payload);

  const sql = getClient();
  if (!sql) return disabledResult(dryRun);

  const registration = payload.registration;
  const metadata = registrationMetadata(registration);

  try {
    const expertProfileId = await sql.begin(async (tx) => {
      const inserted = await tx<{ id: string }[]>`
        insert into public.expert_profiles (
          display_name,
          company_name,
          regions,
          categories,
          languages,
          hourly_rate,
          currency,
          status,
          metadata
        )
        values (
          ${registration.displayName},
          ${registration.companyName || null},
          ${tx.json(toJsonValue(["TW"]))}::jsonb,
          ${tx.json(toJsonValue(registration.categories))}::jsonb,
          ${tx.json(toJsonValue(registration.languages.length ? registration.languages : ["ko", "zh-Hant", "en"]))}::jsonb,
          ${registration.hourlyRate ?? null},
          ${registration.currency || "USD"},
          'draft',
          ${tx.json(toJsonValue(metadata))}::jsonb
        )
        returning id
      `;
      const profileId = inserted[0].id;

      await tx`
        insert into public.audit_logs (
          action,
          entity_table,
          entity_id,
          after_data,
          metadata,
          request_id
        )
        values (
          'expert_registration.create',
          'expert_profiles',
          ${profileId},
          ${tx.json(toJsonValue({ display_name: registration.displayName, categories: registration.categories, status: "draft" }))}::jsonb,
          ${tx.json(toJsonValue({ ...metadata }))}::jsonb,
          ${payload.requestId ?? `expert-reg-${registration.id}`}
        )
      `;

      return profileId;
    });

    return {
      ok: true,
      storage: storageState(),
      applied: true,
      dryRun: false,
      expertProfileId,
      warnings: []
    };
  } catch {
    return {
      ok: false,
      storage: storageState(),
      applied: false,
      dryRun: false,
      error: "database_error",
      message: "전문가 등록을 DB에 저장하는 중 오류가 발생했습니다.",
      warnings: warningsForStorage(storageState())
    };
  }
}
