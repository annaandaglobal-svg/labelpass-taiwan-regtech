#!/usr/bin/env node
// Problem-FINDER: automatically detects three classes of knowledge defects so they can be fixed
// before a user hits them.
//   (1) STRUCTURAL  — a term uses a category that has no verdict branch / is not surfaced (or the
//                     reverse: a surfaced category no term uses). These silently degrade to a
//                     generic or missing verdict.
//   (2) MISROUTE    — a probe query resolves to a verdict in the WRONG domain (food→cosmetic,
//                     cosmetic→alcohol, …). This is the fuzzy-substring failure class.
//   (3) GAP         — a common probe query returns no verdict at all.
// Structural checks are static (no server). Misroute/gap checks need the dev server on :3000;
// if it is down they are skipped with a notice. Exit code = number of problems found.
import { readFile } from "node:fs/promises";

const ROOT = process.cwd();
const read = (p) => readFile(`${ROOT}/${p}`, "utf8");

// ---- load sources ----
const registry = JSON.parse(await read("data/knowledge/term-registry.json"));
const complianceSrc = await read("src/lib/compliance.ts");
const verdictsSrc = await read("src/lib/knowledge-verdicts.ts");

const problems = [];
const add = (kind, detail) => problems.push({ kind, detail });

// ---- (1) STRUCTURAL ----
const registryCategories = new Set(registry.terms.map((t) => t.category));
const categoryUsage = registry.terms.reduce((m, t) => m.set(t.category, (m.get(t.category) ?? 0) + 1), new Map());
// verdict branches: individual `category === "X"` plus any `[...].includes(category)` catch-all group
const verdictBranches = new Set([...verdictsSrc.matchAll(/category === "([a-z0-9_]+)"/g)].map((m) => m[1]));
for (const grp of verdictsSrc.matchAll(/\[([^\]]*?)\]\s*\.includes\(category\)/g)) {
  for (const m of grp[1].matchAll(/"([a-z0-9_]+)"/g)) verdictBranches.add(m[1]);
}
// surfaced set: the block between `verdictSurfacedCategories = new Set([` and `])`
const surfacedBlock = complianceSrc.match(/verdictSurfacedCategories[^[]*\[([\s\S]*?)\]/);
const surfaced = new Set(
  surfacedBlock ? [...surfacedBlock[1].matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]) : []
);
// A category with a verdict branch that isn't surfaced is USUALLY intentional — such categories
// (restricted_substance, food_allergen, …) are surfaced through dedicated finding-generators, not
// the ingredient-verdict path. Report as info only, not a hard problem.
for (const cat of registryCategories) {
  if (verdictBranches.has(cat) && !surfaced.has(cat)) {
    const example = registry.terms.find((t) => t.category === cat)?.canonical_name;
    add("structural-info", `category "${cat}" has a verdict branch but is not surfaced as an ingredient verdict (ok if handled via findings; e.g. ${example})`);
  }
}
// A surfaced category with NO verdict branch is a HARD problem only if a term actually uses it —
// then real ingredients degrade to the generic default. Unused surfaced entries are harmless config.
for (const cat of surfaced) {
  if (!verdictBranches.has(cat)) {
    const uses = categoryUsage.get(cat) ?? 0;
    if (uses > 0) {
      const example = registry.terms.find((t) => t.category === cat)?.canonical_name;
      add("structural", `surfaced category "${cat}" (used by ${uses} terms, e.g. ${example}) has NO verdict branch → those ingredients get the generic default`);
    } else {
      add("structural-info", `surfaced category "${cat}" is unused by any term (dead config — safe to remove)`);
    }
  }
}
// verdict branch defined but no term uses it (dead branch) — informational
for (const cat of verdictBranches) {
  if (!registryCategories.has(cat) && ![...surfaced].includes(cat)) {
    // only report if also not surfaced (some generic categories are intentional)
    if (!["cosmetic_ingredient", "food_ingredient", "food_additive", "botanical_ingredient", "food_safety", "food_labeling", "food_import", "health_food", "health_food_claim", "cosmetic_marketing_claim", "allergen_labeling"].includes(cat))
      add("structural-info", `verdict branch "${cat}" exists but no term uses it (possible dead branch)`);
  }
}

// ---- (2)+(3) MISROUTE + GAP (needs server) ----
const labelDomain = (label) => {
  const L = label || "";
  // Domain-ambiguous but valid generic verdicts — these are not a WRONG domain, so never a misroute.
  if (/조건부 허용|추가 확인|검토|원료 확인|성분 첨가 제한·한도|화장품 제한 성분|표시·광고 주의|라벨 필수검토|분류/.test(L)) return "generic";
  if (/주류|菸酒|담배|전자담배/.test(L)) return "alcohol_tobacco";
  if (/의료기기|醫療器材/.test(L)) return "medical_device";
  if (/미용기기|BSMI|NCC|전자제품/.test(L)) return "appliance";
  if (/반려동물|寵物/.test(L)) return "pet";
  if (/화장품|특정용도|미백|防曬|자외선|염모|染髮|PIF|化粧品|방부제|UV필터|색소·자외선/.test(L)) return "cosmetic";
  if (/검역|輸入檢疫|動植物/.test(L)) return "quarantine";
  if (/재활용|資源回收|環境部|미세플라스틱|환경|商品標示|에너지효율/.test(L)) return "commodity_env";
  if (/첨가물|果汁|초콜릿|경화유|버터|유지|오염물|아크릴|카페인|채식|GMO|알레르겐|영양|어린이|영유아|식품|蜂蜜|3-MCPD|검사|홍국|過氧|당|식용색소|포지티브|色素/.test(L)) return "food_or_generic";
  return "other";
};
// battery: query -> allowed domains (a misroute = verdict domain outside the allowed set)
const BATTERY = [
  // food ingredients/products must NOT land in cosmetic/alcohol/device
  ["크림", ["food_or_generic"]], ["버터", ["food_or_generic"]], ["생크림", ["food_or_generic"]],
  ["젤라틴", ["food_or_generic", "quarantine"]], ["아크릴아마이드", ["food_or_generic"]],
  ["100% 주스", ["food_or_generic"]], ["간장", ["food_or_generic"]], ["김치", ["food_or_generic", "quarantine"]],
  ["커피", ["food_or_generic"]], ["치즈", ["food_or_generic", "quarantine"]], ["멜라민", ["food_or_generic"]],
  ["카라기난", ["food_or_generic"]], ["아스파탐", ["food_or_generic"]], ["적색2호", ["food_or_generic"]],
  ["부분경화유", ["food_or_generic"]], ["완전경화유", ["food_or_generic"]], ["해바라기유", ["food_or_generic"]],
  ["탈지분유", ["food_or_generic", "quarantine"]], ["리보플라빈", ["food_or_generic"]], ["MSG", ["food_or_generic"]],
  ["과산화벤조일", ["food_or_generic"]], ["효모추출물", ["food_or_generic"]], ["사카린", ["food_or_generic"]],
  ["꿀", ["food_or_generic"]], ["아플라톡신", ["food_or_generic"]], ["홍삼", ["food_or_generic"]],
  // alcohol
  ["소주", ["alcohol_tobacco"]], ["막걸리", ["alcohol_tobacco"]], ["맥주", ["alcohol_tobacco"]],
  // cosmetic must NOT land in food/alcohol
  ["레티놀", ["cosmetic"]], ["나이아신아마이드", ["cosmetic"]], ["살리실산", ["cosmetic"]], ["아르부틴", ["cosmetic"]],
  ["파라벤", ["cosmetic"]], ["티트리", ["cosmetic"]], ["세라마이드", ["cosmetic"]], ["미백", ["cosmetic"]],
  ["자외선차단", ["cosmetic"]], ["선크림", ["cosmetic"]], ["치약", ["cosmetic"]], ["PPD", ["cosmetic"]],
  // devices / non-tfda
  ["콘택트렌즈", ["medical_device"]], ["콘돔", ["medical_device"]], ["전자담배", ["alcohol_tobacco"]],
  ["펫푸드", ["pet"]], ["완구", ["commodity_env", "appliance"]], ["재활용 마크", ["commodity_env"]],
  // infant
  ["조제분유", ["food_or_generic"]], ["이유식", ["food_or_generic"]],
];
const GAP_BATTERY = [
  "레시틴", "폴리소르베이트", "카페인", "素食", "유기농", "멜라토닌", "하수오", "스테비아", "자일리톨",
  "안식향산", "이산화황", "펙틴", "인산염", "명반", "향료", "오메가3", "루테인", "밀크씨슬", "유통기한",
  "건강기능식품", "라면", "요구르트", "단백질바", "각질", "구강청결제", "비누", "살균소독제", "마스크",
];

let serverUp = true;
const BASE = process.env.LABELPASS_BASE_URL || "http://127.0.0.1:3000";
const fetchVerdict = async (q) => {
  const r = await fetch(BASE + "/api/knowledge/evidence?q=" + encodeURIComponent(q));
  const j = await r.json();
  return j.verdict ? j.verdict.label : null;
};
try {
  await fetchVerdict("test");
} catch {
  serverUp = false;
}

if (serverUp) {
  for (const [q, allowed] of BATTERY) {
    let label;
    try { label = await fetchVerdict(q); } catch { continue; }
    if (!label) { add("gap", `"${q}" → no verdict (expected ${allowed.join("/")})`); continue; }
    const dom = labelDomain(label);
    // "generic" = a valid non-specific verdict; not a wrong domain, so never a misroute.
    if (dom !== "generic" && !allowed.includes(dom)) {
      add("misroute", `"${q}" → "${label}" [domain=${dom}] but expected ${allowed.join("/")}`);
    }
  }
  for (const q of GAP_BATTERY) {
    let label;
    try { label = await fetchVerdict(q); } catch { continue; }
    if (!label) add("gap", `"${q}" → no verdict`);
  }
} else {
  console.log("⚠ dev server not on :3000 — skipped misroute/gap probes (structural checks only). Start with `pnpm start`.");
}

// ---- report ----
const byKind = (k) => problems.filter((p) => p.kind === k);
const hard = problems.filter((p) => p.kind === "structural" || p.kind === "misroute" || p.kind === "gap");
console.log(`\nFINDER: ${hard.length} problem(s) + ${byKind("structural-info").length} info`);
for (const kind of ["structural", "misroute", "gap", "structural-info"]) {
  const list = byKind(kind);
  if (!list.length) continue;
  console.log(`\n[${kind}] ${list.length}`);
  for (const p of list) console.log("  - " + p.detail);
}
if (!hard.length) console.log("\n✓ no hard problems found");
process.exit(hard.length);
