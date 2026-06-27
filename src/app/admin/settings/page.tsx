import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Database,
  Globe2,
  Settings2,
  ShieldCheck,
  ToggleLeft,
  XCircle
} from "lucide-react";
import { AdminOpsReadinessCard } from "@/components/admin-ops-readiness-card";
import { getPlatformOpsSnapshot, type PlatformSettingRow } from "@/lib/platform-ops-store";

const fallbackSettings: PlatformSettingRow[] = [
  {
    organization: "Annaanda Global",
    billingStatus: "trial",
    locale: "ko-KR",
    markets: ["TW"],
    reviewArchiveEnabled: false,
    expertMatchingEnabled: true,
    logisticsMatchingEnabled: true,
    notifications: ["email"],
    next: "Supabase DB URL 연결 후 리뷰 아카이브와 운영 데이터 저장을 켭니다."
  },
  {
    organization: "Expert Partner Pool",
    billingStatus: "active",
    locale: "zh-TW",
    markets: ["TW", "KR"],
    reviewArchiveEnabled: false,
    expertMatchingEnabled: true,
    logisticsMatchingEnabled: false,
    notifications: ["email", "dashboard"],
    next: "전문가 상담방과 정산 알림 채널을 확인합니다."
  },
  {
    organization: "Logistics Partner Pool",
    billingStatus: "active",
    locale: "zh-TW",
    markets: ["TW"],
    reviewArchiveEnabled: false,
    expertMatchingEnabled: false,
    logisticsMatchingEnabled: true,
    notifications: ["email", "webhook"],
    next: "선적 이벤트 webhook과 통관 보류 알림을 연결합니다."
  }
];

function EnabledPill({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span className={`admin-toggle-pill ${enabled ? "enabled" : "disabled"}`}>
      {enabled ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {label}
    </span>
  );
}

export default async function AdminSettingsPage() {
  const snapshot = await getPlatformOpsSnapshot();
  const settings = snapshot.settings;
  const sourceLabel = snapshot.storage === "database" ? "Supabase 설정 데이터" : "운영 프리뷰 데이터";
  const expertEnabled = settings.filter((item) => item.expertMatchingEnabled).length;
  const logisticsEnabled = settings.filter((item) => item.logisticsMatchingEnabled).length;
  const archiveEnabled = settings.filter((item) => item.reviewArchiveEnabled).length;
  const activeBilling = settings.filter((item) => item.billingStatus === "active").length;

  return (
    <>
      <header className="admin-section-hero">
        <div>
          <p>회사별 설정</p>
          <h1>시장, 언어, 리뷰 저장, 전문가 매칭, 물류 매칭, 알림 채널을 조직 단위로 관리합니다.</h1>
        </div>
        <Link className="admin-primary-action" href="/admin/companies">
          회사 관리 보기
          <ArrowRight size={16} />
        </Link>
      </header>

      <section className="admin-metrics" aria-label="설정 상태 요약">
        <article className="admin-metric good">
          <span>활성 결제 조직</span>
          <strong>{activeBilling}</strong>
          <small>billing_status가 active인 조직</small>
        </article>
        <article className="admin-metric info">
          <span>전문가 매칭 ON</span>
          <strong>{expertEnabled}</strong>
          <small>유료 전문가 상담을 사용할 수 있는 조직</small>
        </article>
        <article className="admin-metric info">
          <span>물류 매칭 ON</span>
          <strong>{logisticsEnabled}</strong>
          <small>견적·선적 트래킹을 사용할 수 있는 조직</small>
        </article>
        <article className="admin-metric warn">
          <span>리뷰 저장 ON</span>
          <strong>{archiveEnabled}</strong>
          <small>서버 DB 저장 게이트와 함께 확인해야 합니다.</small>
        </article>
      </section>

      <section className="admin-grid">
        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>설정 매트릭스</span>
              <h2>조직별 기능 토글</h2>
            </div>
            <Settings2 size={18} />
          </div>
          <div className="admin-table admin-table-settings">
            <div className="admin-table-head">
              <span>조직</span>
              <span>시장·언어</span>
              <span>기능</span>
              <span>다음 확인</span>
            </div>
            {settings.map((item) => (
              <div key={item.organization} className="admin-table-row">
                <span>
                  <b>{item.organization}</b>
                  <small>billing {item.billingStatus}</small>
                </span>
                <span>
                  <b>{item.markets.join(" / ")}</b>
                  <small>{item.locale}</small>
                  <small>{item.notifications.join(", ")}</small>
                </span>
                <span className="admin-toggle-stack">
                  <EnabledPill enabled={item.reviewArchiveEnabled} label="리뷰 저장" />
                  <EnabledPill enabled={item.expertMatchingEnabled} label="전문가" />
                  <EnabledPill enabled={item.logisticsMatchingEnabled} label="물류" />
                </span>
                <span>{item.next}</span>
              </div>
            ))}
          </div>
        </article>

        <AdminOpsReadinessCard />

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>설정 출처</span>
              <h2>DB 연결 상태</h2>
            </div>
            <Database size={18} />
          </div>
          <p className="admin-note">
            현재 표시 소스: {sourceLabel}. {snapshot.warnings[0] ?? "organization_settings가 Supabase에서 읽히고 있습니다."}
          </p>
          <div className="admin-chip-list">
            <span><Database size={14} /> organization_settings</span>
            <span><ShieldCheck size={14} /> RLS manager write</span>
            <span><ToggleLeft size={14} /> feature flags</span>
            <span><Bell size={14} /> notification channels</span>
          </div>
        </article>

        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>운영 정책</span>
              <h2>회사 설정이 제어하는 흐름</h2>
            </div>
            <Globe2 size={18} />
          </div>
          <div className="admin-flow">
            <span><Globe2 size={16} /> TW 시장 우선</span>
            <span><ShieldCheck size={16} /> 리뷰 저장</span>
            <span><CheckCircle2 size={16} /> 전문가 매칭</span>
            <span><CheckCircle2 size={16} /> 물류 매칭</span>
            <span><Bell size={16} /> 알림 채널</span>
            <span><Database size={16} /> DB write gate</span>
          </div>
        </article>
      </section>
    </>
  );
}
