import { scoreKnowledgeSourceForQuery, searchKnowledge } from "./knowledge-search";
import type { KnowledgeSearchResult } from "./knowledge-search";
import { searchSupabaseKnowledge } from "./supabase-knowledge-search";

function sourcePriorityRank(priority: string) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function compareStable(left: string, right: string) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function normalizeRuntimeQuery(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u3131-\u318e\uac00-\ud7a3\u4e00-\u9fff]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function termQueryRank(term: KnowledgeSearchResult["terms"][number], rawQuery: string) {
  const query = normalizeRuntimeQuery(rawQuery);
  if (!query) return 10;

  const canonicalName = normalizeRuntimeQuery(term.canonicalName);
  if (canonicalName === query) return 0;
  if (canonicalName.startsWith(`${query} `)) return 1;

  const identifiers = [
    ...(term.identifiers.cas ?? []),
    ...(term.identifiers.inci ?? []),
    ...(term.identifiers.colorIndex ?? [])
  ].map(normalizeRuntimeQuery);
  if (identifiers.includes(query)) return 2;

  const aliases = term.aliases.map((alias) => normalizeRuntimeQuery(alias.value));
  if (aliases.includes(query)) return 3;
  if (canonicalName.includes(query)) return 4;
  if (aliases.some((alias) => alias.includes(query))) return 5;
  return 10;
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

type AmbiguousAlias = KnowledgeSearchResult["terms"][number]["ambiguousAliases"][number];

function mergeAmbiguousAliases(primary: AmbiguousAlias[] = [], fallback: AmbiguousAlias[] = []) {
  const byNormalized = new Map<string, AmbiguousAlias>();

  for (const alias of primary) {
    byNormalized.set(alias.normalized, { ...alias });
  }

  for (const alias of fallback) {
    const existing = byNormalized.get(alias.normalized);
    if (!existing) {
      byNormalized.set(alias.normalized, { ...alias });
      continue;
    }

    const existingContextCount = existing.contexts?.length ?? 0;
    const nextContextCount = alias.contexts?.length ?? 0;
    byNormalized.set(alias.normalized, {
      ...existing,
      ...(nextContextCount > existingContextCount ? alias : {}),
      value: existing.value || alias.value,
      otherTerms: uniqueValues([...(existing.otherTerms ?? []), ...(alias.otherTerms ?? [])]),
      contexts:
        nextContextCount > existingContextCount
          ? alias.contexts
          : existing.contexts?.length
            ? existing.contexts
            : alias.contexts,
      issue: existing.issue ?? alias.issue,
      priority: existing.priority ?? alias.priority,
      recommendedAction: existing.recommendedAction ?? alias.recommendedAction,
      note: existing.recommendedAction ?? alias.recommendedAction ?? existing.note ?? alias.note
    });
  }

  return [...byNormalized.values()];
}

function mergeKnowledgeResult(
  primary: KnowledgeSearchResult,
  fallback: KnowledgeSearchResult,
  limit: number
): KnowledgeSearchResult {
  const terms = primary.terms.map((term) => ({ ...term }));
  const termsById = new Map(terms.map((term) => [term.id, term]));
  const termIds = new Set(terms.map((term) => term.id));
  const sourcesById = new Map(primary.sources.map((source) => [source.id, { ...source }]));

  for (const fallbackTerm of fallback.terms) {
    const primaryTerm = termsById.get(fallbackTerm.id);
    if (primaryTerm) {
      primaryTerm.sourceKeys = uniqueValues([...(primaryTerm.sourceKeys ?? []), ...(fallbackTerm.sourceKeys ?? [])]);
      primaryTerm.rules = primaryTerm.rules.length
        ? [...primaryTerm.rules, ...fallbackTerm.rules].filter(
            (rule, index, list) => list.findIndex((candidate) => candidate.ruleCode === rule.ruleCode) === index
          )
        : fallbackTerm.rules;
      if (fallbackTerm.score > primaryTerm.score) {
        primaryTerm.score = fallbackTerm.score;
        primaryTerm.aliases = fallbackTerm.aliases;
        primaryTerm.aliasCount = Math.max(primaryTerm.aliasCount, fallbackTerm.aliasCount);
        primaryTerm.rules = fallbackTerm.rules.length ? fallbackTerm.rules : primaryTerm.rules;
      }
      primaryTerm.ambiguousAliases = mergeAmbiguousAliases(primaryTerm.ambiguousAliases, fallbackTerm.ambiguousAliases);
      continue;
    }
    if (termIds.has(fallbackTerm.id)) continue;
    termIds.add(fallbackTerm.id);
    terms.push(fallbackTerm);
  }

  for (const fallbackSource of fallback.sources) {
    const existing = sourcesById.get(fallbackSource.id);
    if (!existing || fallbackSource.score > existing.score) {
      sourcesById.set(fallbackSource.id, { ...fallbackSource });
    }
  }

  const query = primary.query || fallback.query;
  const mergedTerms = terms
    .sort(
      (a, b) =>
        b.score - a.score ||
        termQueryRank(a, query) - termQueryRank(b, query) ||
        compareStable(a.canonicalName, b.canonicalName)
    )
    .slice(0, limit);

  const mergedSources = [...sourcesById.values()]
    .map((source) => {
      const normalizedScore = scoreKnowledgeSourceForQuery(
        {
          title: source.title,
          url: source.url,
          authority: source.authority,
          jurisdiction: source.jurisdiction,
          domain: source.domain,
          sourceType: source.sourceType,
          priority: source.priority,
          tags: source.tags,
          excerpt: source.excerpt
        },
        query
      );
      return {
        ...source,
        score: normalizedScore >= 38 ? normalizedScore : source.score
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        sourcePriorityRank(a.priority) - sourcePriorityRank(b.priority) ||
        compareStable(a.title, b.title)
    )
    .slice(0, limit);

  return {
    ...primary,
    totals: primary.totals,
    ambiguity: primary.ambiguity ?? fallback.ambiguity,
    terms: mergedTerms,
    sources: mergedSources
  };
}

export async function searchKnowledgeRuntime(query: string, limit = 10) {
  const bundledResult = searchKnowledge(query, limit);

  try {
    const supabaseResult = await searchSupabaseKnowledge(query, limit);
    if (!supabaseResult) return bundledResult;
    return mergeKnowledgeResult(supabaseResult, bundledResult, limit);
  } catch (error) {
    console.warn("Supabase knowledge search unavailable; using bundled cache.", error);
  }

  return bundledResult;
}
