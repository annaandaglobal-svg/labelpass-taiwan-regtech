import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF ?? "zqmpvveneqdkrojtqxhi";
const allowUnknownProject = process.env.SUPABASE_ALLOW_UNKNOWN_PROJECT === "1";
const batchSize = parseBatchSize(process.env.SUPABASE_SQL_BATCH_SIZE ?? "250");

const paths = {
  crawlIndex: path.join(root, "data", "knowledge", "index.json"),
  baseSeed: path.join(root, "supabase", "seed.sql"),
  knowledgeSeed: path.join(root, "supabase", "knowledge-seed.sql")
};

const warnings = [];
const errors = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function parseBatchSize(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
    throw new Error(`SUPABASE_SQL_BATCH_SIZE must be an integer from 1 to 1000. Received: ${value}`);
  }
  return parsed;
}

function daysUntil(value, now = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function runCommand(label, command, args, env = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n> ${label}`);
    const useShellCommand = process.platform === "win32";
    const child = spawn(useShellCommand ? [command, ...args].join(" ") : command, useShellCommand ? [] : args, {
      cwd: root,
      env: { ...process.env, ...env },
      shell: useShellCommand,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

function inspectDatabaseTarget() {
  if (!databaseUrl) {
    warn("No Supabase DB URL is set. Preflight can validate artifacts, but apply will require SUPABASE_DB_URL, POSTGRES_URL, or DATABASE_URL.");
    return { present: false };
  }

  let summary = { present: true, detail: "set" };
  try {
    const url = new URL(databaseUrl);
    summary = {
      present: true,
      host: url.host,
      database: url.pathname.replace(/^\//, "") || null,
      username: url.username ? `${url.username.slice(0, 10)}...` : null
    };
  } catch {
    warn("Database URL is set but could not be parsed as a URL.");
  }

  if (!allowUnknownProject && expectedProjectRef && !databaseUrl.toLowerCase().includes(expectedProjectRef.toLowerCase())) {
    fail(
      `Database URL does not appear to target expected Supabase project ${expectedProjectRef}. ` +
        "Set SUPABASE_EXPECTED_PROJECT_REF to the intended ref, or SUPABASE_ALLOW_UNKNOWN_PROJECT=1 after manual verification."
    );
  }

  return summary;
}

function validateGeneratedSeedFormat(label, sql) {
  const actionableLines = sql
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("--") && !["begin;", "commit;"].includes(line.toLowerCase()));

  const malformed = actionableLines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => !line.endsWith(";") || line.includes("$$"));

  if (malformed.length > 0) {
    fail(`${label} has ${malformed.length} statement line(s) that are unsafe for the current line-based apply parser.`);
  }

  return {
    statements: actionableLines.length,
    batches: Math.ceil(actionableLines.length / batchSize),
    malformed: malformed.slice(0, 5).map(({ index, line }) => ({ index, preview: line.slice(0, 120) }))
  };
}

function validateFreshness(index) {
  const results = index.results ?? [];
  const expiredSources = results.filter((source) => {
    const days = daysUntil(source.cache_expires_at);
    return days !== null && days < 0;
  });
  const highPriorityStaleSources = results.filter((source) => source.priority === "high" && source.cache_status === "stale");
  const highPriorityManualFallbacks = results.filter((source) => source.priority === "high" && source.manual_fallback);
  const highPriorityManualFallbacksWithEvidence = highPriorityManualFallbacks.filter(
    (source) => source.browser_capture || source.browser_capture_path || source.screenshot_path
  );
  const highPriorityManualFallbacksWithoutEvidence = highPriorityManualFallbacks.filter(
    (source) => !source.browser_capture && !source.browser_capture_path && !source.screenshot_path
  );

  if (expiredSources.length > 0) {
    fail(`Knowledge crawl has ${expiredSources.length} expired source(s). Refresh before applying to Supabase.`);
  }

  if (highPriorityStaleSources.length > 0) {
    fail(`Knowledge crawl has ${highPriorityStaleSources.length} high-priority stale source(s). Refresh before applying to Supabase.`);
  }

  if (highPriorityManualFallbacksWithoutEvidence.length > 0) {
    warn(
      `${highPriorityManualFallbacksWithoutEvidence.length} high-priority manual fallback source(s) have no browser capture evidence. Review docs/knowledge-operations-report.md for follow-up capture work.`
    );
  }

  return {
    sources: results.length,
    expired: expiredSources.length,
    highPriorityStale: highPriorityStaleSources.length,
    highPriorityManualFallbacks: highPriorityManualFallbacks.length,
    highPriorityManualFallbacksWithEvidence: highPriorityManualFallbacksWithEvidence.length,
    highPriorityManualFallbacksWithoutEvidence: highPriorityManualFallbacksWithoutEvidence.length
  };
}

const [crawlIndex, baseSeed, knowledgeSeed] = await Promise.all([
  readJson(paths.crawlIndex),
  readFile(paths.baseSeed, "utf8"),
  readFile(paths.knowledgeSeed, "utf8")
]);

const target = inspectDatabaseTarget();
const freshness = validateFreshness(crawlIndex);
const seedFormat = {
  baseSeed: validateGeneratedSeedFormat("supabase/seed.sql", baseSeed),
  knowledgeSeed: validateGeneratedSeedFormat("supabase/knowledge-seed.sql", knowledgeSeed)
};

if (errors.length > 0) {
  console.error(JSON.stringify({ ok: false, target, batchSize, freshness, seedFormat, warnings, errors }, null, 2));
  process.exit(1);
}

await runCommand("validate knowledge artifacts", "pnpm", ["validate:knowledge"]);
await runCommand("validate required Taiwan coverage", "pnpm", ["validate:coverage"]);
await runCommand("audit search aliases", "pnpm", ["audit:search-aliases"]);
await runCommand("report knowledge operations", "pnpm", ["report:knowledge-ops"]);
await runCommand("dry-run Supabase apply plan", "node", ["scripts/apply-supabase-knowledge.mjs"], {
  SUPABASE_APPLY_DRY_RUN: "1",
  SUPABASE_SKIP_PREFLIGHT: "1"
});

console.log(JSON.stringify({ ok: true, target, batchSize, freshness, seedFormat, warnings }, null, 2));
