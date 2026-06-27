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
    : "확인 전";
  const nextRefresh = overview.operations.nextRefreshAt
    ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(overview.operations.nextRefreshAt))
    : "확인 전";

  return (
    <main className="knowledge-shell">
      <section className="knowledge-hero">
        <div>
          <Link className="knowledge-back" href="/">
            <ArrowLeft size={17} />
            검토 화면으로
          </Link>
          <p className="eyebrow">대만 식품·화장품 라벨링</p>
          <h1>검토 근거 검색</h1>
          <p>원료명, 표시 문구, 허가번호를 검색해 라벨 검토에 붙일 공식 근거만 빠르게 고릅니다.</p>
        </div>
      </section>

      <KnowledgeSearchClient initialQuery={initialQuery} initialData={initialData} />

      <details className="knowledge-ops" aria-label="지식베이스 운영 상태">
        <summary>
          <span>데이터 상태</span>
          <strong>공식 출처 {totals.sources.toLocaleString()}개</strong>
          <small>별칭, 규칙, 갱신 감시 상태는 펼쳐서 확인합니다.</small>
        </summary>
        <div className="knowledge-ops-grid">
          <Link className="knowledge-ops-link" href="/knowledge/aliases">
            <span>
              <Languages size={16} /> 별칭 검수
            </span>
            <strong>{aliasQueue.summary.review_items.toLocaleString()}건</strong>
            <small>
              고신뢰 충돌 {aliasQueue.summary.high_confidence_collisions.toLocaleString()}건, 문자 깨짐{" "}
              {aliasQueue.summary.mojibake_aliases.toLocaleString()}건, 로컬 별칭 검토 후보{" "}
              {aliasQueue.summary.regulated_terms_without_local_alias.toLocaleString()}건
            </small>
          </Link>
          <div>
            <span>최근 수집</span>
            <strong>{latestFetched}</strong>
            <small>
              다음 갱신 {nextRefresh}, 3일 내 갱신 후보 {overview.operations.expiringSoonSources.toLocaleString()}개, 캐시 재사용{" "}
              {overview.operations.fromCache.toLocaleString()}개, 브라우저 근거 {overview.operations.browserCaptures.toLocaleString()}개,
              수동 보강 {overview.operations.manualFallbacks.toLocaleString()}개, 갱신 감시 후보{" "}
              {overview.operations.updateCandidates.toLocaleString()}개
            </small>
          </div>
          <OverviewGroup title="관할" items={overview.coverage.jurisdictions} />
          <OverviewGroup title="영역" items={overview.coverage.domains} />
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
    food_labeling: "식품 표시",
    food_import: "식품 수입",
    food_safety: "식품 안전",
    food_additives: "식품첨가물",
    food_contact_materials: "식품 접촉재",
    health_food: "건강식품",
    special_dietary_food: "특수영양식품",
    trade: "무역",
    trade_controls: "무역 규제",
    customs: "통관",
    export_control: "수출통제",
    chemical_labeling: "화학물질 표시",
    terminology: "용어",
    general_labeling: "일반 표시",
    law: "법령",
    regulation: "규정",
    notice: "고시",
    guidance: "가이드",
    dataset: "데이터셋",
    cosmetic_ingredient: "화장품 원료",
    food_ingredient: "식품 원료",
    food_additive: "식품첨가물",
    label_claim: "표시·광고 문구",
    allergen: "알레르겐"
  };

  return labels[value] ?? value.replaceAll("_", " ");
}
