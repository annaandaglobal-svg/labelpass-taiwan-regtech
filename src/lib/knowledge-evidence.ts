import type { KnowledgeSearchResult } from "./knowledge-search";
import { searchKnowledgeRuntime } from "./knowledge-runtime";

type EvidenceTerm = {
  id: string;
  canonicalName: string;
  category: string;
  score: number;
  aliases: string[];
  rules: string[];
  sourceKeys: string[];
};

type EvidenceSource = {
  id: string;
  title: string;
  authority: string;
  url: string;
  jurisdiction: string;
  domain: string;
  sourceType: string;
  priority: string;
  cacheStatus: string;
  cacheExpiresAt: string | null;
  documentPath: string | null;
  excerpt: string;
  score: number;
};

export type KnowledgeEvidenceBundle = {
  query: string;
  summary: string;
  confidence: "high" | "medium" | "low";
  terms: EvidenceTerm[];
  sources: EvidenceSource[];
  suggestedActions: string[];
  totals: KnowledgeSearchResult["totals"];
};

function compact(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function unique(values: string[], limit: number) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit);
}

function confidenceFor(result: KnowledgeSearchResult): KnowledgeEvidenceBundle["confidence"] {
  const topTerm = result.terms[0]?.score ?? 0;
  const topSource = result.sources[0]?.score ?? 0;
  if (topTerm >= 95 || (topTerm >= 80 && topSource >= 60)) return "high";
  if (topTerm >= 60 || topSource >= 60) return "medium";
  return "low";
}

function buildSummary(query: string, result: KnowledgeSearchResult) {
  const termNames = result.terms.slice(0, 3).map((term) => term.canonicalName);
  const sourceNames = result.sources.slice(0, 2).map((source) => source.title);

  if (termNames.length && sourceNames.length) {
    return `"${query}"는 ${termNames.join(", ")} 용어와 연결되고, ${sourceNames.join(" / ")} 근거 소스로 확인됩니다.`;
  }

  if (termNames.length) {
    return `"${query}"는 ${termNames.join(", ")} 용어와 연결됩니다. 연결 소스가 부족하면 용어 registry에 source_keys를 보강하세요.`;
  }

  if (sourceNames.length) {
    return `"${query}"는 직접 용어보다 공식 소스 ${sourceNames.join(" / ")}에서 먼저 포착됩니다.`;
  }

  return `"${query}"에 대한 재사용 근거가 부족합니다. 공식 소스 또는 별칭 후보를 추가해야 합니다.`;
}

function suggestedActions(result: KnowledgeSearchResult) {
  const actions = [
    result.terms[0] ? `${result.terms[0].canonicalName} 기준으로 라벨 문구와 원료명을 재대조` : "",
    result.sources[0] ? `${result.sources[0].title} 원문 또는 캐시 문서를 검토 근거로 첨부` : "",
    result.sources.some((source) => source.cacheStatus === "stale") ? "만료된 소스는 재크롤링 큐에 올리고 변경 승인 후 룰에 반영" : "",
    result.terms.some((term) => term.aliasCount > 8) ? "동일 원료의 다국어 별칭을 제품 원문/OCR 텍스트와 함께 확인" : ""
  ];

  return unique(actions, 4);
}

export async function buildKnowledgeEvidenceBundle(rawQuery: string, limit = 12): Promise<KnowledgeEvidenceBundle> {
  const query = String(rawQuery ?? "").trim().slice(0, 160);
  const result = await searchKnowledgeRuntime(query, limit);

  const terms = result.terms.slice(0, 5).map((term) => ({
    id: term.id,
    canonicalName: term.canonicalName,
    category: term.category,
    score: term.score,
    aliases: unique(term.aliases.map((alias) => alias.value), 8),
    rules: unique(term.rules.map((rule) => rule.ruleCode), 8),
    sourceKeys: term.sourceKeys
  }));

  const sources = result.sources.slice(0, 6).map((source) => ({
    id: source.id,
    title: source.title,
    authority: source.authority,
    url: source.url,
    jurisdiction: source.jurisdiction,
    domain: source.domain,
    sourceType: source.sourceType,
    priority: source.priority,
    cacheStatus: source.cacheStatus,
    cacheExpiresAt: source.cacheExpiresAt,
    documentPath: source.documentPath,
    excerpt: compact(source.excerpt, 260),
    score: source.score
  }));

  return {
    query: result.query || query,
    summary: buildSummary(query, result),
    confidence: confidenceFor(result),
    terms,
    sources,
    suggestedActions: suggestedActions(result),
    totals: result.totals
  };
}
