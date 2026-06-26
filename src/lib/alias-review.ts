import aliasReviewQueueData from "../../data/knowledge/alias-review-queue.json";

export type AliasReviewPriority = "blocker" | "high" | "medium" | "low" | "backlog";

export type AliasReviewTerm = {
  term_id: string;
  canonical_name: string;
  confidence: number;
  alias_value: string;
  alias_type: string;
  language: string;
  jurisdiction: string;
  notes: string;
};

export type AliasReviewItem = {
  id: string;
  status: string;
  issue: string;
  priority: AliasReviewPriority;
  sort_order: number;
  alias: string;
  term_count: number;
  max_confidence: number;
  strict_blocker: boolean;
  high_confidence_collision: boolean;
  recommended_action: string;
  terms: AliasReviewTerm[];
};

export type AliasReviewQueue = {
  generated_at: string;
  source: {
    registry_version: string;
    term_index_generated_at: string | null;
    term_index_path: string;
    term_registry_path: string;
    audit_command: string;
  };
  summary: {
    generated_at: string;
    registry_version: string;
    terms_scanned: number;
    aliases_scanned: number;
    alias_rows_scanned: number;
    collision_groups: number;
    high_confidence_collisions: number;
    short_ambiguous_aliases_without_notes: number;
    mojibake_aliases: number;
    short_abbreviations_without_notes: number;
    regulated_terms_without_local_alias: number;
    strict_blockers: number;
    review_items: number;
  };
  items: AliasReviewItem[];
};

const aliasReviewQueue = aliasReviewQueueData as AliasReviewQueue;

export function getAliasReviewQueue() {
  return aliasReviewQueue;
}
