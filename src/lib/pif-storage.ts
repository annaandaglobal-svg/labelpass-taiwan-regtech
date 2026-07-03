import { createClient } from "@supabase/supabase-js";

export type PifStorageState = "supabase" | "disabled" | "service_key_missing" | "bucket_error";

export type PifStorageReadiness = {
  storage: PifStorageState;
  supabaseUrlPresent: boolean;
  serviceRoleKeyPresent: boolean;
  bucket: string;
  maxFileBytes: number;
  ready: boolean;
  warnings: string[];
};

export type PifStorageUploadResult =
  | {
      ok: true;
      storage: "supabase";
      bucket: string;
      storagePath: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      uploadedAt: string;
      warnings: string[];
    }
  | {
      ok: false;
      storage: PifStorageState;
      error: "not_configured" | "file_too_large" | "invalid_file" | "upload_failed";
      message: string;
      warnings: string[];
    };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.LABELPASS_PIF_STORAGE_BUCKET ?? "pif-documents";
const maxFileBytes = Number(process.env.LABELPASS_MAX_PIF_FILE_BYTES ?? 25_000_000);

let storageClient: ReturnType<typeof createClient> | null = null;
let bucketReady = false;

function warningsForStorage(storage: PifStorageState) {
  if (storage === "disabled") return ["Supabase URL is missing, so PIF file originals cannot be uploaded yet."];
  if (storage === "service_key_missing") return ["SUPABASE_SERVICE_ROLE_KEY is missing, so PIF file originals cannot be uploaded yet."];
  if (storage === "bucket_error") return [`Supabase Storage bucket '${bucket}' is not ready.`];
  return [];
}

export function pifStorageReadiness(): PifStorageReadiness {
  const storage: PifStorageState = !supabaseUrl ? "disabled" : !serviceRoleKey ? "service_key_missing" : "supabase";
  return {
    storage,
    supabaseUrlPresent: Boolean(supabaseUrl),
    serviceRoleKeyPresent: Boolean(serviceRoleKey),
    bucket,
    maxFileBytes,
    ready: storage === "supabase",
    warnings: warningsForStorage(storage)
  };
}

function getStorageClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  storageClient ??= createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  return storageClient;
}

function safePathSegment(value: string, fallback: string) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);
  return cleaned || fallback;
}

async function ensureBucket(client: ReturnType<typeof createClient>) {
  if (bucketReady) return true;

  const existing = await client.storage.getBucket(bucket);
  if (!existing.error) {
    bucketReady = true;
    return true;
  }

  const created = await client.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: maxFileBytes
  });
  if (created.error) return false;

  bucketReady = true;
  return true;
}

export async function uploadPifAttachment(params: {
  applicationId: string;
  requirementId: string;
  file: File;
}): Promise<PifStorageUploadResult> {
  const readiness = pifStorageReadiness();
  if (!readiness.ready) {
    return {
      ok: false,
      storage: readiness.storage,
      error: "not_configured",
      message: "PIF file storage is not configured.",
      warnings: readiness.warnings
    };
  }

  if (!params.file || !params.file.name || params.file.size <= 0) {
    return {
      ok: false,
      storage: "supabase",
      error: "invalid_file",
      message: "Invalid PIF file.",
      warnings: []
    };
  }

  if (params.file.size > maxFileBytes) {
    return {
      ok: false,
      storage: "supabase",
      error: "file_too_large",
      message: `PIF file exceeds ${maxFileBytes} bytes.`,
      warnings: []
    };
  }

  const client = getStorageClient();
  if (!client) {
    return {
      ok: false,
      storage: readiness.storage,
      error: "not_configured",
      message: "PIF file storage is not configured.",
      warnings: readiness.warnings
    };
  }

  const ready = await ensureBucket(client);
  if (!ready) {
    return {
      ok: false,
      storage: "bucket_error",
      error: "upload_failed",
      message: "PIF storage bucket is not ready.",
      warnings: warningsForStorage("bucket_error")
    };
  }

  const applicationId = safePathSegment(params.applicationId, "application");
  const requirementId = safePathSegment(params.requirementId, "requirement");
  const fileName = safePathSegment(params.file.name, "attachment");
  const nonce = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const storagePath = `pif/${applicationId}/${requirementId}/${Date.now()}-${safePathSegment(nonce, "file")}-${fileName}`;
  const mimeType = params.file.type || "application/octet-stream";
  const body = Buffer.from(await params.file.arrayBuffer());
  const uploaded = await client.storage.from(bucket).upload(storagePath, body, {
    contentType: mimeType,
    upsert: false
  });

  if (uploaded.error) {
    return {
      ok: false,
      storage: "supabase",
      error: "upload_failed",
      message: uploaded.error.message,
      warnings: []
    };
  }

  return {
    ok: true,
    storage: "supabase",
    bucket,
    storagePath,
    fileName: params.file.name,
    fileSize: params.file.size,
    mimeType,
    uploadedAt: new Date().toISOString(),
    warnings: []
  };
}
