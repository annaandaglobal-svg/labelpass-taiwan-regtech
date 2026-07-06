import type { ReviewInput, ReviewResult, ReviewStatus } from "@/lib/compliance";
import { deriveProductCategory } from "@/lib/saved-reviews";
import { fromBase64, toBase64 } from "@/lib/quote";

// A compact, read-only snapshot of a 1차 검토 result that fits in a shareable URL, so a
// customer can hand the verdict to a boss or client without a login/DB. Only the fields a
// reviewer needs are carried — the full ReviewResult would blow past URL length limits.
export type ShareableReport = {
  v: 1;
  name: string;
  category: string;
  status: ReviewStatus;
  score: number;
  summary: { fail: number; warn: number; pass: number; needsInfo: number };
  issues: Array<{ title: string; area: string; state: string; why: string; fix: string }>;
  ingredients: Array<{ name: string; state: string; label: string }>;
  at: string;
  version: string;
};

const MAX_ISSUES = 14;
const MAX_INGREDIENTS = 16;

export function buildShareableReport(input: ReviewInput, result: ReviewResult): ShareableReport {
  const seenTitles = new Set<string>();
  const rankedFindings = [...result.findings]
    .sort((a, b) => statusRank(a.status) - statusRank(b.status))
    .filter((finding) => {
      const key = `${finding.title}|${finding.area}`;
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });
  return {
    v: 1,
    name: input.productName || "이름 없는 제품",
    category: deriveProductCategory(input.productType),
    status: result.status,
    score: result.score,
    summary: result.summary,
    issues: rankedFindings.slice(0, MAX_ISSUES).map((finding) => ({
      title: finding.title,
      area: finding.area,
      state: finding.status,
      why: finding.why.slice(0, 220),
      fix: (finding.fix[0] ?? "").slice(0, 180)
    })),
    ingredients: result.ingredientVerdicts.slice(0, MAX_INGREDIENTS).map((verdict) => ({
      name: verdict.canonicalName,
      state: verdict.stateLabel,
      label: verdict.label
    })),
    at: result.generatedAt,
    version: result.ruleVersion
  };
}

function statusRank(status: ReviewStatus): number {
  if (status === "fail") return 0;
  if (status === "warn") return 1;
  if (status === "needs_info") return 2;
  return 3;
}

export function encodeReport(report: ShareableReport): string {
  return encodeURIComponent(toBase64(JSON.stringify(report)));
}

export function decodeReport(encoded: string): ShareableReport | null {
  try {
    const parsed = JSON.parse(fromBase64(decodeURIComponent(encoded)));
    if (!parsed || typeof parsed !== "object" || parsed.v !== 1 || typeof parsed.name !== "string") return null;
    if (!Array.isArray(parsed.issues) || !Array.isArray(parsed.ingredients)) return null;
    return parsed as ShareableReport;
  } catch {
    return null;
  }
}

export const REPORT_STATUS_COPY: Record<ReviewStatus, { label: string; tone: string; detail: string }> = {
  fail: { label: "출시 보류", tone: "fail", detail: "바로 수정해야 하는 항목이 있습니다." },
  warn: { label: "수정 권장", tone: "warn", detail: "판매 전 문구·라벨·증빙을 보강하면 통과 가능성이 높아집니다." },
  needs_info: { label: "자료 필요", tone: "navy", detail: "판정 확정을 위해 함량·수입자·시험자료 등 추가 자료가 필요합니다." },
  pass: { label: "진행 가능", tone: "pass", detail: "1차 자동검토에서 즉시 멈출 항목이 보이지 않습니다." }
};
