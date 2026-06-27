import type { ReviewStatus } from "@/lib/compliance";
import type { ReviewActionPlan } from "@/lib/review-action-plan";

export const HANDOFF_DRAFTS_STORAGE_KEY = "labelpass-handoff-drafts";
export const MAX_HANDOFF_DRAFTS = 6;

export type HandoffDraft = {
  id: string;
  createdAt: string;
  productName: string;
  productType: string;
  routeId: string;
  routeLabel: string;
  status: ReviewStatus;
  score: number;
  priority: ReviewActionPlan["priority"];
  nextAction: string;
  expertScope: string[];
  paymentGate: {
    label: string;
    detail: string;
  };
  logistics: {
    trigger: string;
    documents: string[];
  };
  evidenceCount: number;
  neededDocuments: number;
};

export function parseHandoffDrafts(raw: string | null): HandoffDraft[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is HandoffDraft => {
      return (
        item &&
        typeof item.id === "string" &&
        typeof item.productName === "string" &&
        typeof item.routeLabel === "string" &&
        typeof item.nextAction === "string" &&
        Array.isArray(item.expertScope)
      );
    });
  } catch {
    return [];
  }
}
