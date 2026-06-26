"use client";

import Link from "next/link";
import {
  BookOpen,
  ClipboardCheck,
  Database,
  ExternalLink,
  Filter,
  Loader2,
  PackageSearch,
  RefreshCw,
  Search,
  ShieldCheck
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { KnowledgeSearchResult } from "@/lib/knowledge-search";

const ALL = "all";

const focusModes = [
  {
    id: "cosmetics",
    label: "화장품",
    title: "화장품 라벨·PIF 검토",
    helper: "PIF, INCI, 색소, 성분명처럼 화장품 검토에서 먼저 확인할 표현입니다.",
    placeholder: "예: 화장품 PIF, INCI, 색소"
  },
  {
    id: "food",
    label: "식품",
    title: "식품 표시·허가 검토",
    helper: "식품첨가물, 알레르겐, 건강식품 허가번호처럼 표시와 수입 검토에 쓰입니다.",
    placeholder: "예: 식품첨가물, 알레르겐, 허가번호"
  },
  {
    id: "codes",
    label: "공통·코드",
    title: "코드·다국어 명칭 확인",
    helper: "CAS, HS/CCC, SDS/GHS, 번체중문 별칭처럼 나라별 표현 차이를 확인합니다.",
    placeholder: "예: CAS, HS/CCC, SDS/GHS"
  }
] as const;

type FocusMode = (typeof focusModes)[number]["id"];

const taskExampleSets: Record<FocusMode, Array<{ label: string; query: string }>> = {
  cosmetics: [
    { label: "화장품 PIF 확인", query: "대만 화장품 PIF" },
    { label: "INCI/CAS로 검색", query: "INCI CAS" },
    { label: "화장품 색소", query: "cosmetic colorants" },
    { label: "성분 표시명", query: "cosmetic ingredient labeling" }
  ],
  food: [
    { label: "식품첨가물 허용 여부", query: "food additive" },
    { label: "알레르겐 표시", query: "allergen labeling" },
    { label: "건강식품 허가번호", query: "health food permit" },
    { label: "영양 표시 확인", query: "nutrition labeling" }
  ],
  codes: [
    { label: "HS/CCC 코드 확인", query: "HS code CCC code" },
    { label: "SDS/GHS 표시", query: "SDS GHS" },
    { label: "번체중문 별칭", query: "traditional Chinese alias" },
    { label: "수출입 통관 근거", query: "import export customs" }
  ]
};

type SourceItem = KnowledgeSearchResult["sources"][number];
type TermItem = KnowledgeSearchResult["terms"][number];

type Option = {
  value: string;
  label: string;
  count?: number;
};

type EvidenceItem = {
  kind: "term" | "source";
  title: string;
  subtitle: string;
  detail: string;
  score?: number;
  chips: string[];
  href?: string;
  aliases?: string[];
  reviewParam?: string;
};

type UnifiedResult =
  | {
      kind: "term";
      id: string;
      title: string;
      subtitle: string;
      detail: string;
      score: number;
      chips: string[];
      term: TermItem;
    }
  | {
      kind: "source";
      id: string;
      title: string;
      subtitle: string;
      detail: string;
      score: number;
      chips: string[];
      href: string;
      source: SourceItem;
    };

type KnowledgeSearchClientProps = {
  initialQuery?: string;
  initialData?: KnowledgeSearchResult | null;
};

const fixedFreshnessOptions: Option[] = [
  { value: ALL, label: "전체" },
  { value: "fresh", label: "최신" },
  { value: "stale", label: "갱신 필요" },
  { value: "manual", label: "수동 보강" },
  { value: "browser", label: "브라우저 근거" },
  { value: "cache", label: "캐시" }
];

export default function KnowledgeSearchClient({ initialQuery = "", initialData = null }: KnowledgeSearchClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<KnowledgeSearchResult | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jurisdiction, setJurisdiction] = useState(ALL);
  const [domain, setDomain] = useState(ALL);
  const [sourceType, setSourceType] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [freshness, setFreshness] = useState(ALL);
  const [evidence, setEvidence] = useState<EvidenceItem | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [focusMode, setFocusMode] = useState<FocusMode>("cosmetics");

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    const initialQueryFromUrl = new URLSearchParams(window.location.search).get("q");
    if (initialQueryFromUrl?.trim() && initialQueryFromUrl.trim() !== initialQuery.trim()) {
      setQuery(initialQueryFromUrl.trim());
    }
  }, [initialQuery]);

  useEffect(() => {
    setEvidence(null);
    setShowAllResults(false);
  }, [trimmed]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    if (!trimmed) {
      setData(null);
      setError("");
      setEvidence(null);
      setLoading(false);
      return () => {
        active = false;
        controller.abort();
      };
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      fetch(`/api/knowledge/search?q=${encodeURIComponent(trimmed)}&limit=12`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("search_failed");
          return response.json();
        })
        .then((result: KnowledgeSearchResult) => {
          if (active) setData(result);
        })
        .catch((searchError) => {
          if (active && (searchError as Error).name !== "AbortError") {
            setError("지식베이스 검색에 실패했습니다. 잠시 후 다시 검색해 주세요.");
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 180);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  useEffect(() => {
    setEvidence(null);
    setShowAllResults(false);
  }, [data, jurisdiction, domain, sourceType, category, freshness]);

  const filterOptions = useMemo(() => {
    const sources = data?.sources ?? [];
    const terms = data?.terms ?? [];
    return {
      jurisdictions: buildOptions([
        ...sources.map((source) => source.jurisdiction),
        ...terms.flatMap((term) => term.rules.map((rule) => rule.jurisdiction)),
        ...terms.flatMap((term) => term.aliases.map((alias) => alias.jurisdiction ?? ""))
      ]),
      domains: buildOptions(sources.map((source) => source.domain)),
      sourceTypes: buildOptions(sources.map((source) => source.sourceType)),
      categories: buildOptions(terms.map((term) => term.category))
    };
  }, [data]);

  const filteredTerms = useMemo(() => {
    if (!data) return [];
    return data.terms.filter((term) => {
      if (category !== ALL && term.category !== category) return false;
      if (jurisdiction === ALL) return true;
      return (
        term.rules.some((rule) => rule.jurisdiction === jurisdiction) ||
        term.aliases.some((alias) => alias.jurisdiction === jurisdiction)
      );
    });
  }, [category, data, jurisdiction]);

  const filteredSources = useMemo(() => {
    if (!data) return [];
    return data.sources.filter((source) => {
      if (jurisdiction !== ALL && source.jurisdiction !== jurisdiction) return false;
      if (domain !== ALL && source.domain !== domain) return false;
      if (sourceType !== ALL && source.sourceType !== sourceType) return false;
      return matchesFreshness(source, freshness);
    });
  }, [data, domain, freshness, jurisdiction, sourceType]);

  const visibleTerms = filteredTerms.slice(0, 5);
  const visibleSources = filteredSources.slice(0, 4);
  const hasQuery = Boolean(trimmed);
  const hasResults = Boolean(data);
  const isRefreshing = loading && hasResults;
  const matchedCount = filteredTerms.length + filteredSources.length;
  const highPriorityCount = filteredSources.filter((source) => source.priority === "high").length;
  const watchCount = filteredSources.filter((source) => source.manualFallback || source.cacheStatus === "stale").length;
  const browserCount = filteredSources.filter((source) => source.browserCapture).length;
  const focusModeMeta = focusModes.find((mode) => mode.id === focusMode) ?? focusModes[0];
  const taskExamples = taskExampleSets[focusMode];

  const unifiedResults = useMemo<UnifiedResult[]>(() => {
    const termRows = visibleTerms.map((term) => ({
      kind: "term" as const,
      id: `term-${term.id}`,
      title: term.canonicalName,
      subtitle: `${labelFor(term.category)} - 별칭 ${term.aliasCount.toLocaleString()}개`,
      detail: term.notes || "별칭, 식별자, 연결 규정, 근거 출처를 함께 확인할 수 있는 지식 항목입니다.",
      score: term.score,
      chips: uniqueCompact([
        ...term.identifiers.cas.slice(0, 1).map((value) => `CAS ${value}`),
        ...term.identifiers.inci.slice(0, 1).map((value) => `INCI ${value}`),
        ...term.aliases.slice(0, 2).map((alias) => alias.value),
        `${term.sourceKeys.length}개 근거`
      ]).slice(0, 4),
      term
    }));

    const sourceRows = visibleSources.map((source) => {
      const meta = freshnessMeta(source);
      return {
        kind: "source" as const,
        id: `source-${source.id}`,
        title: source.title,
        subtitle: `${source.authority} - ${labelFor(source.domain)}`,
        detail: source.excerpt || "공식 원문, 캐시, 수동 보강 기록을 함께 확인할 수 있는 근거 출처입니다.",
        score: source.score,
        chips: uniqueCompact([
          source.jurisdiction,
          labelFor(source.sourceType),
          source.priority === "high" ? "고우선" : source.priority,
          meta.label
        ]).slice(0, 4),
        href: source.url,
        source
      };
    });

    return [...termRows, ...sourceRows].sort((left, right) => right.score - left.score).slice(0, 8);
  }, [visibleSources, visibleTerms]);

  const topResult = unifiedResults[0];
  const secondaryResults = unifiedResults.slice(1);
  const visibleSecondaryResults = showAllResults ? secondaryResults : secondaryResults.slice(0, 2);
  const selectedEvidence = evidence;
  const selectedEvidenceParam = encodeURIComponent(selectedEvidence?.reviewParam || selectedEvidence?.title || "");
  const displayedResultCount = (topResult ? 1 : 0) + visibleSecondaryResults.length;
  const hiddenResultCount = Math.max(0, unifiedResults.length - displayedResultCount);
  const resultCountLabel = hasResults
    ? `${matchedCount.toLocaleString()}개 중 ${displayedResultCount.toLocaleString()}개 표시`
    : loading
      ? "검색 중"
      : "대기";
  const filterSummary = `${matchedCount.toLocaleString()}개 결과, 고우선 ${highPriorityCount.toLocaleString()}개, 갱신 확인 ${watchCount.toLocaleString()}개`;

  function buildTermEvidence(term: TermItem): EvidenceItem {
    return {
      kind: "term",
      title: term.canonicalName,
      subtitle: `${labelFor(term.category)} - 별칭 ${term.aliasCount.toLocaleString()}개`,
      detail: term.notes || "검토에 반영하기 전에 별칭, 식별자, 연결 규정과 근거 출처를 함께 확인하세요.",
      score: term.score,
      chips: uniqueCompact([
        ...term.identifiers.cas.map((value) => `CAS ${value}`),
        ...term.identifiers.inci.slice(0, 3).map((value) => `INCI ${value}`),
        ...term.rules.slice(0, 4).map((rule) => rule.ruleCode),
        `${term.sourceKeys.length}개 근거`
      ]),
      aliases: uniqueCompact(term.aliases.map((alias) => alias.value).filter((value) => value !== term.canonicalName)),
      reviewParam: term.canonicalName
    };
  }

  function buildSourceEvidence(source: SourceItem): EvidenceItem {
    const meta = freshnessMeta(source);
    return {
      kind: "source",
      title: source.title,
      subtitle: `${source.authority} - ${labelFor(source.domain)}`,
      detail: source.excerpt || "검토에 반영하기 전에 공식 원문과 캡처 상태를 확인하세요.",
      score: source.score,
      href: source.url,
      chips: uniqueCompact([
        source.jurisdiction,
        labelFor(source.sourceType),
        source.priority === "high" ? "고우선" : source.priority,
        meta.label,
        source.documentPath ? "문서화됨" : ""
      ]),
      reviewParam: source.title
    };
  }

  function selectTerm(term: TermItem) {
    setEvidence(buildTermEvidence(term));
  }

  function selectSource(source: SourceItem) {
    setEvidence(buildSourceEvidence(source));
  }

  return (
    <section
      className={["knowledge-workbench", hasQuery ? "has-query" : "is-awaiting", isRefreshing ? "is-refreshing" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="knowledge-command-head">
        <div>
          <span>대만 식품·화장품 지식 검색</span>
          <h2>검색하면 공식 근거와 검토 반영 단계까지 이어집니다.</h2>
          <p>원료명, 표시 문구, 허가번호, INCI, CAS, HS/CCC 코드처럼 서로 다른 이름을 한곳에서 연결합니다.</p>
        </div>
        <div className="knowledge-command-actions">
          <div className={["knowledge-searchbar", loading ? "is-loading" : ""].filter(Boolean).join(" ")}>
            <Search size={19} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={focusModeMeta.placeholder}
              aria-label="지식베이스 검색"
            />
            {loading && <Loader2 className="spin" size={18} />}
          </div>
          <div className="knowledge-mode-tabs knowledge-mode-tabs-steady" aria-label="품목군 선택">
            {focusModes.map((mode) => (
              <button key={mode.id} type="button" className={focusMode === mode.id ? "active" : ""} onClick={() => setFocusMode(mode.id)}>
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="knowledge-alert">{error}</div>}

      <div className={["knowledge-results", "knowledge-results-unified", "knowledge-results-stable", !hasQuery ? "is-start" : ""].join(" ")}>
        <section className="knowledge-result-feed">
          <div className="knowledge-section-title">
            <h2>{hasQuery ? "검색 결과" : "검색 시작"}</h2>
            <span>{hasQuery ? resultCountLabel : "원료, 문구, 코드, 허가 키워드를 입력하세요."}</span>
          </div>

          {!hasQuery && (
            <div className="knowledge-search-empty knowledge-search-empty-start">
              <div className="knowledge-start-copy">
                <b>{focusModeMeta.title}</b>
                <span>원료명, 표시 문구, 허가번호, INCI, CAS, HS/CCC 코드 중 하나만 입력해도 관련 공식 근거와 별칭을 연결합니다.</span>
              </div>
              <div className="knowledge-examples knowledge-examples-start" aria-label="검색 예시">
                <span>예시</span>
                {taskExamples.slice(0, 3).map((example) => (
                  <button key={example.label} type="button" onClick={() => setQuery(example.query)}>
                    {example.label}
                  </button>
                ))}
              </div>
              <div className="knowledge-start-flow" aria-label="검색 후 이어지는 작업">
                <div className="active">
                  <Search size={17} />
                  <b>검색</b>
                  <span>원료·문구·코드 입력</span>
                </div>
                <div>
                  <BookOpen size={17} />
                  <b>근거 확인</b>
                  <span>공식 출처와 별칭 연결</span>
                </div>
                <div>
                  <PackageSearch size={17} />
                  <b>검토 반영</b>
                  <span>라벨 작업대에 추가</span>
                </div>
              </div>
            </div>
          )}

          {hasQuery && data?.ambiguity && (
            <div className="knowledge-ambiguity-panel" role="status">
              <div>
                <b>같은 표현이 여러 규제 의미로 쓰입니다.</b>
                <span>{data.ambiguity.message}</span>
              </div>
              <div>
                {data.ambiguity.terms.map((term) => (
                  <button key={term.id} type="button" onClick={() => setQuery(term.canonicalName)}>
                    <b>{term.canonicalName}</b>
                    <small>{labelFor(term.category)}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasQuery && isRefreshing && (
            <div className="knowledge-refresh-note" role="status">
              최신 결과로 갱신하는 중입니다.
            </div>
          )}

          {hasQuery && hasResults && topResult && (
            <article className={`knowledge-best-card ${topResult.kind}`}>
              <button
                type="button"
                className="knowledge-best-main"
                onClick={() => (topResult.kind === "term" ? selectTerm(topResult.term) : selectSource(topResult.source))}
                aria-pressed={selectedEvidence?.title === topResult.title}
              >
                <span className={`knowledge-decision ${decisionForResult(topResult).tone}`}>{decisionForResult(topResult).label}</span>
                <div>
                  <h3>{topResult.title}</h3>
                  <p>{decisionForResult(topResult).detail}</p>
                  <div className="knowledge-row-meta">
                    <span>{topResult.subtitle}</span>
                    {topResult.chips.slice(0, 3).map((chip) => (
                      <span key={`${topResult.id}-${chip}`}>{chip}</span>
                    ))}
                  </div>
                </div>
                <b className="knowledge-score">{topResult.kind === "term" ? "용어" : "근거"}</b>
                <span className="knowledge-row-action-hint">근거 보기</span>
              </button>
            </article>
          )}

          <div className="knowledge-row-list">
            {hasQuery &&
              hasResults &&
              visibleSecondaryResults.map((item) => (
                <article className={`knowledge-row ${item.kind}`} key={item.id}>
                  <button
                    type="button"
                    className="knowledge-row-main"
                    onClick={() => (item.kind === "term" ? selectTerm(item.term) : selectSource(item.source))}
                    aria-pressed={selectedEvidence?.title === item.title}
                  >
                    <span className={`knowledge-decision ${decisionForResult(item).tone}`}>{decisionForResult(item).label}</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{decisionForResult(item).detail}</p>
                      <div className="knowledge-row-meta">
                        <span>{item.subtitle}</span>
                        {item.chips.slice(0, 2).map((chip) => (
                          <span key={`${item.id}-${chip}`}>{chip}</span>
                        ))}
                      </div>
                    </div>
                    <b className="knowledge-score">{item.kind === "term" ? "용어" : "근거"}</b>
                  </button>
                </article>
              ))}

            {hasQuery && !hasResults && (
              <div className="knowledge-search-empty">
                <Loader2 className={loading ? "spin" : undefined} size={20} />
                <b>{loading ? "검색 중입니다." : "아직 결과가 없습니다."}</b>
                <span>검색어를 조금 더 구체적으로 입력하거나, INCI/CAS/허가번호처럼 원문에 가까운 표현으로 다시 검색해 보세요.</span>
              </div>
            )}
            {hasQuery && hasResults && unifiedResults.length === 0 && <div className="knowledge-empty">현재 필터에 맞는 결과가 없습니다.</div>}
            {hasQuery && hasResults && hiddenResultCount > 0 && (
              <div className="knowledge-more-note">
                <span>{`대표 결과를 먼저 보여줍니다. 관련 결과 ${hiddenResultCount.toLocaleString()}개는 필요할 때 펼칠 수 있습니다.`}</span>
                {!showAllResults && (
                  <button type="button" onClick={() => setShowAllResults(true)}>
                    관련 결과 보기
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="knowledge-detail-panel" aria-label="선택한 근거">
          <div className="knowledge-tray-head">
            <ShieldCheck size={18} />
            <div>
              <h2>근거 패널</h2>
              <span>
                {selectedEvidence
                  ? "선택한 항목의 공식 출처, 별칭, 연결 규칙을 검토합니다."
                  : "검색 결과를 선택하면 검토 근거가 여기에 열립니다."}
              </span>
            </div>
          </div>

          {selectedEvidence ? (
            <div className="knowledge-evidence-card">
              <div>
                <small>{selectedEvidence.kind === "term" ? "용어 근거" : "출처 근거"}</small>
                <h3>{selectedEvidence.title}</h3>
                <span>{selectedEvidence.subtitle}</span>
              </div>
              {typeof selectedEvidence.score === "number" && <b>{Math.round(selectedEvidence.score)}</b>}
              <p>{compact(selectedEvidence.detail, 240)}</p>
              <div className="knowledge-evidence-chips">
                {selectedEvidence.chips.slice(0, 6).map((chip) => (
                  <span key={`${selectedEvidence.title}-${chip}`}>{chip}</span>
                ))}
              </div>
              <div className="knowledge-tray-actions" aria-label="근거 작업">
                <Link href={`/?screen=review&knowledge=${selectedEvidenceParam}`} className="primary">
                  <PackageSearch size={15} />
                  대만 라벨 검토에 반영
                </Link>
                {selectedEvidence.href && (
                  <a href={selectedEvidence.href} target="_blank" rel="noreferrer">
                    원문 <ExternalLink size={15} />
                  </a>
                )}
              </div>
              {selectedEvidence.aliases?.length ? (
                <details className="knowledge-alias-drawer">
                  <summary>다른 이름으로 다시 검색</summary>
                  <div className="knowledge-action-row" aria-label="별칭 재검색">
                    {selectedEvidence.aliases.slice(0, 4).map((alias) => (
                      <button key={`${selectedEvidence.title}-${alias}`} type="button" onClick={() => setQuery(alias)} title={`${alias} 재검색`}>
                        <Search size={14} />
                        {compact(alias, 28)}
                      </button>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          ) : (
            <div className="knowledge-evidence-empty knowledge-evidence-preview">
              <ClipboardCheck size={20} />
              <b>{hasQuery ? "왼쪽 결과를 선택하면 근거가 열립니다." : "검색어를 입력하면 공식 근거를 좁혀드립니다."}</b>
              <p>{hasQuery ? "결과를 직접 선택한 뒤 공식 출처, 별칭, 원문 링크를 확인하고 검토 화면에 반영할 수 있습니다." : "성분명, 표시 문구, 허가번호, INCI, CAS, HS/CCC 코드 중 하나로 시작하세요."}</p>
            </div>
          )}
        </aside>
      </div>

      <details className="knowledge-filter-drawer knowledge-filter-drawer-quiet">
        <summary>
          <Filter size={16} />
          상세 필터·데이터 상태
          <span>{hasResults ? filterSummary : "검색 전에도 범위와 데이터 상태를 확인할 수 있습니다."}</span>
        </summary>
        <div className="knowledge-control-room" aria-label="검색 필터">
          <div className="knowledge-filter-panel">
            <FilterGroup title="관할" value={jurisdiction} options={filterOptions.jurisdictions} onChange={setJurisdiction} disabled={!hasResults} />
            <FilterGroup title="영역" value={domain} options={filterOptions.domains} onChange={setDomain} disabled={!hasResults} />
            <FilterGroup title="출처 유형" value={sourceType} options={filterOptions.sourceTypes} onChange={setSourceType} disabled={!hasResults} />
            <FilterGroup title="용어 분류" value={category} options={filterOptions.categories} onChange={setCategory} disabled={!hasResults} />
            <FilterGroup title="근거 상태" value={freshness} options={fixedFreshnessOptions} onChange={setFreshness} disabled={!hasResults} />
          </div>

          {hasResults && (
            <details className="knowledge-health-drawer">
              <summary>
                <Database size={16} />
                운영 상태
              </summary>
              <div className="knowledge-health-grid">
                <StatusTile
                  icon={<ShieldCheck size={17} />}
                  label="검색 결과"
                  value={matchedCount.toLocaleString()}
                  detail={`용어 ${filteredTerms.length.toLocaleString()}개, 출처 ${filteredSources.length.toLocaleString()}개`}
                  tone="green"
                />
                <StatusTile
                  icon={<Database size={17} />}
                  label="고우선 출처"
                  value={highPriorityCount.toLocaleString()}
                  detail="검토에서 먼저 확인할 공식 출처"
                  tone="blue"
                />
                <StatusTile
                  icon={<RefreshCw size={17} />}
                  label="갱신 확인"
                  value={watchCount.toLocaleString()}
                  detail="수동 보강 또는 갱신 감시 대상"
                  tone={watchCount ? "gold" : "green"}
                />
                <StatusTile
                  icon={<BookOpen size={17} />}
                  label="브라우저 근거"
                  value={browserCount.toLocaleString()}
                  detail="직접 캡처된 공식 화면 근거"
                  tone="neutral"
                />
              </div>
            </details>
          )}
        </div>
      </details>
    </section>
  );
}

function FilterGroup({
  title,
  value,
  options,
  onChange,
  disabled = false
}: {
  title: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="knowledge-filter-row">
      <span>{title}</span>
      <div>
        {options.map((option) => (
          <button
            key={`${title}-${option.value}`}
            type="button"
            className={option.value === value ? "active" : ""}
            onClick={() => onChange(option.value)}
            disabled={disabled}
          >
            {option.label}
            {typeof option.count === "number" && <small>{option.count}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusTile({
  icon,
  label,
  value,
  detail,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "green" | "blue" | "gold" | "neutral";
}) {
  return (
    <div className={`knowledge-status-tile ${tone}`}>
      {icon}
      <span>{label}</span>
      <b>{value}</b>
      <small>{detail}</small>
    </div>
  );
}

function buildOptions(values: string[]) {
  const counts = new Map<string, number>();
  values
    .map((value) => value?.trim())
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  const options = Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || labelFor(left[0]).localeCompare(labelFor(right[0])))
    .map(([value, count]) => ({ value, label: labelFor(value), count }));

  return [{ value: ALL, label: "전체", count: values.filter(Boolean).length }, ...options];
}

function matchesFreshness(source: SourceItem, value: string) {
  if (value === ALL) return true;
  if (value === "manual") return source.manualFallback;
  if (value === "browser") return source.browserCapture;
  if (value === "cache") return source.fromCache;
  return source.cacheStatus === value;
}

function freshnessMeta(source: SourceItem) {
  if (source.browserCapture) return { label: "브라우저 근거", tone: "blue" };
  if (source.manualFallback) return { label: "수동 보강", tone: "gold" };
  if (source.cacheStatus === "stale") return { label: "갱신 필요", tone: "gold" };
  if (source.fromCache) return { label: "캐시", tone: "neutral" };
  if (source.cacheStatus === "fresh") return { label: "최신", tone: "green" };
  return { label: "확인 필요", tone: "neutral" };
}

function decisionForResult(item: UnifiedResult) {
  if (item.kind === "term") {
    if (item.score >= 95) return { label: "공식명 확인됨", detail: "입력 표현이 공식명 또는 고신뢰 별칭과 직접 연결됩니다.", tone: "green" };
    if (item.score >= 70) return { label: "관련 용어", detail: "공식명과 별칭을 함께 확인한 뒤 검토에 반영하세요.", tone: "blue" };
    return { label: "문맥 확인 필요", detail: "품목군과 용도를 확인해야 하는 후보입니다.", tone: "gold" };
  }

  if (item.score >= 80) return { label: "공식 근거 있음", detail: "검색어와 가장 가까운 공식 출처입니다.", tone: "green" };
  if (item.score >= 58) return { label: "참고 근거", detail: "라벨 검토에 참고할 수 있는 공식 출처입니다.", tone: "blue" };
  return { label: "보조 확인 필요", detail: "연결 문맥을 확인한 뒤 사용하세요.", tone: "neutral" };
}

function uniqueCompact(values: string[]) {
  return Array.from(new Set(values.map((value) => compact(value, 42)).filter(Boolean)));
}

function compact(value: string, maxLength: number) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
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
    html: "웹문서",
    pdf: "PDF",
    manual: "수동",
    browser_capture: "브라우저 캡처",
    cosmetic_ingredient: "화장품 원료",
    food_ingredient: "식품 원료",
    food_additive: "식품첨가물",
    label_claim: "표시·광고 문구",
    allergen: "알레르겐",
    documentation: "서류",
    import_export: "수출입",
    term: "용어"
  };

  return labels[value] ?? value.replaceAll("_", " ");
}
