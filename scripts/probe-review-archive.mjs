import postgres from "postgres";

const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const dryRun = process.env.REVIEW_ARCHIVE_PROBE_DRY_RUN === "1";
const rollbackMessage = "LABELPASS_REVIEW_ARCHIVE_PROBE_ROLLBACK";
const probeId = `review-archive-probe-${Date.now()}`;
const generatedAt = new Date().toISOString();

if (!databaseUrl && !dryRun) {
  throw new Error("Set SUPABASE_DB_URL, POSTGRES_URL, or DATABASE_URL before probing review archive writes.");
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

const probePayload = {
  app_review_id: probeId,
  input: {
    productName: "LabelPass Review Archive Probe",
    productType: "leave-on cosmetic cream",
    ingredientsText: "Aqua, Hydroquinone 2%, Retinoic Acid, Fragrance",
    labelText: "Whitening acne care cream. Taiwan market.",
    origin: "KR",
    manufacturer: "LabelPass preflight",
    hsCode: "3304.99",
    incoterms: "DAP Taipei",
    shipmentPurpose: "preflight",
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
        id: "probe-finding",
        status: "fail",
        area: "ingredient",
        title: "Review archive write probe",
        severity: "high",
        why: "Validates products, reviews, and findings inserts in one rollback transaction.",
        fix: ["Keep SUPABASE_DB_URL server-only and verify RLS posture before public client writes."],
        source: "LabelPass preflight",
        sourceUrl: "https://labelpass-taiwan-regtech.vercel.app",
        evidence: "rollback transaction probe"
      }
    ],
    actionPlan: { items: [] },
    summary: { fail: 1, warn: 0, pass: 0, needsInfo: 0 }
  },
  ruleVersion: "preflight"
};

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: true,
        connection: connectionSummary(databaseUrl),
        probeId,
        tables: ["products", "reviews", "findings"]
      },
      null,
      2
    )
  );
  process.exit(0);
}

const sql = postgres(databaseUrl, {
  max: 1,
  ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") ? false : "require",
  idle_timeout: 5,
  connect_timeout: 20,
  prepare: false
});

let inserted = {
  productId: null,
  reviewId: null,
  findingId: null
};
let rollbackConfirmed = false;

try {
  try {
    await sql.begin(async (tx) => {
      const [product] = await tx`
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
          ${probePayload.input.productName},
          ${"cosmetic"},
          ${"TW"},
          ${"needs_action"},
          ${probePayload.input.ingredientsText},
          ${sql.json([])}::jsonb,
          ${probePayload.input.labelText},
          ${sql.json({
            app_review_id: probeId,
            origin: probePayload.input.origin,
            manufacturer: probePayload.input.manufacturer,
            hsCode: probePayload.input.hsCode,
            generatedAt
          })}::jsonb,
          now()
        )
        returning id
      `;
      inserted.productId = product.id;

      const [review] = await tx`
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
          ${"fail"},
          ${probePayload.result.score},
          ${"score 25 · fail 1 · needs_info 0 · warn 0 · pass 0"},
          ${sql.json(probePayload)}::jsonb,
          ${generatedAt},
          ${generatedAt}
        )
        returning id
      `;
      inserted.reviewId = review.id;

      const [finding] = await tx`
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
          ${review.id},
          ${"ingredient"},
          ${"high"},
          ${"open"},
          ${"Hydroquinone 2%"},
          ${"Review archive write probe"},
          ${sql.json(probePayload.result.findings[0])}::jsonb
        )
        returning id
      `;
      inserted.findingId = finding.id;

      throw new Error(rollbackMessage);
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== rollbackMessage) {
      throw error;
    }
    rollbackConfirmed = true;
  }

  const remainingRows = await sql`
    select count(*)::integer as count
    from public.reviews
    where source_version_summary->>'app_review_id' = ${probeId}
  `;
  const remainingReviewRows = remainingRows[0]?.count ?? 0;

  const report = {
    ok: rollbackConfirmed && remainingReviewRows === 0,
    connection: connectionSummary(databaseUrl),
    probeId,
    inserted,
    rollbackConfirmed,
    remainingReviewRows
  };

  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exit(1);
  }
} finally {
  await sql.end({ timeout: 5 });
}
