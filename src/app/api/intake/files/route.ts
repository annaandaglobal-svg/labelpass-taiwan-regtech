import { NextResponse } from "next/server";
import { extractDelimitedTextFile, extractSpreadsheetFile, unsupportedFileExtraction } from "@/lib/intake-file-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

function extensionFor(fileName: string) {
  return fileName.toLowerCase().split(".").pop() ?? "";
}

function combineText(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: "Invalid file upload" }, { status: 400 });
  }

  const files = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File);

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const extractions = [];

  for (const file of files.slice(0, 8)) {
    const fileName = file.name || "uploaded-file";
    const ext = extensionFor(fileName);

    if (file.size > MAX_FILE_BYTES) {
      extractions.push(unsupportedFileExtraction(fileName, "파일이 커서 자동 추출을 건너뛰었습니다. 필요한 시트만 나눠서 올려주세요."));
      continue;
    }

    try {
      if (ext === "xlsx" || ext === "xls") {
        const buffer = Buffer.from(await file.arrayBuffer());
        extractions.push(extractSpreadsheetFile(buffer, fileName));
        continue;
      }

      if (ext === "csv" || ext === "txt") {
        extractions.push(extractDelimitedTextFile(await file.text(), fileName));
        continue;
      }

      extractions.push(unsupportedFileExtraction(fileName, "현재 자동 추출은 엑셀, CSV, TXT 파일을 우선 지원합니다. PDF·이미지는 다음 OCR 단계에서 처리합니다."));
    } catch {
      extractions.push(unsupportedFileExtraction(fileName, "파일을 열었지만 표 구조를 읽지 못했습니다. 시트 보호, 손상 파일, 특수 서식 여부를 확인해야 합니다."));
    }
  }

  const productName = extractions.find((item) => item.productName)?.productName ?? "";
  const productTypeHint = extractions.find((item) => item.productTypeHint)?.productTypeHint ?? "";
  const originText = combineText(extractions.map((item) => item.originText));
  const ingredientsText = combineText(extractions.map((item) => item.ingredientsText));
  const labelText = combineText(extractions.map((item) => item.labelText));
  const ingredientCount = extractions.reduce((total, item) => total + item.ingredientCount, 0);
  const nutritionCount = extractions.reduce((total, item) => total + item.nutritionCount, 0);
  const warnings = extractions.flatMap((item) => item.warnings);

  return NextResponse.json({
    ok: ingredientCount > 0 || nutritionCount > 0 || Boolean(productName),
    productName,
    productTypeHint,
    originText,
    ingredientsText,
    labelText,
    ingredientCount,
    nutritionCount,
    warnings,
    files: extractions
  });
}
