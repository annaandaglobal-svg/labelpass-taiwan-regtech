import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(repoRoot, "src", "lib", "platform-ops-store.ts"), "utf8");
const adminHome = readFileSync(join(repoRoot, "src", "app", "admin", "page.tsx"), "utf8");
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) fail(`${label}: missing ${needle}`);
}

function arrayBlock(name) {
  const match = source.match(new RegExp(`const ${name}:[\\s\\S]*?= \\[([\\s\\S]*?)\\];`));
  return match?.[1] ?? "";
}

function countRows(name) {
  const block = arrayBlock(name);
  if (!block) return 0;
  return (block.match(/^\s*\{/gm) ?? []).length;
}

function requireMinRows(name, min) {
  const count = countRows(name);
  if (count < min) fail(`${name}: expected at least ${min} preview rows, found ${count}`);
}

function requireLinkedCase(product, areas) {
  for (const area of areas) {
    const block = arrayBlock(area);
    if (!block.includes(product)) fail(`${area}: expected linked product "${product}"`);
  }
}

requireIncludes(source, "export function getPlatformOpsPreviewSnapshot", "platform ops preview");
requireIncludes(source, "getPlatformOpsPreviewSnapshot(\"disabled\"", "disabled DB fallback");
requireIncludes(source, "getPlatformOpsPreviewSnapshot(\"preview_disabled\"", "preview-disabled DB fallback");
requireIncludes(source, "getPlatformOpsPreviewSnapshot(\"error\"", "DB error fallback");
requireIncludes(adminHome, "visibleOpsCount", "admin dashboard preview metric");

for (const name of [
  "previewCompanyRows",
  "previewRoleRows",
  "previewReviewFlows",
  "previewExpertProfiles",
  "previewExpertCases",
  "previewPayments",
  "previewLogisticsCompanies",
  "previewShipmentRequests",
  "previewActiveShipments",
  "previewShipmentEvents",
  "previewSettings"
]) {
  requireIncludes(source, name, "platform ops preview arrays");
}

requireMinRows("previewCompanyRows", 3);
requireMinRows("previewRoleRows", 5);
requireMinRows("previewReviewFlows", 4);
requireMinRows("previewExpertProfiles", 3);
requireMinRows("previewExpertCases", 6);
requireMinRows("previewPayments", 4);
requireMinRows("previewLogisticsCompanies", 3);
requireMinRows("previewShipmentRequests", 3);
requireMinRows("previewActiveShipments", 3);
requireMinRows("previewShipmentEvents", 4);
requireMinRows("previewSettings", 3);

requireLinkedCase("Cica Barrier Cream", ["previewReviewFlows", "previewExpertCases"]);
requireLinkedCase("Tinted Sunscreen SPF50", ["previewReviewFlows", "previewExpertCases", "previewPayments"]);
requireLinkedCase("Soy Corn Protein Bar", ["previewReviewFlows", "previewExpertCases", "previewPayments"]);
requireLinkedCase("Shelf-stable Tea Beverage", ["previewReviewFlows"]);
requireLinkedCase("Shelf-stable tea beverage", ["previewShipmentRequests", "previewActiveShipments"]);

for (const [label, expected] of [
  ["organizations", 3],
  ["reviews", 4],
  ["expertMatches", 6],
  ["activeShipments", 3],
  ["customsHolds", 1],
  ["payments", 4]
]) {
  requireIncludes(source, `${label}: ${expected}`, "preview counts");
}

if (source.includes("return emptySnapshot")) {
  fail("getPlatformOpsSnapshot must not return an empty admin snapshot for non-live states");
}

if (failures.length) {
  console.error("Admin preview data audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Admin preview data audit passed: linked operations snapshot is available without Supabase secrets.");
