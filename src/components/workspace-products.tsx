"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Boxes, Layers } from "lucide-react";
import { deriveProductCard, loadSavedReviews, REVIEW_PIPELINE, type ProductCard } from "@/lib/saved-reviews";

function categoryEmoji(category: string) {
  if (category === "화장품") return "🧴";
  if (category === "식품") return "🥫";
  if (category === "건강식품") return "💊";
  if (category === "원료·첨가물") return "🧪";
  if (category === "미용기기") return "🔌";
  return "📦";
}

function nextActionFor(card: ProductCard) {
  if (card.status === "fail") return `수정 필요 ${card.failCount}건 — 성분·표기를 보완한 뒤 다시 검토하세요.`;
  if (card.status === "warn") return `확인 ${card.warnCount}건 — 문구·라벨·증빙을 보강하면 통과 가능성이 올라갑니다.`;
  if (card.status === "needs_info") return "함량·수입자·시험자료 등 추가 자료를 채우면 판정이 확정됩니다.";
  return "즉시 멈출 항목이 없습니다 — 전문가 검수·인허가 서류 준비로 넘어가세요.";
}

const filters: Array<{ key: "all" | "fail" | "warn" | "pass"; label: string }> = [
  { key: "all", label: "전체" },
  { key: "fail", label: "수정 필요" },
  { key: "warn", label: "확인 권장" },
  { key: "pass", label: "진행 가능" }
];

export function WorkspaceProducts() {
  const [cards, setCards] = useState<ProductCard[]>([]);
  const [filter, setFilter] = useState<"all" | "fail" | "warn" | "pass">("all");

  useEffect(() => {
    setCards(loadSavedReviews().map(deriveProductCard));
  }, []);

  const counts = useMemo(() => {
    const list = cards;
    return {
      total: list.length,
      fail: list.filter((c) => c.status === "fail").length,
      warn: list.filter((c) => c.status === "warn" || c.status === "needs_info").length,
      pass: list.filter((c) => c.status === "pass").length
    };
  }, [cards]);

  const visible = useMemo(() => {
    const list = cards;
    if (filter === "all") return list;
    if (filter === "fail") return list.filter((c) => c.status === "fail");
    if (filter === "warn") return list.filter((c) => c.status === "warn" || c.status === "needs_info");
    return list.filter((c) => c.status === "pass");
  }, [cards, filter]);

  if (cards.length === 0) {
    return (
      <article className="workspace-panel workspace-panel-wide">
        <div className="wp-empty">
          <Boxes size={22} />
          <b>아직 검토한 제품이 없습니다.</b>
          <span>성분·라벨을 검토하면 실제 제품이 상태별로 여기에 쌓입니다. 여러 제품은 일괄 검토가 빠릅니다.</span>
          <div className="wp-empty-actions">
            <Link className="lp-button" href="/review">
              성분·라벨 검토
              <ArrowRight size={15} />
            </Link>
            <Link className="workspace-button" href="/review/bulk">
              <Layers size={15} />
              여러 제품 일괄 검토
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="workspace-panel workspace-panel-wide" data-real-products="true">
      <div className="workspace-panel-head">
        <div>
          <span>내 제품 · 검토 결과</span>
          <h2>검토한 {counts.total}개 제품의 상태</h2>
        </div>
        <Link className="workspace-button" href="/review/bulk">
          <Layers size={15} />
          일괄 검토
        </Link>
      </div>

      <div className="wp-filters" role="tablist" aria-label="상태 필터">
        {filters.map((item) => {
          const badge =
            item.key === "all" ? counts.total : item.key === "fail" ? counts.fail : item.key === "warn" ? counts.warn : counts.pass;
          return (
            <button key={item.key} type="button" className={item.key === filter ? "on" : ""} onClick={() => setFilter(item.key)}>
              {item.label} <em>{badge}</em>
            </button>
          );
        })}
      </div>

      <div className="workspace-product-list">
        {visible.map((card) => (
          <div key={card.id} className="pipe-row">
            <div className="pipe-top">
              <div className="ic" aria-hidden="true">
                {categoryEmoji(card.category)}
              </div>
              <div className="pipe-id">
                <div className="nm">{card.name}</div>
                <div className="mt">
                  {card.category} · {card.score}/100 · {new Date(card.generatedAt).toLocaleDateString("ko-KR")}
                </div>
              </div>
              <div className="act">
                <span className={`chip ${card.chip}`}>{card.statusLabel}</span>
                <Link className="linkbtn" href="/review">
                  다시 검토
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
            <div className="pipe-steps">
              {REVIEW_PIPELINE.map((label, index) => (
                <div key={label} className={`pstep${index < card.step ? " done" : index === card.step ? " now" : ""}`}>
                  {label}
                </div>
              ))}
            </div>
            <p className="pipe-next">다음: {nextActionFor(card)}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
