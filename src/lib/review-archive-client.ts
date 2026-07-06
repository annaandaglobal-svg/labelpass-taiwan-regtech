import type { ReviewArchiveResponse, SavedReview } from "@/lib/review-types";

// Thin browser client for the /api/reviews archive. The archive is opt-in (server env gates
// it), so every call degrades gracefully: if the archive is disabled/unavailable, reads return
// [] and writes are no-ops, leaving localStorage as the source of truth. When it IS enabled,
// reviews persist to Supabase and sync across sessions/devices.

export async function fetchArchivedReviews(ownerKey: string, limit = 40): Promise<SavedReview[]> {
  try {
    const ownerParam = ownerKey ? `&owner_key=${encodeURIComponent(ownerKey)}` : "";
    const response = await fetch(`/api/reviews?limit=${limit}${ownerParam}`, { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as ReviewArchiveResponse;
    if (data.storage !== "database" || !Array.isArray(data.reviews)) return [];
    return data.reviews;
  } catch {
    return [];
  }
}

export type ArchiveWriteResult = "database" | "disabled" | "unavailable";

export async function archiveReview(review: SavedReview, ownerKey: string): Promise<ArchiveWriteResult> {
  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...review, owner_key: ownerKey || undefined })
    });
    if (!response.ok) return "unavailable";
    const data = (await response.json()) as ReviewArchiveResponse;
    return data.storage === "database" ? "database" : data.storage === "unavailable" ? "unavailable" : "disabled";
  } catch {
    return "unavailable";
  }
}
