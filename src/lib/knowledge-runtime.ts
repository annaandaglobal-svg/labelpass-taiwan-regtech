import { scoreKnowledgeSourceForQuery, searchKnowledge } from "./knowledge-search";
import type { KnowledgeSearchResult } from "./knowledge-search";
import { searchSupabaseKnowledge } from "./supabase-knowledge-search";

function sourcePriorityRank(priority: string) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
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
      if (fallbackTerm.score > primaryTerm.score) {
        primaryTerm.score = fallbackTerm.score;
        primaryTerm.aliases = fallbackTerm.aliases;
        primaryTerm.aliasCount = Math.max(primaryTerm.aliasCount, fallbackTerm.aliasCount);
        primaryTerm.rules = fallbackTerm.rules.length ? fallbackTerm.rules : primaryTerm.rules;
      }
      if (!primaryTerm.ambiguousAliases?.length && fallbackTerm.ambiguousAliases?.length) {
        primaryTerm.ambiguousAliases = fallbackTerm.ambiguousAliases;
      }
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

  const mergedTerms = terms
    .sort((a, b) => b.score - a.score || a.canonicalName.localeCompare(b.canonicalName))
    .slice(0, limit);

  const query = primary.query || fallback.query;
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
        a.title.localeCompare(b.title)
    )
    .slice(0, limit);

  return {
    ...primary,
    totals: fallback.totals,
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
