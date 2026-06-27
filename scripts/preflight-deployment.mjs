import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const baseUrl = (process.env.LABELPASS_BASE_URL || "https://labelpass-taiwan-regtech.vercel.app").replace(/\/$/, "");
const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const adminDbPreviewEnabled = process.env.LABELPASS_ENABLE_ADMIN_DB_PREVIEW === "1";
const adminDbWritesEnabled = process.env.LABELPASS_ENABLE_ADMIN_DB_WRITES === "1";
const adminOpsToken = process.env.LABELPASS_ADMIN_OPS_TOKEN;
const publicReviewArchiveEnabled = process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE === "1";
const publicReviewArchiveReadEnabled = process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_READ === "1";
const publicReviewArchiveWriteEnabled = process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_WRITE === "1";
const archiveToken = process.env.LABELPASS_REVIEW_ARCHIVE_TOKEN;
const expectedArchiveReadStorage =
  process.env.LABELPASS_EXPECT_ARCHIVE_READ_STORAGE ??
  process.env.LABELPASS_EXPECT_ARCHIVE_STORAGE ??
  (databaseUrl && publicReviewArchiveEnabled && (publicReviewArchiveReadEnabled || archiveToken) ? "database" : "disabled");
const expectedArchiveWriteStorage =
  process.env.LABELPASS_EXPECT_ARCHIVE_WRITE_STORAGE ??
  process.env.LABELPASS_EXPECT_ARCHIVE_STORAGE ??
  (databaseUrl && publicReviewArchiveEnabled && (publicReviewArchiveWriteEnabled || archiveToken) ? "database" : "disabled");
const validArchiveStates = new Set(["database", "disabled", "unavailable"]);
const archiveHeaders = archiveToken ? { authorization: `Bearer ${archiveToken}` } : {};

const paths = {
  rules: path.join(root, "data", "rules", "tw-cosmetics-rules.json"),
  sourceIndex: path.join(root, "data", "knowledge", "index.json"),
  termIndex: path.join(root, "data", "knowledge", "term-index.json"),
  updateQueue: path.join(root, "data", "knowledge", "regulatory-update-queue.json"),
  aliasReviewQueue: path.join(root, "data", "knowledge", "alias-review-queue.json"),
  baseSchema: path.join(root, "supabase", "schema.sql"),
  baseSeed: path.join(root, "supabase", "seed.sql"),
  knowledgeSchema: path.join(root, "supabase", "knowledge-schema.sql"),
  knowledgeSeed: path.join(root, "supabase", "knowledge-seed.sql"),
  chunkManifest: path.join(root, "supabase", "generated", "knowledge-seed-chunks", "manifest.json")
};

function envState(name, value) {
  if (!value) return { name, present: false };
  try {
    const url = new URL(value);
    return { name, present: true, host: url.host };
  } catch {
    return { name, present: true, detail: "set" };
  }
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function fileInfo(filePath) {
  const present = await exists(filePath);
  if (!present) return { path: path.relative(root, filePath), present: false };
  const fileStat = await stat(filePath);
  return {
    path: path.relative(root, filePath),
    present: true,
    bytes: fileStat.size
  };
}

function normalizeKnowledgeQuery(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[^\p{Letter}\p{Number}%.+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countSearchableAliases(term) {
  const aliasesForTerm = [
    ...(term.aliases ?? []).map((alias) => ({ ...alias, identifierAlias: false })),
    ...(term.identifiers?.cas ?? []).map((value) => ({
      value,
      normalized: normalizeKnowledgeQuery(value),
      type: "cas",
      language: "und",
      jurisdiction: "GLOBAL",
      identifierAlias: true
    })),
    ...(term.identifiers?.inci ?? []).map((value) => ({
      value,
      normalized: normalizeKnowledgeQuery(value),
      type: "INCI",
      language: "en",
      jurisdiction: "GLOBAL",
      identifierAlias: true
    })),
    ...(term.identifiers?.color_index ?? []).map((value) => ({
      value,
      normalized: normalizeKnowledgeQuery(value),
      type: "color_index",
      language: "en",
      jurisdiction: "GLOBAL",
      identifierAlias: true
    }))
  ];

  const seen = new Set();
  let aliases = 0;
  let identifierAliases = 0;

  for (const alias of aliasesForTerm) {
    const normalized = alias.normalized ?? normalizeKnowledgeQuery(alias.value);
    const key = `${normalized}:${alias.language ?? ""}:${alias.jurisdiction ?? ""}:${alias.type ?? ""}`;
    if (!alias.value || seen.has(key)) continue;
    seen.add(key);
    aliases += 1;
    if (alias.identifierAlias) identifierAliases += 1;
  }

  return { aliases, identifierAliases };
}

function buildReviewPayload() {
  const generatedAt = new Date().toISOString();
  return {
    id: `preflight-${Date.now()}`,
    input: {
      productName: "Preflight Probe Cream",
      productType: "leave-on cosmetic cream",
      ingredientsText: "Aqua, Hydroquinone 2%, Retinoic Acid, Fragrance",
      labelText: "Whitening acne care cream. Market: Taiwan.",
      origin: "KR",
      manufacturer: "LabelPass preflight",
      hsCode: "3304.99",
      incoterms: "DAP Taipei",
      shipmentPurpose: "test",
      invoiceValue: "1"
    },
    result: {
      status: "fail",
      score: 25,
      generatedAt,
      ruleVersion: "preflight",
      parsedIngredients: [],
      findings: [
        {
          id: "preflight-finding",
          status: "fail",
          area: "ingredient",
          title: "Preflight archive write validation",
          severity: "high",
          why: "Validates review archive payload shape without relying on browser storage.",
          fix: ["Use SUPABASE_DB_URL for persistent archive storage."],
          source: "LabelPass preflight",
          sourceUrl: "https://labelpass-taiwan-regtech.vercel.app",
          evidence: "preflight"
        }
      ],
      actionPlan: { items: [] },
      summary: { fail: 1, warn: 0, pass: 0, needsInfo: 0 }
    }
  };
}

function buildAdminOpsDryRunPayload() {
  return {
    action: "expert_match_status",
    id: "00000000-0000-4000-8000-000000000001",
    status: "matched",
    requestId: `preflight-admin-ops-${Date.now()}`,
    note: "dry-run preflight check"
  };
}

function buildHandoffDryRunPayload() {
  return {
    draft: {
      id: `preflight-handoff-${Date.now()}`,
      createdAt: new Date().toISOString(),
      productName: "Preflight PIF Cream",
      productType: "leave-on cosmetic cream",
      routeId: "tw_cosmetic",
      routeLabel: "대만 화장품",
      status: "needs_info",
      score: 64,
      priority: "collect_documents",
      nextAction: "PIF, INCI, GMP 증빙을 전문가 상담 전에 보강",
      expertScope: ["자료 보강", "PIF 목차 확인", "INCI 제한성분 대조"],
      paymentGate: {
        label: "견적·결제 준비",
        detail: "보강 증빙 확인 후 상담방을 엽니다."
      },
      logistics: {
        trigger: "라벨·증빙 버전 고정 후 선적 연결",
        documents: ["중문 라벨", "PIF", "GMP 증빙"]
      },
      evidenceCount: 5,
      neededDocuments: 3
    },
    requestId: `preflight-handoff-request-${Date.now()}`,
    metadata: { preflight: true }
  };
}

async function fetchJson(label, url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options?.headers ?? {})
    },
    cache: "no-store"
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 240) };
  }
  return { label, url, status: response.status, ok: response.ok, body };
}

const errors = [];
const warnings = [];

if (!validArchiveStates.has(expectedArchiveReadStorage)) {
  errors.push(
    `LABELPASS_EXPECT_ARCHIVE_READ_STORAGE must be database, disabled, or unavailable. Got ${expectedArchiveReadStorage}`
  );
}
if (!validArchiveStates.has(expectedArchiveWriteStorage)) {
  errors.push(
    `LABELPASS_EXPECT_ARCHIVE_WRITE_STORAGE must be database, disabled, or unavailable. Got ${expectedArchiveWriteStorage}`
  );
}

const [rulesData, sourceIndex, termIndex, updateQueue, aliasReviewQueue] = await Promise.all([
  readJson(paths.rules),
  readJson(paths.sourceIndex),
  readJson(paths.termIndex),
  readJson(paths.updateQueue),
  readJson(paths.aliasReviewQueue)
]);

const rules = rulesData.rules ?? [];
const sources = sourceIndex.results ?? [];
const terms = termIndex.terms ?? [];
const aliases = terms.flatMap((term) => term.aliases ?? []);
const links = termIndex.term_rule_links ?? [];
const updateCandidates = updateQueue.items ?? [];
const aliasQueueItems = aliasReviewQueue.items ?? [];
const searchableAliasCounts = terms.reduce(
  (counts, term) => {
    const termCounts = countSearchableAliases(term);
    counts.aliases += termCounts.aliases;
    counts.identifierAliases += termCounts.identifierAliases;
    return counts;
  },
  { aliases: 0, identifierAliases: 0 }
);

const localCounts = {
  rules: rules.length,
  knowledgeSources: sources.length,
  knowledgeTerms: terms.length,
  termAliases: aliases.length,
  searchableIdentifierAliases: searchableAliasCounts.identifierAliases,
  searchableAliases: searchableAliasCounts.aliases,
  termRuleLinks: links.length,
  regulatoryUpdateCandidates: updateCandidates.length,
  aliasReviewQueueItems: aliasQueueItems.length
};

for (const [name, value] of Object.entries(localCounts)) {
  if (!value) errors.push(`Local ${name} count is empty`);
}

const sqlFiles = await Promise.all([
  fileInfo(paths.baseSchema),
  fileInfo(paths.baseSeed),
  fileInfo(paths.knowledgeSchema),
  fileInfo(paths.knowledgeSeed),
  fileInfo(paths.chunkManifest)
]);

for (const file of sqlFiles.slice(0, 4)) {
  if (!file.present) errors.push(`Missing required SQL artifact: ${file.path}`);
}

let chunkManifest = null;
if (await exists(paths.chunkManifest)) {
  chunkManifest = await readJson(paths.chunkManifest);
  if (!Array.isArray(chunkManifest.chunks) || chunkManifest.chunks.length === 0) {
    warnings.push("Knowledge seed chunk manifest exists but has no chunks");
  }
  const maxBytes = chunkManifest.max_bytes ?? chunkManifest.maxBytes ?? null;
  const oversizedChunks = Array.isArray(chunkManifest.chunks) && maxBytes
    ? chunkManifest.chunks.filter((chunk) => Number(chunk.bytes ?? 0) > maxBytes)
    : [];
  if (oversizedChunks.length > 0) {
    warnings.push(`${oversizedChunks.length} knowledge seed chunks exceed configured max_bytes ${maxBytes}`);
  }
}

const env = [
  envState("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  envState("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  envState("SUPABASE_DB_URL/POSTGRES_URL/DATABASE_URL", databaseUrl),
  envState("LABELPASS_ENABLE_ADMIN_DB_PREVIEW", process.env.LABELPASS_ENABLE_ADMIN_DB_PREVIEW),
  envState("LABELPASS_ENABLE_ADMIN_DB_WRITES", process.env.LABELPASS_ENABLE_ADMIN_DB_WRITES),
  envState("LABELPASS_ADMIN_OPS_TOKEN", adminOpsToken),
  envState("LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE", process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE),
  envState("LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_READ", process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_READ),
  envState("LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_WRITE", process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_WRITE),
  envState("LABELPASS_REVIEW_ARCHIVE_TOKEN", archiveToken),
  envState("SUPABASE_ACCESS_TOKEN", process.env.SUPABASE_ACCESS_TOKEN)
];

if (!databaseUrl) {
  warnings.push("Server DB URL is not set; review archive storage will remain browser/local fallback in production.");
}
if (databaseUrl && !adminDbPreviewEnabled) {
  warnings.push("Server DB URL is set, but LABELPASS_ENABLE_ADMIN_DB_PREVIEW is not 1; admin operations pages use safe fallback/design data.");
}
if (!databaseUrl && adminDbPreviewEnabled) {
  warnings.push("LABELPASS_ENABLE_ADMIN_DB_PREVIEW is 1, but no server DB URL is set; admin operations cannot use database.");
}
if (databaseUrl && adminDbPreviewEnabled && !adminDbWritesEnabled) {
  warnings.push("Admin DB preview is enabled, but LABELPASS_ENABLE_ADMIN_DB_WRITES is not 1; admin operation status changes stay read-only.");
}
if (adminDbWritesEnabled && !adminOpsToken) {
  warnings.push("LABELPASS_ENABLE_ADMIN_DB_WRITES is 1, but LABELPASS_ADMIN_OPS_TOKEN is not set; admin operation writes are not authorized.");
}
if (databaseUrl && !publicReviewArchiveEnabled) {
  warnings.push("Server DB URL is set, but LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE is not 1; public review archive API stays disabled.");
}
if (!databaseUrl && publicReviewArchiveEnabled) {
  warnings.push("LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE is 1, but no server DB URL is set; archive storage cannot use database.");
}
if (databaseUrl && publicReviewArchiveEnabled && !publicReviewArchiveReadEnabled && !archiveToken) {
  warnings.push("Review archive DB is configured, but read access is disabled without LABELPASS_REVIEW_ARCHIVE_TOKEN or LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_READ=1.");
}
if (databaseUrl && publicReviewArchiveEnabled && !publicReviewArchiveWriteEnabled && !archiveToken) {
  warnings.push("Review archive DB is configured, but write access is disabled without LABELPASS_REVIEW_ARCHIVE_TOKEN or LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_WRITE=1.");
}

const remoteChecks = [];
try {
  remoteChecks.push(await fetchJson("knowledge search", `${baseUrl}/api/knowledge/search?q=casein&limit=6&preflight=${Date.now()}`));
  remoteChecks.push(await fetchJson("admin ops readiness", `${baseUrl}/api/admin/ops/actions?preflight=${Date.now()}`));
  remoteChecks.push(
    await fetchJson("admin ops dry run", `${baseUrl}/api/admin/ops/actions?dryRun=1&preflight=${Date.now()}`, {
      method: "POST",
      body: JSON.stringify(buildAdminOpsDryRunPayload())
    })
  );
  remoteChecks.push(await fetchJson("handoff readiness", `${baseUrl}/api/handoff/requests?preflight=${Date.now()}`));
  remoteChecks.push(
    await fetchJson("handoff dry run", `${baseUrl}/api/handoff/requests?dryRun=1&preflight=${Date.now()}`, {
      method: "POST",
      body: JSON.stringify(buildHandoffDryRunPayload())
    })
  );
  remoteChecks.push(await fetchJson("review archive list", `${baseUrl}/api/reviews?limit=1&preflight=${Date.now()}`, {
    headers: archiveHeaders
  }));
  remoteChecks.push(
    await fetchJson("review archive dry run", `${baseUrl}/api/reviews?dryRun=1&preflight=${Date.now()}`, {
      method: "POST",
      headers: archiveHeaders,
      body: JSON.stringify(buildReviewPayload())
    })
  );
} catch (error) {
  errors.push(`Remote API preflight failed for ${baseUrl}: ${error instanceof Error ? error.message : String(error)}`);
}

for (const check of remoteChecks) {
  if (!check.ok) errors.push(`${check.label} returned ${check.status}`);
}

const knowledgeCheck = remoteChecks.find((check) => check.label === "knowledge search");
const knowledgeTotals = knowledgeCheck?.body?.totals;
if (knowledgeTotals) {
  if (knowledgeTotals.sources !== localCounts.knowledgeSources) {
    errors.push(`Remote knowledge sources ${knowledgeTotals.sources} did not match local ${localCounts.knowledgeSources}`);
  }
  if (knowledgeTotals.terms !== localCounts.knowledgeTerms) {
    errors.push(`Remote knowledge terms ${knowledgeTotals.terms} did not match local ${localCounts.knowledgeTerms}`);
  }
  if (knowledgeTotals.aliases !== localCounts.searchableAliases) {
    const message =
      `Remote searchable aliases ${knowledgeTotals.aliases} did not match local ${localCounts.searchableAliases} ` +
      `(stored term aliases ${localCounts.termAliases} + searchable identifier aliases ${localCounts.searchableIdentifierAliases})`;
    if (process.env.LABELPASS_STRICT_REMOTE_ALIASES === "1") {
      errors.push(message);
    } else {
      warnings.push(
        `${message}. Run pnpm verify:supabase-knowledge with SUPABASE_DB_URL to compare physical Supabase table rows.`
      );
    }
  }
  if (knowledgeTotals.ruleLinks !== localCounts.termRuleLinks) {
    errors.push(`Remote rule links ${knowledgeTotals.ruleLinks} did not match local ${localCounts.termRuleLinks}`);
  }
}

const archiveList = remoteChecks.find((check) => check.label === "review archive list")?.body;
const archiveDryRun = remoteChecks.find((check) => check.label === "review archive dry run")?.body;
const adminOpsReadiness = remoteChecks.find((check) => check.label === "admin ops readiness")?.body;
const adminOpsDryRun = remoteChecks.find((check) => check.label === "admin ops dry run")?.body;
const handoffReadiness = remoteChecks.find((check) => check.label === "handoff readiness")?.body;
const handoffDryRun = remoteChecks.find((check) => check.label === "handoff dry run")?.body;

if (archiveList && !validArchiveStates.has(archiveList.storage)) {
  errors.push(`Unexpected archive list storage state: ${archiveList.storage}`);
}
if (archiveDryRun && !validArchiveStates.has(archiveDryRun.storage)) {
  errors.push(`Unexpected archive dry-run storage state: ${archiveDryRun.storage}`);
}
if (archiveList && archiveList.storage !== expectedArchiveReadStorage) {
  errors.push(`Archive list expected ${expectedArchiveReadStorage}, got ${archiveList.storage}`);
}
if (archiveDryRun && archiveDryRun.storage !== expectedArchiveWriteStorage) {
  errors.push(`Archive dry run expected ${expectedArchiveWriteStorage}, got ${archiveDryRun.storage}`);
}
if (expectedArchiveWriteStorage === "database" && archiveDryRun?.reviewId?.startsWith("preflight-") !== true) {
  errors.push("Archive dry run expected database storage to preserve the preflight review id");
}
if (!Array.isArray(adminOpsReadiness?.supportedActions?.expert_match_status)) {
  errors.push("Admin ops readiness did not expose expert match status transitions");
}
if (adminOpsDryRun?.dryRun !== true || adminOpsDryRun?.applied !== false) {
  errors.push("Admin ops dry run did not return a safe dry-run response");
}
if (!handoffReadiness?.targetTables?.includes("shipment_requests")) {
  errors.push("Handoff readiness did not expose shipment request target table");
}
if (handoffDryRun?.dryRun !== true || handoffDryRun?.applied !== false || !handoffDryRun?.plannedRecords?.payment) {
  errors.push("Handoff dry run did not return a safe planned-record response");
}

const report = {
  ok: errors.length === 0,
  baseUrl,
  expectedArchiveStorage: expectedArchiveWriteStorage,
  expectedArchiveReadStorage,
  expectedArchiveWriteStorage,
  env,
  localCounts,
  sqlFiles,
  chunkManifest: chunkManifest
    ? {
        chunks: chunkManifest.chunk_count ?? chunkManifest.chunks?.length ?? 0,
        statements: chunkManifest.statement_count ?? null,
        maxBytes: chunkManifest.max_bytes ?? chunkManifest.maxBytes ?? null,
        largestChunkBytes: Array.isArray(chunkManifest.chunks)
          ? Math.max(...chunkManifest.chunks.map((chunk) => Number(chunk.bytes ?? 0)))
          : null
      }
    : null,
  remote: remoteChecks.map((check) => ({
    label: check.label,
    status: check.status,
    ok: check.ok,
    storage: check.body?.storage,
    writesReady: check.body?.writesReady,
    action: check.body?.action,
    dryRun: check.body?.dryRun,
    applied: check.body?.applied,
    targetTables: check.body?.targetTables,
    plannedRecordKeys: check.body?.plannedRecords ? Object.keys(check.body.plannedRecords) : undefined,
    totals: check.body?.totals,
    terms: check.body?.terms?.length,
    sources: check.body?.sources?.length
  })),
  warnings,
  errors
};

console.log(JSON.stringify(report, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
