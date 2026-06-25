import { searchKnowledge } from "./knowledge-search";
import type { KnowledgeSearchResult } from "./knowledge-search";
import { searchSupabaseKnowledge } from "./supabase-knowledge-search";

function mergeKnowledgeResult(
  primary: KnowledgeSearchResult,
  fallback: KnowledgeSearchResult,
  limit: number
): KnowledgeSearchResult {
  const termIds = new Set(primary.terms.map((term) => term.id));
  const sourceIds = new Set(primary.sources.map((source) => source.id));

  return {
    ...primary,
    terms: [
      ...primary.terms,
      ...fallback.terms.filter((term) => {
        if (termIds.has(term.id)) return false;
        termIds.add(term.id);
        return true;
      })
    ].slice(0, limit),
    sources: [
      ...primary.sources,
      ...fallback.sources.filter((source) => {
        if (sourceIds.has(source.id)) return false;
        sourceIds.add(source.id);
        return true;
      })
    ].slice(0, limit)
  };
}

export async function searchKnowledgeRuntime(query: string, limit = 10) {
  const bundledResult = searchKnowledge(query, limit);

  try {
    const supabaseResult = await searchSupabaseKnowledge(query, limit);
    if (!supabaseResult) return bundledResult;
    if (!query.trim()) return supabaseResult;
    return mergeKnowledgeResult(supabaseResult, { ...bundledResult, totals: supabaseResult.totals }, limit);
  } catch (error) {
    console.warn("Supabase knowledge search unavailable; using bundled cache.", error);
  }

  return bundledResult;
}
