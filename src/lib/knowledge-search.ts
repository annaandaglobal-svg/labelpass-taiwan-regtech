import sourceIndexData from "../../data/knowledge/index.json";
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

export type KnowledgeSearchResult = {
  query: string;
  totals: {
    sources: number;
    terms: number;
    aliases: number;
    ruleLinks: number;
  };
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
    latestFetchedAt: string | null;
    nextRefreshAt: string | null;
  };
};

const terms = (termIndexData.terms ?? []) as KnowledgeTerm[];
const links = (termIndexData.term_rule_links ?? []) as TermRuleLink[];
const sources = (sourceIndexData.results ?? []) as SourceResult[];

const linksByTerm = new Map<string, TermRuleLink[]>();
for (const link of links) {
  linksByTerm.set(link.term_id, [...(linksByTerm.get(link.term_id) ?? []), link]);
}

export function normalizeKnowledgeQuery(value: string) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[^\p{Letter}\p{Number}%.+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const normalize = normalizeKnowledgeQuery;

function characterLength(value: string) {
  return Array.from(value).length;
}

function hasCjkOrHangul(value: string) {
  return /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(value);
}

function isShortLatin(value: string) {
  return /^[a-z0-9.+-]+$/i.test(value) && value.length <= 3;
}

function isBroadOrAmbiguous(alias: Alias) {
  const confidence = typeof alias.confidence === "number" ? alias.confidence : 0.85;
  return confidence < 0.75 || /ambiguous|broad|short/i.test(alias.note ?? "");
}

function tokenScore(target: string, query: string, exactOnly = false) {
  if (!target || !query) return 0;
  if (target === query) return 100;
  if (exactOnly) return 0;
  if (target.startsWith(query)) return 88;
  if (target.includes(query)) return 72;

  const queryTokens = query.split(" ").filter((token) => token.length > 1);
  if (queryTokens.length > 1 && queryTokens.every((token) => target.includes(token))) return 58;
  if (query.length > 4 && query.includes(target)) return 44;
  return 0;
}

function scoreAlias(alias: Alias, query: string) {
  const normalized = alias.normalized ?? normalize(alias.value);
  const exactOnly = isShortLatin(normalized) || isBroadOrAmbiguous(alias);
  const base = tokenScore(normalized, query, exactOnly);
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

  return base + confidenceBoost + typeBoost + exactBoost + localLanguageBoost + taiwanBoost - ambiguityPenalty;
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
    const key = `${alias.normalized ?? normalize(alias.value)}:${alias.language ?? ""}:${alias.jurisdiction ?? ""}:${alias.type ?? ""}`;
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
  const canonicalBase = tokenScore(normalizedCanonical, query);
  const canonicalScore = canonicalBase
    ? canonicalBase + (normalizedCanonical === query ? 16 : 0) + (aliasScores.length ? 6 : 0)
    : 0;
  const score = Math.max(canonicalScore, aliasScores[0]?.score ?? 0);
  return { score, aliasScores };
}

function scoreSource(source: SourceResult, query: string) {
  if (characterLength(query) <= 2 && !hasCjkOrHangul(query)) return 0;

  const haystack = normalize(
    [
      source.title,
      source.url,
      source.fetched_url,
      ...(source.extra_fetched_urls ?? []),
      source.authority,
      source.jurisdiction,
      source.domain,
      source.source_type,
      source.priority,
      source.excerpt,
      ...(source.tags ?? [])
    ].join(" ")
  );
  return tokenScore(haystack, query);
}

function topCounts(values: string[], limit = 8) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
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
    return { query: "", totals, terms: [], sources: [] };
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

  const sourceResults = sources
    .map((source) => ({
      source,
      score: scoreSource(source, query)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(4, Math.floor(limit / 2)))
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
      browserCapture: Boolean(source.browser_capture),
      manualFallback: Boolean(source.manual_fallback),
      documentPath: source.document_path ?? null,
      score
    }));

  return {
    query,
    totals,
    terms: termResults,
    sources: sourceResults
  };
}
