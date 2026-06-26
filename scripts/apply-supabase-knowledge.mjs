import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import postgres from "postgres";

const root = process.cwd();
const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const dryRun = process.env.SUPABASE_APPLY_DRY_RUN === "1";
const skipPreflight = process.env.SUPABASE_SKIP_PREFLIGHT === "1";
const skipPostVerify = process.env.SUPABASE_SKIP_POST_VERIFY === "1";
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF ?? "zqmpvveneqdkrojtqxhi";
const allowUnknownProject = process.env.SUPABASE_ALLOW_UNKNOWN_PROJECT === "1";
const expectedConfirmToken = process.env.SUPABASE_APPLY_CONFIRM_TOKEN ?? "APPLY_LABELPASS_KNOWLEDGE";

if (!databaseUrl && !dryRun) {
  throw new Error(
    "Set SUPABASE_DB_URL, POSTGRES_URL, or DATABASE_URL to the Supabase Postgres connection string before running this script."
  );
}

const baseSchemaPath = path.join(root, "supabase", "schema.sql");
const baseSeedPath = path.join(root, "supabase", "seed.sql");
const knowledgeSchemaPath = path.join(root, "supabase", "knowledge-schema.sql");
const knowledgeSeedPath = path.join(root, "supabase", "knowledge-seed.sql");
const maxStatementsPerBatch = parseBatchSize(process.env.SUPABASE_SQL_BATCH_SIZE ?? "250");

function parseBatchSize(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
    throw new Error(`SUPABASE_SQL_BATCH_SIZE must be an integer from 1 to 1000. Received: ${value}`);
  }
  return parsed;
}

function runCommand(label, command, args, env = {}) {
  return new Promise((resolve, reject) => {
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

async function runPreflight() {
  if (dryRun || skipPreflight) return;
  await runCommand("Supabase knowledge preflight", "pnpm", ["preflight:supabase-knowledge"]);
}

async function runPostApplyVerify() {
  if (dryRun || skipPostVerify) return;
  await runCommand("Supabase knowledge post-apply verification", "pnpm", ["verify:supabase-knowledge"]);
}

function assertConnectionTarget(value) {
  if (dryRun || !value) return;

  if (!allowUnknownProject && expectedProjectRef) {
    const haystack = value.toLowerCase();
    if (!haystack.includes(expectedProjectRef.toLowerCase())) {
      throw new Error(
        `Database URL does not appear to target expected Supabase project ${expectedProjectRef}. ` +
          "Set SUPABASE_EXPECTED_PROJECT_REF to the intended ref or SUPABASE_ALLOW_UNKNOWN_PROJECT=1 only after manual verification."
      );
    }
  }

  if (process.env.SUPABASE_APPLY_CONFIRM !== expectedConfirmToken) {
    throw new Error(
      `Set SUPABASE_APPLY_CONFIRM=${expectedConfirmToken} to confirm applying generated LabelPass knowledge data to Supabase.`
    );
  }
}

function connectionSummary(value) {
  if (!value) return { present: false };
  try {
    const url = new URL(value);
    return { present: true, host: url.host, database: url.pathname.replace(/^\//, "") || null };
  } catch {
    return { present: true, detail: "set" };
  }
}

function parseGeneratedSeed(source) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("--"))
    .filter((line) => !["begin;", "commit;"].includes(line.toLowerCase()));
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

await runPreflight();
assertConnectionTarget(databaseUrl);

async function buildPlan() {
  const [baseSchema, baseSeed, knowledgeSchema, knowledgeSeed] = await Promise.all([
    readFile(baseSchemaPath, "utf8"),
    readFile(baseSeedPath, "utf8"),
    readFile(knowledgeSchemaPath, "utf8"),
    readFile(knowledgeSeedPath, "utf8")
  ]);
  const baseSeedStatements = parseGeneratedSeed(baseSeed).length;
  const knowledgeSeedStatements = parseGeneratedSeed(knowledgeSeed).length;
  return {
    connection: connectionSummary(databaseUrl),
    dryRun,
    maxStatementsPerBatch,
    files: [
      { label: "base schema", path: path.relative(root, baseSchemaPath), bytes: baseSchema.length },
      {
        label: "TFDA rule seed",
        path: path.relative(root, baseSeedPath),
        bytes: baseSeed.length,
        statements: baseSeedStatements,
        batches: Math.ceil(baseSeedStatements / maxStatementsPerBatch)
      },
      { label: "knowledge schema", path: path.relative(root, knowledgeSchemaPath), bytes: knowledgeSchema.length },
      {
        label: "knowledge seed",
        path: path.relative(root, knowledgeSeedPath),
        bytes: knowledgeSeed.length,
        statements: knowledgeSeedStatements,
        batches: Math.ceil(knowledgeSeedStatements / maxStatementsPerBatch)
      }
    ]
  };
}

const sql = dryRun
  ? null
  : postgres(databaseUrl, {
      max: 1,
      ssl: "require",
      idle_timeout: 5,
      connect_timeout: 20,
      prepare: false
    });

async function applySqlFile(label, filePath) {
  const source = await readFile(filePath, "utf8");
  await sql.begin(async (tx) => {
    await tx.unsafe(source);
  });
  console.log(`Applied ${label}`);
}

async function applyGeneratedSeed(label, filePath) {
  const source = await readFile(filePath, "utf8");
  const statements = parseGeneratedSeed(source);
  const batches = chunk(statements, maxStatementsPerBatch);

  console.log(
    JSON.stringify(
      {
        applying: label,
        statements: statements.length,
        batches: batches.length,
        maxStatementsPerBatch
      },
      null,
      2
    )
  );

  for (const [index, batch] of batches.entries()) {
    await sql.begin(async (tx) => {
      for (const statement of batch) {
        await tx.unsafe(statement);
      }
    });
    console.log(`Applied ${label} batch ${index + 1}/${batches.length}`);
  }
}

try {
  const plan = await buildPlan();
  console.log(JSON.stringify({ applyPlan: plan }, null, 2));

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          baseSeedStatements: plan.files.find((file) => file.label === "TFDA rule seed")?.statements,
          knowledgeSeedStatements: plan.files.find((file) => file.label === "knowledge seed")?.statements,
          maxStatementsPerBatch
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  await applySqlFile("base schema", baseSchemaPath);
  await applyGeneratedSeed("TFDA rule seed", baseSeedPath);
  await applySqlFile("knowledge schema", knowledgeSchemaPath);
  await applyGeneratedSeed("knowledge seed", knowledgeSeedPath);

  const counts = await sql`
    select 'rules' as table_name, count(*)::integer as row_count from public.rules
    union all select 'current_rule_versions', count(*)::integer from public.rule_versions where is_current = true
    union all select 'knowledge_sources', count(*)::integer from public.knowledge_sources
    union all select 'knowledge_snapshots', count(*)::integer from public.knowledge_snapshots
    union all select 'knowledge_terms', count(*)::integer from public.knowledge_terms
    union all select 'regulatory_update_candidates', count(*)::integer from public.regulatory_update_candidates
    union all select 'term_aliases', count(*)::integer from public.term_aliases
    union all select 'term_rule_links', count(*)::integer from public.term_rule_links
    order by table_name
  `;

  console.log(JSON.stringify({ counts }, null, 2));
  await runPostApplyVerify();
} finally {
  await sql?.end({ timeout: 5 });
}
