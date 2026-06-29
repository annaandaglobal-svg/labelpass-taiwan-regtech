"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
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
import type { KnowledgeEvidenceBundle } from "@/lib/knowledge-evidence";
import type { KnowledgeSearchResult } from "@/lib/knowledge-search";

const ALL = "all";

type FocusMode = "cosmetics" | "food" | "trade";
type SourceItem = KnowledgeSearchResult["sources"][number];
type TermItem = KnowledgeSearchResult["terms"][number];
type RouteHint = KnowledgeEvidenceBundle["routeHints"][number];

type Option = {
  value: string;
  label: string;
  count?: number;
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

type EvidenceItem = {
  kind: "term" | "source";
  title: string;
  subtitle: string;
  detail: string;
  score?: number;
  chips: string[];
  href?: string;
  aliases?: string[];
  aliasWarnings?: TermItem["ambiguousAliases"];
  reviewParam?: string;
};

type KnowledgeSearchClientProps = {
  initialQuery?: string;
  initialData?: KnowledgeSearchResult | null;
  totals: KnowledgeSearchResult["totals"];
  operations: {
    latestFetched: string;
    nextRefresh: string;
    highPrioritySources: number;
    staleSources: number;
    browserCaptures: number;
    manualFallbacks: number;
    aliasReviewItems: number;
    regulatedTermsWithoutLocalAlias: number;
  };
};

const focusModes: Array<{
  id: FocusMode;
  label: string;
  title: string;
  helper: string;
  placeholder: string;
}> = [
  {
    id: "cosmetics",
    label: "화장품",
    title: "대만 화장품 라벨·PIF",
    helper: "INCI, CAS, 금지·제한 성분, 효능 표현, 제품등록, PIF 증빙을 연결합니다.",
    placeholder: "예: PIF, Triclosan, INCI, sunscreen, 急性子"
  },
  {
    id: "food",
    label: "식품",
    title: "식품 원료·첨가물·수입검사",
    helper: "통관에서 막힌 성분명, 발효 원료, 감미료, 영양성분, 수입검사 서류를 확인합니다.",
    placeholder: "예: POTASSIUM GLYCEROPHOSPHATE, 아스퍼질러스 오리재, 스테비아"
  },
  {
    id: "trade",
    label: "통관",
    title: "HS/CCC·수출입 규제",
    helper: "CCC 코드, 수입허가, 원산지 표시, 전략물자/SHTC 여부를 소스와 연결합니다.",
    placeholder: "예: CCC code, import permit, SHTC, origin labeling"
  }
];

const examples: Record<FocusMode, Array<{ label: string; query: string }>> = {
  cosmetics: [
    { label: "PIF", query: "Taiwan cosmetic PIF" },
    { label: "Triclosan", query: "Triclosan" },
    { label: "방부제", query: "Phenoxyethanol Chlorphenesin" },
    { label: "효능 표현", query: "cosmetic claim criteria" }
  ],
  food: [
    { label: "칼륨 글리세로인산", query: "POTASSIUM GLYCEROPHOSPHATE" },
    { label: "오리재 발효분말", query: "아스퍼질러스 오리재발효분말" },
    { label: "나이거 배양물", query: "아스퍼질러스 나이거 배양물" },
    { label: "스테비아", query: "스테비아" }
  ],
  trade: [
    { label: "HS/CCC", query: "HS code CCC code" },
    { label: "수입허가", query: "import regulation permit" },
    { label: "원산지", query: "origin labeling Taiwan customs" },
    { label: "SHTC", query: "strategic high tech commodities" }
  ]
};

const fixedFreshnessOptions: Option[] = [
  { value: ALL, label: "전체" },
  { value: "fresh", label: "최신" },
  { value: "stale", label: "갱신 필요" },
  { value: "manual", label: "수동 보강" },
  { value: "browser", label: "브라우저 캡처" },
  { value: "cache", label: "캐시" }
];

export default function KnowledgeSearchClient({
  initialQuery = "",
  initialData = null,
  totals,
  operations
}: KnowledgeSearchClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<KnowledgeSearchResult | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusMode, setFocusMode] = useState<FocusMode>("cosmetics");
  const [jurisdiction, setJurisdiction] = useState(ALL);
  const [domain, setDomain] = useState(ALL);
  const [sourceType, setSourceType] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [freshness, setFreshness] = useState(ALL);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [evidenceBundle, setEvidenceBundle] = useState<KnowledgeEvidenceBundle | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);

  const trimmed = useMemo(() => query.trim(), [query]);
  const focus = focusModes.find((mode) => mode.id === focusMode) ?? focusModes[0];

  useEffect(() => {
    const urlQuery = new URLSearchParams(window.location.search).get("q");
    if (urlQuery?.trim() && urlQuery.trim() !== initialQuery.trim()) {
      setQuery(urlQuery.trim());
    }
  }, [initialQuery]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    if (!trimmed) {
      setData(null);
      setError("");
      setLoading(false);
      setSelectedEvidence(null);
      setEvidenceBundle(null);
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
            setError("검색을 완료하지 못했습니다. 잠시 후 다시 시도하겠습니다.");
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
    const controller = new AbortController();
    let active = true;

    if (!trimmed) {
      setEvidenceBundle(null);
      return () => {
        active = false;
        controller.abort();
      };
    }

    fetch(`/api/knowledge/evidence?q=${encodeURIComponent(trimmed)}&limit=12`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) throw new Error("evidence_failed");
        return response.json();
      })
      .then((bundle: KnowledgeEvidenceBundle) => {
        if (active) setEvidenceBundle(bundle);
      })
      .catch((evidenceError) => {
        if (active && (evidenceError as Error).name !== "AbortError") setEvidenceBundle(null);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [trimmed]);

  useEffect(() => {
    setSelectedEvidence(null);
    setShowAllResults(false);
  }, [trimmed, jurisdiction, domain, sourceType, category, freshness]);

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

  const unifiedResults = useMemo<UnifiedResult[]>(() => {
    const termRows = filteredTerms.slice(0, 8).map((term) => {
      const collision = collisionSummaryForTerm(term);
      const decision = termDecisionOverride(term);

      return {
        kind: "term" as const,
        id: `term-${term.id}`,
        title: term.canonicalName,
        subtitle: `${labelFor(term.category)} · 별칭 ${term.aliasCount.toLocaleString()}개`,
        detail: decision?.detail || term.notes || "공식 용어, 별칭, CAS/INCI, 연결 규칙을 함께 확인하세요.",
        score: term.score,
        chips: uniqueCompact([
          ...(decision?.chips ?? []),
          ...(collision ? [`문맥 ${collision.names.length + 1}갈래`, collision.alias] : []),
          ...term.identifiers.cas.slice(0, 1).map((value) => `CAS ${value}`),
          ...term.identifiers.inci.slice(0, 1).map((value) => `INCI ${value}`),
          ...term.aliases.slice(0, 2).map((alias) => alias.value),
          `${term.sourceKeys.length}개 소스`
        ]).slice(0, 4),
        term
      };
    });

    const sourceRows = filteredSources.slice(0, 8).map((source) => {
      const meta = freshnessMeta(source);
      return {
        kind: "source" as const,
        id: `source-${source.id}`,
        title: source.title,
        subtitle: `${source.authority} · ${labelFor(source.domain)}`,
        detail: source.excerpt || "공식 원문, 고시, 데이터셋 또는 수동 보강 자료입니다.",
        score: source.score,
        chips: uniqueCompact([
          labelFor(source.jurisdiction),
          labelFor(source.sourceType),
          source.priority === "high" ? "우선 소스" : source.priority,
          meta.label
        ]).slice(0, 4),
        href: source.url,
        source
      };
    });

    return [...termRows, ...sourceRows].sort((left, right) => right.score - left.score).slice(0, 12);
  }, [filteredSources, filteredTerms]);

  const hasQuery = Boolean(trimmed);
  const hasResults = Boolean(data);
  const visibleResults = showAllResults ? unifiedResults : unifiedResults.slice(0, 6);
  const hiddenResultCount = Math.max(0, unifiedResults.length - visibleResults.length);
  const topRoute = evidenceBundle?.routeHints?.[0] ?? null;
  const activeEvidence = selectedEvidence ?? (unifiedResults[0] ? evidenceForResult(unifiedResults[0]) : null);
  const reviewHref = buildReviewHref(activeEvidence?.reviewParam || activeEvidence?.title || trimmed, topRoute);
  const matchedCount = filteredTerms.length + filteredSources.length;
  const highPriorityCount = filteredSources.filter((source) => source.priority === "high").length;
  const watchCount = filteredSources.filter((source) => source.manualFallback || source.cacheStatus === "stale").length;
  const browserCount = filteredSources.filter((source) => source.browserCapture).length;

  function chooseExample(nextQuery: string) {
    setQuery(nextQuery);
  }

  function selectResult(result: UnifiedResult) {
    setSelectedEvidence(evidenceForResult(result));
  }

  return (
    <section className="kb-workbench">
      <div className="kb-command">
        <div className="kb-command-copy">
          <span>검색</span>
          <h2>{focus.title}</h2>
          <p>{focus.helper}</p>
        </div>

        <div className="kb-search-stack">
          <label className={loading ? "kb-searchbar loading" : "kb-searchbar"}>
            <Search size={19} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={focus.placeholder} aria-label="지식베이스 검색" />
            {loading && <Loader2 className="kb-spin" size={18} />}
          </label>

          <div className="kb-mode-tabs" aria-label="업무 모드">
            {focusModes.map((mode) => (
              <button key={mode.id} type="button" className={focusMode === mode.id ? "active" : ""} onClick={() => setFocusMode(mode.id)}>
                {mode.label}
              </button>
            ))}
          </div>

          <div className="kb-example-row" aria-label="추천 검색어">
            {examples[focusMode].map((example) => (
              <button key={example.label} type="button" onClick={() => chooseExample(example.query)}>
                {example.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="kb-alert">{error}</div>}

      <div className="kb-steady-layout">
        <aside className="kb-filter-panel" aria-label="검색 필터">
          <div className="kb-filter-head">
            <Filter size={16} />
            <b>필터</b>
            <span>{hasResults ? `${matchedCount.toLocaleString()}개 매칭` : "검색 후 자동 채움"}</span>
          </div>
          <FilterGroup title="국가·지역" value={jurisdiction} options={filterOptions.jurisdictions} onChange={setJurisdiction} disabled={!hasResults} />
          <FilterGroup title="도메인" value={domain} options={filterOptions.domains} onChange={setDomain} disabled={!hasResults} />
          <FilterGroup title="출처 유형" value={sourceType} options={filterOptions.sourceTypes} onChange={setSourceType} disabled={!hasResults} />
          <FilterGroup title="용어 분류" value={category} options={filterOptions.categories} onChange={setCategory} disabled={!hasResults} />
          <FilterGroup title="갱신 상태" value={freshness} options={fixedFreshnessOptions} onChange={setFreshness} disabled={!hasResults} />
        </aside>

        <section className="kb-results-panel">
          <div className="kb-section-head">
            <div>
              <span>결과</span>
              <h2>{hasQuery ? `"${trimmed}" 검색 결과` : "검색어를 입력하면 이 영역에 결과가 쌓입니다."}</h2>
            </div>
            <small>
              {hasResults
                ? `용어 ${filteredTerms.length.toLocaleString()}개 · 소스 ${filteredSources.length.toLocaleString()}개`
                : `${totals.sources.toLocaleString()}개 소스, ${totals.aliases.toLocaleString()}개 다른 이름`}
            </small>
          </div>

          {!hasQuery && (
            <div className="kb-empty-state">
              <BookOpen size={26} />
              <b>통관에서 문제가 된 성분명이나 라벨 문구를 그대로 붙여넣으세요.</b>
              <span>영어 원료명, 한글 표기, 중문명, HS/CCC, PIF 같은 단어를 함께 넣으면 공식 근거와 확인 경로를 찾습니다.</span>
            </div>
          )}

          {hasQuery && data?.ambiguity && (
            <div className="kb-ambiguity">
              <b>같은 별칭이 여러 용어에 연결될 수 있습니다.</b>
              <span>제품 유형, 국가, 용도를 함께 넣으면 더 정확해집니다.</span>
              <div>
                {data.ambiguity.terms.slice(0, 5).map((term) => (
                  <button key={term.id} type="button" onClick={() => setQuery(term.canonicalName)}>
                    {term.canonicalName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasQuery && loading && !hasResults && (
            <div className="kb-empty-state">
              <Loader2 className="kb-spin" size={24} />
              <b>공식 소스와 용어 인덱스를 찾고 있습니다.</b>
              <span>대만 소스, 별칭, 연결 규칙을 함께 확인합니다.</span>
            </div>
          )}

          {hasQuery && hasResults && unifiedResults.length === 0 && (
            <div className="kb-empty-state">
              <Search size={24} />
              <b>아직 검색 기억장치에 없는 표현입니다.</b>
              <span>검토 콘솔로 넘기면 제품 맥락과 함께 확인하고, 내부에서 필요한 검색어를 보강합니다.</span>
              <Link className="kb-empty-action" href={reviewHref}>
                검토 콘솔에 넣기
                <ArrowRight size={14} />
              </Link>
            </div>
          )}

          <div className="kb-result-list">
            {visibleResults.map((result) => {
              const decision = decisionForResult(result);
              return (
                <article key={result.id} className={`kb-result ${result.kind}`}>
                  <button type="button" onClick={() => selectResult(result)} aria-pressed={activeEvidence?.title === result.title}>
                    <span className={`kb-pill ${decision.tone}`}>{decision.label}</span>
                    <div>
                      <h3>{result.title}</h3>
                      <p>{decision.detail}</p>
                      {result.kind === "term" ? <CollisionInline term={result.term} /> : null}
                      <div className="kb-chip-row">
                        <span>{result.subtitle}</span>
                        {result.chips.slice(0, 3).map((chip) => (
                          <span key={`${result.id}-${chip}`}>{chip}</span>
                        ))}
                      </div>
                    </div>
                    <em>{result.kind === "term" ? "용어" : "소스"}</em>
                  </button>
                </article>
              );
            })}
          </div>

          {hiddenResultCount > 0 && (
            <button className="kb-more-button" type="button" onClick={() => setShowAllResults(true)}>
              결과 {hiddenResultCount.toLocaleString()}개 더 보기
            </button>
          )}
        </section>

        <aside className="kb-detail-panel" aria-label="선택한 증빙">
          <div className="kb-detail-head">
            <ShieldCheck size={18} />
            <div>
              <h2>증빙 패널</h2>
              <span>{activeEvidence ? "선택한 결과를 검토 콘솔로 넘길 수 있습니다." : "검색 결과를 선택하면 공식 출처와 다음 작업이 표시됩니다."}</span>
            </div>
          </div>

          <RouteHintCard route={topRoute} hasQuery={hasQuery} />

          {activeEvidence ? (
            <div className="kb-evidence-card">
              <small>{activeEvidence.kind === "term" ? "용어 증빙" : "공식 소스"}</small>
              <h3>{activeEvidence.title}</h3>
              <span>{activeEvidence.subtitle}</span>
              <p>{compact(activeEvidence.detail, 240)}</p>
              <div className="kb-chip-row">
                {activeEvidence.chips.slice(0, 6).map((chip) => (
                  <span key={`${activeEvidence.title}-${chip}`}>{chip}</span>
                ))}
              </div>
              {activeEvidence.aliases?.length ? (
                <div className="kb-alias-row">
                  {activeEvidence.aliases.slice(0, 5).map((alias) => (
                    <button key={`${activeEvidence.title}-${alias}`} type="button" onClick={() => setQuery(alias)}>
                      {compact(alias, 30)}
                    </button>
                  ))}
                </div>
              ) : null}
              {activeEvidence.aliasWarnings?.length ? (
                <div className="kb-alias-warning">
                  <div>
                    <AlertTriangle size={15} />
                    <b>별칭 문맥 확인</b>
                  </div>
                  {activeEvidence.aliasWarnings.slice(0, 3).map((warning) => (
                    <span key={`${activeEvidence.title}-${warning.normalized}`}>
                      <b>{warning.value}</b>
                      <small> · 문맥: {contextNamesForWarning(warning).join(" / ")}</small>
                      {warning.recommendedAction ? <small> · 권장: {compact(warning.recommendedAction, 120)}</small> : null}
                      {warning.contexts?.slice(0, 3).map((context) => (
                        <small key={`${warning.normalized}-${context.termId}`}>
                          {context.canonicalName}: {labelFor(context.jurisdiction)} · {labelFor(context.language)} · {compact(context.notes, 96)}
                        </small>
                      ))}
                    </span>
                  ))}
                  <small>운영팀 확인 목록에서 품목·용도별 뜻을 분리해야 하는 후보입니다.</small>
                </div>
              ) : null}
              <div className="kb-detail-actions">
                <Link href={reviewHref}>
                  <PackageSearch size={15} />
                  검토 콘솔로 보내기
                </Link>
                {activeEvidence.href && (
                  <a href={activeEvidence.href} target="_blank" rel="noreferrer">
                    원문 열기
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="kb-detail-empty">
              <ClipboardCheck size={22} />
              <b>아직 선택한 증빙이 없습니다.</b>
              <span>검색 결과를 누르면 용어, 별칭, 공식 소스가 여기에 고정됩니다.</span>
              <div className="kb-detail-actions disabled">
                <button type="button" disabled>
                  <PackageSearch size={15} />
                  검토 콘솔로 보내기
                </button>
                <button type="button" disabled>
                  원문 열기
                  <ExternalLink size={15} />
                </button>
              </div>
            </div>
          )}

          <div className="kb-health-grid">
            <StatusTile icon={<Database size={16} />} label="우선 소스" value={hasResults ? highPriorityCount.toLocaleString() : operations.highPrioritySources.toLocaleString()} tone="blue" />
            <StatusTile icon={<RefreshCw size={16} />} label="갱신 필요" value={hasResults ? watchCount.toLocaleString() : operations.staleSources.toLocaleString()} tone={watchCount ? "gold" : "green"} />
            <StatusTile icon={<BookOpen size={16} />} label="브라우저 캡처" value={hasResults ? browserCount.toLocaleString() : operations.browserCaptures.toLocaleString()} tone="neutral" />
            <StatusTile icon={<ShieldCheck size={16} />} label="별칭 검수" value={operations.aliasReviewItems.toLocaleString()} tone="gold" />
          </div>

          <div className="kb-refresh-note">
            <b>최근 수집</b>
            <span>{operations.latestFetched}</span>
            <b>다음 갱신</b>
            <span>{operations.nextRefresh}</span>
          </div>
        </aside>
      </div>
    </section>
  );

  function buildTermEvidence(term: TermItem): EvidenceItem {
    const decision = termDecisionOverride(term);

    return {
      kind: "term",
      title: term.canonicalName,
      subtitle: `${labelFor(term.category)} · 별칭 ${term.aliasCount.toLocaleString()}개`,
      detail: decision?.detail || term.notes || "공식 용어, 별칭, 규칙 링크를 확인하세요.",
      score: term.score,
      chips: uniqueCompact([
        ...(decision?.chips ?? []),
        ...term.identifiers.cas.map((value) => `CAS ${value}`),
        ...term.identifiers.inci.slice(0, 3).map((value) => `INCI ${value}`),
        ...term.rules.slice(0, 4).map((rule) => rule.ruleCode),
        `${term.sourceKeys.length}개 소스`
      ]),
      aliases: uniqueCompact(term.aliases.map((alias) => alias.value).filter((value) => value !== term.canonicalName)).slice(0, 8),
      aliasWarnings: term.ambiguousAliases,
      reviewParam: term.canonicalName
    };
  }

  function buildSourceEvidence(source: SourceItem): EvidenceItem {
    const meta = freshnessMeta(source);
    return {
      kind: "source",
      title: source.title,
      subtitle: `${source.authority} · ${labelFor(source.domain)}`,
      detail: source.excerpt || "공식 원문, 고시, 데이터셋 또는 수동 보강 자료입니다.",
      score: source.score,
      href: source.url,
      chips: uniqueCompact([
        labelFor(source.jurisdiction),
        labelFor(source.sourceType),
        source.priority === "high" ? "우선 소스" : source.priority,
        meta.label,
        source.documentPath ? "문서 저장됨" : ""
      ]),
      reviewParam: source.title
    };
  }

  function evidenceForResult(result: UnifiedResult): EvidenceItem {
    return result.kind === "term" ? buildTermEvidence(result.term) : buildSourceEvidence(result.source);
  }
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
    <div className="kb-filter-group">
      <span>{title}</span>
      <div>
        {options.map((option) => (
          <button
            key={`${title}-${option.value}`}
            type="button"
            className={option.value === value ? "active" : ""}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {typeof option.count === "number" && <small>{option.count}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}

function CollisionInline({ term }: { term: TermItem }) {
  const collision = collisionSummaryForTerm(term);
  if (!collision) return null;

  return (
    <div className="kb-result-context">
      <AlertTriangle size={13} />
      <span>{collision.alias}</span>
      <small> · 문맥: {collision.names.slice(0, 3).join(" / ")}</small>
    </div>
  );
}

function collisionSummaryForTerm(term: TermItem) {
  const warning = term.ambiguousAliases[0];
  if (!warning) return null;
  const contextNames = contextNamesForWarning(warning).filter((name) => name !== term.canonicalName);
  const names = contextNames.length ? contextNames : warning.otherTerms;
  return {
    alias: warning.value,
    names
  };
}

function contextNamesForWarning(warning: TermItem["ambiguousAliases"][number]) {
  const contextNames = warning.contexts?.map((context) => context.canonicalName) ?? [];
  return uniqueCompact(contextNames.length ? contextNames : warning.otherTerms);
}

function RouteHintCard({ route, hasQuery }: { route: RouteHint | null; hasQuery: boolean }) {
  if (!route) {
    return (
      <div className="kb-route-card empty">
        <small>AI 분류</small>
        <b>{hasQuery ? "품목 맥락을 더 넣으면 다음 확인 항목이 좁혀집니다." : "검색하면 관련 확인 항목이 표시됩니다."}</b>
        <p>예: 단백질 파우더, 화장품 PIF, 식품첨가물, HS 0307처럼 품목과 문제 성분을 같이 넣으면 정확도가 올라갑니다.</p>
      </div>
    );
  }

  return (
    <div className="kb-route-card">
      <small>AI 분류</small>
      <b>{cleanRouteLabel(route.label, route.routeId)}</b>
      <p>{cleanRouteAction(route.nextAction)}</p>
      <div className="kb-chip-row">
        {route.requiredInputs.slice(0, 4).map((input) => (
          <span key={`${route.routeId}-${input}`}>{cleanInputLabel(input)}</span>
        ))}
      </div>
    </div>
  );
}

function StatusTile({
  icon,
  label,
  value,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "green" | "blue" | "gold" | "neutral";
}) {
  return (
    <div className={`kb-status-tile ${tone}`}>
      {icon}
      <span>{label}</span>
      <b>{value}</b>
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
    .sort((left, right) => right[1] - left[1] || labelFor(left[0]).localeCompare(labelFor(right[0]), "ko"))
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
  if (source.browserCapture) return { label: "브라우저 캡처", tone: "blue" };
  if (source.manualFallback) return { label: "수동 보강", tone: "gold" };
  if (source.cacheStatus === "stale") return { label: "갱신 필요", tone: "gold" };
  if (source.fromCache) return { label: "캐시", tone: "neutral" };
  if (source.cacheStatus === "fresh") return { label: "최신", tone: "green" };
  return { label: "상태 확인", tone: "neutral" };
}

function termDecisionOverride(term: TermItem) {
  if (term.id === "potassium-glycerophosphate-food-additive") {
    return {
      label: "허용 확인 안 됨",
      detail:
        "대만 TFDA 식품첨가물 사용범위/한도 부록에서 Potassium Glycerophosphate 정확명은 확인되지 않았습니다. Calcium Glycerophosphate는 별도 허용 항목이므로 대체 근거가 아닙니다. 식품첨가물 용도라면 TFDA 허가조회/허가증, 최종 식품군, 사용량, 중문명·규격 확인 전까지 승인 불가로 봅니다.",
      tone: "gold",
      chips: ["TFDA 부록 미확인", "허가조회 필요", "Calcium salt와 별개", "508 수입검사 가능"]
    };
  }

  return null;
}

function decisionForResult(item: UnifiedResult) {
  if (item.kind === "term") {
    const decision = termDecisionOverride(item.term);
    if (decision) return decision;

    if (item.term.ambiguousAliases.length) {
      return { label: "문맥 확인", detail: "같은 별칭이 다른 규제 용어에도 연결됩니다. 품목과 용도를 함께 확인하세요.", tone: "gold" };
    }
    if (item.score >= 95) {
      return { label: "강한 매칭", detail: "입력어가 공식 용어 또는 높은 신뢰도 별칭과 직접 연결됩니다.", tone: "green" };
    }
    if (item.score >= 70) {
      return { label: "관련 용어", detail: "별칭, CAS/INCI, 연결 규칙을 함께 확인하면 좋습니다.", tone: "blue" };
    }
    return { label: "확인 필요", detail: "제품 유형과 국가 맥락을 더 넣으면 매칭 정확도가 올라갑니다.", tone: "gold" };
  }

  if (item.score >= 80) {
    return { label: "공식 근거", detail: "검색어와 강하게 연결된 공식 소스입니다.", tone: "green" };
  }
  if (item.score >= 58) {
    return { label: "참고 소스", detail: "검토 경로와 관련된 출처입니다. 원문을 열어 범위를 확인하세요.", tone: "blue" };
  }
  return { label: "보조 근거", detail: "추가 키워드와 함께 다시 확인하면 좋습니다.", tone: "neutral" };
}

function buildReviewHref(query: string, route: RouteHint | null) {
  const params = new URLSearchParams({ screen: "review" });
  const trimmed = query.trim();
  if (trimmed) params.set("knowledge", trimmed);
  if (route?.routeId) params.set("route_id", route.routeId);
  if (route?.productFamily) params.set("product_family", route.productFamily);
  return `/?${params.toString()}`;
}

function cleanRouteLabel(label: string, routeId: string) {
  if (/[가-힣A-Za-z]/.test(label) && !/[�]/.test(label)) return label;
  if (routeId.includes("cosmetic")) return "대만 화장품 라벨·PIF";
  if (routeId.includes("additive")) return "식품첨가물 검토";
  if (routeId.includes("food")) return "대만 식품 라벨·수입검사";
  if (routeId.includes("packaging")) return "식품용 포장재 검토";
  return "HS/CCC·수출입 규제 검토";
}

function cleanRouteAction(action: string) {
  if (/[가-힣A-Za-z]/.test(action) && !/[�]/.test(action) && action.length < 160) return action;
  return "제품 유형, 성분명, 라벨 문구, 수입자/원산지 정보를 검토 콘솔에 넣고 공식 소스와 대조하세요.";
}

function cleanInputLabel(input: string) {
  const labels: Record<string, string> = {
    product_type: "제품 유형",
    ingredients: "성분·원재료",
    label_text: "라벨 문안",
    origin: "원산지",
    manufacturer: "제조사",
    importer: "수입자",
    hs_code: "HS/CCC",
    evidence: "증빙자료"
  };
  if (labels[input]) return labels[input];
  if (/[가-힣A-Za-z]/.test(input) && !/[�]/.test(input) && input.length < 36) return input.replaceAll("_", " ");
  return "필수 입력";
}

function uniqueCompact(values: string[]) {
  return Array.from(new Set(values.map((value) => compact(value, 42)).filter(Boolean)));
}

function compact(value: string, maxLength: number) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
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
    html: "HTML",
    pdf: "PDF",
    manual: "수동",
    browser_capture: "브라우저 캡처",
    zh: "중국어",
    "zh-Hant": "번체",
    "zh-Hans": "간체",
    en: "영어",
    ko: "한국어",
    ja: "일본어",
    und: "언어 미정",
    cosmetic_ingredient: "화장품 원료",
    food_ingredient: "식품 원료",
    food_cosmetic_ingredient: "식품·화장품 원료",
    fermented_food_ingredient: "발효식품 원료",
    food_additive: "식품첨가물",
    label_claim: "표시·광고 표현",
    allergen: "알레르기",
    documentation: "서류",
    import_export: "수출입",
    term: "용어"
  };

  return labels[value] ?? String(value ?? "").replaceAll("_", " ");
}
