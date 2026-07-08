#!/usr/bin/env node
// Ingest AUTHORITATIVE TFDA FOOD open datasets (data/tfda/food-additives.json [InfoId 61],
// banned-pesticides.json [InfoId 15]) into the term registry — making the official food-additive
// positive list the source of truth (was agent-extracted), and reconciling against the registry.
//   --report (default) : print reconciliation only.   --apply : ingest + merge.
import { readFile, writeFile } from "node:fs/promises";

const REG = "data/knowledge/term-registry.json";
const apply = process.argv.includes("--apply");
const clean = (s) => String(s ?? "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
const norm = (s) => clean(s).toLowerCase().normalize("NFKC").replace(/[^a-z0-9가-힣一-鿿]/g, "");
const slug = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44) || "x";
const A = (v) => { const lg = /[가-힣]/.test(v) ? "ko" : /[㐀-鿿]/.test(v) ? "zh-Hant" : "en"; return { value: v, type: lg === "en" ? "common_name" : "local_name", language: lg, jurisdiction: lg === "ko" ? "KR" : "TW", confidence: /^[a-z0-9]+$/i.test(v) && v.length <= 4 ? 0.7 : 0.9 }; };

const reg = JSON.parse(await readFile(REG, "utf8"));
const byKey = new Map();
for (const t of reg.terms) { for (const a of t.aliases || []) byKey.set(norm(a.value), t); byKey.set(norm(t.canonical_name), t); }
const usedIds = new Set(reg.terms.map((t) => t.id));
let added = 0, merged = 0;

function upsert(idp, cat, names, note) {
  names = [...new Set(names.map(clean).filter((n) => n && n.length >= 2))];
  if (!names.length) return;
  const keys = names.map(norm).filter(Boolean);
  let existing = null;
  for (const k of keys) if (byKey.has(k)) { existing = byKey.get(k); break; }
  const primary = names.find((n) => /[a-z]/i.test(n)) || names[0];
  if (existing) {
    merged++;
    if (apply) {
      const have = new Set((existing.aliases || []).map((a) => norm(a.value)));
      for (const n of names) if (!have.has(norm(n))) { existing.aliases.push(A(n)); have.add(norm(n)); }
    }
    return;
  }
  added++;
  if (apply) {
    let id = `${idp}-${slug(primary)}`, i = 2; while (usedIds.has(id)) id = `${idp}-${slug(primary)}-${i++}`;
    usedIds.add(id);
    const seen = new Set(), aliases = [];
    for (const n of names) { if (seen.has(norm(n))) continue; seen.add(norm(n)); aliases.push(A(n)); }
    const t = { id, canonical_name: primary, category: cat, identifiers: { cas: [], inci: [], color_index: [] }, aliases, source_keys: ["tw-tfda-food-additive-standards"], notes: note };
    reg.terms.push(t);
    for (const k of keys) byKey.set(k, t);
  }
}

// 1) Food additive positive list (804) → food_additive
const fadd = JSON.parse(await readFile("data/tfda/food-additives.json", "utf8"));
for (const row of fadd) {
  const en = clean(row["英文品名"]), zh = clean(row["中文品名"]), cate = clean(row["類別"]);
  if (!en && !zh) continue;
  const limit = clean(row["使用食品範圍及限量"]).slice(0, 90);
  upsert("tfda-fadd", "food_additive", [en, zh], `대만 식품첨가물 공식 포지티브 리스트(${cate}). ${limit}`.trim());
}
// 2) Banned pesticides (67) → food_safety_contaminant (residue = reject)
const bp = JSON.parse(await readFile("data/tfda/banned-pesticides.json", "utf8"));
for (const row of bp) {
  const en = clean(row["英文名稱"]), zh = clean(row["農藥名稱"]);
  if (!en && !zh) continue;
  upsert("tfda-banpest", "food_safety_contaminant", [en, zh], "대만 공고 금지 농약 — 잔류 검출 시 수입 반려. 사용·판매 금지.");
}

console.log(`Food additives: ${fadd.length} · banned pesticides: ${bp.length} · matched(merge): ${merged} · new: ${added}`);
if (apply) { await writeFile(REG, JSON.stringify(reg, null, 2) + "\n", "utf8"); console.log(`APPLIED. total terms: ${reg.terms.length}`); }
else console.log("(report only — run with --apply)");
