// AI INGREDIENT FALLBACK
// -----------------------------------------------------------------------------
// The curated knowledge base (data/knowledge/term-registry.json → verdicts) is the source of
// truth. It covers regulated + common ingredients precisely. For the long tail — an ingredient the
// KB has no confident match for — this optional layer asks an LLM to infer the *likely* regulatory
// CLASS so the user gets a hint instead of nothing.
//
// Hard safety rules (enforced by prompt + schema + post-processing):
//   1. Curated verdicts ALWAYS win. This only runs for ingredients the KB did not match.
//   2. NEVER invent specific Taiwan numeric limits or cite specific regulations — output a CLASS
//      and "verify against the official list". Fabricated ppm/% values are the main hallucination
//      risk and are explicitly forbidden.
//   3. Conservative: when unsure, return needs_verification, not a confident allow/ban.
//   4. Everything is labelled source:"ai-inferred" with capped confidence so the UI can show it as
//      an unverified hint, clearly separated from curated verdicts.
//   5. Fully gated: with the flag off or no API key, every function is a no-op (returns null/[]),
//      so tool behaviour is identical to today unless an operator explicitly enables it.

const openaiApiKey = process.env.OPENAI_API_KEY;
const fallbackEnabled = process.env.LABELPASS_ENABLE_AI_INGREDIENT_FALLBACK === "1";
const fallbackModel = process.env.OPENAI_INGREDIENT_FALLBACK_MODEL || "gpt-5.4-mini";
const MAX_BATCH = 30;

export type AiIngredientStatus =
  | "generally_permitted"
  | "restricted_or_conditional"
  | "likely_prohibited"
  | "needs_verification"
  | "unknown";

export type AiIngredientVerdict = {
  name: string;
  domain: "cosmetic" | "food" | "supplement" | "other" | "unknown";
  status: AiIngredientStatus;
  reason: string;
  note: string;
  source: "ai-inferred";
  confidence: "low" | "medium";
};

export function aiIngredientFallbackReadiness() {
  return {
    provider: "openai" as const,
    model: fallbackModel,
    apiKeyPresent: Boolean(openaiApiKey),
    enabled: fallbackEnabled,
    ready: Boolean(openaiApiKey) && fallbackEnabled,
    requiredEnv: ["OPENAI_API_KEY", "LABELPASS_ENABLE_AI_INGREDIENT_FALLBACK=1"],
    optionalEnv: ["OPENAI_INGREDIENT_FALLBACK_MODEL"]
  };
}

const perItemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "domain", "status", "reason", "note"],
  properties: {
    name: { type: "string" },
    domain: { type: "string", enum: ["cosmetic", "food", "supplement", "other", "unknown"] },
    status: {
      type: "string",
      enum: ["generally_permitted", "restricted_or_conditional", "likely_prohibited", "needs_verification", "unknown"]
    },
    reason: { type: "string" },
    note: { type: "string" }
  }
};

const fallbackSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ingredients"],
  properties: {
    ingredients: { type: "array", items: perItemSchema, maxItems: MAX_BATCH }
  }
};

const SYSTEM_PROMPT =
  "You are a Taiwan (TFDA) import-compliance assistant classifying ingredients a curated database " +
  "did not recognise. For EACH ingredient infer its LIKELY Taiwan regulatory class only. STRICT RULES: " +
  "(1) NEVER state a specific numeric limit (ppm, %, mg) and NEVER cite a specific regulation number — " +
  "instead say to verify against the official Taiwan list. Inventing numbers is forbidden. " +
  "(2) Be conservative: if you are not confident, use status 'needs_verification'. Use 'likely_prohibited' " +
  "only for well-known dangerous/banned substance classes. (3) Write reason/note in Korean, one short " +
  "sentence each, and always frame as an AI inference to be confirmed. Return JSON only.";

// In-process cache so repeated queries for the same ingredient don't re-hit the API.
const cache = new Map<string, AiIngredientVerdict>();
const cacheKey = (name: string, productType: string) => `${productType.toLowerCase()}::${name.toLowerCase().trim()}`;

/**
 * Classify ingredients the curated KB did not match. Returns [] when disabled/unconfigured or on
 * error — callers must treat an empty result as "no fallback available", never as "all clear".
 */
export async function classifyUnknownIngredients(names: string[], productType = ""): Promise<AiIngredientVerdict[]> {
  const readiness = aiIngredientFallbackReadiness();
  const cleaned = dedupe(names.map((n) => n.trim()).filter((n) => n.length >= 2)).slice(0, MAX_BATCH);
  if (!cleaned.length) return [];

  // Serve cached, only call the API for the rest.
  const out: AiIngredientVerdict[] = [];
  const toAsk: string[] = [];
  for (const name of cleaned) {
    const hit = cache.get(cacheKey(name, productType));
    if (hit) out.push(hit);
    else toAsk.push(name);
  }
  if (!toAsk.length) return out;
  if (!readiness.ready) return out; // disabled: return only whatever was cached (usually [])

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: fallbackModel,
        max_output_tokens: 1400,
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  productType: productType || "unknown",
                  ingredients: toAsk,
                  instruction:
                    "각 성분의 대만 규제 '분류'만 추론하세요. 정확한 수치·조문은 절대 쓰지 말고 '공식 목록으로 확인'이라고 하세요."
                })
              }
            ]
          }
        ],
        text: { format: { type: "json_schema", name: "labelpass_ingredient_fallback", strict: true, schema: fallbackSchema } }
      })
    });
    if (!response.ok) return out;
    const payload = (await response.json()) as Record<string, unknown>;
    const parsed = parseJson(payload);
    const items = Array.isArray(parsed?.ingredients) ? parsed!.ingredients : [];
    for (const raw of items) {
      const verdict = sanitize(raw);
      if (!verdict) continue;
      cache.set(cacheKey(verdict.name, productType), verdict);
      out.push(verdict);
    }
    return out;
  } catch {
    return out;
  }
}

/** Map an AI status to the shared verdict shape so the UI can render it like a (clearly-flagged) verdict. */
export function aiVerdictToDisplay(v: AiIngredientVerdict) {
  const tone =
    v.status === "likely_prohibited" ? "red" : v.status === "generally_permitted" ? "green" : "gold";
  const label =
    v.status === "generally_permitted"
      ? "AI 추론: 일반 허용 가능성 (미검증)"
      : v.status === "restricted_or_conditional"
        ? "AI 추론: 제한·조건부 가능성 (미검증)"
        : v.status === "likely_prohibited"
          ? "AI 추론: 금지 가능성 (미검증)"
          : "AI 추론: 확인 필요 (미검증)";
  return {
    label,
    detail: `${v.reason} ${v.note}`.trim(),
    tone,
    state: "needs_check" as const,
    aiInferred: true,
    confidence: v.confidence,
    chips: ["AI 추론(미검증)", "공식 목록 확인 필요"],
    actions: [`'${v.name}'은(는) 큐레이션 DB에 없어 AI가 추론한 결과입니다 — 대만 공식 성분 목록으로 반드시 확인하세요.`]
  };
}

function sanitize(raw: unknown): AiIngredientVerdict | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) return null;
  const domain = pick(o.domain, ["cosmetic", "food", "supplement", "other", "unknown"], "unknown");
  const status = pick(
    o.status,
    ["generally_permitted", "restricted_or_conditional", "likely_prohibited", "needs_verification", "unknown"],
    "needs_verification"
  );
  // Strip any fabricated numeric limits the model may have slipped in despite instructions.
  const scrub = (s: unknown) => stripNumbers(typeof s === "string" ? s : "");
  return {
    name,
    domain,
    status,
    reason: scrub(o.reason),
    note: scrub(o.note),
    source: "ai-inferred",
    confidence: status === "unknown" || status === "needs_verification" ? "low" : "medium"
  };
}

// Remove concrete ppm/%/mg figures so an unverified inference can never present a fabricated limit.
function stripNumbers(s: string) {
  return s
    .replace(/\d+(?:[.,]\d+)?\s*(?:ppm|%|mg|g\/kg|µg|mcg|iu)\b/gi, "해당 한도(공식 목록 확인)")
    .trim();
}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && allowed.includes(v as T) ? (v as T) : fallback;
}
function dedupe(arr: string[]) {
  const seen = new Set<string>();
  return arr.filter((x) => {
    const k = x.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
function parseJson(payload: Record<string, unknown>): Record<string, unknown> | null {
  const direct = typeof payload.output_text === "string" ? payload.output_text : "";
  const text = direct || collectText(payload.output);
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}
function collectText(output: unknown) {
  if (!Array.isArray(output)) return "";
  return output
    .flatMap((item) => {
      const content = item && typeof item === "object" ? (item as { content?: unknown }).content : null;
      if (!Array.isArray(content)) return [];
      return content.map((part) => (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? (part as { text: string }).text : ""));
    })
    .join("");
}
