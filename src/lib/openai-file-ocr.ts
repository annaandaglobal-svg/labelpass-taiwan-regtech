import { extractUnstructuredTextFile, type IntakeFileExtraction, unsupportedFileExtraction } from "./intake-file-parser";

type FileOcrKind = Extract<IntakeFileExtraction["kind"], "pdf" | "image" | "document">;

type OcrPayload = {
  raw_text?: unknown;
  product_name?: unknown;
  product_type_hint?: unknown;
  origin?: unknown;
  ingredients?: unknown;
  nutrition?: unknown;
  label_notes?: unknown;
  warnings?: unknown;
};

const openaiOcrModel = process.env.OPENAI_OCR_MODEL || process.env.OPENAI_REVIEW_MODEL || "gpt-5.4-mini";

const fileOcrSchema = {
  type: "object",
  additionalProperties: false,
  required: ["raw_text", "product_name", "product_type_hint", "origin", "ingredients", "nutrition", "label_notes", "warnings"],
  properties: {
    raw_text: { type: "string" },
    product_name: { type: "string" },
    product_type_hint: { type: "string" },
    origin: { type: "string" },
    ingredients: { type: "array", items: { type: "string" }, maxItems: 220 },
    nutrition: { type: "array", items: { type: "string" }, maxItems: 40 },
    label_notes: { type: "array", items: { type: "string" }, maxItems: 20 },
    warnings: { type: "array", items: { type: "string" }, maxItems: 10 }
  }
};

export function fileOcrReadiness() {
  const apiKeyPresent = Boolean(process.env.OPENAI_API_KEY);
  const disabled = process.env.LABELPASS_DISABLE_FILE_OCR === "1";

  return {
    provider: "openai" as const,
    model: openaiOcrModel,
    apiKeyPresent,
    disabled,
    ready: apiKeyPresent && !disabled,
    requiredEnv: ["OPENAI_API_KEY"],
    optionalEnv: ["OPENAI_OCR_MODEL", "LABELPASS_DISABLE_FILE_OCR=1"]
  };
}

export async function extractOpenAiFileOcr({
  buffer,
  fileName,
  mimeType,
  kind
}: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  kind: FileOcrKind;
}): Promise<IntakeFileExtraction> {
  const readiness = fileOcrReadiness();

  if (!readiness.ready) {
    const reason = readiness.disabled
      ? "파일 OCR이 설정에서 꺼져 있습니다. LABELPASS_DISABLE_FILE_OCR 값을 확인해야 합니다."
      : "PDF/이미지 OCR에는 OPENAI_API_KEY가 필요합니다. 현재 서버 환경에서는 OCR 키가 없어 자동 추출을 진행하지 못했습니다.";
    return unsupportedFileExtraction(fileName, reason);
  }

  try {
    const payload = await requestOpenAiFileOcr({ buffer, fileName, mimeType, kind, model: readiness.model });
    const rawText = stringField(payload.raw_text);
    const ingredients = stringArray(payload.ingredients, 220);
    const nutrition = stringArray(payload.nutrition, 40);
    const warnings = stringArray(payload.warnings, 10);

    if (!rawText && !ingredients.length && !nutrition.length) {
      return unsupportedFileExtraction(fileName, "OCR은 실행됐지만 읽을 수 있는 성분·라벨 텍스트를 찾지 못했습니다. 더 선명한 원본이 필요합니다.");
    }

    return extractUnstructuredTextFile(rawText || [...ingredients, ...nutrition].join("\n"), fileName, kind, {
      productName: stringField(payload.product_name),
      productTypeHint: stringField(payload.product_type_hint),
      originText: stringField(payload.origin),
      ingredients,
      nutrition,
      labelNotes: stringArray(payload.label_notes, 20),
      warnings
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 OCR 오류";
    return unsupportedFileExtraction(fileName, `OCR 요청에 실패했습니다: ${message}`);
  }
}

async function requestOpenAiFileOcr({
  buffer,
  fileName,
  mimeType,
  kind,
  model
}: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  kind: FileOcrKind;
  model: string;
}) {
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const prompt = [
    "You are extracting regulatory review inputs from a Taiwan import/export labeling document.",
    "Read Korean, English, Traditional Chinese, Simplified Chinese, and mixed ingredient tables.",
    "Return Korean JSON only.",
    "Do not decide regulatory approval. Only transcribe and structure what is visible.",
    "Keep ingredient names with useful aliases, percentages, CAS numbers, allergens, nutrition facts, origin, manufacturer/importer, and label warnings.",
    "If a field is not visible, return an empty string or empty array."
  ].join(" ");
  const content =
    kind === "image"
      ? [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: dataUri, detail: "high" }
        ]
      : [
          { type: "input_file", filename: fileName, file_data: dataUri },
          { type: "input_text", text: prompt }
        ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      max_output_tokens: 2800,
      input: [
        {
          role: "system",
          content:
            "You are a careful OCR extraction engine for LabelPass. Preserve visible text, separate ingredients from nutrition and label notes, and avoid adding facts that are not in the uploaded file."
        },
        {
          role: "user",
          content
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "labelpass_file_ocr",
          strict: true,
          schema: fileOcrSchema
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`OpenAI OCR ${response.status}${errorText ? `: ${errorText.slice(0, 180)}` : ""}`);
  }

  const responsePayload = (await response.json()) as Record<string, unknown>;
  const parsed = parseResponseJson(responsePayload);
  if (!parsed) throw new Error("OpenAI OCR 응답에서 JSON을 찾지 못했습니다.");
  return parsed;
}

function parseResponseJson(payload: Record<string, unknown>): OcrPayload | null {
  const directText = typeof payload.output_text === "string" ? payload.output_text : "";
  const text = directText || collectOutputText(payload.output);
  if (!text) return null;

  try {
    return JSON.parse(text) as OcrPayload;
  } catch {
    return null;
  }
}

function collectOutputText(output: unknown) {
  if (!Array.isArray(output)) return "";
  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) return [];
      return content.map((part) => {
        if (!part || typeof part !== "object") return "";
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      });
    })
    .join("");
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean).slice(0, limit);
}
