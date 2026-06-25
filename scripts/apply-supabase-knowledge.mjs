import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const root = process.cwd();
const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const dryRun = process.env.SUPABASE_APPLY_DRY_RUN === "1";

if (!databaseUrl && !dryRun) {
  throw new Error(
    "Set SUPABASE_DB_URL, POSTGRES_URL, or DATABASE_URL to the Supabase Postgres connection string before running this script."
  );
}

const baseSchemaPath = path.join(root, "supabase", "schema.sql");
const baseSeedPath = path.join(root, "supabase", "seed.sql");
const knowledgeSchemaPath = path.join(root, "supabase", "knowledge-schema.sql");
const knowledgeSeedPath = path.join(root, "supabase", "knowledge-seed.sql");
const maxStatementsPerBatch = Number(process.env.SUPABASE_SQL_BATCH_SIZE ?? 250);

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
  if (dryRun) {
    const [baseSeed, knowledgeSeed] = await Promise.all([
      readFile(baseSeedPath, "utf8"),
      readFile(knowledgeSeedPath, "utf8")
    ]);

    console.log(
      JSON.stringify(
        {
          dryRun: true,
          baseSeedStatements: parseGeneratedSeed(baseSeed).length,
          knowledgeSeedStatements: parseGeneratedSeed(knowledgeSeed).length,
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
} finally {
  await sql?.end({ timeout: 5 });
}
