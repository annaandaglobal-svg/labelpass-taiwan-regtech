import type { ReviewInput, ReviewResult } from "./compliance";

export type SavedReview = {
  id: string;
  input: ReviewInput;
  result: ReviewResult;
  // Optional per-SKU organisation tags (client/brand, assignee). Rides in the archive payload so a
  // shared team code syncs them across devices. Edited independently of the review itself.
  meta?: { client?: string; assignee?: string };
};

export type ReviewArchiveStorage = "database" | "browser" | "disabled" | "unavailable";

export type ReviewArchiveResponse = {
  storage: Exclude<ReviewArchiveStorage, "browser">;
  reviews?: SavedReview[];
  review?: SavedReview | null;
  reviewId?: string;
  dryRun?: boolean;
  access?: "restricted";
  error?: string;
};
