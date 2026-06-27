import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CreditCard,
  Database,
  FileCheck2,
  Handshake,
  PlaneTakeoff,
  Settings2,
  ShieldCheck,
  Truck,
  Users
} from "lucide-react";
import { getAliasReviewQueue } from "@/lib/alias-review";
import { getKnowledgeOverview, searchKnowledge } from "@/lib/knowledge-search";
import { adminMetrics, adminQueue, platformModules } from "@/lib/platform-admin";
import { getPlatformOpsSnapshot } from "@/lib/platform-ops-store";

const moduleIcons: Record<string, ReactNode> = {
  organizations: <Users size={18} />,
  documents: <FileCheck2 size={18} />,
  experts: <Handshake size={18} />,
  payments: <CreditCard size={18} />,
  logistics: <Truck size={18} />,
  settings: <Settings2 size={18} />
};

export default async function AdminPage() {
  const overview = getKnowledgeOverview();
  const totals = searchKnowledge("").totals;
  const aliasQueue = getAliasReviewQueue();
  const opsSnapshot = await getPlatformOpsSnapshot();
  const visibleOpsCount =
    opsSnapshot.counts.organizations +
    opsSnapshot.counts.expertMatches +
    opsSnapshot.counts.shipmentRequests +
    opsSnapshot.counts.activeShipments;
  const metrics = adminMetrics.map((metric) => {
    if (metric.label === "공식 지식 소스") {
      return {
        ...metric,
        value: totals.sources.toLocaleString(),
        detail: `${totals.terms.toLocaleString()} terms, ${totals.aliases.toLocaleString()} aliases`
      };
    }
    if (metric.label === "운영 테이블" && visibleOpsCount > 0) {
      return {
        ...metric,
        value: visibleOpsCount.toLocaleString(),
        detail: `조직 ${opsSnapshot.counts.organizations}, 전문가매칭 ${opsSnapshot.counts.expertMatches}, 물류요청 ${opsSnapshot.counts.shipmentRequests}, 선적 ${opsSnapshot.counts.activeShipments}`
      };
    }
    if (metric.label === "남은 연결") {
      return {
        ...metric,
        value: opsSnapshot.storage === "database" ? "DB 연결" : "프리뷰",
        detail:
          opsSnapshot.storage === "database"
            ? "관리자 운영 화면이 Supabase 실데이터를 읽고 있습니다."
            : opsSnapshot.warnings[0] ?? metric.detail,
        tone: opsSnapshot.storage === "database" ? "good" : metric.tone
      };
    }
    return metric;
  });

  return (
    <>
      <header className="admin-hero">
        <div>
          <p>운영 콘솔</p>
          <h1>회사 데이터, 리뷰 큐, 전문가 매칭, 물류·선적 상태를 한 흐름으로 관리합니다.</h1>
        </div>
        <Link className="admin-primary-action" href="/admin/companies">
          회사 관리 시작
          <ArrowRight size={16} />
        </Link>
      </header>

      <section className="admin-metrics" aria-label="운영 상태 요약">
        {metrics.map((metric) => (
          <article key={metric.label} className={`admin-metric ${metric.tone}`}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </section>

      <section className="admin-grid">
        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>운영 모듈</span>
              <h2>플랫폼 확장 뼈대</h2>
            </div>
            <BadgeCheck size={18} />
          </div>
          <div className="admin-module-list">
            {platformModules.map((module) => (
              <div key={module.id} className="admin-module-card">
                <span>{moduleIcons[module.id]}</span>
                <div>
                  <b>{module.label}</b>
                  <p>{module.purpose}</p>
                  <small>{module.tables.join(", ")}</small>
                </div>
                <em>{module.status === "schema_ready" ? "DB 준비" : "연결 필요"}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>검수 큐</span>
              <h2>다음 운영 작업</h2>
            </div>
            <ShieldCheck size={18} />
          </div>
          <div className="admin-queue-list">
            {adminQueue.map((item) => (
              <div key={item.id} className={`admin-queue-item ${item.status}`}>
                <span>{item.status}</span>
                <b>{item.title}</b>
                <p>{item.note}</p>
                <small>{item.owner} · {item.due}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>지식 운영</span>
              <h2>공식 소스 상태</h2>
            </div>
            <Database size={18} />
          </div>
          <div className="admin-health-list">
            <span>
              <b>{overview.operations.highPrioritySources.toLocaleString()}</b>
              high-priority sources
            </span>
            <span>
              <b>{overview.operations.manualFallbacks.toLocaleString()}</b>
              manual fallback with evidence
            </span>
            <span>
              <b>{aliasQueue.summary.review_items.toLocaleString()}</b>
              alias review items
            </span>
            <span>
              <b>{overview.operations.updateCandidates.toLocaleString()}</b>
              update candidates
            </span>
          </div>
        </article>

        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>운영 흐름</span>
              <h2>검토에서 선적까지</h2>
            </div>
            <PlaneTakeoff size={18} />
          </div>
          <div className="admin-flow">
            <span><Boxes size={16} /> 회사/제품</span>
            <span><ShieldCheck size={16} /> 라벨 검토</span>
            <span><Handshake size={16} /> 전문가 상담</span>
            <span><CreditCard size={16} /> 결제·정산</span>
            <span><Truck size={16} /> 물류 매칭</span>
            <span><PlaneTakeoff size={16} /> 선적 추적</span>
          </div>
        </article>
      </section>
    </>
  );
}
