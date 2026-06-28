import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  Handshake,
  PackageCheck,
  Search,
  Ship,
  Truck
} from "lucide-react";
import { WorkspaceHandoffDrafts } from "@/components/workspace-handoff-drafts";
import { getKnowledgeOverview, searchKnowledge } from "@/lib/knowledge-search";
import { buildPlatformOpsActionQueue, getPlatformOpsSnapshot } from "@/lib/platform-ops-store";

const productRows = [
  {
    name: "Cica Barrier Cream",
    category: "화장품",
    route: "대만 화장품 라벨·PIF",
    status: "PIF 보강",
    tone: "warn",
    owner: "Annaanda Global",
    due: "7월 1일",
    progress: 68,
    next: "PIF 목차, INCI 제한성분 대조표, 중문 라벨 표현을 전문가 상담 전 확정합니다.",
    docs: ["PIF", "GMP", "COA", "중문 라벨"],
    links: [
      { href: "/#intake", label: "1차 검토" },
      { href: "/workspace#expert-cases", label: "상담 상태" },
      { href: "/workspace#shipment-events", label: "선적 상태" }
    ]
  },
  {
    name: "Soy Corn Protein Bar",
    category: "식품",
    route: "대만 식품 라벨",
    status: "라벨 수정",
    tone: "review",
    owner: "Green Spoon Co.",
    due: "7월 3일",
    progress: 54,
    next: "알레르겐, 영양성분, 원재료 별칭, GMO/non-GMO 증빙을 한 묶음으로 정리합니다.",
    docs: ["중문 라벨", "영양성분", "알레르겐", "원산지"],
    links: [
      { href: "/#intake", label: "1차 검토" },
      { href: "/knowledge?q=allergen", label: "근거" },
      { href: "/workspace#expert-cases", label: "상담 상태" }
    ]
  },
  {
    name: "Shelf-stable Tea Beverage",
    category: "식품 수입",
    route: "식품 수입검사·통관",
    status: "통관 보류",
    tone: "blocked",
    owner: "Green Market TW",
    due: "오늘",
    progress: 32,
    next: "첨가물 용도 설명, 라벨 번역본, CCC/HS 근거를 통관 이벤트에 붙입니다.",
    docs: ["성분표", "첨가물", "CCC/HS", "수입검사"],
    links: [
      { href: "/knowledge?q=food additive", label: "첨가물" },
      { href: "/workspace#shipment-events", label: "선적" },
      { href: "/workspace#review-queue", label: "리뷰 상태" }
    ]
  }
];

const launchHandoffSteps = [
  {
    id: "expert",
    label: "상담 범위",
    title: "전문가에게 넘길 항목 묶기",
    detail: "PIF, INCI, 중문 라벨, 식품 클레임을 제품별 상담 범위로 고정합니다.",
    href: "/workspace#expert-cases",
    tone: "review",
    icon: Handshake
  },
  {
    id: "payment",
    label: "견적·결제",
    title: "결제 후 작업방 열기",
    detail: "견적 승인, 결제 상태, 상담방 접근 권한을 같은 흐름에서 확인합니다.",
    href: "/workspace#expert-cases",
    tone: "waiting",
    icon: CreditCard
  },
  {
    id: "shipment",
    label: "선적·통관",
    title: "물류사와 tracking 연결",
    detail: "물류 견적, 선적 이벤트, 통관 보류 증빙을 선적 상태에 붙입니다.",
    href: "/workspace#shipment-events",
    tone: "blocked",
    icon: Truck
  }
];

const stateLabels: Record<string, string> = {
  requested: "요청",
  quoted: "견적",
  accepted: "수락",
  booked: "예약",
  in_transit: "운송중",
  customs_hold: "통관 보류",
  delivered: "도착",
  cancelled: "취소",
  matched: "매칭",
  paid: "결제",
  in_progress: "진행중",
  completed: "완료",
  refunded: "환불"
};

function labelState(value: string) {
  return stateLabels[value] ?? value;
}

function customerActionHref(href: string) {
  switch (href) {
    case "/admin/reviews":
      return "/workspace#review-queue";
    case "/admin/experts":
    case "/admin/payments":
      return "/workspace#expert-cases";
    case "/admin/logistics":
      return "/workspace#shipment-events";
    default:
      return href.startsWith("/admin") ? "/workspace" : href;
  }
}

export default async function WorkspacePage() {
  const [opsSnapshot] = await Promise.all([getPlatformOpsSnapshot()]);
  const workspaceActionQueue = buildPlatformOpsActionQueue(opsSnapshot, 8)
    .filter((item) => {
      const searchableText = `${item.label} ${item.title} ${item.detail} ${item.next} ${item.owner}`;
      return item.href !== "/admin/settings" && !/관리자 DB|운영 설정|DB URL|storage|Supabase/i.test(searchableText);
    })
    .slice(0, 5);
  const knowledgeTotals = searchKnowledge("").totals;
  const overview = getKnowledgeOverview();
  const blockedProducts = productRows.filter((item) => item.tone === "blocked").length;
  const docCount = productRows.reduce((total, item) => total + item.docs.length, 0);
  const activeExpertCases = opsSnapshot.expertCases.filter((item) =>
    ["requested", "matched", "paid", "in_progress"].includes(item.state)
  );

  const metrics = [
    {
      label: "제품",
      value: productRows.length,
      detail: blockedProducts > 0 ? `${blockedProducts}건 우선 처리` : "출시 준비 흐름 정상"
    },
    {
      label: "검토",
      value: opsSnapshot.counts.reviews,
      detail: "라벨·PIF·수입검사 큐"
    },
    {
      label: "증빙",
      value: docCount,
      detail: "제품별 필수 문서 묶음"
    },
    {
      label: "전문가",
      value: activeExpertCases.length,
      detail: "상담·결제·작업방"
    },
    {
      label: "선적",
      value: opsSnapshot.counts.activeShipments,
      detail: `${opsSnapshot.counts.customsHolds}건 통관 보류`
    }
  ];

  return (
    <>
      <section className="lp-main workspace-main">
        <header className="workspace-topbar">
          <div>
            <p>Annaanda Global 워크스페이스</p>
            <h1>대만 화장품·식품 제품, 증빙, 전문가, 물류 상태를 한 화면에서 정리합니다.</h1>
          </div>
          <div className="workspace-topbar-actions">
            <Link className="workspace-button primary" href="/">
              <ClipboardCheck size={15} />
              새 검토
            </Link>
            <Link className="workspace-button" href="/knowledge">
              <Search size={15} />
              근거 검색
            </Link>
          </div>
        </header>

        <section className="workspace-metrics" aria-label="워크스페이스 상태">
          {metrics.map((metric) => (
            <span key={metric.label} className="workspace-metric">
              <small>{metric.label}</small>
              <b>{metric.value.toLocaleString("ko-KR")}</b>
              <em>{metric.detail}</em>
            </span>
          ))}
        </section>

        <section className="workspace-handoff-strip" aria-label="전문가·결제·물류 요청 흐름">
          {launchHandoffSteps.map((step) => {
            const Icon = step.icon;

            return (
              <Link key={step.id} className={`workspace-handoff-step ${step.tone}`} href={step.href}>
                <Icon size={16} />
                <span>{step.label}</span>
                <b>{step.title}</b>
                <small>{step.detail}</small>
              </Link>
            );
          })}
        </section>

        <section className="workspace-dashboard">
          <WorkspaceHandoffDrafts />

          <article className="workspace-panel workspace-panel-wide">
            <div className="workspace-panel-head">
              <div>
                <span>제품별 진행</span>
                <h2>이번 주 닫아야 할 대만 출시 작업</h2>
              </div>
              <PackageCheck size={18} />
            </div>
            <div className="workspace-product-list">
              {productRows.map((product) => (
                <section key={product.name} className={`workspace-product-row ${product.tone}`}>
                  <div className="workspace-product-main">
                    <div className="workspace-product-title">
                      <div>
                        <b>{product.name}</b>
                        <span>{product.category} / {product.route}</span>
                      </div>
                      <em>{product.status}</em>
                    </div>
                    <p>{product.next}</p>
                    <div className="workspace-doc-grid" aria-label={`${product.name} 증빙`}>
                      {product.docs.map((doc) => (
                        <span key={`${product.name}-${doc}`}>
                          <FileCheck2 size={14} />
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="workspace-product-aside">
                    <span>
                      <CalendarCheck size={14} />
                      {product.due}
                    </span>
                    <i aria-label={`${product.progress}% 완료`}>
                      <b style={{ width: `${product.progress}%` }} />
                    </i>
                    <small>{product.owner}</small>
                    <div className="workspace-link-row">
                      {product.links.map((link) => (
                        <Link key={`${product.name}-${link.href}-${link.label}`} href={link.href}>
                          {link.label}
                          <ArrowRight size={13} />
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </article>

          <article className="workspace-panel" id="review-queue">
            <div className="workspace-panel-head">
              <div>
                <span>오늘 처리</span>
                <h2>리뷰·전문가·물류 액션</h2>
              </div>
              <AlertTriangle size={18} />
            </div>
            <div className="workspace-action-list">
              {workspaceActionQueue.map((item) => (
                <Link key={item.id} className={`workspace-action-item ${item.tone}`} href={customerActionHref(item.href)}>
                  <span>{item.label}</span>
                  <b>{item.title}</b>
                  <p>{item.next}</p>
                  <small>{item.owner}</small>
                </Link>
              ))}
            </div>
          </article>

          <article className="workspace-panel" id="expert-cases">
            <div className="workspace-panel-head">
              <div>
                <span>전문가 매칭</span>
                <h2>상담·결제·작업방</h2>
              </div>
              <Handshake size={18} />
            </div>
            <div className="workspace-expert-list">
              {activeExpertCases.slice(0, 3).map((expertCase) => (
                <div key={expertCase.id} className={`workspace-expert-row ${expertCase.queueTone}`}>
                  <span>{expertCase.displayId ?? expertCase.id}</span>
                  <b>{expertCase.product}</b>
                  <small>{expertCase.expert} / {labelState(expertCase.state)} / {expertCase.payment}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="workspace-panel workspace-panel-wide" id="shipment-events">
            <div className="workspace-panel-head">
              <div>
                <span>물류·선적</span>
                <h2>운송과 통관 이벤트</h2>
              </div>
              <Ship size={18} />
            </div>
            <div className="workspace-shipment-grid">
              {opsSnapshot.activeShipments.map((shipment) => (
                <div key={shipment.reference} className={`workspace-shipment-row ${shipment.state}`}>
                  <Truck size={17} />
                  <div>
                    <b>{shipment.reference}</b>
                    <span>{shipment.product} / {shipment.route}</span>
                    <small>{shipment.carrier} / {shipment.tracking}</small>
                  </div>
                  <em>{labelState(shipment.state)} · {shipment.eta}</em>
                </div>
              ))}
            </div>
          </article>

          <article className="workspace-panel">
            <div className="workspace-panel-head">
              <div>
                <span>공식 근거</span>
                <h2>재사용 지식베이스</h2>
              </div>
              <BookOpenCheck size={18} />
            </div>
            <div className="workspace-source-grid">
              <span>
                <b>{knowledgeTotals.sources.toLocaleString("ko-KR")}</b>
                공식 소스
              </span>
              <span>
                <b>{knowledgeTotals.aliases.toLocaleString("ko-KR")}</b>
                별칭
              </span>
              <span>
                <b>{overview.operations.browserCaptures.toLocaleString("ko-KR")}</b>
                브라우저 캡처
              </span>
              <span>
                <b>{overview.operations.updateCandidates.toLocaleString("ko-KR")}</b>
                변경 감시
              </span>
            </div>
            <Link className="workspace-wide-link" href="/knowledge">
              <BadgeCheck size={15} />
              출처와 용어 확인
            </Link>
          </article>

          <article className="workspace-panel">
            <div className="workspace-panel-head">
              <div>
                <span>완료 기준</span>
                <h2>출시 전 체크</h2>
              </div>
              <CheckCircle2 size={18} />
            </div>
            <div className="workspace-check-list">
              <span>제품별 검토 결과와 증빙 묶음 저장</span>
              <span>전문가 상담 범위와 결제 상태 확정</span>
              <span>물류사 배정, tracking, 통관 보류 이벤트 연결</span>
            </div>
          </article>
        </section>
      </section>
    </>
  );
}
