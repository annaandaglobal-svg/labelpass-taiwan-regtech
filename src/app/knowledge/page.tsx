import Link from "next/link";
import { ArrowLeft, Languages } from "lucide-react";
import type { KnowledgeSearchResult } from "@/lib/knowledge-search";
import { getKnowledgeOverview, searchKnowledge } from "@/lib/knowledge-search";
import { getAliasReviewQueue } from "@/lib/alias-review";
import KnowledgeSearchClient from "./search-client";

type KnowledgePageProps = {
  searchParams?: {
    q?: string | string[];
  };
};

export default function KnowledgePage({ searchParams }: KnowledgePageProps) {
  const rawInitialQuery = Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q;
  const initialQuery = rawInitialQuery?.trim() ?? "";
  const initialData: KnowledgeSearchResult | null = initialQuery ? searchKnowledge(initialQuery, 12) : null;
  const totals = searchKnowledge("").totals;
  const overview = getKnowledgeOverview();
  const aliasQueue = getAliasReviewQueue();
  const latestFetched = overview.operations.latestFetchedAt
    ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(overview.operations.latestFetchedAt))
    : "대기 중";
  const nextRefresh = overview.operations.nextRefreshAt
    ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(overview.operations.nextRefreshAt))
    : "대기 중";

  return (
    <main className="knowledge-shell">
      <section className="knowledge-hero">
        <div>
          <Link className="knowledge-back" href="/">
            <ArrowLeft size={17} />
            대시보드로
          </Link>
          <p className="eyebrow">재사용 규제 메모리</p>
          <h1>규제 지식 검색</h1>
          <p>
            대만 화장품, 식품, 표시, 성분, 첨가물 규정을 검색하고 검토에 쓸 후보만 먼저 정리합니다. INCI, CAS,
            고시, 가이드, 번역 메모를 공식 근거와 함께 연결합니다.
          </p>
        </div>
      </section>

      <KnowledgeSearchClient initialQuery={initialQuery} initialData={initialData} />

      <details className="knowledge-ops" aria-label="지식베이스 운영 현황">
        <summary>
          <span>운영 현황</span>
          <strong>공식 출처 {totals.sources.toLocaleString()}개 운영 중</strong>
          <small>별칭, 규칙, 갱신 감시 상태는 펼쳐서 확인합니다.</small>
        </summary>
        <div className="knowledge-ops-grid">
          <Link className="knowledge-ops-link" href="/knowledge/aliases">
            <span><Languages size={16} /> 별칭 검수</span>
            <strong>{aliasQueue.summary.review_items.toLocaleString()}건</strong>
            <small>
              고신뢰 충돌 {aliasQueue.summary.high_confidence_collisions.toLocaleString()}건 · 문자 깨짐{" "}
              {aliasQueue.summary.mojibake_aliases.toLocaleString()}건 · 현지명 백로그{" "}
              {aliasQueue.summary.regulated_terms_without_local_alias.toLocaleString()}건
            </small>
          </Link>
          <div>
            <span>최근 수집</span>
            <strong>{latestFetched}</strong>
            <small>
              다음 갱신 {nextRefresh} · 3일 내 만료 예상 {overview.operations.expiringSoonSources.toLocaleString()}개 ·
              캐시 반영 {overview.operations.fromCache.toLocaleString()}개 · 브라우저 수집{" "}
              {overview.operations.browserCaptures.toLocaleString()}개 · 수동 보완{" "}
              {overview.operations.manualFallbacks.toLocaleString()}개 · 업데이트 후보{" "}
              {overview.operations.updateCandidates.toLocaleString()}개 · 대기 중 업데이트{" "}
              {overview.operations.pendingUpdateCandidates.toLocaleString()}개
            </small>
          </div>
          <OverviewGroup title="관할" items={overview.coverage.jurisdictions} />
          <OverviewGroup title="도메인" items={overview.coverage.domains} />
          <OverviewGroup title="분류" items={overview.coverage.categories} />
          <OverviewGroup title="언어" items={overview.coverage.languages} />
        </div>
      </details>
    </main>
  );
}

function OverviewGroup({ title, items }: { title: string; items: Array<{ key: string; count: number }> }) {
  return (
    <div>
      <span>{title}</span>
      <div className="knowledge-mini-bars">
        {items.slice(0, 5).map((item) => (
          <small key={`${title}-${item.key}`}>
            {labelFor(item.key)}
            <b>{item.count.toLocaleString()}</b>
          </small>
        ))}
      </div>
    </div>
  );
}

function labelFor(value: string) {
  const labels: Record<string, string> = {
    all: "전체",
    TW: "대만",
    KR: "한국",
    JP: "일본",
    CN: "중국",
    US: "미국",
    EU: "EU",
    GLOBAL: "글로벌",
    cosmetics: "화장품",
    food: "식품",
    trade: "통관",
    general_labeling: "일반 표시",
    customs: "관세",
    law: "법령",
    regulation: "규정",
    notice: "고시",
    guidance: "가이드",
    dataset: "데이터셋",
    cosmetic_ingredient: "화장품 성분",
    food_ingredient: "식품 원료",
    food_additive: "식품첨가물",
    label_claim: "표시·광고",
    allergen: "알레르겐"
  };

  return labels[value] ?? value.replaceAll("_", " ");
}
