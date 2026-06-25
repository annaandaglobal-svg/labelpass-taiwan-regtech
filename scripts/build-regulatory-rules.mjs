import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const rawDir = path.join(root, "data", "tfda");
const outDir = path.join(root, "data", "rules");

const field = {
  id: "\u7de8\u865f",
  ingredientName: "\u6210\u5206\u540d",
  prohibitedName: "\u6210\u5206\u540d\u7a31",
  inciName: "INCI\u540d",
  casNoDot: "CAS_NO.",
  casNo: "CAS_No.",
  casNumber: "CAS_Number",
  productScope: "\u7522\u54c1\u985e\u578b\uff0f\u4f7f\u7528\u7bc4\u570d",
  limitText: "\u9650\u91cf\u6a19\u6e96",
  restrictionText: "\u9650\u5236\u898f\u5b9a",
  cautionText: "\u61c9\u520a\u8f09\u4e4b\u6ce8\u610f\u4e8b\u9805",
  notes: "\u5099\u8a3b",
  colorantName: "Color_Index_Number\uff0f\u6210\u5206\u540d",
  alias: "\u5225\u540d",
  useScope: "\u4f7f\u7528\u7bc4\u570d"
};

const datasets = [
  {
    file: "cosmetic-prohibited-ingredients.json",
    category: "prohibited",
    infoId: 203,
    sourceTitle: "TFDA cosmetics prohibited ingredients",
    sourceUrl: "https://data.gov.tw/dataset/173684"
  },
  {
    file: "cosmetic-restricted-ingredients.json",
    category: "restricted",
    infoId: 199,
    sourceTitle: "TFDA cosmetics restricted ingredients",
    sourceUrl: "https://data.gov.tw/dataset/173685"
  },
  {
    file: "cosmetic-colorants.json",
    category: "colorant",
    infoId: 200,
    sourceTitle: "TFDA cosmetics colorants",
    sourceUrl: "https://data.gov.tw/dataset/173686"
  },
  {
    file: "cosmetic-preservatives.json",
    category: "preservative",
    infoId: 201,
    sourceTitle: "TFDA cosmetics preservatives",
    sourceUrl: "https://data.gov.tw/dataset/173682"
  },
  {
    file: "cosmetic-sunscreens.json",
    category: "sunscreen",
    infoId: 202,
    sourceTitle: "TFDA cosmetics sunscreen ingredients",
    sourceUrl: "https://data.gov.tw/dataset/173683"
  }
];

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function splitNames(value) {
  return clean(value)
    .split(/\s*(?:\/|;|\r|\n)\s*/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function casNumbers(value) {
  return Array.from(clean(value).matchAll(/\b\d{2,7}-\d{2}-\d\b/g)).map((match) => match[0]);
}

function colorIndexes(value) {
  return Array.from(clean(value).matchAll(/\bCI\s*\d{5}\b/gi)).map((match) => match[0].replace(/\s+/g, " ").toUpperCase());
}

function percentValues(value) {
  return Array.from(clean(value).matchAll(/(\d+(?:\.\d+)?)\s*%/g)).map((match) => Number(match[1]));
}

function uniq(values) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function hashRecord(record) {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex");
}

function normalizeRecord(record, dataset) {
  const sourceRecordId = clean(record[field.id]);
  const ingredientName =
    dataset.category === "prohibited"
      ? clean(record[field.prohibitedName])
      : dataset.category === "colorant"
        ? clean(record[field.colorantName])
        : clean(record[field.ingredientName]);

  const inciNames = splitNames(record[field.inciName]);
  const cas = uniq([
    ...casNumbers(record[field.casNoDot]),
    ...casNumbers(record[field.casNo]),
    ...casNumbers(record[field.casNumber])
  ]);
  const colorIndexNumbers = uniq(colorIndexes(`${record[field.colorantName] ?? ""} ${record[field.alias] ?? ""}`));
  const productScope = clean(record[field.productScope] ?? record[field.useScope]);
  const limitText = clean(record[field.limitText]);
  const restrictionText = clean(record[field.restrictionText]);
  const cautionText = clean(record[field.cautionText]);
  const notes = clean(record[field.notes]);
  const limitPercentValues = percentValues(limitText);

  const aliases = uniq([
    ingredientName,
    ...splitNames(ingredientName),
    ...inciNames,
    ...splitNames(record[field.alias]),
    ...cas,
    ...colorIndexNumbers
  ]);

  return {
    id: `tw-cos-${dataset.infoId}-${sourceRecordId || hashRecord(record).slice(0, 8)}`,
    jurisdiction: "TW",
    category: dataset.category,
    source_info_id: dataset.infoId,
    source_title: dataset.sourceTitle,
    source_url: dataset.sourceUrl,
    export_url: `https://data.fda.gov.tw/data/opendata/export/${dataset.infoId}/json`,
    source_record_id: sourceRecordId,
    ingredient_name: ingredientName,
    inci_names: inciNames,
    cas_numbers: cas,
    color_index_numbers: colorIndexNumbers,
    aliases,
    product_scope: productScope,
    limit_text: limitText,
    limit_percent_values: limitPercentValues,
    max_limit_percent: limitPercentValues.length ? Math.max(...limitPercentValues) : null,
    restriction_text: restrictionText,
    caution_text: cautionText,
    notes,
    raw_hash: hashRecord(record),
    raw: record
  };
}

await mkdir(outDir, { recursive: true });

const allRules = [];
const summaries = [];

for (const dataset of datasets) {
  const filePath = path.join(rawDir, dataset.file);
  const raw = JSON.parse(await readFile(filePath, "utf8"));
  const rules = raw.map((record) => normalizeRecord(record, dataset));
  allRules.push(...rules);
  summaries.push({
    info_id: dataset.infoId,
    category: dataset.category,
    source_title: dataset.sourceTitle,
    source_url: dataset.sourceUrl,
    rows: rules.length
  });
}

const payload = {
  generated_at: new Date().toISOString(),
  jurisdiction: "TW",
  product_domain: "cosmetics",
  rule_count: allRules.length,
  datasets: summaries,
  rules: allRules
};

await writeFile(path.join(outDir, "tw-cosmetics-rules.json"), JSON.stringify(payload, null, 2), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify({ generated_at: payload.generated_at, rule_count: payload.rule_count, datasets: summaries }, null, 2), "utf8");
console.log(JSON.stringify({ generated_at: payload.generated_at, rule_count: payload.rule_count, datasets: summaries }, null, 2));
