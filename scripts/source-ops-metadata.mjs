import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = process.cwd();
const sourceRegistryPath = path.join(root, "data", "knowledge", "source-registry.json");
const outputPath = path.join(root, "data", "knowledge", "source-ops-metadata.json");

const ownerByDomain = {
  chemical_labeling: "chemical-ghs-labeling",
  cosmetics: "tw-cosmetics-labeling-pif",
  cosmetics_import: "tw-cosmetics-import",
  customs: "customs-origin-classification",
  export_control: "export-control",
  food_additives: "tw-food-additives",
  food_contact_materials: "tw-food-contact-materials",
  food_import: "tw-food-import",
  food_labeling: "tw-food-labeling",
  food_safety: "tw-food-safety",
  general_labeling: "consumer-goods-labeling",
  health_food: "tw-health-food",
  market_guide: "market-guide",
  origin_labeling: "origin-labeling",
  product_certification: "product-certification",
  special_dietary_food: "tw-special-dietary-food",
  terminology: "terminology-alias-ops",
  trade: "trade-import-export-controls",
  trade_controls: "trade-import-export-controls"
};

function compareStable(left, right) {
  const a = String(left ?? "");
  const b = String(right ?? "");
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function lowerSourceText(source) {
  return [source.id, source.title, source.url, source.authority, ...(source.extra_urls ?? [])]
    .join(" ")
    .toLowerCase();
}

function inferLanguages(source) {
  if (source.languages?.length) return unique(source.languages).sort(compareStable);
  if (source.language) return [source.language];

  const text = lowerSourceText(source);
  const languages = [];

  if (
    /\/eng\b|\/english\b|english\.|eng\/|lang=en|language=e|ecfr|ec\.europa\.eu|eur-lex|osha|itc|fda\.gov\/cosmetics|customs\.go\.jp\/english|mhlw\.go\.jp\/content/i.test(
      text
    )
  ) {
    languages.push("en");
  }
  if (
    /\/tc\b|\/tc\/|tc\/|language=c|law\.moj\.gov\.tw\/lawclass|data\.gov\.tw|data\.fda\.gov\.tw|fda\.gov\.tw\/tc|qms\.fda\.gov\.tw|cos\.fda\.gov\.tw|fadenbook\.fda\.gov\.tw/i.test(
      text
    )
  ) {
    languages.push("zh-Hant");
  }
  if (source.jurisdiction === "CN" && !text.includes("english")) languages.push("zh-Hans");
  if (source.jurisdiction === "JP" && !text.includes("english")) languages.push("ja");
  if (source.jurisdiction === "KR" && !text.includes("/eng/")) languages.push("ko");

  if (!languages.length && source.jurisdiction === "TW") languages.push("zh-Hant");
  if (!languages.length) languages.push("en");

  return unique(languages).sort(compareStable);
}

function inferSelectorStrategy(source) {
  if (source.selector_strategy) return source.selector_strategy;
  const format = String(source.format ?? "").toLowerCase();
  const type = String(source.source_type ?? "").toLowerCase();
  const url = String(source.url ?? "").toLowerCase();

  if (format === "browser_capture" || source.browser_capture_path || source.screenshot_path) {
    return "browser-visible-text-capture";
  }
  if (format === "manual" || source.manual_extract) return "manual-operational-extract";
  if (format === "pdf" || url.includes(".pdf") || url.includes("getfile.ashx")) return "pdf-text-extract";
  if (format === "json" || source.extra_urls?.some((extraUrl) => String(extraUrl).includes("/opendata/export/"))) {
    return "open-data-json";
  }
  if (source.ecfr) return "ecfr-xml-api";
  if (url.includes("law.moj.gov.tw")) return "law-database-article-extract";
  if (type.includes("index") || type.includes("hub") || type.includes("portal")) return "official-index-listing-extract";
  if (type.includes("database") || url.includes("query") || url.includes("search")) return "official-database-landing-capture";
  return "official-html-main-content";
}

function inferDateStrategy(source) {
  if (source.effective_date || source.amended_at || source.version_date) return "explicit-registry-date";

  const format = String(source.format ?? "").toLowerCase();
  const type = String(source.source_type ?? "").toLowerCase();
  const url = String(source.url ?? "").toLowerCase();

  if (source.ecfr) return "ecfr-latest-issue-date";
  if (url.includes("law.moj.gov.tw")) return "moj-law-amended-date";
  if (url.includes("data.gov.tw") || source.extra_urls?.some((extraUrl) => String(extraUrl).includes("/opendata/export/"))) {
    return "open-data-dataset-update-timestamp";
  }
  if (url.includes("fda.gov.tw") && (type.includes("notice") || url.includes("newscontent"))) {
    return "tfda-update-announced-date";
  }
  if (url.includes("fda.gov.tw") && (type.includes("index") || type.includes("hub"))) {
    return "tfda-index-item-date-scan";
  }
  if (format === "pdf" || url.includes(".pdf") || url.includes("getfile.ashx")) {
    return "pdf-frontmatter-or-notice-date";
  }
  if (type.includes("index") || type.includes("hub")) return "index-item-publication-date-scan";
  return "page-update-or-publication-date";
}

function inferRefreshStrategy(source) {
  const days = Number(source.cache_days ?? 14);
  if (source.priority === "high" && days <= 7) return "weekly-high-priority-watch";
  if (source.priority === "high" && days <= 14) return "biweekly-high-priority-watch";
  if (source.priority === "high") return "monthly-high-priority-watch";
  if (days <= 14) return "biweekly-watch";
  if (days <= 30) return "monthly-watch";
  return "quarterly-or-stable-reference-watch";
}

function inferEvidencePolicy(source) {
  const selectorStrategy = inferSelectorStrategy(source);
  if (selectorStrategy === "browser-visible-text-capture") {
    return source.screenshot_path ? "browser-text-and-screenshot" : "browser-visible-text";
  }
  if (selectorStrategy === "manual-operational-extract") return "manual-extract-with-live-url-verification";
  if (selectorStrategy === "open-data-json") return "structured-open-data-cache";
  if (selectorStrategy === "pdf-text-extract") return "pdf-text-cache";
  return "official-page-text-cache";
}

export function deriveSourceOpsMetadata(source) {
  return {
    id: source.id,
    languages: inferLanguages(source),
    review_owner: source.review_owner ?? source.owner ?? ownerByDomain[source.domain] ?? "knowledge-ops",
    selector_strategy: inferSelectorStrategy(source),
    date_strategy: inferDateStrategy(source),
    refresh_strategy: source.refresh_strategy ?? inferRefreshStrategy(source),
    evidence_policy: source.evidence_policy ?? inferEvidencePolicy(source)
  };
}

export function buildSourceOpsMetadata(registry) {
  const sources = registry.sources ?? [];
  return {
    schema_version: 1,
    generated_from: {
      source_registry_version: registry.version,
      source_count: sources.length
    },
    sources: sources.map(deriveSourceOpsMetadata)
  };
}

async function main() {
  const registry = JSON.parse(await readFile(sourceRegistryPath, "utf8"));
  const metadata = buildSourceOpsMetadata(registry);
  await writeFile(outputPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        output: path.relative(root, outputPath),
        sources: metadata.sources.length,
        source_registry_version: metadata.generated_from.source_registry_version
      },
      null,
      2
    )
  );
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  await main();
}
