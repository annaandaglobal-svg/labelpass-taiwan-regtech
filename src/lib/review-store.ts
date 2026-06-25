import postgres from "postgres";
import type { Finding, ReviewInput, ReviewResult, ReviewStatus } from "./compliance";
import type { SavedReview } from "./review-types";

type DbClient = ReturnType<typeof postgres>;

type ReviewRow = {
  id: string;
  source_version_summary: {
    app_review_id?: string;
    input?: ReviewInput;
    result?: ReviewResult;
  } | null;
};

export type ReviewStoreListResult = {
  storage: "database" | "disabled";
  reviews: SavedReview[];
};

export type ReviewStoreSaveResult = {
  storage: "database" | "disabled";
  review: SavedReview | null;
};

const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
let client: DbClient | null = null;

function getClient() {
  if (!databaseUrl) return null;
  client ??= postgres(databaseUrl, {
    max: 2,
    ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") ? false : "require",
    idle_timeout: 10,
    connect_timeout: 8,
    prepare: false
  });
  return client;
}

function productCategory(input: ReviewInput, result: ReviewResult) {
  const haystack = `${input.productType} ${result.ruleVersion}`.toLowerCase();
  if (/food|식품|食品|additive/.test(haystack)) return "food";
  if (/customs|통관|hs|ccc/.test(haystack)) return "customs";
  return "cosmetic";
}

function productStatus(status: ReviewStatus) {
  if (status === "pass") return "approved";
  if (status === "fail") return "needs_action";
  return "in_review";
}

function reviewVerdict(status: ReviewStatus) {
  return status === "needs_info" ? "needs_review" : status;
}

function reviewSummary(result: ReviewResult) {
  return [
    `score ${result.score}`,
    `fail ${result.summary.fail}`,
    `needs_info ${result.summary.needsInfo}`,
    `warn ${result.summary.warn}`,
    `pass ${result.summary.pass}`
  ].join(" · ");
}

function findingType(finding: Finding) {
  const area = String(finding.area);
  if (/성분|알레르겐|영양/.test(area)) return "ingredient";
  if (/라벨|표시|효능/.test(area)) return "labeling";
  if (/PIF|자료|서류/.test(area)) return "pif";
  return "manual";
}

function findingSeverity(finding: Finding) {
  const value = `${finding.severity} ${finding.status}`.toLowerCase();
  if (/critical|긴급/.test(value)) return "critical";
  if (/high|높음/.test(value) || finding.status === "fail") return "high";
  if (/medium|중간/.test(value) || finding.status === "needs_info") return "medium";
  if (/low|낮음/.test(value) || finding.status === "warn") return "low";
  return "info";
}

function findingStatus(finding: Finding) {
  return finding.status === "pass" ? "resolved" : "open";
}

function toSavedReview(row: ReviewRow): SavedReview | null {
  const payload = row.source_version_summary;
  if (!payload?.input || !payload.result) return null;

  return {
    id: payload.app_review_id ?? row.id,
    input: payload.input,
    result: payload.result
  };
}

export async function listStoredReviews(limit = 20): Promise<ReviewStoreListResult> {
  const sql = getClient();
  if (!sql) return { storage: "disabled", reviews: [] };

  const rows = await sql<ReviewRow[]>`
    select id, source_version_summary
    from public.reviews
    where source_version_summary ? 'app_review_id'
    order by created_at desc
    limit ${Math.min(Math.max(Math.floor(limit), 1), 50)}
  `;

  return {
    storage: "database",
    reviews: rows.map(toSavedReview).filter((review): review is SavedReview => Boolean(review))
  };
}

export async function saveStoredReview(review: SavedReview): Promise<ReviewStoreSaveResult> {
  const sql = getClient();
  if (!sql) return { storage: "disabled", review: null };

  await sql.begin(async (tx) => {
    const category = productCategory(review.input, review.result);
    const metadata = {
      app_review_id: review.id,
      origin: review.input.origin,
      manufacturer: review.input.manufacturer,
      hsCode: review.input.hsCode,
      incoterms: review.input.incoterms,
      shipmentPurpose: review.input.shipmentPurpose,
      invoiceValue: review.input.invoiceValue,
      generatedAt: review.result.generatedAt
    };

    const [product] = await tx<{ id: string }[]>`
      insert into public.products (
        name,
        category,
        market,
        status,
        ingredients_text,
        ingredients_json,
        label_text,
        metadata,
        submitted_at
      )
      values (
        ${review.input.productName.trim() || "이름 없는 제품"},
        ${category},
        ${"TW"},
        ${productStatus(review.result.status)},
        ${review.input.ingredientsText},
        ${sql.json(review.result.parsedIngredients ?? [])}::jsonb,
        ${review.input.labelText},
        ${sql.json(metadata)}::jsonb,
        now()
      )
      returning id
    `;

    const resultPayload = {
      app_review_id: review.id,
      input: review.input,
      result: review.result,
      ruleVersion: review.result.ruleVersion
    };

    const [storedReview] = await tx<{ id: string }[]>`
      insert into public.reviews (
        product_id,
        status,
        verdict,
        risk_score,
        summary,
        source_version_summary,
        started_at,
        completed_at
      )
      values (
        ${product.id},
        ${"completed"},
        ${reviewVerdict(review.result.status)},
        ${review.result.score},
        ${reviewSummary(review.result)},
        ${sql.json(resultPayload)}::jsonb,
        ${review.result.generatedAt},
        ${review.result.generatedAt}
      )
      returning id
    `;

    for (const finding of review.result.findings) {
      await tx`
        insert into public.findings (
          product_id,
          review_id,
          finding_type,
          severity,
          status,
          matched_text,
          rule_summary,
          evidence
        )
        values (
          ${product.id},
          ${storedReview.id},
          ${findingType(finding)},
          ${findingSeverity(finding)},
          ${findingStatus(finding)},
          ${finding.evidence ?? finding.title},
          ${finding.title},
          ${sql.json(finding)}::jsonb
        )
      `;
    }
  });

  return { storage: "database", review };
}
