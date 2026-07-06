"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, Boxes, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import type { ReviewInput, ReviewResult } from "@/lib/compliance";
import {
  deriveProductCard,
  loadSavedReviews,
  mergeSavedReviews,
  persistSavedReviews,
  type ProductCard,
  type SavedReview
} from "@/lib/saved-reviews";

type RowStatus = "pending" | "extracting" | "reviewing" | "done" | "error";

type BulkRow = {
  id: string;
  fileName: string;
  status: RowStatus;
  card: ProductCard | null;
  error?: string;
};

function stripExtension(name: string) {
  return name.replace(/\.[^./\\]+$/, "").replace(/[_-]+/g, " ").trim();
}

async function extractOneFile(file: File): Promise<{
  productName: string;
  productType: string;
  ingredientsText: string;
  labelText: string;
  origin: string;
}> {
  const formData = new FormData();
  formData.append("files", file, file.name);
  const response = await fetch("/api/intake/files", { method: "POST", body: formData });
  if (!response.ok) throw new Error("extract_failed");
  const data = await response.json();
  return {
    productName: (data.productName as string) || stripExtension(file.name),
    productType: (data.productTypeHint as string) || "",
    ingredientsText: (data.ingredientsText as string) || "",
    labelText: (data.labelText as string) || `첨부 파일: ${file.name}`,
    origin: (data.originText as string) || ""
  };
}

async function reviewInput(input: ReviewInput): Promise<ReviewResult> {
  const response = await fetch("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("review_failed");
  return response.json();
}

const filters: Array<{ key: "all" | "fail" | "warn" | "pass"; label: string }> = [
  { key: "all", label: "전체" },
  { key: "fail", label: "수정 필요" },
  { key: "warn", label: "확인 권장" },
  { key: "pass", label: "진행 가능" }
];

export function BulkReviewClient() {
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [filter, setFilter] = useState<"all" | "fail" | "warn" | "pass">("all");
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const summary = useMemo(() => {
    const cards = rows.map((row) => row.card).filter(Boolean) as ProductCard[];
    return {
      total: cards.length,
      fail: cards.filter((c) => c.status === "fail").length,
      warn: cards.filter((c) => c.status === "warn").length,
      pass: cards.filter((c) => c.status === "pass").length,
      info: cards.filter((c) => c.status === "needs_info").length
    };
  }, [rows]);

  const visibleRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((row) => {
      if (!row.card) return true;
      if (filter === "fail") return row.card.status === "fail";
      if (filter === "warn") return row.card.status === "warn" || row.card.status === "needs_info";
      return row.card.status === "pass";
    });
  }, [rows, filter]);

  async function runBulk(files: FileList) {
    const list = Array.from(files).slice(0, 40);
    if (!list.length) return;
    setRunning(true);
    setProgress({ done: 0, total: list.length });
    const initialRows: BulkRow[] = list.map((file, index) => ({
      id: `${index}-${file.name}`,
      fileName: file.name,
      status: "pending",
      card: null
    }));
    setRows(initialRows);

    const collected: SavedReview[] = [];
    for (let index = 0; index < list.length; index += 1) {
      const file = list[index];
      const rowId = initialRows[index].id;
      const patch = (next: Partial<BulkRow>) =>
        setRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...next } : row)));
      try {
        patch({ status: "extracting" });
        const extracted = await extractOneFile(file);
        patch({ status: "reviewing" });
        const input: ReviewInput = {
          productName: extracted.productName,
          productType: extracted.productType,
          ingredientsText: extracted.ingredientsText,
          labelText: extracted.labelText,
          origin: extracted.origin,
          manufacturer: ""
        };
        const result = await reviewInput(input);
        const review: SavedReview = {
          id: `bulk-${rowId}-${result.generatedAt}`,
          input,
          result
        };
        collected.push(review);
        patch({ status: "done", card: deriveProductCard(review) });
      } catch {
        patch({ status: "error", error: "이 파일은 읽거나 검토하지 못했습니다." });
      } finally {
        setProgress((current) => ({ ...current, done: current.done + 1 }));
      }
    }

    if (collected.length) {
      const merged = mergeSavedReviews(loadSavedReviews(), collected);
      persistSavedReviews(merged);
      setSavedCount(collected.length);
    }
    setRunning(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const hasResults = rows.some((row) => row.card);

  return (
    <section className="lp-main bulk-main">
      <header className="workspace-topbar">
        <div>
          <p>일괄 검토</p>
          <h1>여러 제품(SKU)을 한 번에 올려 규제 판정을 표로 받습니다.</h1>
        </div>
        <div className="workspace-topbar-actions">
          <Link className="workspace-button" href="/review">
            <ArrowRight size={15} />
            단일 검토
          </Link>
          <Link className="workspace-button primary" href="/workspace">
            <Boxes size={15} />
            내 제품에서 보기
          </Link>
        </div>
      </header>

      <p className="bulk-intro">
        파일 <b>한 개당 제품 1개(SKU)</b>로 처리합니다. 엑셀·CSV·PDF·이미지의 성분표/라벨을 여러 개 선택하면 각각 개별 판정하고,
        결과는 <b>내 제품</b>에 그대로 쌓입니다. 한 번에 최대 40개.
      </p>

      <div className="bulk-drop" data-running={running}>
        <UploadCloud size={26} />
        <b>제품 파일 여러 개 선택</b>
        <span>각 파일이 하나의 SKU로 검토됩니다. 엑셀/CSV/PDF/이미지/DOCX</span>
        <button
          type="button"
          className="lp-button"
          disabled={running}
          onClick={() => fileInputRef.current?.click()}
        >
          {running ? <Loader2 className="lp-spin" size={16} /> : <UploadCloud size={16} />}
          {running ? `검토 중 ${progress.done}/${progress.total}` : "파일 선택"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => event.target.files && runBulk(event.target.files)}
        />
      </div>

      {savedCount > 0 && !running && (
        <div className="bulk-saved-note">
          <CheckCircle2 size={16} />
          {savedCount}개 제품을 검토해 <Link href="/workspace">내 제품</Link>에 저장했습니다.
        </div>
      )}

      {hasResults && (
        <div className="bulk-summary">
          <span className="chip fail">수정 필요 {summary.fail}</span>
          <span className="chip warn">확인 권장 {summary.warn + summary.info}</span>
          <span className="chip pass">진행 가능 {summary.pass}</span>
          <span className="bulk-summary-total">총 {summary.total}개</span>
        </div>
      )}

      {(hasResults || running) && (
        <div className="bulk-filters" role="tablist" aria-label="상태 필터">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === filter ? "on" : ""}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {(hasResults || running) && (
        <div className="bulk-table" role="table">
          <div className="bulk-row bulk-head" role="row">
            <span>제품</span>
            <span>품목</span>
            <span>판정</span>
            <span>점수</span>
            <span>문제</span>
          </div>
          {visibleRows.map((row) => (
            <div key={row.id} className="bulk-row" role="row">
              <span className="bulk-name">{row.card?.name ?? stripExtension(row.fileName)}</span>
              <span className="bulk-cat">{row.card?.category ?? "—"}</span>
              <span>
                {row.status === "done" && row.card ? (
                  <span className={`chip ${row.card.chip}`}>{row.card.statusLabel}</span>
                ) : row.status === "error" ? (
                  <span className="chip fail">오류</span>
                ) : (
                  <span className="bulk-progress">
                    <Loader2 className="lp-spin" size={13} />
                    {row.status === "extracting" ? "읽는 중" : row.status === "reviewing" ? "검토 중" : "대기"}
                  </span>
                )}
              </span>
              <span className="bulk-score">{row.card ? `${row.card.score}` : "—"}</span>
              <span className="bulk-issues">
                {row.card ? (
                  <>
                    {row.card.failCount > 0 && <em className="fail">{row.card.failCount}</em>}
                    {row.card.warnCount > 0 && <em className="warn">{row.card.warnCount}</em>}
                    {row.card.failCount === 0 && row.card.warnCount === 0 && "—"}
                  </>
                ) : row.error ? (
                  <span className="bulk-err">{row.error}</span>
                ) : (
                  "—"
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {!hasResults && !running && (
        <div className="bulk-empty">
          <Boxes size={22} />
          <b>아직 올린 제품이 없습니다.</b>
          <span>여러 SKU의 성분표·라벨 파일을 한꺼번에 선택하면 각각 판정해 표로 보여 드립니다.</span>
        </div>
      )}
    </section>
  );
}
