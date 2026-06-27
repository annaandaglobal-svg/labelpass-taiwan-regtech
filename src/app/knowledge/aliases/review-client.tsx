"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Filter,
  Languages,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AliasReviewItem, AliasReviewPriority, AliasReviewQueue } from "@/lib/alias-review";

const ALL = "all";
const STATUS_STORAGE_KEY = "labelpass-alias-review-status";

type AliasReviewWorkStatus = "review" | "reviewed" | "deferred" | "recrawl";

type AliasReviewLocalState = Record<
  string,
  {
    status: AliasReviewWorkStatus;
    updatedAt: string;
    alias: string;
    issue: string;
    priority: string;
    note?: string;
  }
>;

const priorityLabels: Record<AliasReviewPriority, string> = {
  blocker: "차단",
  high: "높음",
  medium: "중간",
  low: "낮음",
  backlog: "백로그"
};

const issueLabels: Record<string, string> = {
  "alias-collision-high-confidence": "고신뢰 충돌",
  "alias-collision": "별칭 충돌",
  mojibake: "문자 깨짐",
  "missing-local-alias": "현지명 누락"
};

const issueIntents: Record<string, string> = {
  "alias-collision-high-confidence": "품목·용도 문맥 메모 추가",
  "alias-collision": "공유 별칭 문맥 보강",
  mojibake: "재수집·수동 캡처",
  "missing-local-alias": "공식 현지명 추가"
};

const laneOptions = [
  { value: "active", label: "우선 검수" },
  { value: "backlog", label: "현지명 백로그" },
  { value: ALL, label: "전체" }
];

const workStatusLabels: Record<AliasReviewWorkStatus, string> = {
  review: "검수 대기",
  reviewed: "검수 완료",
  deferred: "보류",
  recrawl: "재수집 필요"
};

function labelForIssue(issue: string) {
  return issueLabels[issue] ?? issue.replaceAll("-", " ");
}

function labelForPriority(priority: AliasReviewPriority) {
  return priorityLabels[priority] ?? priority;
}

function looksDamaged(item: AliasReviewItem) {
  return item.issue === "mojibake" || /[\uFFFD�]|[?]{2,}/.test(item.alias);
}

function compact(value: string, max = 110) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function unique<T>(items: T[]) {
  return [...new Set(items.filter(Boolean))];
}

function patchTextFor(item: AliasReviewItem) {
  const termIds = item.terms.map((term) => term.term_id).join(", ");
  return [
    `Alias review: ${item.alias}`,
    `Issue: ${labelForIssue(item.issue)} / ${labelForPriority(item.priority)}`,
    `Terms: ${termIds}`,
    `Recommended action: ${item.recommended_action}`
  ].join("\n");
}

function readLocalState(): AliasReviewLocalState {
  try {
    const raw = window.localStorage.getItem(STATUS_STORAGE_KEY);
    return raw ? JSON.parse(raw) as AliasReviewLocalState : {};
  } catch {
    window.localStorage.removeItem(STATUS_STORAGE_KEY);
    return {};
  }
}

function writeLocalState(state: AliasReviewLocalState) {
  window.localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(state));
}

export default function AliasReviewClient({ queue }: { queue: AliasReviewQueue }) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<string>("high");
  const [issue, setIssue] = useState<string>(ALL);
  const [workStatus, setWorkStatus] = useState<string>(ALL);
  const [lane, setLane] = useState("active");
  const [selectedId, setSelectedId] = useState(queue.items[0]?.id ?? "");
  const [copied, setCopied] = useState("");
  const [localState, setLocalState] = useState<AliasReviewLocalState>({});

  useEffect(() => {
    setLocalState(readLocalState());
    const params = new URLSearchParams(window.location.search);
    const initialAlias = params.get("alias")?.trim();
    const initialIssue = params.get("issue")?.trim();
    const initialPriority = params.get("priority")?.trim();
    const initialLane = params.get("lane")?.trim();
    if (initialIssue && (initialIssue === ALL || queue.items.some((item) => item.issue === initialIssue))) setIssue(initialIssue);
    if (initialPriority && (initialPriority === ALL || ["blocker", "high", "medium", "low", "backlog"].includes(initialPriority))) {
      setPriority(initialPriority);
    }
    if (initialLane && laneOptions.some((option) => option.value === initialLane)) setLane(initialLane);
    if (initialAlias) {
      setQuery(initialAlias);
      const exactMatch = queue.items.find((item) => item.alias === initialAlias);
      if (exactMatch) setSelectedId(exactMatch.id);
    }
  }, [queue.items]);

  const priorityCounts = useMemo(() => {
    return queue.items.reduce<Record<string, number>>((counts, item) => {
      counts[item.priority] = (counts[item.priority] ?? 0) + 1;
      return counts;
    }, {});
  }, [queue.items]);

  const issueCounts = useMemo(() => {
    return queue.items.reduce<Record<string, number>>((counts, item) => {
      counts[item.issue] = (counts[item.issue] ?? 0) + 1;
      return counts;
    }, {});
  }, [queue.items]);

  const filterOptions = useMemo(() => {
    const languages = unique(queue.items.flatMap((item) => item.terms.map((term) => term.language))).slice(0, 7);
    const aliasTypes = unique(queue.items.flatMap((item) => item.terms.map((term) => term.alias_type))).slice(0, 7);
    return { languages, aliasTypes };
  }, [queue.items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return queue.items
      .filter((item) => {
        const itemWorkStatus = localState[item.id]?.status ?? "review";
        if (lane === "active" && item.priority === "backlog") return false;
        if (lane === "backlog" && item.priority !== "backlog") return false;
        if (priority !== ALL && item.priority !== priority) return false;
        if (issue !== ALL && item.issue !== issue) return false;
        if (workStatus !== ALL && itemWorkStatus !== workStatus) return false;
        if (!normalizedQuery) return true;
        const haystack = [
          item.alias,
          item.issue,
          item.priority,
          itemWorkStatus,
          item.recommended_action,
          ...item.terms.flatMap((term) => [
            term.term_id,
            term.canonical_name,
            term.alias_type,
            term.language,
            term.jurisdiction,
            term.notes
          ])
        ].join(" ").toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => left.sort_order - right.sort_order);
  }, [issue, lane, localState, priority, query, queue.items, workStatus]);

  useEffect(() => {
    if (filteredItems.length && !filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  const selected = filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;
  const visibleItems = filteredItems.slice(0, 80);
  const damagedCount = queue.items.filter(looksDamaged).length;
  const selectedLanguages = selected ? unique(selected.terms.map((term) => term.language)) : [];
  const selectedAliasTypes = selected ? unique(selected.terms.map((term) => term.alias_type)) : [];
  const localStatusCounts = useMemo(() => {
    return queue.items.reduce<Record<AliasReviewWorkStatus, number>>(
      (counts, item) => {
        const status = localState[item.id]?.status ?? "review";
        counts[status] += 1;
        return counts;
      },
      { review: 0, reviewed: 0, deferred: 0, recrawl: 0 }
    );
  }, [localState, queue.items]);
  const selectedWorkStatus = selected ? localState[selected.id]?.status ?? "review" : "review";

  function setItemStatus(item: AliasReviewItem, status: AliasReviewWorkStatus, note?: string) {
    const next = {
      ...localState,
      [item.id]: {
        status,
        updatedAt: new Date().toISOString(),
        alias: item.alias,
        issue: item.issue,
        priority: item.priority,
        note
      }
    };
    if (status === "review") {
      delete next[item.id];
    }
    setLocalState(next);
    writeLocalState(next);
  }

  function exportLocalState() {
    const payload = {
      exported_at: new Date().toISOString(),
      source_queue_generated_at: queue.generated_at,
      registry_version: queue.summary.registry_version,
      storage: "browser",
      counts: localStatusCounts,
      items: Object.entries(localState).map(([id, state]) => ({ id, ...state }))
    };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `labelpass-alias-review-state-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function copyPatch(item: AliasReviewItem) {
    const text = patchTextFor(item);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(item.id);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  }

  return (
    <section className="alias-review-workbench">
      <div className="alias-health-grid" aria-label="별칭 큐 요약">
        <HealthTile icon={<ShieldCheck size={17} />} label="검수 항목" value={queue.summary.review_items} detail="전체 별칭 운영 큐" tone="green" href="/knowledge/aliases?lane=active&priority=high" />
        <HealthTile icon={<AlertTriangle size={17} />} label="고신뢰 충돌" value={queue.summary.high_confidence_collisions} detail="우선 문맥 보강" tone="gold" href="/knowledge/aliases?issue=alias-collision-high-confidence&priority=high&lane=active" />
        <HealthTile icon={<Languages size={17} />} label="현지명 백로그" value={queue.summary.regulated_terms_without_local_alias} detail="공식 zh-Hant/ko/ja 보강" tone="blue" href="/knowledge/aliases?issue=missing-local-alias&priority=backlog&lane=backlog" />
        <HealthTile icon={<CheckCircle2 size={17} />} label="엄격 차단" value={queue.summary.strict_blockers} detail={damagedCount ? `문자 깨짐 ${damagedCount}건 별도 확인` : "차단 항목 없음"} tone={queue.summary.strict_blockers ? "red" : "neutral"} href="/knowledge/aliases?priority=blocker&lane=all" />
      </div>

      <div className="alias-progress-strip" aria-label="로컬 검수 진행률">
        <span><b>{localStatusCounts.review.toLocaleString()}</b>대기</span>
        <span><b>{localStatusCounts.reviewed.toLocaleString()}</b>완료</span>
        <span><b>{localStatusCounts.deferred.toLocaleString()}</b>보류</span>
        <span><b>{localStatusCounts.recrawl.toLocaleString()}</b>재수집</span>
        <button type="button" onClick={exportLocalState}>
          <Clipboard size={15} />
          상태 내보내기
        </button>
      </div>

      <div className="alias-control-bar">
        <label className="alias-searchbox">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="별칭, term id, 언어, alias type, 조치 메모 검색"
          />
        </label>
        <div className="alias-segment" aria-label="검수 lane">
          {laneOptions.map((option) => (
            <button key={option.value} className={lane === option.value ? "active" : ""} onClick={() => setLane(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <details className="alias-filter-drawer">
        <summary>
          <Filter size={16} />
          필터
          <span>{filteredItems.length.toLocaleString()}건 표시</span>
        </summary>
        <div className="alias-filter-grid">
          <FilterGroup
            label="우선순위"
            value={priority}
            options={[ALL, "blocker", "high", "medium", "low", "backlog"]}
            counts={priorityCounts}
            formatter={(value) => value === ALL ? "전체" : labelForPriority(value as AliasReviewPriority)}
            onChange={setPriority}
          />
          <FilterGroup
            label="이슈"
            value={issue}
            options={[ALL, ...Object.keys(issueCounts)]}
            counts={issueCounts}
            formatter={(value) => value === ALL ? "전체" : labelForIssue(value)}
            onChange={setIssue}
          />
          <FilterGroup
            label="검수 상태"
            value={workStatus}
            options={[ALL, "review", "reviewed", "deferred", "recrawl"]}
            counts={localStatusCounts}
            formatter={(value) => value === ALL ? "전체" : workStatusLabels[value as AliasReviewWorkStatus]}
            onChange={setWorkStatus}
          />
          <div className="alias-filter-hints">
            <b>빠른 힌트</b>
            <span>언어: {filterOptions.languages.join(" · ") || "대기"}</span>
            <span>Alias type: {filterOptions.aliasTypes.join(" · ") || "대기"}</span>
          </div>
        </div>
      </details>

      <div className="alias-review-grid">
        <section className="alias-list-panel">
          <div className="alias-section-head">
            <div>
              <h2>검수 후보</h2>
              <span>상위 {visibleItems.length.toLocaleString()}건 표시 · 전체 일치 {filteredItems.length.toLocaleString()}건</span>
            </div>
            <b>{lane === "backlog" ? "백로그" : lane === "active" ? "우선 검수" : "전체"}</b>
          </div>

          <div className="alias-card-list">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                className={selected?.id === item.id ? "alias-card active" : "alias-card"}
                onClick={() => setSelectedId(item.id)}
              >
                <span className={`alias-priority ${item.priority}`}>{labelForPriority(item.priority)}</span>
                <div>
                  <h3>{item.alias || "(빈 별칭)"}</h3>
                  <p>{compact(item.recommended_action, 130)}</p>
                  <div className="alias-card-meta">
                    <span>{labelForIssue(item.issue)}</span>
                    <span>{workStatusLabels[localState[item.id]?.status ?? "review"]}</span>
                    <span>{item.term_count}개 term</span>
                    <span>{Math.round(item.max_confidence * 100)}%</span>
                    {looksDamaged(item) && <span>문자 확인</span>}
                  </div>
                </div>
                <small>#{item.sort_order}</small>
              </button>
            ))}
            {filteredItems.length === 0 && (
              <div className="alias-empty">
                <Search size={18} />
                <b>조건에 맞는 검수 항목이 없습니다.</b>
                <span>검색어 또는 lane을 넓혀보세요.</span>
              </div>
            )}
          </div>
        </section>

        <aside className="alias-detail-panel" aria-label="선택한 별칭 검수 상세">
          {selected ? (
            <>
              <div className="alias-detail-head">
                <span className={`alias-priority ${selected.priority}`}>{labelForPriority(selected.priority)}</span>
                <div>
                  <h2>{selected.alias || "(빈 별칭)"}</h2>
                  <p>{labelForIssue(selected.issue)} · {issueIntents[selected.issue] ?? "검수 필요"}</p>
                </div>
              </div>

              <div className="alias-action-card">
                <b>권장 조치</b>
                <p>{selected.recommended_action}</p>
                <span className={`alias-work-status ${selectedWorkStatus}`}>{workStatusLabels[selectedWorkStatus]}</span>
                <div>
                  <Link href={`/knowledge?q=${encodeURIComponent(selected.alias)}`}>
                    <Search size={15} />
                    지식 검색에서 확인
                  </Link>
                  <button type="button" onClick={() => void copyPatch(selected)}>
                    <Clipboard size={15} />
                    {copied === selected.id ? "복사됨" : "검수 메모 복사"}
                  </button>
                </div>
                <div className="alias-status-actions" aria-label="검수 상태 변경">
                  <button type="button" onClick={() => setItemStatus(selected, "reviewed", "source-backed context reviewed")}>
                    <CheckCircle2 size={15} />
                    완료
                  </button>
                  <button type="button" onClick={() => setItemStatus(selected, "deferred", "needs later source confirmation")}>
                    <ShieldCheck size={15} />
                    보류
                  </button>
                  <button type="button" onClick={() => setItemStatus(selected, "recrawl", "needs recrawl or manual browser capture")}>
                    <AlertTriangle size={15} />
                    재수집
                  </button>
                  <button type="button" onClick={() => setItemStatus(selected, "review")}>
                    초기화
                  </button>
                </div>
              </div>

              <div className="alias-detail-metrics">
                <span><b>{selected.term_count}</b>연결 term</span>
                <span><b>{Math.round(selected.max_confidence * 100)}%</b>최대 신뢰도</span>
                <span><b>{selectedLanguages.join(" · ") || "und"}</b>언어</span>
                <span><b>{selectedAliasTypes.slice(0, 2).join(" · ") || "alias"}</b>alias type</span>
              </div>

              <div className="alias-term-stack">
                {selected.terms.map((term) => (
                  <article key={`${selected.id}-${term.term_id}`} className="alias-term-card">
                    <div>
                      <h3>{term.canonical_name}</h3>
                      <span>{term.term_id}</span>
                    </div>
                    <div className="alias-term-meta">
                      <span>{term.language}</span>
                      <span>{term.jurisdiction}</span>
                      <span>{term.alias_type}</span>
                      <span>{Math.round(term.confidence * 100)}%</span>
                    </div>
                    <p>{term.notes || "문맥 메모가 필요합니다."}</p>
                  </article>
                ))}
              </div>

              <div className="alias-decision-list">
                <b>운영 액션</b>
                <span><Sparkles size={14} /> 소스 기반 문맥 note 추가</span>
                <span><Sparkles size={14} /> 품목·용도별 별칭 분리</span>
                <span><Sparkles size={14} /> 신뢰도 하향 또는 공식 현지명 보강</span>
                {looksDamaged(selected) && <span><AlertTriangle size={14} /> 재수집 또는 브라우저 수동 캡처 필요</span>}
              </div>
            </>
          ) : (
            <div className="alias-empty">
              <Search size={18} />
              <b>검수 항목을 선택하세요.</b>
              <span>왼쪽 큐에서 별칭을 선택하면 연결 term과 운영 액션이 열립니다.</span>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function HealthTile({
  icon,
  label,
  value,
  detail,
  tone,
  href
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
  tone: "green" | "gold" | "blue" | "red" | "neutral";
  href?: string;
}) {
  const content = (
    <>
      <div>
        {icon}
        <span>{label}</span>
      </div>
      <strong>{value.toLocaleString()}</strong>
      <small>{detail}</small>
    </>
  );

  if (href) {
    return (
      <Link className={`alias-health-card ${tone}`} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`alias-health-card ${tone}`}>
      {content}
    </div>
  );
}

function FilterGroup({
  label,
  value,
  options,
  counts,
  formatter,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  counts: Record<string, number>;
  formatter: (value: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="alias-filter-group">
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <button key={`${label}-${option}`} className={value === option ? "active" : ""} onClick={() => onChange(option)}>
            {formatter(option)}
            {option !== ALL && <small>{(counts[option] ?? 0).toLocaleString()}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}
