import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(repoRoot, "src", "lib", "platform-ops-store.ts"), "utf8");
const adminHome = readFileSync(join(repoRoot, "src", "app", "admin", "page.tsx"), "utf8");
const failures = [];
const require = createRequire(import.meta.url);

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

function loadPlatformOpsStore() {
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: "platform-ops-store.ts"
  }).outputText;
  const module = { exports: {} };
  const sandbox = {
    exports: module.exports,
    module,
    require,
    process,
    console
  };
  vm.runInNewContext(transpiled, sandbox, { filename: "platform-ops-store.cjs" });
  return module.exports;
}

function requireBadge(badges, href, expected) {
  const badge = badges[href];
  if (!badge) {
    fail(`${href}: expected nav badge`);
    return;
  }
  for (const [field, value] of Object.entries(expected)) {
    if (badge[field] !== value) fail(`${href}: expected ${field}=${value}, got ${badge[field]}`);
  }
}

requireIncludes(source, "export function getPlatformOpsPreviewSnapshot", "platform ops preview");
requireIncludes(source, "export function buildPlatformOpsNavBadges", "platform ops nav badges");
requireIncludes(source, "export function buildPlatformOpsActionQueue", "platform ops action queue");
requireIncludes(source, "getPlatformOpsPreviewSnapshot(\"disabled\"", "disabled DB fallback");
requireIncludes(source, "getPlatformOpsPreviewSnapshot(\"preview_disabled\"", "preview-disabled DB fallback");
requireIncludes(source, "getPlatformOpsPreviewSnapshot(\"error\"", "DB error fallback");
requireIncludes(adminHome, "visibleOpsCount", "admin dashboard preview metric");
requireIncludes(adminHome, "buildPlatformOpsActionQueue", "admin dashboard action queue");
requireIncludes(adminHome, "admin-queue-link", "admin dashboard linked action queue");
requireIncludes(source, "[\"/admin/reviews\", nonzeroBadge", "review nav badge");
requireIncludes(source, "\"/admin/experts\"", "expert nav badge");
requireIncludes(source, "[\"/admin/payments\", nonzeroBadge", "payment nav badge");
requireIncludes(source, "[\"/admin/logistics\", nonzeroBadge", "logistics nav badge");
requireIncludes(source, "[\"/admin/settings\", nonzeroBadge", "settings nav badge");

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

const { buildPlatformOpsActionQueue, buildPlatformOpsNavBadges, getPlatformOpsPreviewSnapshot } = loadPlatformOpsStore();
const previewSnapshot = getPlatformOpsPreviewSnapshot("disabled", ["preview warning"]);
const previewActionQueue = buildPlatformOpsActionQueue(previewSnapshot);
if (previewActionQueue.length !== 6) {
  fail(`preview action queue: expected 6 items, got ${previewActionQueue.length}`);
}
for (const href of ["/admin/experts", "/admin/payments", "/admin/logistics", "/admin/settings"]) {
  if (!previewActionQueue.some((item) => item.href === href)) fail(`preview action queue: missing ${href}`);
}
if (!previewActionQueue.some((item) => item.tone === "blocked")) {
  fail("preview action queue: expected at least one blocked item");
}
if (!previewActionQueue.some((item) => item.label === "통관 보류")) {
  fail("preview action queue: expected customs hold tracking item");
}
const previewBadges = buildPlatformOpsNavBadges(previewSnapshot);
requireBadge(previewBadges, "/admin", { count: 13, tone: "danger", label: "13개 운영 대기" });
requireBadge(previewBadges, "/admin/reviews", { count: 4, tone: "warn", label: "4개 리뷰 후속" });
requireBadge(previewBadges, "/admin/experts", { count: 3, tone: "danger", label: "3개 전문가 매칭 확인" });
requireBadge(previewBadges, "/admin/payments", { count: 2, tone: "danger", label: "2개 결제 또는 상담방 확인" });
requireBadge(previewBadges, "/admin/logistics", { count: 3, tone: "danger", label: "3개 물류 확인" });
requireBadge(previewBadges, "/admin/settings", { count: 1, tone: "info", label: "1개 운영 설정 확인" });

const quietSnapshot = {
  ...previewSnapshot,
  storage: "database",
  warnings: [],
  reviewFlows: [],
  expertCases: [],
  payments: [],
  shipmentRequests: [],
  activeShipments: []
};
const quietBadges = buildPlatformOpsNavBadges(quietSnapshot);
if (Object.keys(quietBadges).length !== 0) {
  fail(`quiet snapshot: expected zero nav badges, got ${Object.keys(quietBadges).join(", ")}`);
}

const largeBadgeSnapshot = {
  ...previewSnapshot,
  reviewFlows: Array.from({ length: 120 }, (_, index) => ({
    title: `Review ${index}`,
    product: "Bulk test",
    route: "TW",
    status: "open",
    next: "next",
    handoff: "handoff"
  })),
  expertCases: [],
  payments: [],
  shipmentRequests: [],
  activeShipments: [],
  warnings: []
};
const largeBadges = buildPlatformOpsNavBadges(largeBadgeSnapshot);
requireBadge(largeBadges, "/admin/reviews", { count: 120, tone: "warn", label: "120개 리뷰 후속" });

if (failures.length) {
  console.error("Admin preview data audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Admin preview data audit passed: linked operations snapshot is available without Supabase secrets.");
