import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
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
    step: 2,
    next: "PIF 목차, INCI 제한성분 대조표, 중문 라벨 표현을 전문가 상담 전 확정합니다.",
    docs: ["PIF", "GMP", "COA", "중문 라벨"],
    links: [
      { href: "/#intake", label: "1차 검토" },
      { href: "/workspace/pif", label: "PIF 신청" },
      { href: "/workspace/experts", label: "상담 상태" },
      { href: "/workspace/logistics", label: "선적 상태" }
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
    step: 1,
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
    step: 4,
    next: "첨가물 용도 설명, 라벨 번역본, CCC/HS 근거를 통관 이벤트에 붙입니다.",
    docs: ["성분표", "첨가물", "CCC/HS", "수입검사"],
    links: [
      { href: "/knowledge?q=food additive", label: "첨가물" },
      { href: "/workspace#shipment-events", label: "선적" },
      { href: "/workspace#review-queue", label: "리뷰 상태" }
    ]
  }
];

// Same 5-step launch pipeline as the home, so 내 제품 reads the 시안's labeled progress line.
const WORKSPACE_PIPELINE = ["라벨 검토", "수정 반영", "전문가 검수", "TFDA 등록", "통관·선적"];

function productChipClass(tone: string) {
  if (tone === "blocked") return "fail";
  if (tone === "warn") return "warn";
  if (tone === "pass") return "pass";
  return "navy";
}

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
            <p>내 제품</p>
            <h1>검토한 제품과 진행 상태를 한곳에서 관리합니다.</h1>
          </div>
          <div className="workspace-topbar-actions">
            <Link className="workspace-button primary" href="/review">
              <ClipboardCheck size={15} />
              새 검토
            </Link>
            <Link className="workspace-button" href="/licensing">
              <FileCheck2 size={15} />
              인허가 서류
            </Link>
            <Link className="workspace-button" href="/customs">
              <Search size={15} />
              통관 참고
            </Link>
          </div>
        </header>

        <p className="workspace-intro">
          검토한 제품과 진행 단계를 봅니다. 인허가 서류·통관 참고는 위 버튼에서, 전문가 상담·물류는 왼쪽 메뉴에서 이어가세요.
        </p>

        <section className="workspace-dashboard">
          <WorkspaceHandoffDrafts />

          <article className="workspace-panel workspace-panel-wide">
            <div className="workspace-panel-head">
              <div>
                <span>제품별 진행 <em className="workspace-demo-tag">예시</em></span>
                <h2>이번 주 닫아야 할 대만 출시 작업</h2>
              </div>
              <PackageCheck size={18} />
            </div>
            <p className="workspace-demo-note">
              아래는 화면 구성을 보여 주는 <b>예시 제품</b>입니다. <Link href="/review">성분·라벨 검토</Link>를 실행하면 내 실제 제품이 여기에 쌓입니다.
            </p>
            <div className="workspace-product-list">
              {productRows.map((product) => (
                <div key={product.name} className="pipe-row">
                  <div className="pipe-top">
                    <div className="ic" aria-hidden="true">
                      {product.category.includes("식품") ? "🥫" : "🧴"}
                    </div>
                    <div className="pipe-id">
                      <div className="nm">{product.name}</div>
                      <div className="mt">
                        {product.route} · {product.due} · {product.owner}
                      </div>
                    </div>
                    <div className="act">
                      <span className={`chip ${productChipClass(product.tone)}`}>{product.status}</span>
                      <Link className="linkbtn" href={product.links[0]?.href ?? "/review"}>
                        {product.links[0]?.label ?? "검토"}
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                  <div className="pipe-steps">
                    {WORKSPACE_PIPELINE.map((label, index) => (
                      <div
                        key={label}
                        className={`pstep${index < product.step ? " done" : index === product.step ? " now" : ""}`}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  {product.next && <p className="pipe-next">다음: {product.next}</p>}
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </>
  );
}
