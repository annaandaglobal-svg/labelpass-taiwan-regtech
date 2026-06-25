import { searchKnowledge } from "./knowledge-search";
import { searchSupabaseKnowledge } from "./supabase-knowledge-search";

export async function searchKnowledgeRuntime(query: string, limit = 10) {
  const bundledResult = searchKnowledge(query, limit);

  try {
    const supabaseResult = await searchSupabaseKnowledge(query, limit);
    if (!supabaseResult) return bundledResult;
    if (!query.trim() || supabaseResult.terms.length || supabaseResult.sources.length) return supabaseResult;
    return { ...bundledResult, totals: supabaseResult.totals };
  } catch (error) {
    console.warn("Supabase knowledge search unavailable; using bundled cache.", error);
  }

  return bundledResult;
}
