import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const root = process.cwd();
const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const dryRun = process.env.SUPABASE_VERIFY_DRY_RUN === "1";

const paths = {
  rules: path.join(root, "data", "rules", "tw-cosmetics-rules.json"),
  index: path.join(root, "data", "knowledge", "index.json"),
  termIndex: path.join(root, "data", "knowledge", "term-index.json"),
  updateQueue: path.join(root, "data", "knowledge", "regulatory-update-queue.json")
};

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const [rulesData, sourceIndex, termIndex, updateQueue] = await Promise.all([
  readJson(paths.rules),
  readJson(paths.index),
  readJson(paths.termIndex),
  readJson(paths.updateQueue)
]);

const rules = rulesData.rules ?? [];
const sources = sourceIndex.results ?? [];
const terms = termIndex.terms ?? [];
const aliases = terms.flatMap((term) => term.aliases ?? []);
const links = termIndex.term_rule_links ?? [];
const updateCandidates = updateQueue.items ?? [];

const expectedCounts = {
  rules: rules.length,
  current_rule_versions: rules.length,
  knowledge_sources: sources.length,
  knowledge_snapshots: sources.length,
  knowledge_terms: terms.length,
  regulatory_update_candidates: updateCandidates.length,
  term_aliases: aliases.length,
  term_rule_links: links.length
};

const probeTermKeys = [
  "monosodium-glutamate",
  "benzoates-food-additives",
  "caseinates-food-additives",
  "cephalopods-advisory-allergen",
  "kiwifruit-advisory-allergen",
  "safety-data-sheet",
  "hs-code-classification",
  "country-of-origin-marking",
  "certificate-of-origin",
  "incoterms",
  "commercial-invoice",
  "packing-list",
  "shipment-purpose",
  "taiwan-importer-responsible-firm",
  "certificate-of-analysis",
  "inci-ingredient-name",
  "cosmetic-labeling-claims",
  "cosmetic-prohibited-ingredients",
  "cosmetic-restricted-ingredients",
  "cosmetic-colorants",
  "cosmetic-preservatives",
  "cosmetic-sunscreen-ingredients",
  "food-labeling-claims",
  "nutrition-labeling",
  "food-allergen-labeling",
  "cosmetic-product-information-file",
  "cosmetic-product-notification",
  "imported-cosmetics-inspection",
  "food-import-inspection-exemption",
  "imported-food-inspection",
  "systematic-imported-food-inspection",
  "food-import-health-certificate",
  "food-business-registration-importer",
  "product-information-sheet",
  "business-use-food-intact-package-labeling",
  "advance-tariff-classification-ruling",
  "import-export-permit"
];

const probeAliases = [
  "msg",
  "味精",
  "카제인나트륨",
  "魷魚",
  "奇異果",
  "sds",
  "hs코드",
  "ccc碼",
  "원산지 표시",
  "원산지증명서",
  "인코텀즈",
  "商業發票",
  "패킹리스트",
  "進口目的",
  "대만 수입자",
  "coa",
  "inci",
  "화장품 효능표현",
  "화장품 금지성분",
  "限用成分",
  "化粧品色素",
  "防腐劑",
  "防曬成分",
  "식품 효능표현",
  "甜味宣稱",
  "醫療效能",
  "營養標示",
  "過敏原標示",
  "pif",
  "化妆品备案",
  "輸入化粧品檢驗",
  "免申請查驗",
  "輸入食品查驗",
  "수입식품 통관검사",
  "HS 0307 health certificate",
  "食品業者登錄",
  "產品資訊表",
  "業務用食品標示",
  "進口貨物稅則預先審核",
  "輸入許可證"
];

if (dryRun || !databaseUrl) {
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        hasDatabaseUrl: Boolean(databaseUrl),
        expectedCounts,
        probeTermKeys,
        probeAliases
      },
      null,
      2
    )
  );

  if (!databaseUrl && !dryRun) {
    process.exitCode = 1;
  }
  process.exit(0);
}

const sql = postgres(databaseUrl, {
  max: 1,
  ssl: "require",
  idle_timeout: 5,
  connect_timeout: 20,
  prepare: false
});

try {
  const countRows = await sql`
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

  const actualCounts = Object.fromEntries(countRows.map((row) => [row.table_name, row.row_count]));
  const countMismatches = Object.entries(expectedCounts)
    .filter(([tableName, expected]) => actualCounts[tableName] !== expected)
    .map(([tableName, expected]) => ({
      tableName,
      expected,
      actual: actualCounts[tableName] ?? null
    }));

  const termRows = await sql`
    select term_key, canonical_name
    from public.knowledge_terms
    where term_key in ${sql(probeTermKeys)}
    order by term_key
  `;

  const aliasRows = await sql`
    select normalized_alias, term_key
    from public.term_aliases
    where normalized_alias in ${sql(probeAliases)}
    order by normalized_alias, term_key
  `;

  const foundTermKeys = new Set(termRows.map((row) => row.term_key));
  const foundAliases = new Set(aliasRows.map((row) => row.normalized_alias));
  const missingTermKeys = probeTermKeys.filter((termKey) => !foundTermKeys.has(termKey));
  const missingAliases = probeAliases.filter((alias) => !foundAliases.has(alias));
  const errors = [
    ...countMismatches.map((mismatch) => `Count mismatch for ${mismatch.tableName}: expected ${mismatch.expected}, got ${mismatch.actual}`),
    ...missingTermKeys.map((termKey) => `Missing probe term: ${termKey}`),
    ...missingAliases.map((alias) => `Missing probe alias: ${alias}`)
  ];

  console.log(
    JSON.stringify(
      {
        ok: errors.length === 0,
        expectedCounts,
        actualCounts,
        probeTerms: termRows,
        probeAliases: aliasRows,
        errors
      },
      null,
      2
    )
  );

  if (errors.length > 0) {
    process.exit(1);
  }
} finally {
  await sql.end({ timeout: 5 });
}
