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

const examples = [
  { label: "PIF", query: "PIF" },
  { label: "식품첨가물", query: "food additive" },
  { label: "알레르기 표시", query: "allergen labeling" },
  { label: "화장품 색소", query: "cosmetic colorants" },
  { label: "INCI", query: "INCI" },
  { label: "HS code", query: "HS code" },
  { label: "건강기능식품", query: "health food" },
  { label: "SDS/GHS", query: "SDS" }
];

const ALL = "all";
const onboardingExamples = examples.slice(0, 4);

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

const fixedFreshnessOptions: Option[] = [
  { value: ALL, label: "전체" },
  { value: "fresh", label: "최신" },
  { value: "stale", label: "확인 필요" },
  { value: "manual", label: "수동 보강" },
  { value: "browser", label: "브라우저 캡처" },
  { value: "cache", label: "캐시" }
];

export default function KnowledgeSearchClient() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<KnowledgeSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jurisdiction, setJurisdiction] = useState(ALL);
  const [domain, setDomain] = useState(ALL);
  const [sourceType, setSourceType] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [freshness, setFreshness] = useState(ALL);
  const [evidence, setEvidence] = useState<EvidenceItem | null>(null);

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    const initialQuery = new URLSearchParams(window.location.search).get("q");
    if (initialQuery?.trim()) setQuery(initialQuery.trim());
  }, []);

  useEffect(() => {
    setEvidence(null);
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
            setError("검색 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
        detail: source.excerpt || "제목, 기관, 관할권, 연결 용어 기준으로 매칭된 근거 출처입니다.",
        score: source.score,
        chips: uniqueCompact([
          source.jurisdiction,
          labelFor(source.sourceType),
          source.priority === "high" ? "중요" : source.priority,
          meta.label
        ]).slice(0, 4),
        href: source.url,
        source
      };
    });

    return [...termRows, ...sourceRows].sort((left, right) => right.score - left.score).slice(0, 8);
  }, [visibleSources, visibleTerms]);

  const selectedEvidence = evidence;
  const selectedEvidenceParam = encodeURIComponent(selectedEvidence?.reviewParam || selectedEvidence?.title || "");
  const resultCountLabel = hasResults ? unifiedResults.length.toLocaleString() : loading ? "검색 중" : "대기";
  const moreResultCount =
    Math.max(0, filteredTerms.length - visibleTerms.length) + Math.max(0, filteredSources.length - visibleSources.length);
  const filterSummary = `${matchedCount.toLocaleString()}개 결과 - 중요 ${highPriorityCount.toLocaleString()} - 확인 필요 ${watchCount.toLocaleString()}`;

  function buildTermEvidence(term: TermItem): EvidenceItem {
    return {
      kind: "term",
      title: term.canonicalName,
      subtitle: `${labelFor(term.category)} - 별칭 ${term.aliasCount.toLocaleString()}개`,
      detail: term.notes || "검토에 반영하기 전에 별칭, 식별자, 연결 규정을 확인합니다.",
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
      detail: source.excerpt || "검토에 반영하기 전에 매칭된 출처 발췌와 최신 상태를 확인합니다.",
      score: source.score,
      href: source.url,
      chips: uniqueCompact([
        source.jurisdiction,
        labelFor(source.sourceType),
        source.priority === "high" ? "중요" : source.priority,
        meta.label,
        source.documentPath ? "문서 저장됨" : ""
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
      <div className={["knowledge-searchbar", loading ? "is-loading" : ""].filter(Boolean).join(" ")}>
        <Search size={19} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="대만 화장품 PIF, 식품첨가물, INCI, CAS, HS code"
          aria-label="지식 검색어"
        />
        {loading && <Loader2 className="spin" size={18} />}
      </div>

      <div className="knowledge-examples knowledge-examples-start" aria-label="검색 예시">
        {onboardingExamples.map((example) => (
          <button key={example.label} type="button" onClick={() => setQuery(example.query)}>
            {example.label}
          </button>
        ))}
      </div>

      {error && <div className="knowledge-alert">{error}</div>}

      <div className="knowledge-flow-strip" aria-label="검색 흐름">
        <span className={hasQuery ? "ready" : ""}>
          <Search size={15} />
          <b>검색</b>
          <small>용어, CAS, 출처를 찾습니다</small>
        </span>
        <span className={hasResults ? "ready" : ""}>
          <ClipboardCheck size={15} />
          <b>결과 선택</b>
          <small>{hasResults ? `${unifiedResults.length.toLocaleString()}개 후보` : "검색 후 선택"}</small>
        </span>
        <span className={selectedEvidence ? "ready" : ""}>
          <PackageSearch size={15} />
          <b>근거 확인</b>
          <small>{selectedEvidence ? "선택한 근거 확인 중" : "선택 전 대기"}</small>
        </span>
        <span className={selectedEvidence ? "ready" : ""}>
          <ClipboardCheck size={15} />
          <b>검토 반영</b>
          <small>{selectedEvidence ? "검토 화면으로 이동" : "근거 확인 후 가능"}</small>
        </span>
      </div>

      {!hasQuery ? (
        <>
          <details className="knowledge-filter-drawer">
            <summary>
              <Filter size={16} />
              필터
              <span>검색 후 결과 범위를 좁힐 수 있습니다</span>
            </summary>
            <div className="knowledge-control-room" aria-label="검색 필터">
              <div className="knowledge-filter-panel">
                <FilterGroup title="관할권" value={jurisdiction} options={filterOptions.jurisdictions} onChange={setJurisdiction} disabled />
                <FilterGroup title="분야" value={domain} options={filterOptions.domains} onChange={setDomain} disabled />
                <FilterGroup title="출처" value={sourceType} options={filterOptions.sourceTypes} onChange={setSourceType} disabled />
                <FilterGroup title="범주" value={category} options={filterOptions.categories} onChange={setCategory} disabled />
                <FilterGroup title="상태" value={freshness} options={fixedFreshnessOptions} onChange={setFreshness} disabled />
              </div>
            </div>
          </details>

          <div className="knowledge-results knowledge-results-unified">
            <section className="knowledge-result-feed">
              <div className="knowledge-section-title">
                <h2>검색 결과</h2>
                <span>{resultCountLabel}</span>
              </div>
              <div className="knowledge-search-empty">
                <Search size={20} />
                <b>검색어를 입력하면 이 자리에 후보가 정리됩니다.</b>
                <span>원료명, CAS, INCI, 번체 현지명, HS code를 같은 검색창에서 찾을 수 있습니다.</span>
              </div>
            </section>

            <aside className="knowledge-detail-panel" aria-label="근거 확인">
              <div className="knowledge-tray-head">
                <ShieldCheck size={18} />
                <div>
                  <h2>근거 확인</h2>
                  <span>결과를 선택하면 원문, 별칭, 검토 연결이 이 자리에 표시됩니다.</span>
                </div>
              </div>
              <div className="knowledge-tray-actions" aria-label="검토 반영">
                <button type="button" disabled>
                  <PackageSearch size={15} />
                  결과 선택 후 검토 반영
                </button>
              </div>
              <div className="knowledge-evidence-empty">
                <ClipboardCheck size={20} />
                <p>후보를 선택하면 관련 원문, 별칭, 근거 상태를 확인할 수 있습니다.</p>
              </div>
            </aside>
          </div>
        </>
      ) : (
        <>
          {data?.ambiguity && (
            <div className="knowledge-ambiguity-panel" role="status">
              <div>
                <b>비슷한 후보가 있습니다</b>
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

          <details className="knowledge-filter-drawer">
              <summary>
                <Filter size={16} />
                필터
                <span>{hasResults ? filterSummary : "검색 후 결과 범위를 좁힐 수 있습니다"}</span>
              </summary>
              <div className="knowledge-control-room" aria-label="검색 보조 옵션">
                <div className="knowledge-filter-panel">
                  <FilterGroup title="관할권" value={jurisdiction} options={filterOptions.jurisdictions} onChange={setJurisdiction} disabled={!hasResults} />
                  <FilterGroup title="분야" value={domain} options={filterOptions.domains} onChange={setDomain} disabled={!hasResults} />
                  <FilterGroup title="출처" value={sourceType} options={filterOptions.sourceTypes} onChange={setSourceType} disabled={!hasResults} />
                  <FilterGroup title="범주" value={category} options={filterOptions.categories} onChange={setCategory} disabled={!hasResults} />
                  <FilterGroup title="상태" value={freshness} options={fixedFreshnessOptions} onChange={setFreshness} disabled={!hasResults} />
                </div>

                {hasResults && <details className="knowledge-health-drawer">
                  <summary>
                    <Database size={16} />
                    운영 지표
                  </summary>
                  <div className="knowledge-health-grid">
                    <StatusTile
                      icon={<ShieldCheck size={17} />}
                      label="매칭 결과"
                      value={matchedCount.toLocaleString()}
                      detail={`용어 ${filteredTerms.length.toLocaleString()}개 - 근거 ${filteredSources.length.toLocaleString()}개`}
                      tone="green"
                    />
                    <StatusTile
                      icon={<Database size={17} />}
                      label="중요 출처"
                      value={highPriorityCount.toLocaleString()}
                      detail="우선 검토 대상 출처"
                      tone="blue"
                    />
                    <StatusTile
                      icon={<RefreshCw size={17} />}
                      label="확인 필요"
                      value={watchCount.toLocaleString()}
                      detail="오래된 캐시 또는 수동 보강 항목"
                      tone={watchCount ? "gold" : "green"}
                    />
                    <StatusTile
                      icon={<BookOpen size={17} />}
                      label="브라우저"
                      value={browserCount.toLocaleString()}
                      detail="브라우저 기반 보강 근거"
                      tone="neutral"
                    />
                  </div>
                </details>}
              </div>
            </details>

          <div className="knowledge-results knowledge-results-unified">
            <section className="knowledge-result-feed">
              <div className="knowledge-section-title">
                <h2>검색 결과</h2>
                <span>{resultCountLabel}</span>
              </div>
              {isRefreshing && (
                <div className="knowledge-refresh-note" role="status">
                  결과를 새로 확인하는 중입니다.
                </div>
              )}
              <div className="knowledge-row-list">
                {hasResults &&
                  unifiedResults.map((item) => (
                    <article className={`knowledge-row ${item.kind}`} key={item.id}>
                      <button
                        type="button"
                        className="knowledge-row-main"
                        onClick={() => (item.kind === "term" ? selectTerm(item.term) : selectSource(item.source))}
                        aria-pressed={selectedEvidence?.title === item.title}
                      >
                        <span className="knowledge-row-kind">{item.kind === "term" ? "용어" : "근거"}</span>
                        <div>
                          <h3>{item.title}</h3>
                          <p>{compact(item.detail, 150)}</p>
                          <div className="knowledge-row-meta">
                            <span>{item.subtitle}</span>
                            {item.chips.slice(0, 2).map((chip) => (
                              <span key={`${item.id}-${chip}`}>{chip}</span>
                            ))}
                          </div>
                        </div>
                        <b>{Math.round(item.score)}</b>
                      </button>
                    </article>
                  ))}

                {!hasResults && (
                  <div className="knowledge-search-empty">
                    <Loader2 className={loading ? "spin" : undefined} size={20} />
                    <b>{loading ? "검색 중입니다." : "검색어에 맞는 후보를 정리하고 있습니다."}</b>
                    <span>결과가 준비되면 같은 자리에서 근거를 선택하고 검토에 반영할 수 있습니다.</span>
                  </div>
                )}
                {hasResults && unifiedResults.length === 0 && <div className="knowledge-empty">현재 필터에 맞는 결과가 없습니다.</div>}
                {hasResults && moreResultCount > 0 && (
                  <div className="knowledge-more-note">
                    {`상위 ${unifiedResults.length.toLocaleString()}개를 표시 중입니다. 보조 옵션에서 숨은 후보 ${moreResultCount.toLocaleString()}개를 더 좁혀 볼 수 있습니다.`}
                  </div>
                )}
              </div>
            </section>

            <aside className="knowledge-detail-panel" aria-label="근거 확인">
              <div className="knowledge-tray-head">
                <ShieldCheck size={18} />
                <div>
                  <h2>근거 확인</h2>
                  <span>
                    {selectedEvidence
                      ? "근거를 확인한 뒤 검토 화면에 반영할 수 있습니다."
                      : "결과를 선택하면 근거와 검토 연결을 확인할 수 있습니다."}
                  </span>
                </div>
              </div>

              <div className="knowledge-tray-actions" aria-label="검토 반영">
                {selectedEvidence ? (
                  <Link href={`/?screen=review&knowledge=${selectedEvidenceParam}`}>
                    <PackageSearch size={15} />
                    검토에 반영하기
                  </Link>
                ) : (
                  <button type="button" disabled>
                    <PackageSearch size={15} />
                    결과 선택 후 검토 반영
                  </button>
                )}
              </div>

              {selectedEvidence ? (
                <div className="knowledge-evidence-card">
                  <div>
                    <small>{selectedEvidence.kind === "term" ? "용어 근거" : "출처 근거"}</small>
                    <h3>{selectedEvidence.title}</h3>
                    <span>{selectedEvidence.subtitle}</span>
                  </div>
                  {typeof selectedEvidence.score === "number" && <b>{Math.round(selectedEvidence.score)}</b>}
                  {selectedEvidence.href && (
                    <div className="knowledge-tray-actions" aria-label="원문 확인">
                      <a href={selectedEvidence.href} target="_blank" rel="noreferrer">
                        원문 열기 <ExternalLink size={15} />
                      </a>
                    </div>
                  )}
                  <p>{compact(selectedEvidence.detail, 240)}</p>
                  <div className="knowledge-evidence-chips">
                    {selectedEvidence.chips.slice(0, 6).map((chip) => (
                      <span key={`${selectedEvidence.title}-${chip}`}>{chip}</span>
                    ))}
                  </div>
                  {selectedEvidence.aliases?.length ? (
                    <div className="knowledge-action-row" aria-label="별칭 재검색">
                      {selectedEvidence.aliases.slice(0, 4).map((alias) => (
                        <button key={`${selectedEvidence.title}-${alias}`} type="button" onClick={() => setQuery(alias)} title={`${alias} 재검색`}>
                          <Search size={14} />
                          {compact(alias, 28)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="knowledge-evidence-empty">
                  <ClipboardCheck size={20} />
                  <p>왼쪽 검색 결과에서 항목을 선택하면 제목, 분류, 근거 상태를 바로 확인할 수 있습니다.</p>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
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
    <div className={`knowledge-health-card ${tone}`}>
      <div>
        {icon}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function buildOptions(values: string[], limit = 7): Option[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [
    { value: ALL, label: "전체" },
    ...[...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([value, count]) => ({ value, label: labelFor(value), count }))
  ];
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
    trade: "무역",
    general_labeling: "일반 표시",
    customs: "통관",
    law: "법률",
    regulation: "규정",
    notice: "고시",
    guidance: "가이드",
    dataset: "데이터셋",
    cosmetic_ingredient: "화장품 성분",
    food_ingredient: "식품 원료",
    food_additive: "식품첨가물",
    label_claim: "표시 광고",
    allergen: "알레르기"
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function matchesFreshness(source: SourceItem, value: string) {
  if (value === ALL) return true;
  if (value === "fresh") return source.cacheStatus === "fresh";
  if (value === "stale") return source.cacheStatus === "stale";
  if (value === "manual") return source.manualFallback;
  if (value === "browser") return source.browserCapture;
  if (value === "cache") return source.fromCache;
  return true;
}

function freshnessMeta(source: SourceItem) {
  if (source.manualFallback) return { label: "수동 보강", tone: "manual" };
  if (source.cacheStatus === "stale") return { label: "확인 필요", tone: "stale" };
  if (source.cacheStatus === "fresh") return { label: source.fromCache ? "캐시 최신" : "최신", tone: "fresh" };
  return { label: source.cacheStatus || "상태 미확인", tone: "unknown" };
}

function compact(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function uniqueCompact(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, 8);
}
