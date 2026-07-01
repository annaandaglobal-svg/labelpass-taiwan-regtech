import * as XLSX from "xlsx";

export type IntakeFileExtraction = {
  fileName: string;
  kind: "spreadsheet" | "text" | "pdf" | "image" | "document" | "unsupported";
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

type IngredientFields = {
  productName: string;
  origin: string;
  localName: string;
  zhName: string;
  englishName: string;
  amount: string;
  casNo: string;
  functionText: string;
};

const ingredientHeaderPattern = /(원재료|원료명|성분명|전성분|ingredient|ingredients|inci|原料|成分)/i;
const exactIngredientHeaderPattern = /^(원재료|원료명|성분명|전성분|ingredient|ingredients(?:\s*\([^)]+\))?|ingredient\s*name|inci|原料|成分)$/i;
const localIngredientHeaderPattern = /^(성분명|원재료|원료명|전성분|ingredients?\s*\((kr|kor|korean)\)|原料|成分)$/i;
const englishIngredientHeaderPattern = /^(ingredients?\s*\((en|eng|english|eu)\)|ingredients?|ingredient\s*name|inci|english|英文)$/i;
const chineseIngredientHeaderPattern = /^(ingredients?\s*\((cn|zh|chinese)\)|대만어|대만|중문|번체|中文|繁體|繁体|台灣|台湾|臺灣|臺灣)$/i;
const originHeaderPattern = /(원산지|origin|country|產地|产地|來源|来源)/i;
const chineseHeaderPattern = /(대만어|대만|중문|번체|中文|繁體|繁体|台灣|台湾|臺灣|臺灣)/i;
const englishHeaderPattern = /(영어|english|英文|inci)/i;
const nutritionHeaderPattern = /(영양|營養|营养|nutrition|nutrition facts)/i;
const amountHeaderPattern = /(용량|함량|중량|amount|content|quantity|actual\s*%|actual\s*wt|actual\s*weight|wt\(%\)|배합량|농도|含量|份量|每份|濃度|浓度)/i;
const actualAmountHeaderPattern = /(actual\s*%|actual\s*wt|actual\s*weight|wt\(%\)|실제\s*함량|최종\s*함량)/i;
const casHeaderPattern = /^cas(\s*no\.?)?$/i;
const functionHeaderPattern = /^(기능|용도|function|functions|purpose|用途|功效)$/i;
const rowNumberHeaderPattern = /^(no\.?|번호|순번|#)$/i;
const productNamePattern = /^(제품명|품명|products?\s*name|品名|產品名稱|产品名称|商品名)$/i;

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

function normalizeTextBlock(text: string) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function compactTextLines(text: string) {
  return normalizeTextBlock(text)
    .split("\n")
    .map(cleanLine)
    .filter(Boolean);
}

const freeformIngredientHeaderPattern =
  /^(?:ingredients?|ingredient\s+list|inci|formula|composition|materials?|raw\s*materials?|配料|成分|全成分|原料|原材料|組成|组成|성분|전성분|원재료|원료)\b/i;
const freeformNutritionHeaderPattern = /^(?:nutrition(?:\s+facts?)?|營養|营养|영양)\b/i;
const freeformNutrientLinePattern =
  /^(?:calories?|energy|protein|fat|total\s+fat|carbohydrate|sugars?|sodium|熱量|热量|蛋白質|蛋白质|脂肪|碳水化合物|糖|鈉|钠|열량|단백질|지방|탄수화물|당류|나트륨)\b/i;
const freeformStopSectionPattern =
  /^(?:nutrition(?:\s+facts?)?|allergens?|warning|caution|directions?|usage|how\s+to\s+use|manufacturer|importer|distributor|net\s*(?:weight|content)|contents?|lot|batch|expiry|exp\.?|best\s+before|storage|claims?|made\s+in|country\s+of\s+origin|origin|營養|营养|過敏原|过敏原|警告|注意|用法|製造|制造|進口|进口|原產地|原产地|產地|产地|保存|有效|內容量|内容量|영양|알레르기|주의|사용법|제조|수입|원산지|제조국|내용량|보관|유통기한|소비기한|품질유지기한)/i;

function stripSectionHeader(line: string, headerPattern: RegExp) {
  const colonIndex = line.search(/[:：]/);
  if (colonIndex >= 0 && headerPattern.test(line.slice(0, colonIndex))) {
    return cleanLine(line.slice(colonIndex + 1));
  }
  return headerPattern.test(line) ? "" : line;
}

function splitIngredientText(text: string) {
  return text
    .replace(/^[\s:：-]+/, "")
    .split(/\n|[;；]|,(?=\s*[A-Za-z가-힣\u4E00-\u9FFF])/g)
    .map((item) =>
      cleanLine(
        item
          .replace(/^[-*•·]\s*/, "")
          .replace(/^\d+[\).、]\s*/, "")
      )
    )
    .filter((item) => item.length >= 2)
    .filter((item) => !/^(no\.?|total|subtotal|product\s*name|products?\s*name|nutrition|warning|manufacturer|importer)$/i.test(item))
    .filter((item) => !/^\d+(\.\d+)?\s*%?$/.test(item));
}

function extractFreeformIngredients(text: string) {
  const lines = compactTextLines(text);
  const blocks: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!freeformIngredientHeaderPattern.test(line)) continue;

    const inline = stripSectionHeader(line, freeformIngredientHeaderPattern);
    const collected = inline ? [inline] : [];

    for (let nextIndex = index + 1; nextIndex < lines.length && collected.length < 30; nextIndex += 1) {
      const nextLine = lines[nextIndex];
      if (freeformStopSectionPattern.test(nextLine)) break;
      if (/^(?:product\s*name|products?\s*name|품명|제품명|品名|產品名稱|产品名称)\b/i.test(nextLine)) break;
      collected.push(nextLine);
    }

    if (collected.length) blocks.push(collected.join("\n"));
  }

  if (!blocks.length) {
    const likelyIngredientLine = lines.find((line) => {
      const separatorCount = (line.match(/[,;；、]/g) ?? []).length;
      return separatorCount >= 2 && /water|aqua|glycerin|protein|extract|oil|acid|powder|stevia|enzyme|vitamin|成分|原料|성분|원재료/i.test(line);
    });
    if (likelyIngredientLine) blocks.push(likelyIngredientLine);
  }

  return unique(blocks.flatMap(splitIngredientText)).slice(0, 220);
}

function cleanProvidedIngredients(ingredients: string[]) {
  return unique(ingredients.flatMap(splitIngredientText))
    .filter((item) => !freeformStopSectionPattern.test(item))
    .filter((item) => !freeformNutritionHeaderPattern.test(item))
    .filter((item) => !freeformNutrientLinePattern.test(item))
    .slice(0, 220);
}

function extractFreeformNutrition(text: string) {
  const lines = compactTextLines(text);
  const nutritionLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!freeformNutritionHeaderPattern.test(line) && !freeformNutrientLinePattern.test(line)) continue;

    nutritionLines.push(stripSectionHeader(line, freeformNutritionHeaderPattern) || line);
    for (let nextIndex = index + 1; nextIndex < lines.length && nutritionLines.length < 20; nextIndex += 1) {
      const nextLine = lines[nextIndex];
      if (freeformStopSectionPattern.test(nextLine) && !freeformNutritionHeaderPattern.test(nextLine)) break;
      if (!freeformNutritionHeaderPattern.test(nextLine) && !freeformNutrientLinePattern.test(nextLine) && !/\d/.test(nextLine)) break;
      nutritionLines.push(nextLine);
    }
  }

  return unique(nutritionLines).slice(0, 40);
}

function extractFreeformProductName(text: string) {
  const lines = compactTextLines(text);
  const productPattern = /(?:product\s*name|products?\s*name|name\s+of\s+product|品名|產品名稱|产品名称|商品名|제품명|상품명)\s*[:：]\s*(.+)$/i;

  for (const line of lines) {
    const match = line.match(productPattern);
    if (match?.[1]) return cleanLine(match[1]);
  }

  return lines.find((line) => line.length >= 4 && line.length <= 80 && !freeformIngredientHeaderPattern.test(line) && !freeformStopSectionPattern.test(line)) ?? "";
}

function extractFreeformOrigin(text: string) {
  const patterns = [
    /(?:made\s+in|country\s+of\s+origin|origin)\s*[:：]?\s*([A-Za-z가-힣\u4E00-\u9FFF ]{2,40})/i,
    /(?:原產地|原产地|產地|产地|製造地|制造地|원산지|제조국)\s*[:：]?\s*([A-Za-z가-힣\u4E00-\u9FFF ]{2,40})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanLine(match[1]).replace(/[.。]$/, "");
  }

  return "";
}

function cleanAmount(value: string) {
  const normalized = cleanLine(value).replace(/%$/, "");
  if (!normalized) return "";

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return normalized;

  return numeric
    .toFixed(6)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
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
  const filledCells = row.filter(Boolean);
  const hasExactIngredientHeader = row.some((cell) => exactIngredientHeaderPattern.test(cell));

  if (!hasExactIngredientHeader) return 0;
  if (filledCells.length === 1) return 6;

  let score = 0;
  if (hasExactIngredientHeader) score += 7;
  if (row.some((cell) => rowNumberHeaderPattern.test(cell))) score += 1;
  if (row.some((cell) => amountHeaderPattern.test(cell))) score += 2;
  if (row.some((cell) => casHeaderPattern.test(cell))) score += 2;
  if (row.some((cell) => functionHeaderPattern.test(cell))) score += 1;
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

function parseProductNameCell(cell: string) {
  const direct = cell.match(/(?:제품명|품명|products?\s*name|品名|產品名稱|产品名称|商品名)\s*[:：-]\s*(.+)$/i);
  return direct?.[1] ? cleanLine(direct[1]) : "";
}

function findProductName(rows: string[][]) {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const cell = row[colIndex];
      const inlineProductName = parseProductNameCell(cell);
      if (inlineProductName) return inlineProductName;

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

function formatIngredient(fields: IngredientFields) {
  const names = unique([fields.localName, fields.englishName, fields.zhName]);
  if (!names.length) return "";

  const amount = cleanAmount(fields.amount);
  const details = [
    amount ? `함량 ${amount}%` : "",
    fields.casNo && fields.casNo !== "-" ? `CAS ${fields.casNo}` : ""
  ].filter(Boolean);
  const prefix = [fields.productName, fields.origin ? `원산지 ${fields.origin}` : ""].filter(Boolean).join(" / ");

  return `${prefix ? `[${prefix}] ` : ""}${names.join(" / ")}${details.length ? ` (${details.join(" | ")})` : ""}`;
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
  if (/화장품|스킨케어|클렌저|폼클렌저|선크림|토너|세럼|크림|로션|마스크|팩|머드|더마|inci|cosmetic|skincare|skin\s*care|toner|cream|serum|mask|modeling\s*mask|lotion|cleanser|sunscreen/i.test(text)) {
    return "cosmetic / Taiwan import";
  }
  if (/식품첨가물|감미료|sweetener|additive|stevia|sucralose|erythritol|phosphate/i.test(text)) {
    return "food ingredient / food additive / Taiwan import";
  }
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
  const localIngredientCol = findColumn(headerRow, localIngredientHeaderPattern);
  const ingredientCol = localIngredientCol >= 0 ? localIngredientCol : findColumn(headerRow, exactIngredientHeaderPattern);
  const originCol = findColumn(headerRow, originHeaderPattern, ingredientCol);
  const chineseCol = findColumn(headerRow, chineseIngredientHeaderPattern, ingredientCol);
  const englishCol = findColumn(headerRow, englishIngredientHeaderPattern, ingredientCol);
  const actualAmountCol = findColumn(headerRow, actualAmountHeaderPattern, ingredientCol);
  const amountCol = actualAmountCol >= 0 ? actualAmountCol : findColumn(headerRow, amountHeaderPattern, ingredientCol);
  const casCol = findColumn(headerRow, casHeaderPattern, ingredientCol);
  const functionCol = findColumn(headerRow, functionHeaderPattern, ingredientCol);
  const productName = findProductName(rows);
  const ingredients: string[] = [];
  const origins: string[] = [];

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const rowLabel = cleanCell(row[0] ?? "");
    if (/^(total|합계|소계|subtotal|grand\s*total)$/i.test(rowLabel)) continue;
    if (/^(kr|kor|korean|en|eng|english|eu|cn|zh|chinese|中文|중문|한글|영문)$/i.test(rowLabel)) continue;
    if (/^(slc\s+co\.?,?\s*ltd\.?|company|제조사)$/i.test(rowLabel)) continue;

    const ingredient = cleanCell(row[ingredientCol] ?? "");
    const origin = originCol >= 0 ? cleanCell(row[originCol] ?? "") : "";
    const zh = chineseCol >= 0 ? cleanCell(row[chineseCol] ?? "") : "";
    const english = englishCol >= 0 && englishCol !== ingredientCol ? cleanCell(row[englishCol] ?? "") : "";
    const amount = amountCol >= 0 ? cleanCell(row[amountCol] ?? "") : "";
    const casNo = casCol >= 0 ? cleanCell(row[casCol] ?? "") : "";
    const functionText = functionCol >= 0 ? cleanCell(row[functionCol] ?? "") : "";

    if (!nonEmpty([ingredient, zh, english]).length) continue;
    if (/^(no\.?|번호|순번|total)$/i.test(ingredient)) continue;
    if (/^\d+(\.\d+)?$/.test(ingredient)) continue;
    if (parseProductNameCell(ingredient) || productNamePattern.test(ingredient)) continue;

    const line = formatIngredient({
      productName,
      origin,
      localName: ingredient,
      zhName: zh,
      englishName: english,
      amount,
      casNo,
      functionText
    });

    if (line) ingredients.push(line);
    if (origin) origins.push(origin);
  }

  if (!ingredients.length) warnings.push("성분 열은 찾았지만 실제 성분 행을 추출하지 못했습니다.");

  return {
    sheetName,
    productName,
    originText: unique(origins).join(", "),
    ingredients: unique(ingredients).slice(0, 220),
    nutrition: extractNutrition(rows, headerIndex, headerRow),
    warnings
  };
}

function buildExtraction(fileName: string, kind: IntakeFileExtraction["kind"], sheets: SheetExtraction[]): IntakeFileExtraction {
  const productName = unique(sheets.map((sheet) => sheet.productName)).join(" / ");
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
  const extraction = buildExtraction(fileName, "text", [sheet]);

  if (fileName.toLowerCase().endsWith(".csv")) return extraction;
  if (extraction.ingredientCount > 0 || extraction.nutritionCount > 0) return extraction;

  return extractUnstructuredTextFile(text, fileName, "text");
}

export function extractUnstructuredTextFile(
  text: string,
  fileName: string,
  kind: Extract<IntakeFileExtraction["kind"], "text" | "pdf" | "image" | "document"> = "text",
  options: {
    productName?: string;
    productTypeHint?: string;
    originText?: string;
    ingredients?: string[];
    nutrition?: string[];
    labelNotes?: string[];
    warnings?: string[];
  } = {}
): IntakeFileExtraction {
  const normalizedText = normalizeTextBlock(text);
  const productName = options.productName?.trim() || extractFreeformProductName(normalizedText);
  const originText = options.originText?.trim() || extractFreeformOrigin(normalizedText);
  const ingredients = unique([...cleanProvidedIngredients(options.ingredients ?? []), ...extractFreeformIngredients(normalizedText)]).slice(0, 220);
  const nutrition = unique([...(options.nutrition ?? []), ...extractFreeformNutrition(normalizedText)]).slice(0, 40);
  const warnings = [...(options.warnings ?? [])];

  if (!normalizedText) {
    warnings.push("파일에서 읽을 수 있는 텍스트를 찾지 못했습니다. 스캔본이면 더 선명한 원본이나 이미지 OCR이 필요합니다.");
  } else if (!ingredients.length && !nutrition.length) {
    warnings.push("원재료/성분 또는 영양정보 영역을 자동으로 분리하지 못했습니다. OCR 원문을 검토 문안에 넣었습니다.");
  }

  const sourceLabel = `[파일 추출] ${fileName}`;
  const productLine = productName ? `제품명: ${productName}` : "";
  const originLine = originText ? `원산지/제조국: ${originText}` : "";
  const ingredientsText = [
    sourceLabel,
    productLine,
    originLine,
    ingredients.length ? "원재료/성분:" : "",
    ...ingredients.map((line, index) => `${index + 1}. ${line}`)
  ]
    .filter(Boolean)
    .join("\n");
  const rawText = normalizedText.slice(0, 12000);
  const labelText = [
    sourceLabel,
    productLine,
    originLine,
    nutrition.length ? "영양정보:" : "",
    ...nutrition.map((line) => `- ${line}`),
    ...(options.labelNotes ?? []).map((line) => `- ${line}`),
    rawText ? "OCR/문서 원문:" : "",
    rawText
  ]
    .filter(Boolean)
    .join("\n");
  const combined = `${fileName} ${productName} ${options.productTypeHint ?? ""} ${originText} ${ingredients.join(" ")} ${normalizedText}`;

  return {
    fileName,
    kind,
    productName,
    productTypeHint: options.productTypeHint?.trim() || inferProductType(combined),
    originText,
    ingredientsText,
    labelText,
    sheetCount: 1,
    ingredientCount: ingredients.length,
    nutritionCount: nutrition.length,
    warnings
  };
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
