// Regression test for spreadsheet ingredient extraction.
// Guards against the real-world failure where only 번호/Total/회사명 leaked out of a
// cosmetic full-ingredient sheet, and where common header wordings were not detected.
// Run with Node's type stripping: `node --experimental-strip-types`.
import * as XLSX from "xlsx";
import { extractSpreadsheetFile } from "../src/lib/intake-file-parser.ts";

let failures = 0;
function fail(message) {
  console.error(`Intake parser test failed: ${message}`);
  failures += 1;
}
function assert(condition, message) {
  if (!condition) fail(message);
}

function build(rows, sheetName = "Sheet1") {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

const noiseTokens = /(회사명|제조사|공급사|판매원|co\.?,?\s*ltd|company|^total$|^합계$|grand\s*total)/i;
function assertNoNoise(extraction, label) {
  for (const line of extraction.ingredientsText.split("\n")) {
    const body = line.replace(/^\d+\.\s*/, "");
    if (/^\[.*\]\s/.test(body) || /함량|CAS|\//.test(body)) {
      // ingredient line: make sure it is not a bare company/total row
      const namePart = body.replace(/^\[[^\]]*\]\s*/, "").split(" (")[0];
      if (/^(SLC Co\.?,?\s*Ltd\.?|Total|합계)$/i.test(namePart.trim())) {
        fail(`${label}: noise row leaked as ingredient -> ${namePart}`);
      }
    }
  }
}

// Case A: standard Korean cosmetic sheet with No./원료명/INCI/함량/CAS and a trailing 회사명 row.
const caseA = build([
  ["화장품 전성분표"],
  ["제품명", "Cica Barrier Cream 50ml"],
  ["No.", "원료명", "INCI Name", "함량(%)", "CAS No.", "기능"],
  ["1", "정제수", "Water", "65.4", "7732-18-5", "용제"],
  ["2", "글리세린", "Glycerin", "5.0", "56-81-5", "보습제"],
  ["3", "페녹시에탄올", "Phenoxyethanol", "0.8", "122-99-6", "보존제"],
  ["Total", "", "", "100.0", "", ""],
  ["회사명", "SLC Co., Ltd."]
]);
const a = extractSpreadsheetFile(caseA, "cosmetic_A.xlsx");
assert(a.productName === "Cica Barrier Cream 50ml", `A productName wrong: ${a.productName}`);
assert(a.ingredientCount === 3, `A expected 3 ingredients, got ${a.ingredientCount}`);
assert(/정제수/.test(a.ingredientsText) && /Water/.test(a.ingredientsText), "A missing paired KR/INCI names");
assert(!/SLC Co/.test(a.ingredientsText), "A leaked company name into ingredients");
assertNoNoise(a, "A");

// Case B: header wording variant (연번/성분명(국문)/Ingredient Name (INCI)/배합비(wt%)).
const caseB = build([
  ["Product Name:", "Hydra Serum"],
  ["연번", "성분명(국문)", "Ingredient Name (INCI)", "배합비(wt%)", "CAS"],
  ["1", "정제수", "Water", "70", "7732-18-5"],
  ["2", "히알루론산", "Sodium Hyaluronate", "0.1", "9067-32-7"],
  ["합계", "", "", "100", ""]
]);
const b = extractSpreadsheetFile(caseB, "cosmetic_B.xlsx");
assert(b.productName === "Hydra Serum", `B productName wrong: ${b.productName}`);
assert(b.ingredientCount === 2, `B expected 2 ingredients, got ${b.ingredientCount}`);
assertNoNoise(b, "B");

// Case C: English-only INCI with Material Name / % w/w.
const caseC = build([
  ["Formulation Breakdown"],
  ["#", "Material Name", "% w/w", "Function"],
  ["1", "Aqua", "68.00", "Solvent"],
  ["2", "Glycerin", "4.00", "Humectant"],
  ["Grand Total", "", "100.00", ""]
]);
const c = extractSpreadsheetFile(caseC, "cosmetic_C.xlsx");
assert(c.ingredientCount === 2, `C expected 2 ingredients, got ${c.ingredientCount}`);
assert(/Aqua/.test(c.ingredientsText) && /Glycerin/.test(c.ingredientsText), "C missing INCI names");
assertNoNoise(c, "C");

if (failures) {
  process.exitCode = 1;
} else {
  console.log("Intake parser test passed: 3 cosmetic sheets extracted, no 번호/Total/회사명 noise.");
}
