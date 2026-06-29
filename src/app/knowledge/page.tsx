import { Database, Languages, RefreshCw, Search, ShieldCheck } from "lucide-react";
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
  const latestFetched = formatDateTime(overview.operations.latestFetchedAt);
  const nextRefresh = formatDateTime(overview.operations.nextRefreshAt);

  return (
    <>
      <section className="lp-main lp-main-full">
        <div className="kb-content kb-content-embedded">
          <header className="kb-topbar">
            <div>
              <p>통합검색</p>
              <h1>막힌 성분명, 통관 이슈, 라벨 문구, HS/CCC, 제품 유형을 한 번에 넣고 다음 확인 항목을 찾습니다.</h1>
            </div>
          </header>

          <section className="kb-metrics" aria-label="지식베이스 상태">
            <span>
              <Database size={17} />
              <b>{totals.sources.toLocaleString()}</b>
              공식 소스
            </span>
            <span>
              <Languages size={17} />
              <b>{totals.aliases.toLocaleString()}</b>
              검색 별칭
            </span>
            <span>
              <ShieldCheck size={17} />
              <b>{totals.terms.toLocaleString()}</b>
              규제 용어
            </span>
            <span>
              <RefreshCw size={17} />
              <b>{overview.operations.updateCandidates.toLocaleString()}</b>
              변경 감시
            </span>
          </section>

          <KnowledgeSearchClient
            initialQuery={initialQuery}
            initialData={initialData}
            totals={totals}
            operations={{
              latestFetched,
              nextRefresh,
              highPrioritySources: overview.operations.highPrioritySources,
              staleSources: overview.operations.staleSources,
              browserCaptures: overview.operations.browserCaptures,
              manualFallbacks: overview.operations.manualFallbacks,
              aliasReviewItems: aliasQueue.summary.review_items,
              regulatedTermsWithoutLocalAlias: aliasQueue.summary.regulated_terms_without_local_alias
            }}
          />

          <section className="kb-ops">
            <div className="kb-section-head">
              <div>
                <span>검색 기억장치</span>
                <h2>한 번 찾은 공식 출처와 원료의 다른 이름을 저장해 다음 검색에서 바로 재사용합니다.</h2>
              </div>
            </div>
            <div className="kb-ops-grid">
              <OverviewGroup title="국가·지역" items={overview.coverage.jurisdictions} />
              <OverviewGroup title="업무 도메인" items={overview.coverage.domains} />
              <OverviewGroup title="용어 분류" items={overview.coverage.categories} />
              <OverviewGroup title="언어" items={overview.coverage.languages} />
            </div>
          </section>

          <footer className="kb-footer-note">
            <Search size={15} />
            검색이 안 되거나 엉뚱한 결과가 나오면 운영팀 확인 목록에 원료명, 번역명, 약어, 중문명을 보강해 다음 검색 품질을 높입니다.
          </footer>
        </div>
      </section>
    </>
  );
}

function OverviewGroup({ title, items }: { title: string; items: Array<{ key: string; count: number }> }) {
  return (
    <div className="kb-overview-group">
      <b>{title}</b>
      {items.slice(0, 6).map((item) => (
        <span key={`${title}-${item.key}`}>
          {labelFor(item.key)}
          <em>{item.count.toLocaleString()}</em>
        </span>
      ))}
    </div>
  );
}

function formatDateTime(value?: string | null) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "확인 필요";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(date);
}

function labelFor(value: string) {
  const labels: Record<string, string> = {
    TW: "대만",
    KR: "한국",
    JP: "일본",
    CN: "중국",
    US: "미국",
    EU: "EU",
    GLOBAL: "글로벌",
    cosmetics: "화장품",
    food: "식품",
    food_labeling: "식품 라벨",
    food_import: "식품 수입",
    food_safety: "식품 안전",
    food_additives: "식품첨가물",
    food_contact_materials: "식품용 포장재",
    health_food: "건강식품",
    special_dietary_food: "특수영양식품",
    trade: "무역",
    trade_controls: "수출입 규제",
    customs: "통관",
    export_control: "수출통제",
    chemical_labeling: "화학물질 라벨",
    terminology: "용어",
    general_labeling: "일반 라벨",
    law: "법령",
    regulation: "규정",
    notice: "고시",
    guidance: "가이드",
    dataset: "공개 데이터",
    cosmetic_ingredient: "화장품 원료",
    food_ingredient: "식품 원료",
    food_cosmetic_ingredient: "식품·화장품 원료",
    fermented_food_ingredient: "발효식품 원료",
    food_additive: "식품첨가물",
    label_claim: "표시·광고 표현",
    allergen: "알레르기",
    documentation: "서류",
    import_export: "수출입",
    term: "용어",
    zh: "중국어",
    "zh-Hant": "번체",
    "zh-Hans": "간체",
    en: "영어",
    ko: "한국어",
    und: "언어 미정"
  };

  return labels[value] ?? value.replaceAll("_", " ");
}
