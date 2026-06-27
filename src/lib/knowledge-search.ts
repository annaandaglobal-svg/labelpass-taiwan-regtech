import sourceIndexData from "../../data/knowledge/index.json";
import aliasReviewQueueData from "../../data/knowledge/alias-review-queue.json";
import updateQueueData from "../../data/knowledge/regulatory-update-queue.json";
import termIndexData from "../../data/knowledge/term-index.json";

type Alias = {
  value: string;
  normalized?: string;
  type?: string;
  language?: string;
  jurisdiction?: string;
  confidence?: number;
  note?: string | null;
  source?: string;
};

type KnowledgeTerm = {
  id: string;
  canonical_name: string;
  category?: string;
  identifiers?: {
    cas?: string[];
    inci?: string[];
    color_index?: string[];
  };
  aliases?: Alias[];
  source_keys?: string[];
  notes?: string;
};

type TermRuleLink = {
  term_id: string;
  rule_code: string;
  jurisdiction?: string;
  match_basis?: string;
  confidence?: number;
};

type SourceResult = {
  id: string;
  title: string;
  url: string;
  fetched_url?: string;
  extra_fetched_urls?: string[];
  authority: string;
  jurisdiction: string;
  domain: string;
  source_type: string;
  priority: string;
  tags?: string[];
  excerpt?: string;
  format?: string;
  fetched_at?: string;
  from_cache?: boolean;
  cache_days?: number;
  cache_expires_at?: string;
  cache_status?: string;
  browser_capture?: boolean;
  manual_fallback?: boolean;
  document_path?: string;
};

type UpdateQueueItem = {
  candidate_key: string;
  severity: "low" | "medium" | "high";
  status: string;
};

type AliasReviewQueueItem = {
  id: string;
  status: string;
  issue: string;
  priority: "backlog" | "low" | "medium" | "high" | "blocker";
  alias: string;
  term_count: number;
  max_confidence: number;
  recommended_action?: string;
  terms?: Array<{
    term_id: string;
    canonical_name: string;
    confidence?: number;
    alias_value?: string;
    alias_type?: string;
    language?: string;
    jurisdiction?: string;
    notes?: string;
  }>;
};

export type KnowledgeSourceScoringInput = {
  title: string;
  url: string;
  fetchedUrl?: string;
  extraFetchedUrls?: string[];
  authority: string;
  jurisdiction: string;
  domain: string;
  sourceType: string;
  priority: string;
  tags?: string[];
  excerpt?: string;
};

export type KnowledgeSearchResult = {
  query: string;
  totals: {
    sources: number;
    terms: number;
    aliases: number;
    ruleLinks: number;
  };
  ambiguity: {
    query: string;
    normalized: string;
    termCount: number;
    terms: Array<{
      id: string;
      canonicalName: string;
      category: string;
      notes: string;
    }>;
    message: string;
  } | null;
  terms: Array<{
    id: string;
    canonicalName: string;
    category: string;
    score: number;
    identifiers: {
      cas: string[];
      inci: string[];
      colorIndex: string[];
    };
    aliases: Alias[];
    aliasCount: number;
    ambiguousAliases: Array<{
      value: string;
      normalized: string;
      otherTerms: string[];
      note: string;
      issue?: string;
      priority?: string;
      recommendedAction?: string;
      contexts?: Array<{
        termId: string;
        canonicalName: string;
        category: string;
        confidence: number;
        aliasType: string;
        language: string;
        jurisdiction: string;
        notes: string;
      }>;
    }>;
    sourceKeys: string[];
    notes: string;
    rules: Array<{
      ruleCode: string;
      jurisdiction: string;
      basis: string;
      confidence: number;
    }>;
  }>;
  sources: Array<{
    id: string;
    title: string;
    url: string;
    authority: string;
    jurisdiction: string;
    domain: string;
    sourceType: string;
    priority: string;
    tags: string[];
    format: string;
    fetchedAt: string | null;
    fromCache: boolean;
    cacheDays: number | null;
    cacheExpiresAt: string | null;
    cacheStatus: string;
    excerpt: string;
    browserCapture: boolean;
    manualFallback: boolean;
    documentPath: string | null;
    score: number;
  }>;
};

export type KnowledgeOverview = {
  generatedAt: string;
  sourceRegistryVersion: string;
  termRegistryVersion: string;
  coverage: {
    jurisdictions: Array<{ key: string; count: number }>;
    domains: Array<{ key: string; count: number }>;
    categories: Array<{ key: string; count: number }>;
    languages: Array<{ key: string; count: number }>;
  };
  operations: {
    fromCache: number;
    browserCaptures: number;
    manualFallbacks: number;
    highPrioritySources: number;
    staleSources: number;
    expiringSoonSources: number;
    updateCandidates: number;
    pendingUpdateCandidates: number;
    detectedUpdateCandidates: number;
    watchedUpdateSources: number;
    latestFetchedAt: string | null;
    nextRefreshAt: string | null;
  };
};

const terms = (termIndexData.terms ?? []) as KnowledgeTerm[];
const links = (termIndexData.term_rule_links ?? []) as TermRuleLink[];
const sources = (sourceIndexData.results ?? []) as SourceResult[];
const updateCandidates = (updateQueueData.items ?? []) as UpdateQueueItem[];
const aliasReviewItems = (aliasReviewQueueData.items ?? []) as AliasReviewQueueItem[];

const linksByTerm = new Map<string, TermRuleLink[]>();
for (const link of links) {
  linksByTerm.set(link.term_id, [...(linksByTerm.get(link.term_id) ?? []), link]);
}

const termNamesById = new Map(terms.map((term) => [term.id, term.canonical_name]));
const termCategoryById = new Map(terms.map((term) => [term.id, term.category ?? "term"]));

const regulatoryVariantFoldMap: Record<string, string> = {
  "妆": "粧",
  "妝": "粧",
  "氢": "氫",
  "钠": "鈉",
  "钾": "鉀",
  "钙": "鈣",
  "镁": "鎂",
  "锌": "鋅",
  "铁": "鐵",
  "铜": "銅",
  "铝": "鋁",
  "苏": "蘇",
  "胶": "膠",
  "壳": "殼",
  "类": "類",
  "虾": "蝦",
  "鱼": "魚",
  "贝": "貝",
  "麦": "麥",
  "麸": "麩",
  "质": "質",
  "坚": "堅",
  "黄": "黃",
  "晒": "曬",
  "盐": "鹽",
  "亚": "亞",
  "剂": "劑",
  "标": "標",
  "签": "籤",
  "营": "營",
  "养": "養",
  "过": "過",
  "产": "產",
  "资": "資",
  "讯": "訊",
  "档": "檔",
  "录": "錄",
  "验": "驗",
  "证": "證",
  "许": "許",
  "湾": "灣",
  "臺": "台"
};

function foldRegulatoryVariants(value: string) {
  return value.replace(/[妆妝氢钠钾钙镁锌铁铜铝苏胶壳类虾鱼贝麦麸质坚黄晒盐亚剂标签营养过产资讯档录验证许湾臺]/g, (character) => {
    return regulatoryVariantFoldMap[character] ?? character;
  });
}

export function normalizeKnowledgeQuery(value: string) {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[^\p{Letter}\p{Number}%.+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return foldRegulatoryVariants(normalized);
}

const normalize = normalizeKnowledgeQuery;

function compareStable(left: string, right: string) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function aliasReviewPriorityRank(priority: string) {
  if (priority === "blocker") return 0;
  if (priority === "high") return 1;
  if (priority === "medium") return 2;
  if (priority === "low") return 3;
  return 4;
}

const aliasReviewByNormalized = new Map<string, AliasReviewQueueItem[]>();
for (const item of aliasReviewItems) {
  const normalized = normalize(item.alias);
  if (!normalized || item.term_count <= 1 || !item.terms?.length) continue;
  aliasReviewByNormalized.set(normalized, [...(aliasReviewByNormalized.get(normalized) ?? []), item]);
}

for (const [normalized, items] of aliasReviewByNormalized) {
  aliasReviewByNormalized.set(
    normalized,
    items.sort(
      (left, right) =>
        aliasReviewPriorityRank(left.priority) - aliasReviewPriorityRank(right.priority) ||
        right.max_confidence - left.max_confidence ||
        compareStable(left.id, right.id)
    )
  );
}

function aliasReviewContextFor(normalized: string) {
  const items = aliasReviewByNormalized.get(normalized) ?? [];
  return items.find((item) => item.issue.includes("collision")) ?? items[0] ?? null;
}

const aliasOwners = new Map<string, Set<string>>();
for (const term of terms) {
  const aliases = [
    ...(term.aliases ?? []),
    ...(term.identifiers?.cas ?? []).map((value) => ({ value, normalized: normalizeKnowledgeQuery(value) })),
    ...(term.identifiers?.inci ?? []).map((value) => ({ value, normalized: normalizeKnowledgeQuery(value) })),
    ...(term.identifiers?.color_index ?? []).map((value) => ({ value, normalized: normalizeKnowledgeQuery(value) }))
  ];
  for (const alias of aliases) {
    const normalized = normalizeKnowledgeQuery(alias.value || alias.normalized || "");
    if (!normalized) continue;
    aliasOwners.set(normalized, (aliasOwners.get(normalized) ?? new Set()).add(term.id));
  }
}

export function foldKnowledgeSeparators(value: string) {
  return String(value ?? "").replace(/[\s._-]+/g, "");
}

function spaceKnowledgeSeparators(value: string) {
  return String(value ?? "").replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
}

function characterLength(value: string) {
  return Array.from(value).length;
}

function hasCjkOrHangul(value: string) {
  return /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(value);
}

function isShortLatin(value: string) {
  return /^[a-z0-9.+-]+$/i.test(value) && value.length <= 4;
}

function isCompactChemicalToken(value: string) {
  return /^[a-z0-9.+-]{2,6}$/i.test(value) && /\d/.test(value) && /[a-z]/i.test(value);
}

function isCasRegistryNumber(value: string) {
  return /^\d{2,7}-\d{2}-\d$/i.test(value);
}

function isBroadOrAmbiguous(alias: Alias) {
  const confidence = typeof alias.confidence === "number" ? alias.confidence : 0.85;
  return confidence < 0.75 || /ambiguous|broad|short/i.test(alias.note ?? "");
}

function tokenScore(target: string, query: string, exactOnly = false) {
  if (!target || !query) return 0;
  if (target === query) return 100;

  const targetFolded = foldKnowledgeSeparators(target);
  const queryFolded = foldKnowledgeSeparators(query);
  const canUseShortFoldedExact =
    targetFolded === queryFolded && isCompactChemicalToken(targetFolded) && isCompactChemicalToken(queryFolded);
  if (canUseShortFoldedExact) return 94;

  const canUseFolded = targetFolded.length > 3 && queryFolded.length > 3;
  if (canUseFolded && targetFolded === queryFolded) return 94;
  if (isCasRegistryNumber(target) && query.replace(/^cas\s+/i, "") === target) return 94;

  if (exactOnly) {
    const targetTokens = target.split(" ");
    const queryTokensForExact = query.split(" ");
    if (targetTokens.includes(query) || queryTokensForExact.includes(target)) return 86;
    return 0;
  }
  if (target.startsWith(query)) return 88;
  if (target.includes(query)) return 72;

  const targetSpaced = spaceKnowledgeSeparators(target);
  const querySpaced = spaceKnowledgeSeparators(query);
  if (querySpaced !== query && targetSpaced.includes(querySpaced)) return 72;
  if (canUseFolded && targetFolded.startsWith(queryFolded)) return 82;
  if (canUseFolded && targetFolded.includes(queryFolded)) return 66;

  const queryTokens = query.split(" ").filter((token) => token.length > 1);
  if (queryTokens.length > 1 && queryTokens.every((token) => target.includes(token))) return 58;
  if (query.length > 4 && query.includes(target)) return 44;
  if (canUseFolded && queryFolded.includes(targetFolded)) return 42;
  return 0;
}

const queryStopwords = new Set([
  "대만",
  "타이완",
  "taiwan",
  "tw",
  "official",
  "platform",
  "portal",
  "system",
  "database",
  "query",
  "lookup",
  "page",
  "臺灣",
  "台灣",
  "규정",
  "규제",
  "확인",
  "검색",
  "자료",
  "관련"
]);

function queryTokensForFallback(query: string) {
  return query
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => {
      if (!token || queryStopwords.has(token)) return false;
      if (isShortLatin(token)) return token.length >= 2;
      if (hasCjkOrHangul(token)) return characterLength(token) >= 2;
      return token.length > 2;
    });
}

function tokenScoreWithQueryFallback(target: string, query: string, exactOnly = false) {
  const directScore = tokenScore(target, query, exactOnly);
  if (directScore) return directScore;

  const queryTokens = queryTokensForFallback(query);
  if (queryTokens.length <= 1) return 0;

  const tokenScores = queryTokens.reduce<number[]>((scores, token) => {
    const tokenExactOnly = exactOnly || isShortLatin(token);
    const score = tokenScore(target, token, tokenExactOnly);
    if (score > 0) scores.push(score);
    return scores;
  }, []);

  if (!tokenScores.length) return 0;

  if (!hasCjkOrHangul(query)) {
    const coverage = tokenScores.length / queryTokens.length;
    if (tokenScores.length < 2 || coverage < 0.5) return 0;
    const averageScore = tokenScores.reduce((sum, score) => sum + Math.min(score, 88), 0) / tokenScores.length;
    const coverageBoost = Math.round(coverage * 20);
    const densityBoost = Math.min(12, tokenScores.length * 2);
    return Math.min(64, Math.max(38, Math.round(averageScore * 0.45) + coverageBoost + densityBoost));
  }

  return queryTokens.reduce((best, token) => {
    const tokenExactOnly = exactOnly || isShortLatin(token);
    const tokenScoreValue = tokenScore(target, token, tokenExactOnly);
    if (!tokenScoreValue) return best;
    return Math.max(best, Math.max(36, tokenScoreValue - 18));
  }, 0);
}

function scoreAlias(alias: Alias, query: string) {
  const normalized = normalize(alias.value || alias.normalized || "");
  const exactOnly = isShortLatin(normalized) || isBroadOrAmbiguous(alias);
  const base = tokenScoreWithQueryFallback(normalized, query, exactOnly);
  if (!base) return 0;

  const confidence = typeof alias.confidence === "number" ? alias.confidence : 0.85;
  const confidenceBoost = Math.round(confidence * 10);
  const typeBoost = alias.type === "cas" || alias.type === "color_index" || alias.type === "INCI" ? 8 : 0;
  const exactBoost = normalized === query ? 18 : 0;
  const localLanguageBoost =
    hasCjkOrHangul(query) && ["zh", "zh-Hant", "zh-Hans", "ko", "ja"].includes(alias.language ?? "")
      ? 7
      : 0;
  const taiwanBoost = alias.jurisdiction === "TW" && hasCjkOrHangul(query) ? 5 : 0;
  const ambiguityPenalty = isBroadOrAmbiguous(alias) ? 6 : 0;
  const sharedAliasPenalty = (aliasOwners.get(normalized)?.size ?? 0) > 1 ? 10 : 0;

  return base + confidenceBoost + typeBoost + exactBoost + localLanguageBoost + taiwanBoost - ambiguityPenalty - sharedAliasPenalty;
}

function aliasesForTerm(term: KnowledgeTerm): Alias[] {
  const identifierAliases: Alias[] = [
    ...(term.identifiers?.cas ?? []).map((value) => ({
      value,
      normalized: normalize(value),
      type: "cas",
      language: "und",
      jurisdiction: "GLOBAL",
      confidence: 1
    })),
    ...(term.identifiers?.inci ?? []).map((value) => ({
      value,
      normalized: normalize(value),
      type: "INCI",
      language: "en",
      jurisdiction: "GLOBAL",
      confidence: 1
    })),
    ...(term.identifiers?.color_index ?? []).map((value) => ({
      value,
      normalized: normalize(value),
      type: "color_index",
      language: "en",
      jurisdiction: "GLOBAL",
      confidence: 1
    }))
  ];

  const seen = new Set<string>();
  return [...(term.aliases ?? []), ...identifierAliases].filter((alias) => {
    const key = `${normalize(alias.value || alias.normalized || "")}:${alias.language ?? ""}:${alias.jurisdiction ?? ""}:${alias.type ?? ""}`;
    if (!alias.value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreTerm(term: KnowledgeTerm, query: string) {
  const aliasScores = aliasesForTerm(term)
    .map((alias) => ({ alias, score: scoreAlias(alias, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const normalizedCanonical = normalize(term.canonical_name);
  const canonicalBase = tokenScoreWithQueryFallback(normalizedCanonical, query);
  const canonicalScore = canonicalBase
    ? canonicalBase + (normalizedCanonical === query ? 16 : 0) + (aliasScores.length ? 6 : 0)
    : 0;
  const score = Math.max(canonicalScore, aliasScores[0]?.score ?? 0);
  return { score, aliasScores };
}

function ambiguousAliasesForTerm(term: KnowledgeTerm, aliases: Alias[], matchedAliases: Alias[]) {
  const matchedKeys = new Set(matchedAliases.map((alias) => normalize(alias.value || alias.normalized || "")));
  return aliases
    .map((alias) => {
      const normalized = normalize(alias.value || alias.normalized || "");
      if (!matchedKeys.has(normalized)) return null;
      const owners = aliasOwners.get(normalized);
      if (!owners || owners.size <= 1) return null;
      const otherTerms = [...owners]
        .filter((termId) => termId !== term.id)
        .map((termId) => termNamesById.get(termId) ?? termId)
        .sort((a, b) => compareStable(a, b))
        .slice(0, 5);
      if (!otherTerms.length) return null;
      const reviewContext = aliasReviewContextFor(normalized);
      const contexts = (reviewContext?.terms ?? [])
        .map((context) => ({
          termId: context.term_id,
          canonicalName: context.canonical_name,
          category: termCategoryById.get(context.term_id) ?? "term",
          confidence: context.confidence ?? 0,
          aliasType: context.alias_type ?? "alias",
          language: context.language ?? "und",
          jurisdiction: context.jurisdiction ?? "GLOBAL",
          notes: context.notes ?? ""
        }))
        .sort((left, right) => right.confidence - left.confidence || compareStable(left.canonicalName, right.canonicalName))
        .slice(0, 6);
      return {
        value: alias.value,
        normalized,
        otherTerms,
        note: reviewContext?.recommended_action ?? "동일 별칭이 여러 규제 용어에 연결되어 문맥 확인이 필요합니다.",
        issue: reviewContext?.issue,
        priority: reviewContext?.priority,
        recommendedAction: reviewContext?.recommended_action,
        contexts: contexts.length ? contexts : undefined
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.normalized === entry.normalized) === index)
    .slice(0, 4);
}

const sourceTagExpansions: Record<string, string[]> = {
  announcements: ["announcement", "notice", "latest notice", "regulatory update", "news"],
  pif: ["product information file", "product information dossier", "cosmetic safety dossier"],
  gmp: ["good manufacturing practice", "manufacturing quality system", "factory quality evidence"],
  "product-registration": ["product registration", "product notification", "product filing"],
  "product-notification": ["product notification", "product registration", "product filing"],
  "ingredient-restrictions": ["restricted ingredient", "prohibited ingredient", "ingredient limit"],
  "law-index": ["law regulations index", "guidance law regulations"],
  "latest-regulations": ["latest regulation", "regulatory update", "law amendment"],
  "food-additives": ["food additive", "additive permit", "composition report"],
  "health-food": ["health food", "permit number", "approved health care effects"],
  "import-inspection": ["imported food inspection", "border inspection", "document review"],
  "permit-query": ["permit query", "permit data query", "license query", "official lookup", "registration lookup"],
  "registration-number": ["registration number", "permit number", "license number"],
  "license-number": ["license number", "permit number", "registration number"],
  labeling: ["label", "labelling", "label required items", "mandatory label"],
  claims: ["advertisement", "promotion", "false exaggerated misleading medical efficacy"],
  ccc: ["ccc code", "commodity classification code", "import export regulation"],
  shtc: ["strategic high tech commodities", "export permit", "international import certificate"]
};

const taiwanRouteIntentTokens = new Set([
  "additive",
  "allergen",
  "ccc",
  "cosmetic",
  "cosmetics",
  "food",
  "gmp",
  "health",
  "ingredient",
  "inspection",
  "label",
  "labeling",
  "labelling",
  "nutrition",
  "packaging",
  "permit",
  "pif",
  "registration",
  "shtc",
  "tfda",
  "traceability"
]);

function sourceExpansionText(source: KnowledgeSourceScoringInput) {
  const normalizedTags = (source.tags ?? []).map((tag) => normalize(tag));
  const expansions = new Set<string>();

  for (const tag of normalizedTags) {
    expansions.add(tag);
    sourceTagExpansions[tag]?.forEach((term) => expansions.add(term));
  }

  const authority = normalize(source.authority);
  const domain = normalize(source.domain);
  const sourceType = normalize(source.sourceType);

  if (authority.includes("taiwan food and drug administration")) {
    ["tfda", "taiwan fda", "food and drug administration taiwan"].forEach((term) => expansions.add(term));
  }

  if (source.jurisdiction === "TW") {
    ["taiwan", "tw", "republic of china"].forEach((term) => expansions.add(term));
  }

  if (domain.includes("cosmetic")) {
    ["cosmetic", "cosmetics", "cosmetic products"].forEach((term) => expansions.add(term));
  }

  if (domain.includes("food")) {
    ["food", "foods", "food products", "food labeling"].forEach((term) => expansions.add(term));
  }

  if (sourceType.includes("notice")) {
    ["announcement", "notice", "latest announcement", "regulatory update"].forEach((term) => expansions.add(term));
  }

  return [...expansions].join(" ");
}

function queryHasTaiwanRouteIntent(query: string) {
  const tokens = queryTokensForFallback(query);
  if (tokens.some((token) => taiwanRouteIntentTokens.has(token))) return true;
  return [
    "product information file",
    "good manufacturing practice",
    "food and drug administration",
    "import export regulation"
  ].some((phrase) => query.includes(phrase));
}

function sourceIntentBoost(source: KnowledgeSourceScoringInput, query: string) {
  if (!queryHasTaiwanRouteIntent(query)) return 0;

  const authority = normalize(source.authority);
  const tags = (source.tags ?? []).map((tag) => normalize(tag));
  const tagSet = new Set(tags);
  const isTfda = authority.includes("taiwan food and drug administration");
  const isTaiwan = source.jurisdiction === "TW";
  const queryMentionsNotice = ["announcement", "announcements", "notice", "latest", "update"].some((term) =>
    query.includes(term)
  );
  const queryMentionsTfdaDomain = ["tfda", "cosmetic", "cosmetics", "food", "pif", "gmp"].some((term) =>
    query.includes(term)
  );
  const queryMentionsPermitLookup = query.includes("permit query") || query.includes("license query");

  let boost = 0;
  if (isTaiwan) boost += 8;
  if (isTfda && queryMentionsTfdaDomain) boost += 6;
  if (queryMentionsNotice && (tagSet.has("announcements") || normalize(source.sourceType).includes("notice"))) boost += 8;
  if (queryMentionsPermitLookup && tagSet.has("permit-query")) boost += 10;
  return boost;
}

function ambiguitySummary(query: string, termResults: KnowledgeSearchResult["terms"]): KnowledgeSearchResult["ambiguity"] {
  if (!query || termResults.length < 2) return null;
  const exactOwners = aliasOwners.get(query);
  const ownerIds = exactOwners ? new Set(exactOwners) : null;
  const ambiguousTerms = termResults.filter((term) => {
    if (ownerIds?.has(term.id)) return true;
    return term.ambiguousAliases.some((alias) => alias.normalized === query);
  });

  if (ambiguousTerms.length < 2) return null;

  const termsForSummary = ambiguousTerms.slice(0, 6).map((term) => ({
    id: term.id,
    canonicalName: term.canonicalName,
    category: term.category,
    notes: term.notes
  }));

  return {
    query,
    normalized: query,
    termCount: ambiguousTerms.length,
    terms: termsForSummary,
    message: "같은 검색어가 여러 규제 문맥에 연결됩니다. 품목, 용도, 표시문구 문맥을 함께 확인하세요."
  };
}

function scoreSourceFields(source: KnowledgeSourceScoringInput, query: string) {
  if (characterLength(query) <= 2 && !hasCjkOrHangul(query)) return 0;

  const expansionText = sourceExpansionText(source);
  const titleScore = tokenScoreWithQueryFallback(normalize(source.title), query);
  const tagScore = tokenScoreWithQueryFallback(normalize([...(source.tags ?? []), expansionText].join(" ")), query);
  const urlScore = tokenScoreWithQueryFallback(
    normalize([source.url, source.fetchedUrl, ...(source.extraFetchedUrls ?? [])].join(" ")),
    query
  );
  const metadataScore = tokenScoreWithQueryFallback(
    normalize([source.authority, source.jurisdiction, source.domain, source.sourceType, source.priority].join(" ")),
    query
  );
  const excerptScore = tokenScoreWithQueryFallback(normalize(source.excerpt ?? ""), query);
  const expansionScore = tokenScoreWithQueryFallback(normalize(expansionText), query);
  const haystackScore = tokenScoreWithQueryFallback(
    normalize(
      [
        source.title,
        source.url,
        source.fetchedUrl,
        ...(source.extraFetchedUrls ?? []),
        source.authority,
        source.jurisdiction,
        source.domain,
        source.sourceType,
        source.priority,
        source.excerpt,
        expansionText,
        ...(source.tags ?? [])
      ].join(" ")
    ),
    query
  );

  const matchedFields = [titleScore, tagScore, urlScore, metadataScore, excerptScore, expansionScore].filter(
    (score) => score > 0
  ).length;
  const bestScore = Math.max(
    titleScore ? titleScore + 8 : 0,
    tagScore ? tagScore + 6 : 0,
    urlScore ? urlScore + 4 : 0,
    metadataScore,
    excerptScore ? Math.max(0, excerptScore - 2) : 0,
    expansionScore ? expansionScore + 6 : 0,
    haystackScore
  );

  return Math.min(100, bestScore + (matchedFields >= 2 ? 4 : 0) + sourceIntentBoost(source, query));
}

export function scoreKnowledgeSourceForQuery(source: KnowledgeSourceScoringInput, rawQuery: string) {
  return scoreSourceFields(source, normalize(rawQuery).slice(0, 120));
}

function scoreSource(source: SourceResult, query: string) {
  return scoreSourceFields(
    {
      title: source.title,
      url: source.url,
      fetchedUrl: source.fetched_url,
      extraFetchedUrls: source.extra_fetched_urls,
      authority: source.authority,
      jurisdiction: source.jurisdiction,
      domain: source.domain,
      sourceType: source.source_type,
      priority: source.priority,
      tags: source.tags,
      excerpt: source.excerpt
    },
    query
  );
}

function sourcePriorityRank(priority: string) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function topCounts(values: string[], limit = 8) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || compareStable(a.key, b.key))
    .slice(0, limit);
}

function parseTime(value?: string | null) {
  const time = Date.parse(String(value ?? ""));
  return Number.isFinite(time) ? time : null;
}

export function getKnowledgeOverview(): KnowledgeOverview {
  const allAliases = terms.flatMap((term) => aliasesForTerm(term));
  const now = Date.now();
  const soonThreshold = now + 3 * 24 * 60 * 60 * 1000;
  const fetchedDates = sources.map((source) => parseTime(source.fetched_at)).filter((time): time is number => time !== null);
  const refreshDates = sources
    .map((source) => parseTime(source.cache_expires_at))
    .filter((time): time is number => time !== null);

  return {
    generatedAt: String((sourceIndexData as { generated_at?: string }).generated_at ?? ""),
    sourceRegistryVersion: String((sourceIndexData as { source_registry_version?: string }).source_registry_version ?? ""),
    termRegistryVersion: String((termIndexData as { registry_version?: string }).registry_version ?? ""),
    coverage: {
      jurisdictions: topCounts(sources.map((source) => source.jurisdiction)),
      domains: topCounts(sources.map((source) => source.domain)),
      categories: topCounts(terms.map((term) => term.category ?? "term")),
      languages: topCounts(allAliases.map((alias) => alias.language ?? "und"))
    },
    operations: {
      fromCache: sources.filter((source) => Boolean(source.from_cache)).length,
      browserCaptures: sources.filter((source) => source.browser_capture).length,
      manualFallbacks: sources.filter((source) => source.manual_fallback).length,
      highPrioritySources: sources.filter((source) => source.priority === "high").length,
      staleSources: sources.filter((source) => source.cache_status === "stale").length,
      expiringSoonSources: refreshDates.filter((time) => time > now && time <= soonThreshold).length,
      updateCandidates: updateCandidates.length,
      pendingUpdateCandidates: updateCandidates.filter((item) => item.status === "pending_refresh").length,
      detectedUpdateCandidates: updateCandidates.filter((item) => item.status === "detected").length,
      watchedUpdateSources: updateCandidates.filter((item) => item.status === "watching").length,
      latestFetchedAt: fetchedDates.length ? new Date(Math.max(...fetchedDates)).toISOString() : null,
      nextRefreshAt: refreshDates.length ? new Date(Math.min(...refreshDates)).toISOString() : null
    }
  };
}

export function searchKnowledge(rawQuery: string, limit = 10): KnowledgeSearchResult {
  const query = normalize(rawQuery).slice(0, 120);
  const aliasTotal = terms.reduce((count, term) => count + aliasesForTerm(term).length, 0);
  const totals = {
    sources: sources.length,
    terms: terms.length,
    aliases: aliasTotal,
    ruleLinks: links.length
  };

  if (!query) {
    return { query: "", totals, ambiguity: null, terms: [], sources: [] };
  }

  const termResults = terms
    .map((term) => {
      const aliases = aliasesForTerm(term);
      const scored = scoreTerm(term, query);
      if (!scored.score) return null;

      const matchedAliases = scored.aliasScores.length
        ? scored.aliasScores.slice(0, 8).map((entry) => entry.alias)
        : aliases.slice(0, 8);

      return {
        id: term.id,
        canonicalName: term.canonical_name,
        category: term.category ?? "term",
        score: scored.score,
        identifiers: {
          cas: term.identifiers?.cas ?? [],
          inci: term.identifiers?.inci ?? [],
          colorIndex: term.identifiers?.color_index ?? []
        },
        aliases: matchedAliases,
        aliasCount: aliases.length,
        ambiguousAliases: ambiguousAliasesForTerm(term, aliases, matchedAliases),
        sourceKeys: term.source_keys ?? [],
        notes: term.notes ?? "",
        rules: (linksByTerm.get(term.id) ?? []).slice(0, 12).map((link) => ({
          ruleCode: link.rule_code,
          jurisdiction: link.jurisdiction ?? "TW",
          basis: link.match_basis ?? "term",
          confidence: link.confidence ?? 0.85
        }))
      };
    })
    .filter((result): result is NonNullable<typeof result> => result !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit) as KnowledgeSearchResult["terms"];

  const sourceBoosts = new Map<string, number>();
  for (const term of termResults.slice(0, 6)) {
    term.sourceKeys.forEach((sourceKey, index) => {
      const orderedBoost = Math.max(36, term.score - 8 - index * 2);
      sourceBoosts.set(sourceKey, Math.max(sourceBoosts.get(sourceKey) ?? 0, orderedBoost));
    });
  }

  const sourceResults = sources
    .map((source) => ({
      source,
      score: Math.max(scoreSource(source, query), sourceBoosts.get(source.id) ?? 0)
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        sourcePriorityRank(a.source.priority) - sourcePriorityRank(b.source.priority) ||
        compareStable(a.source.title, b.source.title)
    )
    .slice(0, Math.max(8, limit))
    .map(({ source, score }) => ({
      id: source.id,
      title: source.title,
      url: source.url,
      authority: source.authority,
      jurisdiction: source.jurisdiction,
      domain: source.domain,
      sourceType: source.source_type,
      priority: source.priority,
      tags: source.tags ?? [],
      format: source.format ?? "html",
      fetchedAt: source.fetched_at ?? null,
      fromCache: Boolean(source.from_cache),
      cacheDays: source.cache_days ?? null,
      cacheExpiresAt: source.cache_expires_at ?? null,
      cacheStatus: source.cache_status ?? "unknown",
      excerpt: source.excerpt ?? "",
      browserCapture: Boolean(source.browser_capture),
      manualFallback: Boolean(source.manual_fallback),
      documentPath: source.document_path ?? null,
      score
    }));

  return {
    query,
    totals,
    ambiguity: ambiguitySummary(query, termResults),
    terms: termResults,
    sources: sourceResults
  };
}
