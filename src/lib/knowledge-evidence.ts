import type { KnowledgeSearchResult } from "./knowledge-search";
import { searchKnowledgeRuntime } from "./knowledge-runtime";
import evidenceTemplateData from "../../data/knowledge/evidence-bundle-templates.json";
import productRouteData from "../../data/knowledge/product-routing-matrix.json";

const POTASSIUM_GLYCEROPHOSPHATE_TERM_ID = "potassium-glycerophosphate-food-additive";

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

type EvidenceRouteHint = {
  routeId: string;
  label: string;
  productFamily: string;
  templateId: string;
  score: number;
  requiredInputs: string[];
  openQuestions: string[];
  nextAction: string;
  sourceIds: string[];
  termIds: string[];
};

export type KnowledgeEvidenceBundle = {
  query: string;
  summary: string;
  confidence: "high" | "medium" | "low";
  terms: EvidenceTerm[];
  sources: EvidenceSource[];
  routeHints: EvidenceRouteHint[];
  suggestedActions: string[];
  totals: KnowledgeSearchResult["totals"];
};

type EvidenceOptions = {
  productFamily?: string;
  routeId?: string;
};

function compact(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function unique(values: string[], limit: number) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit);
}

function compareStable(left: string, right: string) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function overlapCount(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value)).length;
}

function routeQueryScore(query: string, examples: string[]) {
  const normalized = query.toLowerCase();
  return examples.some((example) => normalized.includes(example.toLowerCase()) || example.toLowerCase().includes(normalized)) ? 30 : 0;
}

function confidenceFor(result: KnowledgeSearchResult): KnowledgeEvidenceBundle["confidence"] {
  const topTerm = result.terms[0]?.score ?? 0;
  const topSource = result.sources[0]?.score ?? 0;
  if (topTerm >= 95 || (topTerm >= 80 && topSource >= 60)) return "high";
  if (topTerm >= 60 || topSource >= 60) return "medium";
  return "low";
}

function hasPotassiumGlycerophosphate(result: KnowledgeSearchResult) {
  return result.terms.some((term) => term.id === POTASSIUM_GLYCEROPHOSPHATE_TERM_ID);
}

function buildSummary(query: string, result: KnowledgeSearchResult) {
  if (hasPotassiumGlycerophosphate(result)) {
    return `"${query}"는 금지목록 성분으로 확인된 것이 아니라, 대만 식품첨가물/영양첨가물 포지티브 리스트에서 정확명 등재가 확인되지 않은 성분입니다. 따라서 첨가물 용도라면 현재 근거로는 사용 불가로 판단하고, 일반 식품원료라고 주장하려면 TFDA 원료조회/공식 분류, 허가증, 중문명, 정확한 염 형태, 최종 식품군, 사용량 근거가 필요합니다.`;
  }

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

function routeHintsFor(result: KnowledgeSearchResult, query: string, options: EvidenceOptions) {
  const termIds = result.terms.map((term) => term.id);
  const sourceIds = result.sources.map((source) => source.id);
  const domains = result.sources.map((source) => source.domain);
  const categories = result.terms.map((term) => term.category);
  const routeRows = productRouteData.product_routes ?? [];
  const templates = evidenceTemplateData.templates ?? [];

  return routeRows
    .map((route) => {
      const template = templates.find((item) => item.product_route_id === route.id);
      if (!template) return null;
      let score = 0;
      if (options.routeId && route.id === options.routeId) score += 1000;
      if (options.productFamily && route.product_family === options.productFamily) score += 180;
      score += overlapCount(termIds, route.term_ids ?? []) * 90;
      score += overlapCount(sourceIds, route.source_ids ?? []) * 80;
      score += overlapCount(domains, template.match_domains ?? []) * 18;
      score += overlapCount(categories, template.match_categories ?? []) * 24;
      score += routeQueryScore(query, route.query_examples ?? []);
      if (score === 0) return null;

      return {
        routeId: route.id,
        label: route.label,
        productFamily: route.product_family,
        templateId: template.id,
        score,
        requiredInputs: (template.required_inputs ?? route.classification_inputs ?? []).slice(0, 7),
        openQuestions: (route.entry_questions ?? []).slice(0, 3),
        nextAction: template.next_action ?? route.next_actions?.[0] ?? "",
        sourceIds: (route.source_ids ?? []).slice(0, 6),
        termIds: (route.term_ids ?? []).slice(0, 6)
      };
    })
    .filter((hint): hint is EvidenceRouteHint => Boolean(hint))
    .sort((left, right) => right.score - left.score || compareStable(left.routeId, right.routeId))
    .slice(0, 3);
}

function suggestedActions(result: KnowledgeSearchResult, routeHints: EvidenceRouteHint[]) {
  const actions = [
    hasPotassiumGlycerophosphate(result) ? "식품첨가물/영양첨가물 용도라면 현재 기준으로 사용 불가로 표시하고, 허가증 또는 공식 분류 근거가 나오기 전까지 승인하지 마세요." : "",
    hasPotassiumGlycerophosphate(result) ? "공급사에서 일반 식품원료라고 주장하면 TFDA 원료조회 결과, 중문명, 정확한 염 형태, 최종 식품군, 사용량, 규격서를 받아 Calcium/Magnesium Glycerophosphate와 분리하세요." : "",
    routeHints[0]?.nextAction ? `업무 라우트: ${routeHints[0].nextAction}` : "",
    result.terms[0] ? `${result.terms[0].canonicalName} 기준으로 라벨 문구와 원료명을 재대조` : "",
    result.sources[0] ? `${result.sources[0].title} 원문 또는 캐시 문서를 검토 근거로 첨부` : "",
    result.sources.some((source) => source.cacheStatus === "stale") ? "만료된 소스는 재크롤링 큐에 올리고 변경 승인 후 룰에 반영" : "",
    result.terms.some((term) => term.aliasCount > 8) ? "동일 원료의 다국어 별칭을 제품 원문/OCR 텍스트와 함께 확인" : ""
  ];

  return unique(actions, 4);
}

export async function buildKnowledgeEvidenceBundle(rawQuery: string, limit = 12, options: EvidenceOptions = {}): Promise<KnowledgeEvidenceBundle> {
  const query = String(rawQuery ?? "").trim().slice(0, 160);
  const result = await searchKnowledgeRuntime(query, limit);
  const routeHints = routeHintsFor(result, query, options);

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
    routeHints,
    suggestedActions: suggestedActions(result, routeHints),
    totals: result.totals
  };
}
