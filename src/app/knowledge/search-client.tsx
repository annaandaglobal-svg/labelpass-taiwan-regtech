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
  { label: "화장품 PIF", query: "PIF" },
  { label: "식품첨가물 허가", query: "food additive" },
  { label: "알레르겐 표시", query: "대만 알레르겐 표시" },
  { label: "화장품 색소", query: "cosmetic colorants" },
  { label: "INCI 성분명", query: "INCI" },
  { label: "수입 라벨·HS", query: "HS code" },
  { label: "건강식품 허가", query: "health food" },
  { label: "SDS/GHS", query: "SDS" }
];
const ALL = "all";

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
      reviewParam: string;
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
      reviewParam: string;
      href: string;
      source: SourceItem;
    };

const fixedFreshnessOptions: Option[] = [
  { value: ALL, label: "전체" },
  { value: "fresh", label: "최신" },
  { value: "stale", label: "갱신 필요" },
  { value: "manual", label: "수동 보완" },
  { value: "browser", label: "브라우저 수집" },
  { value: "cache", label: "캐시 반영" }
];

const onboardingExamples = examples.slice(0, 4);

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
            setError("지식 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.");
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
  }, [data]);

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
      if (jurisdiction !== ALL) {
        const hasJurisdiction =
          term.rules.some((rule) => rule.jurisdiction === jurisdiction) ||
          term.aliases.some((alias) => alias.jurisdiction === jurisdiction);
        if (!hasJurisdiction) return false;
      }
      return true;
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
  const primaryTerm = filteredTerms[0];
  const primarySource = filteredSources[0];
  const hasQuery = Boolean(trimmed);
  const hasResults = Boolean(data);
  const isRefreshing = loading && hasResults;
  const highPriorityCount = filteredSources.filter((source) => source.priority === "high").length;
  const watchCount = filteredSources.filter((source) => source.manualFallback || source.cacheStatus === "stale").length;
  const browserCount = filteredSources.filter((source) => source.browserCapture).length;
  const matchedCount = filteredTerms.length + filteredSources.length;
  const unifiedResults = useMemo<UnifiedResult[]>(() => {
    const termRows = visibleTerms.map((term) => ({
      kind: "term" as const,
      id: `term-${term.id}`,
      title: term.canonicalName,
      subtitle: `${labelFor(term.category)} · 별칭 ${term.aliasCount.toLocaleString()}개`,
      detail: term.notes || "다국어 별칭, 식별자, 규칙 연결을 함께 확인해야 하는 용어입니다.",
      score: term.score,
      chips: uniqueCompact([
        ...term.identifiers.cas.slice(0, 1).map((value) => `CAS ${value}`),
        ...term.identifiers.inci.slice(0, 1).map((value) => `INCI ${value}`),
        ...term.aliases.slice(0, 2).map((alias) => alias.value),
        `${term.sourceKeys.length}개 출처`
      ]).slice(0, 4),
      reviewParam: term.canonicalName,
      term
    }));
    const sourceRows = visibleSources.map((source) => {
      const meta = freshnessMeta(source);
      return {
        kind: "source" as const,
        id: `source-${source.id}`,
        title: source.title,
        subtitle: `${source.authority} · ${labelFor(source.domain)}`,
        detail: source.excerpt || "검색어와 연결된 공식 규제 근거입니다.",
        score: source.score,
        chips: uniqueCompact([
          source.jurisdiction,
          labelFor(source.sourceType),
          source.priority === "high" ? "우선 검토" : source.priority,
          meta.label
        ]).slice(0, 4),
        reviewParam: source.title,
        href: source.url,
        source
      };
    });

    return [...termRows, ...sourceRows].sort((left, right) => right.score - left.score).slice(0, 8);
  }, [visibleSources, visibleTerms]);
  const activeEvidence = evidence ?? (primaryTerm ? buildTermEvidence(primaryTerm) : primarySource ? buildSourceEvidence(primarySource) : null);
  const activeEvidenceParam = encodeURIComponent(activeEvidence?.reviewParam || activeEvidence?.title || trimmed || "PIF");
  const controlSummary = hasResults
    ? `${isRefreshing ? "업데이트 중 · " : ""}우선 검토 ${highPriorityCount.toLocaleString()} · 감시 ${watchCount.toLocaleString()}`
    : hasQuery
      ? "결과가 준비되면 활성화됩니다"
      : "검색 후 범위를 좁힙니다";
  const resultCountLabel = hasResults ? unifiedResults.length.toLocaleString() : loading ? "검색 중" : "대기";
  const moreResultCount = Math.max(0, filteredTerms.length - visibleTerms.length) + Math.max(0, filteredSources.length - visibleSources.length);

  function buildTermEvidence(term: TermItem): EvidenceItem {
    const chips = uniqueCompact([
      ...term.identifiers.cas.map((value) => `CAS ${value}`),
      ...term.identifiers.inci.slice(0, 3).map((value) => `INCI ${value}`),
      ...term.rules.slice(0, 4).map((rule) => rule.ruleCode),
      `${term.sourceKeys.length}개 출처`
    ]);

    return {
      kind: "term",
      title: term.canonicalName,
      subtitle: `${labelFor(term.category)} · 별칭 ${term.aliasCount.toLocaleString()}개`,
      detail:
        term.notes || "이 용어는 다국어 별칭, 식별자, 규칙 연결을 함께 묶어 검토하기 좋습니다.",
      score: term.score,
      chips,
      aliases: uniqueCompact(term.aliases.map((alias) => alias.value).filter((value) => value !== term.canonicalName)),
      reviewParam: term.canonicalName
    };
  }

  function buildSourceEvidence(source: SourceItem): EvidenceItem {
    const meta = freshnessMeta(source);
    return {
      kind: "source",
      title: source.title,
      subtitle: `${source.authority} · ${labelFor(source.domain)}`,
      detail: source.excerpt || "이 출처는 검색 결과와 연결된 규제 근거입니다.",
      score: source.score,
      href: source.url,
      chips: uniqueCompact([
        source.jurisdiction,
        labelFor(source.sourceType),
        source.priority === "high" ? "우선 검토" : source.priority,
        meta.label,
        source.documentPath ? "로컬 문서" : ""
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
    <section className={["knowledge-workbench", hasQuery ? "has-query" : "is-awaiting", isRefreshing ? "is-refreshing" : ""].filter(Boolean).join(" ")}>
      <div className={["knowledge-searchbar", loading ? "is-loading" : ""].filter(Boolean).join(" ")}>
        <Search size={19} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="대만 화장품 PIF, 식품 첨가물, INCI, CAS, 수입 라벨"
          aria-label="규제 지식 검색어"
        />
        {loading && <Loader2 className="spin" size={18} />}
      </div>

      {!hasQuery && (
        <div className="knowledge-examples knowledge-examples-start" aria-label="예시 검색">
          {onboardingExamples.map((example) => (
            <button key={example.label} type="button" onClick={() => setQuery(example.query)}>
              {example.label}
            </button>
          ))}
        </div>
      )}

      {error && <div className="knowledge-alert">{error}</div>}

      <div className="knowledge-summary" aria-live="polite">
        <span>{hasResults ? `${isRefreshing ? "검색 갱신 중 · " : ""}검색 결과 ${matchedCount.toLocaleString()}건` : hasQuery ? "검색 준비 중" : "검색 전 대기"}</span>
        <span>{hasResults ? `용어 ${filteredTerms.length.toLocaleString()}` : "용어 대기"}</span>
        <span>{hasResults ? `출처 ${filteredSources.length.toLocaleString()}` : "출처 대기"}</span>
      </div>

      {data?.ambiguity && (
        <div className="knowledge-ambiguity-panel" role="status">
          <div>
            <b>문맥 확인 필요</b>
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
          고급 필터
          <span>{controlSummary}</span>
        </summary>
        <div className="knowledge-control-room" aria-label="검색 결과 제어판">
          <div className="knowledge-filter-panel">
            <div className="knowledge-panel-title">
              <Filter size={17} />
              <div>
                <b>검색 필터</b>
                <span>{hasResults ? "관할, 도메인, 출처 유형, 분류, 신선도로 검색 범위를 좁힙니다." : "검색 전에는 위치만 유지하고, 결과가 들어오면 같은 자리에서 활성화됩니다."}</span>
              </div>
            </div>
            <FilterGroup title="관할" value={jurisdiction} options={filterOptions.jurisdictions} onChange={setJurisdiction} disabled={!hasResults} />
            <FilterGroup title="도메인" value={domain} options={filterOptions.domains} onChange={setDomain} disabled={!hasResults} />
            <FilterGroup title="출처 유형" value={sourceType} options={filterOptions.sourceTypes} onChange={setSourceType} disabled={!hasResults} />
            <FilterGroup title="분류" value={category} options={filterOptions.categories} onChange={setCategory} disabled={!hasResults} />
            <FilterGroup title="신선도" value={freshness} options={fixedFreshnessOptions} onChange={setFreshness} disabled={!hasResults} />
          </div>

          <div className="knowledge-health-grid">
            <StatusTile
              icon={<ShieldCheck size={17} />}
              label="일치한 항목"
              value={hasResults ? matchedCount.toLocaleString() : loading ? "검색 중" : "대기"}
              detail={hasResults ? `용어 ${filteredTerms.length.toLocaleString()}개 · 출처 ${filteredSources.length.toLocaleString()}개` : "검색어를 넣으면 결과 기준으로 갱신됩니다"}
              tone="green"
            />
            <StatusTile
              icon={<Database size={17} />}
              label="우선 검토 자료"
              value={hasResults ? highPriorityCount.toLocaleString() : "대기"}
              detail="우선 검토가 필요한 공식 자료"
              tone="blue"
            />
            <StatusTile
              icon={<RefreshCw size={17} />}
              label="갱신 감시"
              value={hasResults ? watchCount.toLocaleString() : "대기"}
              detail="갱신 필요 또는 수동 보완 상태"
              tone={watchCount && hasResults ? "gold" : "green"}
            />
            <StatusTile
              icon={<BookOpen size={17} />}
              label="브라우저 수집"
              value={hasResults ? browserCount.toLocaleString() : "대기"}
              detail="브라우저에서 확보한 보조 근거"
              tone="neutral"
            />
          </div>
        </div>
      </details>

      <div className="knowledge-results knowledge-results-unified">
        <section className="knowledge-result-feed">
          <div className="knowledge-section-title">
            <h2>검토 후보</h2>
            <span>{resultCountLabel}</span>
          </div>
          {isRefreshing && (
            <div className="knowledge-refresh-note" role="status">
              기존 후보를 유지한 채 새 검색을 반영하고 있습니다.
            </div>
          )}
          <div className="knowledge-row-list">
            {hasResults && unifiedResults.map((item) => (
              <article className={`knowledge-row ${item.kind}`} key={item.id}>
                <button
                  type="button"
                  className="knowledge-row-main"
                  onClick={() => item.kind === "term" ? selectTerm(item.term) : selectSource(item.source)}
                  aria-pressed={activeEvidence?.title === item.title}
                >
                  <span className="knowledge-row-kind">{item.kind === "term" ? "용어" : "출처"}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{compact(item.detail, 150)}</p>
                    <div className="knowledge-row-meta">
                      <span>{item.subtitle}</span>
                      {item.chips.slice(0, 3).map((chip) => <span key={`${item.id}-${chip}`}>{chip}</span>)}
                    </div>
                  </div>
                  <b>{Math.round(item.score)}</b>
                </button>
              </article>
            ))}

            {!hasResults && !hasQuery && (
              <div className="knowledge-search-empty">
                <Search size={20} />
                <b>원료명, 현지 용어, CAS, 표시문구를 검색하세요.</b>
                <span>후보 목록, 고급 필터, 근거 액션은 같은 자리에서 열립니다.</span>
              </div>
            )}
            {!hasResults && hasQuery && (
              <div className="knowledge-search-empty">
                <Loader2 className={loading ? "spin" : undefined} size={20} />
                <b>{loading ? "검색 중입니다." : "검색 결과를 기다리고 있습니다."}</b>
                <span>후보가 준비되면 이 목록에서 하나만 선택하고, 실행은 오른쪽 근거 패널에서 이어갑니다.</span>
              </div>
            )}
            {hasResults && unifiedResults.length === 0 && <div className="knowledge-empty">현재 필터에 맞는 후보가 없습니다.</div>}
            {hasResults && moreResultCount > 0 && (
              <div className="knowledge-more-note">{`상위 후보 ${unifiedResults.length.toLocaleString()}개만 먼저 보여줍니다. 고급 필터로 범위를 좁히면 숨은 후보 ${moreResultCount.toLocaleString()}개를 더 정확히 볼 수 있습니다.`}</div>
            )}
          </div>
        </section>

        <aside className="knowledge-detail-panel" aria-label="선택한 근거">
          <div className="knowledge-tray-head">
            <ShieldCheck size={18} />
            <div>
              <h2>근거 상세</h2>
              <span>{activeEvidence ? "선택한 후보에서 검토에 넘길 근거만 따로 확인합니다." : "검색 전부터 액션 위치를 유지하고, 후보 선택 후 활성화합니다."}</span>
            </div>
          </div>

          {activeEvidence ? (
            <div className="knowledge-evidence-card">
              <div>
                <small>{activeEvidence.kind === "term" ? "용어 근거" : "출처 근거"}</small>
                <h3>{activeEvidence.title}</h3>
                <span>{activeEvidence.subtitle}</span>
              </div>
              {typeof activeEvidence.score === "number" && <b>{Math.round(activeEvidence.score)}</b>}
              <div className="knowledge-tray-actions">
                <Link href={`/?screen=review&knowledge=${activeEvidenceParam}`}>
                  <PackageSearch size={15} />
                  이 근거로 라벨 검토
                </Link>
                {activeEvidence.href && (
                  <a href={activeEvidence.href} target="_blank" rel="noreferrer">
                    원문 보기 <ExternalLink size={15} />
                  </a>
                )}
              </div>
              <p>{compact(activeEvidence.detail, 240)}</p>
              <div className="knowledge-evidence-chips">
                {activeEvidence.chips.slice(0, 8).map((chip) => (
                  <span key={`${activeEvidence.title}-${chip}`}>{chip}</span>
                ))}
              </div>
              {activeEvidence.aliases?.length ? (
                <div className="knowledge-action-row" aria-label="별칭 재검색">
                  {activeEvidence.aliases.slice(0, 4).map((alias) => (
                    <button key={`${activeEvidence.title}-${alias}`} type="button" onClick={() => setQuery(alias)} title={`${alias} 별칭으로 다시 검색`}>
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
              <p>{hasQuery ? "후보를 선택하면 라벨 검토와 원문 확인 액션이 이곳에서 활성화됩니다." : "검색 전에는 검토 액션이 비활성 상태로 대기합니다."}</p>
              <div className="knowledge-tray-actions" aria-label="대기 중인 근거 액션">
                <button type="button" disabled>
                  <PackageSearch size={15} />
                  라벨 검토 대기
                </button>
                <button type="button" disabled>
                  <ExternalLink size={15} />
                  원문 보기 대기
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
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
  if (source.manualFallback) return { label: "수동 보완", tone: "manual" };
  if (source.cacheStatus === "stale") return { label: "갱신 필요", tone: "stale" };
  if (source.cacheStatus === "fresh") return { label: source.fromCache ? "캐시 최신" : "최신", tone: "fresh" };
  return { label: source.cacheStatus || "상태 미정", tone: "unknown" };
}

function compact(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function uniqueCompact(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, 8);
}
