import type { ReviewInput, ReviewResult, ReviewStatus } from "@/lib/compliance";

// A single completed review the customer has run, persisted in the browser so 내 제품 and the
// 일괄 검토 table can read real results (not demo rows). Kept in localStorage because the review
// API is stateless and there is no per-user DB yet.
export type SavedReview = {
  id: string;
  input: ReviewInput;
  result: ReviewResult;
};

export const SAVED_REVIEWS_KEY = "labelpass-reviews";
// Raised from 5 so a bulk run of many SKUs actually accumulates in 내 제품.
export const MAX_SAVED_REVIEWS = 60;

const OWNER_KEY_STORAGE = "labelpass-owner-key";

// A stable per-browser id used to scope reviews in the (opt-in) Supabase archive so one
// visitor never sees another's products. Generated once and kept in localStorage.
export function getOwnerKey(): string {
  if (typeof window === "undefined") return "";
  let key = window.localStorage.getItem(OWNER_KEY_STORAGE);
  if (!key) {
    key = globalThis.crypto?.randomUUID?.() ?? `owner-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(OWNER_KEY_STORAGE, key);
  }
  return key;
}

export function parseSavedReviews(raw: string | null): SavedReview[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedReview =>
        Boolean(item) &&
        typeof item.id === "string" &&
        Boolean(item.input) &&
        typeof item.input.productName === "string" &&
        Boolean(item.result) &&
        typeof item.result.status === "string"
    );
  } catch {
    return [];
  }
}

export function loadSavedReviews(): SavedReview[] {
  if (typeof window === "undefined") return [];
  return parseSavedReviews(window.localStorage.getItem(SAVED_REVIEWS_KEY));
}

// Newest first, de-duplicated by product name, capped.
export function mergeSavedReviews(existing: SavedReview[], incoming: SavedReview[]): SavedReview[] {
  const merged: SavedReview[] = [];
  const seen = new Set<string>();
  for (const review of [...incoming, ...existing]) {
    const key = review.input.productName.trim().toLowerCase() || review.id;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(review);
  }
  return merged.slice(0, MAX_SAVED_REVIEWS);
}

export function persistSavedReviews(reviews: SavedReview[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_REVIEWS_KEY, JSON.stringify(reviews.slice(0, MAX_SAVED_REVIEWS)));
}

// The 시안's five-step launch pipeline, shared by 홈 · 내 제품 · 일괄 검토.
export const REVIEW_PIPELINE = ["라벨 검토", "수정 반영", "전문가 검수", "TFDA 등록", "통관·선적"] as const;

type StatusMeta = { chip: "fail" | "warn" | "navy" | "pass"; label: string; step: number };

const STATUS_META: Record<ReviewStatus, StatusMeta> = {
  fail: { chip: "fail", label: "수정 필요", step: 1 },
  warn: { chip: "warn", label: "수정 권장", step: 1 },
  needs_info: { chip: "navy", label: "자료 필요", step: 1 },
  pass: { chip: "pass", label: "진행 가능", step: 2 }
};

export function deriveProductCategory(productType: string): string {
  const value = (productType || "").toLowerCase();
  if (/화장품|cosmetic|skincare|makeup|pif/.test(value)) return "화장품";
  if (/device|기기|electronic|전자/.test(value)) return "미용기기";
  if (/supplement|health\s*food|건강식품|protein|단백질/.test(value)) return "건강식품";
  if (/additive|ingredient|첨가물|원료/.test(value)) return "원료·첨가물";
  if (/packaging|contact|포장|용기/.test(value)) return "포장재";
  if (/food|식품|beverage|음료|snack/.test(value)) return "식품";
  return "기타";
}

export type ProductCard = {
  id: string;
  name: string;
  category: string;
  productType: string;
  status: ReviewStatus;
  chip: StatusMeta["chip"];
  statusLabel: string;
  score: number;
  step: number;
  failCount: number;
  warnCount: number;
  passCount: number;
  generatedAt: string;
};

export function deriveProductCard(review: SavedReview): ProductCard {
  const meta = STATUS_META[review.result.status] ?? STATUS_META.needs_info;
  const summary = review.result.summary ?? { fail: 0, warn: 0, pass: 0, needsInfo: 0 };
  return {
    id: review.id,
    name: review.input.productName || "이름 없는 제품",
    category: deriveProductCategory(review.input.productType),
    productType: review.input.productType,
    status: review.result.status,
    chip: meta.chip,
    statusLabel: meta.label,
    score: review.result.score,
    step: meta.step,
    failCount: summary.fail,
    warnCount: summary.warn,
    passCount: summary.pass,
    generatedAt: review.result.generatedAt
  };
}
