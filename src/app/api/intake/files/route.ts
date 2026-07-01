import { NextResponse } from "next/server";
import {
  extractDelimitedTextFile,
  extractSpreadsheetFile,
  extractUnstructuredTextFile,
  unsupportedFileExtraction,
  type IntakeFileExtraction
} from "@/lib/intake-file-parser";
import { extractOpenAiFileOcr } from "@/lib/openai-file-ocr";
import { extractPdfText } from "@/lib/pdf-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const imageMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const imageExtensions = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const documentExtensions = new Set(["doc", "docx", "rtf", "odt"]);

function extensionFor(fileName: string) {
  return fileName.toLowerCase().split(".").pop() ?? "";
}

function combineText(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n\n");
}

function mimeTypeFor(file: File, ext: string) {
  if (file.type) return file.type;
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "doc") return "application/msword";
  if (ext === "rtf") return "application/rtf";
  if (ext === "odt") return "application/vnd.oasis.opendocument.text";
  return "application/octet-stream";
}

function withAdditionalWarnings(extraction: IntakeFileExtraction, warnings: string[]) {
  const nextWarnings = [...extraction.warnings, ...warnings.filter(Boolean)];
  return {
    ...extraction,
    warnings: nextWarnings,
    labelText: [extraction.labelText, warnings.length ? "추출 주의:" : "", ...warnings.map((warning) => `- ${warning}`)]
      .filter(Boolean)
      .join("\n")
  };
}

async function extractPdfUpload(buffer: Buffer, file: File, fileName: string) {
  const pdfText = await extractPdfText(buffer);
  const textExtraction = pdfText ? extractUnstructuredTextFile(pdfText, fileName, "pdf") : null;

  if (textExtraction && (textExtraction.ingredientCount > 0 || textExtraction.nutritionCount > 0)) {
    return textExtraction;
  }

  const ocrExtraction = await extractOpenAiFileOcr({
    buffer,
    fileName,
    mimeType: mimeTypeFor(file, "pdf"),
    kind: "pdf"
  });

  if (ocrExtraction.kind !== "unsupported" || !textExtraction) return ocrExtraction;
  return withAdditionalWarnings(textExtraction, ocrExtraction.warnings);
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

  const extractions: IntakeFileExtraction[] = [];

  for (const file of files.slice(0, 8)) {
    const fileName = file.name || "uploaded-file";
    const ext = extensionFor(fileName);

    if (file.size > MAX_FILE_BYTES) {
      extractions.push(unsupportedFileExtraction(fileName, "파일이 커서 자동 추출을 건너뛰었습니다. 필요한 시트나 페이지만 나눠서 올려주세요."));
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

      if (ext === "pdf") {
        const buffer = Buffer.from(await file.arrayBuffer());
        extractions.push(await extractPdfUpload(buffer, file, fileName));
        continue;
      }

      if (imageExtensions.has(ext) || file.type.startsWith("image/")) {
        const mimeType = mimeTypeFor(file, ext);
        if (!imageMimeTypes.has(mimeType)) {
          extractions.push(unsupportedFileExtraction(fileName, "이미지 OCR은 PNG, JPG/JPEG, WEBP, 비애니메이션 GIF를 지원합니다. HEIC 등은 PNG나 JPG로 변환해서 올려주세요."));
          continue;
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        extractions.push(await extractOpenAiFileOcr({ buffer, fileName, mimeType, kind: "image" }));
        continue;
      }

      if (documentExtensions.has(ext)) {
        const buffer = Buffer.from(await file.arrayBuffer());
        extractions.push(
          await extractOpenAiFileOcr({
            buffer,
            fileName,
            mimeType: mimeTypeFor(file, ext),
            kind: "document"
          })
        );
        continue;
      }

      extractions.push(unsupportedFileExtraction(fileName, "현재 자동 추출은 엑셀, CSV, TXT, PDF, 이미지, DOC/DOCX 파일을 지원합니다."));
    } catch {
      extractions.push(unsupportedFileExtraction(fileName, "파일을 열었지만 내용을 읽지 못했습니다. 암호, 손상 파일, 너무 낮은 해상도, 특수 서식 여부를 확인해야 합니다."));
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
