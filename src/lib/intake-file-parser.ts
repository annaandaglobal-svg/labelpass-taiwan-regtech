import * as XLSX from "xlsx";

export type IntakeFileExtraction = {
  fileName: string;
  kind: "spreadsheet" | "text" | "unsupported";
  productName: string;
  productTypeHint: string;
  originText: string;
  ingredientsText: string;
  labelText: string;
  sheetCount: number;
  ingredientCount: number;
  nutritionCount: number;
  warnings: string[];
};

type SheetExtraction = {
  sheetName: string;
  productName: string;
  originText: string;
  ingredients: string[];
  nutrition: string[];
  warnings: string[];
};

const ingredientHeaderPattern = /(원재료|원료명|성분명|전성분|ingredient|ingredients|原料|成分)/i;
const originHeaderPattern = /(원산지|origin|country|產地|产地|來源|来源)/i;
const chineseHeaderPattern = /(대만어|대만|중문|번체|中文|繁體|繁体|台灣|台湾|臺灣|臺灣)/i;
const englishHeaderPattern = /(영어|english|英文|inci)/i;
const nutritionHeaderPattern = /(영양|營養|营养|nutrition|nutrition facts)/i;
const amountHeaderPattern = /(용량|함량|amount|content|含量|份量|每份)/i;
const productNamePattern = /^(제품명|품명|product\s*name|品名|產品名稱|产品名称|商品名)$/i;

function cleanCell(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function nonEmpty(values: string[]) {
  return values.map(cleanLine).filter(Boolean);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(cleanLine).filter(Boolean)));
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cleanCell(cell));
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cleanCell(cell));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cleanCell(cell));
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function rowsFromSheet(sheet: XLSX.WorkSheet) {
  return XLSX.utils
    .sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false
    })
    .map((row) => row.map(cleanCell));
}

function scoreHeaderRow(row: string[]) {
  let score = 0;
  if (row.some((cell) => ingredientHeaderPattern.test(cell))) score += 8;
  if (row.some((cell) => originHeaderPattern.test(cell))) score += 3;
  if (row.some((cell) => chineseHeaderPattern.test(cell))) score += 2;
  if (row.some((cell) => englishHeaderPattern.test(cell))) score += 2;
  if (row.some((cell) => nutritionHeaderPattern.test(cell))) score += 1;
  return score;
}

function findHeaderRow(rows: string[][]) {
  let bestIndex = -1;
  let bestScore = 0;

  rows.forEach((row, index) => {
    const score = scoreHeaderRow(row);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 6 ? bestIndex : -1;
}

function findColumn(row: string[], pattern: RegExp, nearColumn?: number) {
  const matches = row
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => pattern.test(cell));

  if (!matches.length) return -1;
  if (nearColumn === undefined || nearColumn < 0) return matches[0].index;

  return matches.sort((left, right) => Math.abs(left.index - nearColumn) - Math.abs(right.index - nearColumn))[0].index;
}

function findProductName(rows: string[][]) {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const cell = row[colIndex];
      if (!productNamePattern.test(cell)) continue;

      const candidates = [
        ...row.slice(colIndex + 1, colIndex + 6),
        ...(rows[rowIndex + 1] ?? []).slice(Math.max(0, colIndex - 1), colIndex + 6),
        ...(rows[rowIndex + 2] ?? []).slice(Math.max(0, colIndex - 1), colIndex + 6)
      ].filter((value) => value && !productNamePattern.test(value) && !/^총?\s*\d/i.test(value));

      if (candidates[0]) return cleanLine(candidates[0]);
    }
  }

  return "";
}

function formatIngredient(origin: string, korean: string, zh: string, english: string) {
  const names = nonEmpty([korean, zh, english]);
  if (!names.length) return "";
  return `${origin ? `[${origin}] ` : ""}${names.join(" / ")}`;
}

function extractNutrition(rows: string[][], headerIndex: number, headerRow: string[]) {
  const nutritionStart = findColumn(headerRow, nutritionHeaderPattern);
  if (nutritionStart < 0) return [];

  const amountCol = findColumn(headerRow, amountHeaderPattern, nutritionStart) >= 0 ? findColumn(headerRow, amountHeaderPattern, nutritionStart) : nutritionStart + 3;
  const nameCols = [nutritionStart, nutritionStart + 1, nutritionStart + 2].filter((index) => index >= 0);
  const lines: string[] = [];

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const names = nonEmpty(nameCols.map((index) => row[index] ?? ""));
    const amount = cleanCell(row[amountCol] ?? "");

    if (!names.length && !amount) continue;
    if (!names.length) continue;
    lines.push(`${names.join(" / ")}${amount ? `: ${amount}` : ""}`);
  }

  return unique(lines).slice(0, 40);
}

function inferProductType(text: string) {
  if (/단백질|protein|whey|soy protein|프로바이오틱|유산균|supplement|health food|효소|enzyme/i.test(text)) {
    return "protein powder / supplement / Taiwan import";
  }
  if (/식품첨가물|감미료|sweetener|additive|stevia|sucralose|erythritol|phosphate/i.test(text)) {
    return "food ingredient / food additive / Taiwan import";
  }
  if (/화장품|inci|cosmetic|skincare/i.test(text)) return "cosmetic / Taiwan import";
  if (/식품|nutrition|allergen|원재료/i.test(text)) return "prepackaged food / Taiwan import";
  return "";
}

function extractSheet(rows: string[][], sheetName: string): SheetExtraction {
  const headerIndex = findHeaderRow(rows);
  const warnings: string[] = [];

  if (headerIndex < 0) {
    return {
      sheetName,
      productName: findProductName(rows),
      originText: "",
      ingredients: [],
      nutrition: [],
      warnings: ["성분표 머리글을 찾지 못했습니다. 원재료명/Ingredient 열이 있는지 확인이 필요합니다."]
    };
  }

  const headerRow = rows[headerIndex];
  const ingredientCol = findColumn(headerRow, ingredientHeaderPattern);
  const originCol = findColumn(headerRow, originHeaderPattern, ingredientCol);
  const chineseCol = findColumn(headerRow, chineseHeaderPattern, ingredientCol);
  const englishCol = findColumn(headerRow, englishHeaderPattern, ingredientCol);
  const ingredients: string[] = [];
  const origins: string[] = [];

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const ingredient = cleanCell(row[ingredientCol] ?? "");
    const origin = originCol >= 0 ? cleanCell(row[originCol] ?? "") : "";
    const zh = chineseCol >= 0 ? cleanCell(row[chineseCol] ?? "") : "";
    const english = englishCol >= 0 ? cleanCell(row[englishCol] ?? "") : "";
    const line = formatIngredient(origin, ingredient, zh, english);

    if (line) ingredients.push(line);
    if (origin) origins.push(origin);
  }

  if (!ingredients.length) warnings.push("성분 열은 찾았지만 실제 성분 행을 추출하지 못했습니다.");

  return {
    sheetName,
    productName: findProductName(rows),
    originText: unique(origins).join(", "),
    ingredients: unique(ingredients).slice(0, 220),
    nutrition: extractNutrition(rows, headerIndex, headerRow),
    warnings
  };
}

function buildExtraction(fileName: string, kind: IntakeFileExtraction["kind"], sheets: SheetExtraction[]): IntakeFileExtraction {
  const productName = sheets.find((sheet) => sheet.productName)?.productName ?? "";
  const origins = unique(sheets.flatMap((sheet) => sheet.originText.split(",").map((item) => item.trim()))).join(", ");
  const ingredients = sheets.flatMap((sheet) => sheet.ingredients);
  const nutrition = sheets.flatMap((sheet) => sheet.nutrition);
  const warnings = sheets.flatMap((sheet) => sheet.warnings);
  const sourceLabel = `[파일 추출] ${fileName}`;
  const productLine = productName ? `제품명: ${productName}` : "";
  const originLine = origins ? `원산지/원료 원산지: ${origins}` : "";
  const ingredientsText = [sourceLabel, productLine, originLine, "원재료/성분:", ...ingredients.map((line, index) => `${index + 1}. ${line}`)]
    .filter(Boolean)
    .join("\n");
  const labelText = [
    sourceLabel,
    productLine,
    originLine,
    nutrition.length ? "영양정보:" : "",
    ...nutrition.map((line) => `- ${line}`),
    warnings.length ? "읽기 주의:" : "",
    ...warnings.map((line) => `- ${line}`)
  ]
    .filter(Boolean)
    .join("\n");
  const combined = `${fileName} ${productName} ${ingredients.join(" ")} ${nutrition.join(" ")}`;

  return {
    fileName,
    kind,
    productName,
    productTypeHint: inferProductType(combined),
    originText: origins,
    ingredientsText,
    labelText,
    sheetCount: sheets.length,
    ingredientCount: ingredients.length,
    nutritionCount: nutrition.length,
    warnings
  };
}

export function extractSpreadsheetFile(buffer: Buffer, fileName: string): IntakeFileExtraction {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheets = workbook.SheetNames.map((sheetName) => extractSheet(rowsFromSheet(workbook.Sheets[sheetName]), sheetName));
  return buildExtraction(fileName, "spreadsheet", sheets);
}

export function extractDelimitedTextFile(text: string, fileName: string): IntakeFileExtraction {
  const rows = fileName.toLowerCase().endsWith(".csv") ? parseCsv(text) : text.split(/\r?\n/).map((line) => [cleanLine(line)]);
  const sheet = extractSheet(rows, "text");
  return buildExtraction(fileName, "text", [sheet]);
}

export function unsupportedFileExtraction(fileName: string, reason: string): IntakeFileExtraction {
  return {
    fileName,
    kind: "unsupported",
    productName: "",
    productTypeHint: "",
    originText: "",
    ingredientsText: "",
    labelText: `[파일 추출] ${fileName}\n읽기 주의:\n- ${reason}`,
    sheetCount: 0,
    ingredientCount: 0,
    nutritionCount: 0,
    warnings: [reason]
  };
}
