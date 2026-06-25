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
  ShieldCheck,
  Tags
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { KnowledgeSearchResult } from "@/lib/knowledge-search";

const examples = ["SDS", "HS코드", "원산지 표시", "INCI", "營養標示", "過敏原標示", "PIF", "化妆品备案"];
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
};

const fixedFreshnessOptions: Option[] = [
  { value: ALL, label: "전체" },
  { value: "fresh", label: "신선" },
  { value: "stale", label: "오래됨" },
  { value: "manual", label: "수동 확인" },
  { value: "browser", label: "브라우저 캡처" },
  { value: "cache", label: "캐시" }
];

export default function KnowledgeSearchClient() {
  const [query, setQuery] = useState("SDS");
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
    const timer = window.setTimeout(() => {
      if (!trimmed) {
        setData(null);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      fetch(`/api/knowledge/search?q=${encodeURIComponent(trimmed)}&limit=12`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("search_failed");
          return response.json();
        })
        .then((result: KnowledgeSearchResult) => setData(result))
        .catch((searchError) => {
          if (searchError.name !== "AbortError") setError("검색을 완료하지 못했습니다. 다른 용어나 출처로 다시 시도해 주세요.");
        })
        .finally(() => setLoading(false));
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed]);

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

  const evidenceTitle = evidence?.title || trimmed || "SDS";
  const evidenceParam = encodeURIComponent(evidenceTitle);
  const highPriorityCount = filteredSources.filter((source) => source.priority === "high").length;
  const watchCount = filteredSources.filter((source) => source.manualFallback || source.cacheStatus === "stale").length;
  const browserCount = filteredSources.filter((source) => source.browserCapture).length;

  function selectTerm(term: TermItem) {
    const chips = uniqueCompact([
      ...term.identifiers.cas.map((value) => `CAS ${value}`),
      ...term.identifiers.inci.slice(0, 3).map((value) => `INCI ${value}`),
      ...term.rules.slice(0, 4).map((rule) => rule.ruleCode),
      `${term.sourceKeys.length} sources`
    ]);
    setEvidence({
      kind: "term",
      title: term.canonicalName,
      subtitle: `${labelFor(term.category)} · 별칭 ${term.aliasCount.toLocaleString()}개`,
      detail: term.notes || "선택한 용어의 별칭, 식별자, 규칙 링크를 검토 콘솔에서 재확인할 수 있습니다.",
      score: term.score,
      chips
    });
  }

  function selectSource(source: SourceItem) {
    const meta = freshnessMeta(source);
    setEvidence({
      kind: "source",
      title: source.title,
      subtitle: `${source.authority} · ${labelFor(source.domain)}`,
      detail: source.excerpt || "공식 출처 색인에 연결된 근거 자료입니다.",
      score: source.score,
      href: source.url,
      chips: uniqueCompact([
        source.jurisdiction,
        labelFor(source.sourceType),
        source.priority === "high" ? "high priority" : source.priority,
        meta.label,
        source.documentPath ? "local document" : ""
      ])
    });
  }

  return (
    <section className="knowledge-workbench">
      <div className="knowledge-searchbar">
        <Search size={19} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="원료명, CAS, INCI, 현지어, HS코드, 공식 출처 검색"
          aria-label="Knowledge search"
        />
        {loading && <Loader2 className="spin" size={18} />}
      </div>

      <div className="knowledge-examples">
        {examples.map((example) => (
          <button key={example} onClick={() => setQuery(example)}>
            {example}
          </button>
        ))}
      </div>

      {error && <div className="knowledge-alert">{error}</div>}

      {data && (
        <>
          <div className="knowledge-summary">
            <span>{data.totals.terms.toLocaleString()} terms</span>
            <span>{data.totals.aliases.toLocaleString()} aliases</span>
            <span>{data.totals.ruleLinks.toLocaleString()} rule links</span>
            <span>{data.totals.sources.toLocaleString()} sources</span>
          </div>

          <div className="knowledge-control-room" aria-label="검색 결과 제어판">
            <div className="knowledge-filter-panel">
              <div className="knowledge-panel-title">
                <Filter size={17} />
                <div>
                  <b>결과 필터</b>
                  <span>국가, 분야, 출처 유형, 용어 분류, 캐시 상태 기준으로 좁힙니다.</span>
                </div>
              </div>
              <FilterGroup title="관할" value={jurisdiction} options={filterOptions.jurisdictions} onChange={setJurisdiction} />
              <FilterGroup title="분야" value={domain} options={filterOptions.domains} onChange={setDomain} />
              <FilterGroup title="출처 유형" value={sourceType} options={filterOptions.sourceTypes} onChange={setSourceType} />
              <FilterGroup title="용어 분류" value={category} options={filterOptions.categories} onChange={setCategory} />
              <FilterGroup title="신선도" value={freshness} options={fixedFreshnessOptions} onChange={setFreshness} />
            </div>

            <div className="knowledge-health-grid">
              <StatusTile
                icon={<ShieldCheck size={17} />}
                label="현재 증거"
                value={`${filteredTerms.length + filteredSources.length}`}
                detail={`용어 ${filteredTerms.length}개, 출처 ${filteredSources.length}개`}
                tone="green"
              />
              <StatusTile
                icon={<Database size={17} />}
                label="고신뢰 출처"
                value={highPriorityCount.toLocaleString()}
                detail="high priority 공식 자료"
                tone="blue"
              />
              <StatusTile
                icon={<RefreshCw size={17} />}
                label="점검 필요"
                value={watchCount.toLocaleString()}
                detail="오래됨 또는 수동 확인"
                tone={watchCount ? "gold" : "green"}
              />
              <StatusTile
                icon={<BookOpen size={17} />}
                label="캡처 보강"
                value={browserCount.toLocaleString()}
                detail="브라우저 캡처 완료"
                tone="neutral"
              />
            </div>
          </div>
        </>
      )}

      <div className="knowledge-results">
        <section className="knowledge-result-column">
          <div className="knowledge-section-title">
            <h2>Matched Terms</h2>
            <span>{filteredTerms.length.toLocaleString()}</span>
          </div>
          <div className="knowledge-result-list">
            {filteredTerms.map((term) => (
              <article className="knowledge-term" key={term.id}>
                <div className="knowledge-term-head">
                  <Tags size={18} />
                  <div>
                    <h3>{term.canonicalName}</h3>
                    <span>{labelFor(term.category)}</span>
                  </div>
                  <b>{Math.round(term.score)}</b>
                </div>

                <div className="knowledge-aliases">
                  {term.aliases.map((alias) => (
                    <button
                      key={`${term.id}-${alias.value}-${alias.language}-${alias.type}`}
                      type="button"
                      onClick={() => setQuery(alias.value)}
                    >
                      <span>{alias.value}</span>
                      <small>{[alias.type, alias.language, alias.jurisdiction].filter(Boolean).join(" / ")}</small>
                    </button>
                  ))}
                </div>

                <div className="knowledge-identifiers">
                  {term.identifiers.cas.map((value) => (
                    <button key={`cas-${value}`} type="button" onClick={() => setQuery(value)}>CAS {value}</button>
                  ))}
                  {term.identifiers.inci.slice(0, 4).map((value) => (
                    <button key={`inci-${value}`} type="button" onClick={() => setQuery(value)}>INCI {value}</button>
                  ))}
                  {term.identifiers.colorIndex.map((value) => (
                    <button key={`ci-${value}`} type="button" onClick={() => setQuery(value)}>{value}</button>
                  ))}
                </div>

                {term.rules.length > 0 && (
                  <div className="knowledge-rules">
                    {term.rules.slice(0, 6).map((rule) => (
                      <button
                        key={`${term.id}-${rule.ruleCode}`}
                        type="button"
                        onClick={() => {
                          setQuery(rule.ruleCode);
                          selectTerm(term);
                        }}
                      >
                        <span>{rule.ruleCode}</span>
                        <small>{rule.basis}</small>
                      </button>
                    ))}
                  </div>
                )}

                {term.notes && <p>{term.notes}</p>}

                <div className="knowledge-action-row">
                  <button type="button" onClick={() => selectTerm(term)}>
                    <ClipboardCheck size={15} />
                    증거 고정
                  </button>
                  <Link href={`/?screen=review&knowledge=${encodeURIComponent(term.canonicalName)}`}>
                    <PackageSearch size={15} />
                    검토 콘솔
                  </Link>
                </div>
              </article>
            ))}

            {data && filteredTerms.length === 0 && <div className="knowledge-empty">현재 필터에서 맞는 용어가 없습니다.</div>}
          </div>
        </section>

        <section className="knowledge-result-column">
          <div className="knowledge-section-title">
            <h2>Matched Sources</h2>
            <span>{filteredSources.length.toLocaleString()}</span>
          </div>
          <div className="knowledge-result-list">
            {filteredSources.map((source) => {
              const meta = freshnessMeta(source);
              return (
                <article className="knowledge-source" key={source.id}>
                  <div className="knowledge-term-head">
                    <BookOpen size={18} />
                    <div>
                      <h3>{source.title}</h3>
                      <span>{source.authority}</span>
                    </div>
                    <b>{Math.round(source.score)}</b>
                  </div>
                  <div className="knowledge-source-meta">
                    <span className={`knowledge-freshness ${meta.tone}`}>{meta.label}</span>
                    <span>{source.jurisdiction}</span>
                    <span>{labelFor(source.domain)}</span>
                    <span>{labelFor(source.sourceType)}</span>
                    <span>{source.format.toUpperCase()}</span>
                    {source.cacheExpiresAt && <span>refresh {formatDate(source.cacheExpiresAt)}</span>}
                    {source.browserCapture && <span>browser capture</span>}
                    {source.manualFallback && <span>manual fallback</span>}
                  </div>
                  {source.excerpt && <p className="knowledge-source-excerpt">{compact(source.excerpt, 180)}</p>}
                  <div className="knowledge-source-tags">
                    {source.tags.slice(0, 6).map((tag) => (
                      <button key={`${source.id}-${tag}`} type="button" onClick={() => setQuery(tag)}>
                        {tag}
                      </button>
                    ))}
                  </div>
                  <div className="knowledge-action-row">
                    <button type="button" onClick={() => setQuery(source.authority)}>
                      <Database size={15} />
                      기관 검색
                    </button>
                    <button type="button" onClick={() => selectSource(source)}>
                      <ClipboardCheck size={15} />
                      증거 고정
                    </button>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      공식 원문 <ExternalLink size={15} />
                    </a>
                  </div>
                </article>
              );
            })}

            {data && filteredSources.length === 0 && <div className="knowledge-empty">현재 필터에서 맞는 출처가 없습니다.</div>}
          </div>
        </section>

        <aside className="knowledge-evidence-tray" aria-label="고정된 검토 증거">
          <div className="knowledge-tray-head">
            <ShieldCheck size={18} />
            <div>
              <h2>Evidence Tray</h2>
              <span>고정한 용어와 출처를 검토 흐름으로 넘깁니다.</span>
            </div>
          </div>

          {evidence ? (
            <div className="knowledge-evidence-card">
              <div>
                <small>{evidence.kind === "term" ? "Term evidence" : "Source evidence"}</small>
                <h3>{evidence.title}</h3>
                <span>{evidence.subtitle}</span>
              </div>
              {typeof evidence.score === "number" && <b>{Math.round(evidence.score)}</b>}
              <p>{compact(evidence.detail, 220)}</p>
              <div className="knowledge-evidence-chips">
                {evidence.chips.map((chip) => (
                  <span key={`${evidence.title}-${chip}`}>{chip}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="knowledge-evidence-empty">
              <ClipboardCheck size={20} />
              <p>용어, 규칙, 공식 출처를 고정하면 이곳에 검토 근거가 쌓입니다.</p>
            </div>
          )}

          <div className="knowledge-tray-actions">
            <Link href={`/?screen=review&knowledge=${evidenceParam}`}>
              <PackageSearch size={15} />
              검토 콘솔
            </Link>
            <Link href={`/?screen=products&knowledge=${evidenceParam}`}>
              <Database size={15} />
              제품 보관함
            </Link>
            {evidence?.href && (
              <a href={evidence.href} target="_blank" rel="noreferrer">
                원문 열기 <ExternalLink size={15} />
              </a>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function FilterGroup({
  title,
  value,
  options,
  onChange
}: {
  title: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
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
    EU: "유럽",
    GLOBAL: "글로벌",
    cosmetics: "화장품",
    food: "식품",
    trade: "수출입",
    general_labeling: "공통 표시",
    customs: "통관",
    law: "법령",
    regulation: "규정",
    notice: "고시",
    guidance: "가이드",
    dataset: "데이터",
    cosmetic_ingredient: "화장품 원료",
    food_ingredient: "식품 원료",
    food_additive: "식품첨가물",
    label_claim: "표시/광고",
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
  if (source.manualFallback) return { label: "수동 확인", tone: "manual" };
  if (source.cacheStatus === "stale") return { label: "오래됨", tone: "stale" };
  if (source.cacheStatus === "fresh") return { label: source.fromCache ? "캐시 신선" : "신선", tone: "fresh" };
  return { label: source.cacheStatus || "미확인", tone: "unknown" };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "pending";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", timeZone: "Asia/Seoul" }).format(date);
}

function compact(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function uniqueCompact(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, 8);
}
