#!/usr/bin/env node
// Ingest the AUTHORITATIVE TFDA cosmetic open datasets (data/tfda/*.json, fetched by fetch:tfda)
// into the term registry — making the official lists the source of truth for cosmetic
// prohibited/restricted/preservative/sunscreen/colorant status, and RECONCILING against whatever is
// already in the registry (agent-extracted or curated) so conflicts surface instead of hiding.
//   --report  : print reconciliation only (conflicts + would-add), change nothing (default)
//   --apply   : apply — add official terms, correct conflicting categories to the official one,
//               merge missing CAS/INCI aliases.
import { readFile, writeFile } from "node:fs/promises";

const REG = "data/knowledge/term-registry.json";
const apply = process.argv.includes("--apply");
const clean = (s) => String(s ?? "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
const norm = (s) => clean(s).toLowerCase().normalize("NFKC").replace(/[^a-z0-9]/g, "");
const isCas = (s) => /^\d{2,7}-\d{2}-\d$/.test(clean(s));
const splitMulti = (s) => clean(s).split(/[\/;]|、/).map(clean).filter(Boolean);
const slug = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44) || "x";

const datasets = [
  { file: "cosmetic-prohibited-ingredients", cat: "prohibited", name: "成分名稱", cas: "CAS_Number", note: "備註", idp: "tfda-prohib" },
  { file: "cosmetic-restricted-ingredients", cat: "cosmetic_ingredient_restriction", name: "成分名", inci: "INCI名", cas: "CAS_NO.", limit: "限量標準", rule: "限制規定", warn: "應刊載之注意事項", idp: "tfda-restrict" },
  { file: "cosmetic-preservatives", cat: "preservative", name: "成分名", inci: "INCI名", cas: "CAS_No.", limit: "限量標準", rule: "限制規定", warn: "應刊載之注意事項", idp: "tfda-preserv" },
  { file: "cosmetic-sunscreens", cat: "uv_filter", name: "成分名", inci: "INCI名", cas: "CAS_No.", limit: "限量標準", rule: "限制規定", warn: "應刊載之注意事項", idp: "tfda-uv" },
  { file: "cosmetic-colorants", cat: "colorant_uv_filter", name: "Color_Index_Number／成分名", alias: "別名", rule: "限制規定", note: "備註", idp: "tfda-color" }
];

// Build authoritative records from the official JSON
const records = [];
for (const ds of datasets) {
  const rows = JSON.parse(await readFile(`data/tfda/${ds.file}.json`, "utf8"));
  for (const row of rows) {
    // The BSE (mad-cow) prohibited entry is a compound clause that LISTS exempted materials
    // (lanolin, glycerin, amino acids…). Splitting it would wrongly mark those exemptions as banned.
    if (/牛海綿狀腦病|spongiform/i.test(clean(row[ds.name]))) continue;
    const names = [];
    for (const v of splitMulti(row[ds.name])) if (v && !/^ci\s*\d+$/i.test(v)) names.push({ v, lang: "en" });
    const casList = ds.cas ? splitMulti(row[ds.cas]).filter(isCas) : [];
    const inciList = ds.inci ? splitMulti(row[ds.inci]) : [];
    const aliasList = ds.alias ? splitMulti(row[ds.alias]) : [];
    const ciName = ds.file === "cosmetic-colorants" ? clean(row[ds.name]) : "";
    const primary = clean(inciList[0] || names[0]?.v || ciName || aliasList[0]);
    if (!primary || primary.length > 80) continue; // skip paragraph-name rows (e.g. BSE clause) — not an ingredient
    const noteParts = [];
    if (ds.limit && clean(row[ds.limit])) noteParts.push(`한도 ${clean(row[ds.limit])}`);
    if (ds.rule && clean(row[ds.rule])) noteParts.push(clean(row[ds.rule]).slice(0, 80));
    if (ds.warn && clean(row[ds.warn])) noteParts.push(`경고 ${clean(row[ds.warn]).slice(0, 60)}`);
    if (ds.note && clean(row[ds.note])) noteParts.push(clean(row[ds.note]).slice(0, 60));
    records.push({
      cat: ds.cat,
      idp: ds.idp,
      primary,
      names: [...names.map((n) => n.v), ...inciList, ...aliasList, ciName].map(clean).filter(Boolean),
      cas: casList,
      note: `대만 TFDA 공식 목록(${ds.file}). ${noteParts.join(" · ")}`.trim()
    });
  }
}

// Index the current registry by normalized name + CAS
const reg = JSON.parse(await readFile(REG, "utf8"));
const byKey = new Map();
for (const t of reg.terms) {
  for (const a of t.aliases || []) byKey.set(norm(a.value), t);
  byKey.set(norm(t.canonical_name), t);
  for (const c of t.identifiers?.cas || []) byKey.set(norm(c), t);
}
// "official is stricter than the registry says" — the dangerous conflict class
const strictness = { prohibited: 4, cosmetic_ingredient_restriction: 3, preservative: 3, uv_filter: 3, colorant_uv_filter: 2 };
// Only auto-correct a PURE-cosmetic permissive term to the official cosmetic category. Food-domain
// terms (benzoic/sorbic acid, riboflavin…) legitimately keep their food-additive meaning even
// though the same substance is also a restricted cosmetic — don't clobber the food context.
const permissive = new Set(["cosmetic_ingredient", "cosmetic_marketing_claim"]);

const usedIds = new Set(reg.terms.map((t) => t.id));
const A = (v, lang) => { const lg = /[가-힣]/.test(v) ? "ko" : /[㐀-鿿]/.test(v) ? "zh-Hant" : (lang || "en"); return { value: v, type: lg === "en" ? "common_name" : "local_name", language: lg, jurisdiction: lg === "ko" ? "KR" : "TW", confidence: /^[a-z0-9]+$/i.test(v) && v.length <= 4 ? 0.7 : 0.9 }; };
const conflicts = [], merges = [], news = [];

for (const rec of records) {
  const keys = [...rec.names, ...rec.cas].map(norm).filter(Boolean);
  let existing = null;
  for (const k of keys) if (byKey.has(k)) { existing = byKey.get(k); break; }
  if (existing) {
    if (existing.category !== rec.cat && permissive.has(existing.category) && strictness[rec.cat] >= 2) {
      conflicts.push({ id: existing.id, was: existing.category, official: rec.cat, name: rec.primary });
      if (apply) { existing.category = rec.cat; existing.notes = rec.note; }
    } else if (apply) {
      const have = new Set((existing.aliases || []).map((a) => norm(a.value)));
      for (const c of rec.cas) if (!existing.identifiers.cas.includes(c)) existing.identifiers.cas.push(c);
      for (const n of rec.names) if (n && !have.has(norm(n))) { existing.aliases.push(A(n, "en")); have.add(norm(n)); }
    }
    merges.push(rec.primary);
  } else {
    news.push(rec);
    if (apply) {
      let id = `${rec.idp}-${slug(rec.primary)}`, i = 2; while (usedIds.has(id)) id = `${rec.idp}-${slug(rec.primary)}-${i++}`;
      usedIds.add(id);
      const seen = new Set(), aliases = [];
      for (const n of rec.names) { if (!n || n.length < 2 || seen.has(norm(n))) continue; seen.add(norm(n)); aliases.push(A(n, "en")); }
      const t = { id, canonical_name: rec.primary, category: rec.cat, identifiers: { cas: [...new Set(rec.cas)], inci: [], color_index: [] }, aliases, source_keys: ["tw-tfda-cosmetic-restricted-ingredients"], notes: rec.note };
      reg.terms.push(t);
      for (const k of keys) byKey.set(k, t);
    }
  }
}

console.log(`Official records: ${records.length} · matched existing: ${merges.length} · new: ${news.length} · CONFLICTS (registry said permissive, official is stricter): ${conflicts.length}`);
if (conflicts.length) { console.log("\n=== 🔴 CONFLICTS (관대→공식 엄격) ==="); for (const c of conflicts.slice(0, 40)) console.log(`  ${c.name}  [${c.id}] ${c.was} → ${c.official}`); }
if (apply) { await writeFile(REG, JSON.stringify(reg, null, 2) + "\n", "utf8"); console.log(`\nAPPLIED. total terms: ${reg.terms.length}`); }
else console.log("\n(report only — run with --apply to ingest + correct)");
