import Link from "next/link";
import { ArrowLeft, Database, Search, ShieldCheck } from "lucide-react";
import { getKnowledgeOverview, searchKnowledge } from "@/lib/knowledge-search";
import KnowledgeSearchClient from "./search-client";

export default function KnowledgePage() {
  const totals = searchKnowledge("").totals;
  const overview = getKnowledgeOverview();
  const latestFetched = overview.operations.latestFetchedAt
    ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(overview.operations.latestFetchedAt))
    : "pending";
  const nextRefresh = overview.operations.nextRefreshAt
    ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(overview.operations.nextRefreshAt))
    : "pending";

  return (
    <main className="knowledge-shell">
      <section className="knowledge-hero">
        <div>
          <Link className="knowledge-back" href="/">
            <ArrowLeft size={17} />
            Back to review
          </Link>
          <p className="eyebrow">Regulatory memory</p>
          <h1>Ingredient and source search</h1>
          <p>
            Search INCI, CAS, Korean, Traditional Chinese, Simplified Chinese, Japanese, common names,
            abbreviations, and official Taiwan rule aliases from the reusable LabelPass knowledge base.
          </p>
        </div>
        <div className="knowledge-stats">
          <span>
            <Database size={18} />
            {totals.sources.toLocaleString()} official sources
          </span>
          <span>
            <Search size={18} />
            {totals.aliases.toLocaleString()} search aliases
          </span>
          <span>
            <ShieldCheck size={18} />
            {totals.ruleLinks.toLocaleString()} rule links
          </span>
        </div>
      </section>

      <section className="knowledge-ops" aria-label="Knowledge operations overview">
        <div>
          <span>출처 최신성</span>
          <strong>{latestFetched}</strong>
          <small>
            다음 갱신 {nextRefresh} · 만료 {overview.operations.staleSources.toLocaleString()} · 3일 내 갱신{" "}
            {overview.operations.expiringSoonSources.toLocaleString()} · 캐시 재사용{" "}
            {overview.operations.fromCache.toLocaleString()} · 브라우저 캡처{" "}
            {overview.operations.browserCaptures.toLocaleString()} · 수동 보강{" "}
            {overview.operations.manualFallbacks.toLocaleString()} · 변경 큐{" "}
            {overview.operations.updateCandidates.toLocaleString()} · 갱신 대기{" "}
            {overview.operations.pendingUpdateCandidates.toLocaleString()} · 감시{" "}
            {overview.operations.watchedUpdateSources.toLocaleString()}
          </small>
        </div>
        <OverviewGroup title="국가" items={overview.coverage.jurisdictions} />
        <OverviewGroup title="영역" items={overview.coverage.domains} />
        <OverviewGroup title="용어" items={overview.coverage.categories} />
        <OverviewGroup title="언어" items={overview.coverage.languages} />
      </section>

      <KnowledgeSearchClient />
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
            {item.key}
            <b>{item.count.toLocaleString()}</b>
          </small>
        ))}
      </div>
    </div>
  );
}
