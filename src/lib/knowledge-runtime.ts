import { searchKnowledge } from "./knowledge-search";
import { searchSupabaseKnowledge } from "./supabase-knowledge-search";

export async function searchKnowledgeRuntime(query: string, limit = 10) {
  try {
    const supabaseResult = await searchSupabaseKnowledge(query, limit);
    if (supabaseResult) return supabaseResult;
  } catch (error) {
    console.warn("Supabase knowledge search unavailable; using bundled cache.", error);
  }

  return searchKnowledge(query, limit);
}
