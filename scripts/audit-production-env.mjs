import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const baseUrl = (process.env.LABELPASS_BASE_URL || "https://labelpass-taiwan-regtech.vercel.app").replace(/\/$/, "");
const strictArchive = process.argv.includes("--strict-archive");
const jsonOnly = process.argv.includes("--json");
const archiveToken = process.env.LABELPASS_REVIEW_ARCHIVE_TOKEN;

const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const adminDbPreviewEnabled = process.env.LABELPASS_ENABLE_ADMIN_DB_PREVIEW === "1";
const archiveEnabled = process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE === "1";
const archiveReadEnabled = process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_READ === "1";
const archiveWriteEnabled = process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_WRITE === "1";

const localEnv = [
  envState("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  envState("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  envState("SUPABASE_DB_URL/POSTGRES_URL/DATABASE_URL", databaseUrl),
  envState("LABELPASS_ENABLE_ADMIN_DB_PREVIEW", process.env.LABELPASS_ENABLE_ADMIN_DB_PREVIEW),
  envState("LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE", process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE),
  envState("LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_READ", process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_READ),
  envState("LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_WRITE", process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_WRITE),
  envState("LABELPASS_REVIEW_ARCHIVE_TOKEN", archiveToken)
];

const report = {
  ok: true,
  baseUrl,
  checkedAt: new Date().toISOString(),
  localEnv,
  vercelLink: await readVercelLink(),
  localKnowledge: await readLocalKnowledgeSummary(),
  remote: [],
  readiness: {},
  nextActions: []
};

try {
  report.remote.push(await fetchJson("knowledge search MSG", `${baseUrl}/api/knowledge/search?q=MSG&limit=4&audit=${Date.now()}`));
  report.remote.push(await fetchJson("knowledge search SO2", `${baseUrl}/api/knowledge/search?q=${encodeURIComponent("SO₂")}&limit=4&audit=${Date.now()}`));
  report.remote.push(await fetchJson("review archive list", `${baseUrl}/api/reviews?limit=1&audit=${Date.now()}`, {
    headers: archiveHeaders()
  }));
  report.remote.push(await fetchJson("review archive dry run", `${baseUrl}/api/reviews?dryRun=1&audit=${Date.now()}`, {
    method: "POST",
    headers: archiveHeaders(),
    body: JSON.stringify(buildReviewPayload())
  }));
} catch (error) {
  report.ok = false;
  report.remoteError = error instanceof Error ? error.message : String(error);
}

const knowledgeChecks = report.remote.filter((check) => check.label.startsWith("knowledge search"));
const archiveList = report.remote.find((check) => check.label === "review archive list")?.body;
const archiveDryRun = report.remote.find((check) => check.label === "review archive dry run")?.body;
const remoteAliasCounts = knowledgeChecks
  .map((check) => check.body?.totals?.aliases)
  .filter((value) => typeof value === "number");
const expectedAliases = report.localKnowledge?.searchableAliases;
const remoteKnowledgeReady =
  knowledgeChecks.length > 0 &&
  knowledgeChecks.every((check) => check.ok && Number(check.body?.totals?.terms ?? 0) > 0) &&
  (typeof expectedAliases !== "number" || remoteAliasCounts.every((count) => count === expectedAliases));
const archiveDatabaseReady = archiveList?.storage === "database" && archiveDryRun?.storage === "database";

report.readiness = {
  vercelProjectLinked: report.vercelLink.linked,
  localDatabaseUrlPresent: Boolean(databaseUrl),
  localAdminDbPreviewEnabled: adminDbPreviewEnabled,
  localArchiveFlagEnabled: archiveEnabled,
  localArchiveReadAuthorized: archiveReadEnabled || Boolean(archiveToken),
  localArchiveWriteAuthorized: archiveWriteEnabled || Boolean(archiveToken),
  remoteKnowledgeReady,
  remoteArchiveReadStorage: archiveList?.storage ?? "unknown",
  remoteArchiveWriteStorage: archiveDryRun?.storage ?? "unknown",
  archiveDatabaseReady
};

if (!databaseUrl) {
  report.nextActions.push("Set SUPABASE_DB_URL, POSTGRES_URL, or DATABASE_URL in the local shell before applying or verifying the physical Supabase DB.");
}
if (databaseUrl && !adminDbPreviewEnabled) {
  report.nextActions.push("Set LABELPASS_ENABLE_ADMIN_DB_PREVIEW=1 only when admin operations pages should read live Supabase data.");
}
if (!databaseUrl && adminDbPreviewEnabled) {
  report.nextActions.push("Set a server DB URL or disable LABELPASS_ENABLE_ADMIN_DB_PREVIEW because admin operations cannot use database without it.");
}
if (!archiveEnabled) {
  report.nextActions.push("Set LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE=1 in Vercel when review history should use Supabase instead of browser/local fallback.");
}
if (!archiveReadEnabled && !archiveToken) {
  report.nextActions.push("Authorize archive reads with LABELPASS_REVIEW_ARCHIVE_TOKEN or demo-only LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_READ=1.");
}
if (!archiveWriteEnabled && !archiveToken) {
  report.nextActions.push("Authorize archive writes with LABELPASS_REVIEW_ARCHIVE_TOKEN or demo-only LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_WRITE=1.");
}
if (!remoteKnowledgeReady) {
  report.nextActions.push("Run pnpm preflight:deployment and pnpm verify:supabase-knowledge with SUPABASE_DB_URL if remote knowledge counts drift from local generated data.");
}
if (strictArchive && !archiveDatabaseReady) {
  report.ok = false;
  report.nextActions.push("Strict archive mode expected both archive probes to return storage=database.");
}
if (report.nextActions.length === 0) {
  report.nextActions.push("Production environment checks are ready for the current expected operating mode.");
}

if (jsonOnly) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printHumanReport(report);
}

if (!report.ok) {
  process.exitCode = 1;
}

function envState(name, value) {
  if (!value) return { name, present: false };
  try {
    const parsed = new URL(value);
    return { name, present: true, host: parsed.host };
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

async function readVercelLink() {
  const repoPath = path.join(root, ".vercel", "repo.json");
  if (!(await exists(repoPath))) return { linked: false };

  try {
    const parsed = JSON.parse(await readFile(repoPath, "utf8"));
    const project = parsed.projects?.[0];
    return {
      linked: Boolean(project),
      projectName: project?.name ?? null,
      directory: project?.directory ?? null,
      remoteName: parsed.remoteName ?? null
    };
  } catch (error) {
    return { linked: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function readLocalKnowledgeSummary() {
  try {
    const termIndex = JSON.parse(await readFile(path.join(root, "data", "knowledge", "term-index.json"), "utf8"));
    const sourceIndex = JSON.parse(await readFile(path.join(root, "data", "knowledge", "index.json"), "utf8"));
    const terms = termIndex.terms ?? [];
    return {
      sources: sourceIndex.results?.length ?? 0,
      terms: terms.length,
      termAliases: terms.reduce((sum, term) => sum + (term.aliases?.length ?? 0), 0),
      searchableAliases: terms.reduce((sum, term) => sum + countSearchableAliases(term), 0),
      ruleLinks: termIndex.term_rule_links?.length ?? 0
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
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

  for (const alias of aliasesForTerm) {
    const normalized = alias.normalized ?? normalizeKnowledgeQuery(alias.value);
    const key = `${normalized}:${alias.language ?? ""}:${alias.jurisdiction ?? ""}:${alias.type ?? ""}`;
    if (!alias.value || seen.has(key)) continue;
    seen.add(key);
    aliases += 1;
  }

  return aliases;
}

function archiveHeaders() {
  return archiveToken ? { authorization: `Bearer ${archiveToken}` } : {};
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
  return { label, status: response.status, ok: response.ok, body: summarizeBody(body) };
}

function summarizeBody(body) {
  if (!body || typeof body !== "object") return body;
  if ("totals" in body) {
    return {
      totals: body.totals,
      terms: Array.isArray(body.terms) ? body.terms.length : undefined,
      sources: Array.isArray(body.sources) ? body.sources.length : undefined
    };
  }
  if ("storage" in body) {
    return {
      ok: body.ok,
      storage: body.storage,
      reviews: Array.isArray(body.reviews) ? body.reviews.length : undefined,
      reviewId: body.reviewId
    };
  }
  return body;
}

function buildReviewPayload() {
  const generatedAt = new Date().toISOString();
  return {
    id: `audit-${Date.now()}`,
    input: {
      productName: "Audit Probe",
      productType: "prepackaged food",
      ingredientsText: "Water, Monosodium Glutamate, Soy",
      labelText: "MSG seasoning sample. Market: Taiwan.",
      origin: "KR",
      manufacturer: "LabelPass audit",
      hsCode: "2103.90",
      incoterms: "DAP Taipei",
      shipmentPurpose: "test",
      invoiceValue: "1"
    },
    result: {
      status: "warn",
      score: 75,
      generatedAt,
      ruleVersion: "audit",
      parsedIngredients: [],
      findings: [
        {
          id: "audit-finding",
          status: "warn",
          area: "label",
          title: "Audit archive validation",
          severity: "medium",
          why: "Validates review archive dry-run storage without saving customer data.",
          fix: ["Confirm archive storage mode before launch."],
          source: "LabelPass audit",
          sourceUrl: baseUrl,
          evidence: "dry-run"
        }
      ],
      actionPlan: { items: [] },
      summary: { fail: 0, warn: 1, pass: 0, needsInfo: 0 }
    }
  };
}

function printHumanReport(value) {
  console.log("Production environment audit");
  console.log(`- Base URL: ${value.baseUrl}`);
  console.log(`- Vercel linked: ${value.vercelLink.linked ? `yes (${value.vercelLink.projectName})` : "no"}`);
  console.log(`- Local DB URL present: ${value.readiness.localDatabaseUrlPresent ? "yes" : "no"}`);
  console.log(`- Local archive enabled: ${value.readiness.localArchiveFlagEnabled ? "yes" : "no"}`);
  console.log(`- Remote knowledge ready: ${value.readiness.remoteKnowledgeReady ? "yes" : "no"}`);
  console.log(`- Remote archive read/write: ${value.readiness.remoteArchiveReadStorage} / ${value.readiness.remoteArchiveWriteStorage}`);
  console.log("");
  console.log("Local environment values");
  for (const item of value.localEnv) {
    const suffix = item.host ? ` (${item.host})` : item.detail ? ` (${item.detail})` : "";
    console.log(`- ${item.name}: ${item.present ? `set${suffix}` : "missing"}`);
  }
  console.log("");
  console.log("Remote checks");
  for (const item of value.remote) {
    const storage = item.body?.storage ? ` storage=${item.body.storage}` : "";
    const aliases = item.body?.totals?.aliases ? ` aliases=${item.body.totals.aliases}` : "";
    console.log(`- ${item.label}: HTTP ${item.status}${storage}${aliases}`);
  }
  console.log("");
  console.log("Next actions");
  for (const action of value.nextActions) {
    console.log(`- ${action}`);
  }
}
