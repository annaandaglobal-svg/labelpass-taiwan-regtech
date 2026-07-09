// KNOWLEDGE-GROUNDED CONSULTATION CHAT (RAG)
// -----------------------------------------------------------------------------
// Turns the curated knowledge base (term-registry → verdicts) into a conversational
// Q&A layer. Unlike the keyword search, this understands a natural-language question
// ("총비소랑 무기비소 뭐가 달라?"), RETRIEVES the relevant verdicts/terms, and asks an
// LLM to answer ONLY from that retrieved context — with citations, and never inventing
// numbers that aren't in the context.
//
// Safety rules (prompt + retrieval gate):
//   1. Grounded-only: the model may use ONLY the retrieved CONTEXT. No context → it must
//      say it cannot confirm and route to official sources / expert, NOT guess.
//   2. No fabricated limits: numeric limits may appear ONLY if present in the context.
//   3. Fully gated: no OpenAI key (or flag off) → not ready; the route degrades to a
//      retrieval-only answer (verdict snippets) with no LLM call.

import { searchKnowledge } from "./knowledge-search";
import { verdictForKnowledgeTerm } from "./knowledge-verdicts";
import { scrubInferredText } from "./ai-ingredient-fallback";
import { recordUnknownTopic } from "./learning-queue";

const openaiApiKey = process.env.OPENAI_API_KEY;
// Reuse the AI-review enablement so an operator who turned on AI review gets the chat too;
// a dedicated flag can force it on/off independently.
const chatFlag = process.env.LABELPASS_ENABLE_CONSULT_CHAT;
const aiReviewFlag = process.env.LABELPASS_ENABLE_AI_REVIEW === "1";
const chatEnabled = chatFlag === "1" || (chatFlag !== "0" && aiReviewFlag);
const chatModel = process.env.OPENAI_CONSULT_MODEL || process.env.OPENAI_REVIEW_MODEL || "gpt-5.4-mini";
const RETRIEVE_K = 8;
const MIN_SCORE = 45; // below this a term is too weak to be a trustworthy citation

export type ConsultCitation = {
  id: string;
  term: string;
  category: string;
  label: string;
  detail: string;
  uncertainty?: string;
  sourceKeys: string[];
};

export type ConsultAnswer = {
  answer: string;
  grounded: boolean; // true when the answer rests on retrieved KB context
  citations: ConsultCitation[];
  model: string | null;
  source: "kb-grounded" | "retrieval-only" | "no-context" | "ai-inferred";
};

export function consultChatReadiness() {
  return {
    provider: "openai" as const,
    model: chatModel,
    apiKeyPresent: Boolean(openaiApiKey),
    enabled: chatEnabled,
    ready: Boolean(openaiApiKey) && chatEnabled,
    requiredEnv: ["OPENAI_API_KEY", "LABELPASS_ENABLE_CONSULT_CHAT=1 (or LABELPASS_ENABLE_AI_REVIEW=1)"]
  };
}

// Common Korean particles (josa) — stripped from a word so "무기비소가" retrieves the term "무기비소".
const JOSA = ["이랑", "으로", "에서", "에게", "까지", "부터", "보다", "처럼", "든지", "이나", "밖에", "조차", "마다", "랑", "와", "과", "가", "이", "은", "는", "을", "를", "에", "의", "도", "로", "만", "나", "든", "뿐"];

function stripJosa(word: string): string {
  for (const j of JOSA) {
    if (word.length > j.length + 1 && word.endsWith(j)) return word.slice(0, -j.length);
  }
  return word;
}

/**
 * Build the candidate queries for a natural-language question: the whole question, plus each
 * meaningful word with its trailing particle stripped. A raw sentence often fails to match a
 * term ("총비소랑…" vs the alias "총비소"); the word-level queries recover it.
 */
function candidateQueries(question: string): string[] {
  const queries = [question];
  const words = question
    .split(/[\s,./?!·、，。？！()"'\[\]]+/)
    .map((w) => stripJosa(w.trim()))
    .filter((w) => w.length >= 2 && !/^(뭐가|뭐|무엇|어떻게|차이|달라|되나요|인가요|하나요|알려|주세요|무슨|어떤|왜|얼마|언제|어디)$/.test(w));
  for (const w of words) if (!queries.includes(w)) queries.push(w);
  return queries.slice(0, 8);
}

/** Retrieve the strongest verdict-bearing terms for a natural-language question. */
export async function retrieveConsultContext(question: string): Promise<ConsultCitation[]> {
  const cleaned = question.trim();
  if (cleaned.length < 2) return [];

  // Gather the best-scoring term hit across all candidate queries, keyed by term id.
  // Uses the bundled catalog search (not the Supabase-merged runtime search) so retrieval is
  // deterministic and independent of any network/mirror state — the bundle is authoritative.
  type CatalogTerm = ReturnType<typeof searchKnowledge>["terms"][number];
  const bestByTerm = new Map<string, { term: CatalogTerm; score: number }>();
  for (const q of candidateQueries(cleaned)) {
    let result;
    try {
      result = searchKnowledge(q, RETRIEVE_K);
    } catch {
      continue;
    }
    for (const term of result.terms) {
      const score = term.score ?? 0;
      if (score < MIN_SCORE) continue;
      const prev = bestByTerm.get(term.id);
      if (!prev || score > prev.score) bestByTerm.set(term.id, { term, score });
    }
  }

  const ranked = [...bestByTerm.values()].sort((a, b) => b.score - a.score);
  const citations: ConsultCitation[] = [];
  const seen = new Set<string>();
  for (const { term } of ranked) {
    const verdict = verdictForKnowledgeTerm(term);
    if (!verdict) continue;
    if (seen.has(verdict.label)) continue; // collapse duplicate verdict cards
    seen.add(verdict.label);
    citations.push({
      id: term.id,
      term: term.canonicalName,
      category: term.category,
      label: verdict.label,
      detail: verdict.detail,
      uncertainty: verdict.uncertainty,
      sourceKeys: term.sourceKeys ?? []
    });
    if (citations.length >= 5) break;
  }
  return citations;
}

const SYSTEM_PROMPT =
  "당신은 대만 수출 규제 상담 어시스턴트입니다. 한국 수출자의 질문에 한국어로 답합니다. " +
  "절대 규칙: (1) 아래 제공된 CONTEXT(큐레이션 규제 지식)에 근거해서만 답하세요. CONTEXT에 없는 내용은 " +
  "지어내지 말고 '현재 지식베이스에서 확인되지 않습니다 — 공식 출처나 전문가 확인이 필요합니다'라고 하세요. " +
  "(2) 구체적 수치(ppm·%·mg·한도)는 CONTEXT에 있을 때만 인용하고, 없으면 수치를 만들지 마세요. " +
  "(3) 답변은 간결하고 실무적으로, 필요하면 근거가 된 항목명을 함께 언급하세요. " +
  "(4) 불확실하거나 리스크가 크면 전문가 상담·공식 확인을 권하세요.";

function buildContextBlock(citations: ConsultCitation[]): string {
  return citations
    .map((c, i) => {
      const parts = [`[${i + 1}] ${c.term} (${c.category})`, `판정: ${c.label}`, `설명: ${c.detail}`];
      if (c.uncertainty) parts.push(`확인필요: ${c.uncertainty}`);
      return parts.join("\n");
    })
    .join("\n\n");
}

/**
 * Answer a consultation question grounded in the KB. Always returns something safe:
 * - no relevant KB context → an honest "not confirmed, see expert" answer (no LLM call);
 * - LLM disabled/errored → retrieval-only answer built from the verdict snippets;
 * - otherwise → an LLM answer constrained to the retrieved context.
 */
export async function answerConsult(question: string, history: Array<{ role: "user" | "assistant"; text: string }> = []): Promise<ConsultAnswer> {
  const citations = await retrieveConsultContext(question);

  if (!citations.length) {
    // Leave a signal about what the curated KB is missing: a server log (always) + the learning queue
    // (best-effort, writable fs) so gaps can be prioritised for a verified research + ingestion pass.
    console.log("[consult-unknown]", question.slice(0, 200));
    void recordUnknownTopic(question, new Date().toISOString());
    // Graceful degrade: instead of a dead-end, give an AI-INFERRED direction — clearly unverified,
    // never with fabricated numbers — when the LLM is available. Otherwise stay honestly blank.
    const inferred = await inferUnknown(question);
    if (inferred) {
      return {
        answer:
          "⚠️ 이 성분·주제는 현재 큐레이션 규제 지식베이스에 없어 아래는 AI 추론(미검증)입니다. 반드시 공식 출처(TFDA·법령) 또는 전문가로 확인하세요.\n\n" +
          inferred,
        grounded: false,
        citations: [],
        model: chatModel,
        source: "ai-inferred"
      };
    }
    return {
      answer:
        "현재 지식베이스에서 이 질문에 대한 확실한 근거를 찾지 못했습니다. 성분·품목명을 더 구체적으로 알려주시거나, 공식 출처(TFDA·법령) 확인 또는 전문가 상담을 권합니다.",
      grounded: false,
      citations: [],
      model: null,
      source: "no-context"
    };
  }

  const readiness = consultChatReadiness();
  if (!readiness.ready) {
    // Retrieval-only fallback: surface the most relevant verdict directly.
    const top = citations[0];
    const answer =
      `'${top.term}' 관련해서 확인된 판정입니다:\n\n${top.label} — ${top.detail}` +
      (top.uncertainty ? `\n\n확인 필요: ${top.uncertainty}` : "") +
      (citations.length > 1 ? `\n\n(관련 항목: ${citations.slice(1).map((c) => c.term).join(", ")})` : "");
    return { answer, grounded: true, citations, model: null, source: "retrieval-only" };
  }

  const contextBlock = buildContextBlock(citations);
  const historyText = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "질문" : "답변"}: ${m.text}`)
    .join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: chatModel,
        max_output_tokens: 900,
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  (historyText ? `이전 대화:\n${historyText}\n\n` : "") +
                  `CONTEXT (이 안에서만 답하세요):\n${contextBlock}\n\n질문: ${question}`
              }
            ]
          }
        ]
      })
    });
    if (!response.ok) return retrievalOnly(citations, question);
    const payload = (await response.json()) as Record<string, unknown>;
    const text = extractText(payload).trim();
    if (!text) return retrievalOnly(citations, question);
    return { answer: text, grounded: true, citations, model: chatModel, source: "kb-grounded" };
  } catch {
    return retrievalOnly(citations, question);
  }
}

const INFER_SYSTEM_PROMPT =
  "당신은 대만(TFDA) 수입 규제 어시스턴트입니다. 큐레이션 지식베이스에 없는 성분·주제에 대해 " +
  "'가능성 있는 규제 분류·방향'만 한국어로 추론합니다. 절대 규칙: (1) 구체적 수치(ppm·%·mg·한도)와 " +
  "특정 조문 번호는 절대 쓰지 말고 '공식 목록으로 확인'이라고 하세요 — 수치를 지어내면 안 됩니다. " +
  "(2) 확신하지 말고 '~일 가능성', '확인 필요'로 보수적으로 쓰세요. (3) 2~4문장으로 짧게, 무엇을 어디서 " +
  "확인해야 하는지(성분명/CAS/품목 범주, TFDA 원료조회·공식 목록)를 함께 안내하세요.";

/** Best-effort AI inference for a topic the curated KB does not cover. Returns null when the LLM is
 *  unavailable or errors — the caller then stays honestly blank. Numbers are scrubbed as a backstop. */
async function inferUnknown(question: string): Promise<string | null> {
  if (!consultChatReadiness().ready) return null;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: chatModel,
        max_output_tokens: 500,
        input: [
          { role: "system", content: INFER_SYSTEM_PROMPT },
          { role: "user", content: [{ type: "input_text", text: `질문: ${question}\n\n큐레이션 DB에 근거가 없습니다. 가능성 있는 대만 규제 분류·방향만 보수적으로 추론하고, 수치 없이 확인 방법을 안내하세요.` }] }
        ]
      })
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as Record<string, unknown>;
    const text = extractText(payload).trim();
    if (!text) return null;
    return scrubInferredText(text); // backstop: strip any numeric limit the model slipped in
  } catch {
    return null;
  }
}

function retrievalOnly(citations: ConsultCitation[], _question: string): ConsultAnswer {
  const top = citations[0];
  return {
    answer: `'${top.term}' 관련 확인된 판정: ${top.label} — ${top.detail}` + (top.uncertainty ? `\n\n확인 필요: ${top.uncertainty}` : ""),
    grounded: true,
    citations,
    model: null,
    source: "retrieval-only"
  };
}

function extractText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = payload.output;
  if (!Array.isArray(output)) return "";
  return output
    .flatMap((item) => {
      const content = item && typeof item === "object" ? (item as { content?: unknown }).content : null;
      if (!Array.isArray(content)) return [];
      return content.map((part) => (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? (part as { text: string }).text : ""));
    })
    .join("");
}
