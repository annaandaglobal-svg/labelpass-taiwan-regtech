import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const root = process.cwd();
const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Set SUPABASE_DB_URL, POSTGRES_URL, or DATABASE_URL to the Supabase Postgres connection string before running this script."
  );
}

const schemaPath = path.join(root, "supabase", "knowledge-schema.sql");
const seedPath = path.join(root, "supabase", "knowledge-seed.sql");
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

const sql = postgres(databaseUrl, {
  max: 1,
  ssl: "require",
  idle_timeout: 5,
  connect_timeout: 20
});

try {
  const schemaSql = await readFile(schemaPath, "utf8");
  const seedSql = await readFile(seedPath, "utf8");
  const seedStatements = parseGeneratedSeed(seedSql);
  const batches = chunk(seedStatements, maxStatementsPerBatch);

  console.log(
    JSON.stringify(
      {
        applying: "knowledge schema and seed",
        seedStatements: seedStatements.length,
        batches: batches.length,
        maxStatementsPerBatch
      },
      null,
      2
    )
  );

  await sql.begin(async (tx) => {
    await tx.unsafe(schemaSql);
  });

  for (const [index, statements] of batches.entries()) {
    await sql.begin(async (tx) => {
      for (const statement of statements) {
        await tx.unsafe(statement);
      }
    });
    console.log(`Applied knowledge seed batch ${index + 1}/${batches.length}`);
  }

  const counts = await sql`
    select 'rules' as table_name, count(*)::integer as row_count from public.rules
    union all select 'current_rule_versions', count(*)::integer from public.rule_versions where valid_to is null
    union all select 'knowledge_sources', count(*)::integer from public.knowledge_sources
    union all select 'knowledge_snapshots', count(*)::integer from public.knowledge_snapshots
    union all select 'knowledge_terms', count(*)::integer from public.knowledge_terms
    union all select 'term_aliases', count(*)::integer from public.term_aliases
    union all select 'term_rule_links', count(*)::integer from public.term_rule_links
    order by table_name
  `;

  console.log(JSON.stringify({ counts }, null, 2));
} finally {
  await sql.end({ timeout: 5 });
}
