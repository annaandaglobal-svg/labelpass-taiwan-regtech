import type { ReviewInput, ReviewResult } from "./compliance";

export type SavedReview = {
  id: string;
  input: ReviewInput;
  result: ReviewResult;
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
