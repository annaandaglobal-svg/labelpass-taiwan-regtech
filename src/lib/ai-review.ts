import type { ReviewInput, ReviewResult } from "./compliance";

export type AiReviewInsight = {
  provider: "openai";
  model: string;
  status: "generated" | "skipped" | "error";
  summary: string;
  productCategory: string;
  riskLevel: "low" | "medium" | "high" | "unknown";
  riskSignals: string[];
  documentGaps: string[];
  customsQuestions: string[];
  sourceAlignment: string[];
  confidence: "low" | "medium" | "high";
  warning?: string;
};

const openaiApiKey = process.env.OPENAI_API_KEY;
const aiReviewEnabled = process.env.LABELPASS_ENABLE_AI_REVIEW === "1";
const openaiReviewModel = process.env.OPENAI_REVIEW_MODEL || "gpt-5.4-mini";

const aiReviewSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "product_category",
    "risk_level",
    "risk_signals",
    "document_gaps",
    "customs_questions",
    "source_alignment",
    "confidence"
  ],
  properties: {
    summary: { type: "string" },
    product_category: { type: "string" },
    risk_level: { type: "string", enum: ["low", "medium", "high", "unknown"] },
    risk_signals: { type: "array", items: { type: "string" }, maxItems: 8 },
    document_gaps: { type: "array", items: { type: "string" }, maxItems: 8 },
    customs_questions: { type: "array", items: { type: "string" }, maxItems: 8 },
    source_alignment: { type: "array", items: { type: "string" }, maxItems: 8 },
    confidence: { type: "string", enum: ["low", "medium", "high"] }
  }
};

export function aiReviewReadiness() {
  return {
    provider: "openai" as const,
    model: openaiReviewModel,
    apiKeyPresent: Boolean(openaiApiKey),
    enabled: aiReviewEnabled,
    ready: Boolean(openaiApiKey) && aiReviewEnabled,
    requiredEnv: ["OPENAI_API_KEY", "LABELPASS_ENABLE_AI_REVIEW=1"],
    optionalEnv: ["OPENAI_REVIEW_MODEL"]
  };
}

export async function generateAiReviewInsight(input: ReviewInput, result: ReviewResult): Promise<AiReviewInsight | null> {
  const readiness = aiReviewReadiness();
  if (!readiness.ready) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: openaiReviewModel,
        max_output_tokens: 900,
        input: [
          {
            role: "system",
            content:
              "You are a Taiwan import labeling compliance analyst. Return Korean JSON only. Use the provided rule findings as ground truth, do not invent official citations, and flag uncertainty clearly."
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildAiReviewPrompt(input, result)
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "labelpass_ai_review",
            strict: true,
            schema: aiReviewSchema
          }
        }
      })
    });

    if (!response.ok) {
      return errorInsight(readiness.model, `OpenAI API ${response.status}`);
    }

    const payload = await response.json();
    const parsed = parseResponseJson(payload);
    if (!parsed) return errorInsight(readiness.model, "OpenAI 응답을 JSON으로 읽지 못했습니다.");

    return {
      provider: "openai",
      model: readiness.model,
      status: "generated",
      summary: stringField(parsed.summary),
      productCategory: stringField(parsed.product_category),
      riskLevel: enumField(parsed.risk_level, ["low", "medium", "high", "unknown"], "unknown"),
      riskSignals: stringArray(parsed.risk_signals),
      documentGaps: stringArray(parsed.document_gaps),
      customsQuestions: stringArray(parsed.customs_questions),
      sourceAlignment: stringArray(parsed.source_alignment),
      confidence: enumField(parsed.confidence, ["low", "medium", "high"], "low")
    };
  } catch (error) {
    return errorInsight(readiness.model, error instanceof Error ? error.message : "AI 분석 호출 실패");
  }
}

function buildAiReviewPrompt(input: ReviewInput, result: ReviewResult) {
  const findings = result.findings.slice(0, 12).map((finding) => ({
    status: finding.status,
    area: finding.area,
    title: finding.title,
    source: finding.source,
    evidence: finding.evidence
  }));

  return JSON.stringify(
    {
      task:
        "대만 수입/라벨링 1차 분석 결과를 사람이 바로 이해할 수 있게 요약하고, 품목 분류, 성분/서류/통관 질문, 추가 확인 항목을 정리하세요.",
      product: {
        name: input.productName,
        type: input.productType,
        origin: input.origin,
        manufacturer: input.manufacturer,
        hsCode: input.hsCode,
        incoterms: input.incoterms,
        shipmentPurpose: input.shipmentPurpose
      },
      ingredientsText: input.ingredientsText.slice(0, 6000),
      labelText: input.labelText.slice(0, 6000),
      ruleResult: {
        status: result.status,
        score: result.score,
        summary: result.summary,
        nextAction: result.actionPlan.nextAction,
        findings
      }
    },
    null,
    2
  );
}

function parseResponseJson(payload: Record<string, unknown>) {
  const directText = typeof payload.output_text === "string" ? payload.output_text : "";
  const text = directText || collectOutputText(payload.output);
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
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

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean).slice(0, 8);
}

function enumField<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function errorInsight(model: string, warning: string): AiReviewInsight {
  return {
    provider: "openai",
    model,
    status: "error",
    summary: "AI 분석 호출에 실패해 규칙 기반 1차 검토 결과만 표시합니다.",
    productCategory: "확인 필요",
    riskLevel: "unknown",
    riskSignals: [],
    documentGaps: [],
    customsQuestions: [],
    sourceAlignment: [],
    confidence: "low",
    warning
  };
}
