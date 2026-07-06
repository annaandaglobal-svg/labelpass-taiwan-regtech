import Link from "next/link";
import { BadgeCheck, Boxes, ClipboardCheck, Home, Search, Ship, UserCheck } from "lucide-react";

export type AppNavKey =
  | "home"
  | "review"
  | "licensing"
  | "customs"
  | "products"
  | "experts"
  | "logistics"
  | "knowledge"
  | "admin";

type AppNavItem = {
  key: AppNavKey;
  href: string;
  label: string;
  ariaLabel?: string;
  hint?: string;
  icon: typeof ClipboardCheck;
};

// Matches the v5 시안: a short, calm nav (홈 / 내 제품 / 전문가 검수 / 통관·물류). 성분 검토 is
// the "새 라벨 검토" button; 인허가 서류·통관 참고 are reached in context from 내 제품 and the
// review result, keeping the sidebar uncluttered.
const primaryNavItems: AppNavItem[] = [
  { key: "home", href: "/", label: "홈", icon: Home },
  { key: "products", href: "/workspace", label: "내 제품", ariaLabel: "내 제품 · 검토 이력·인허가", icon: Boxes },
  { key: "experts", href: "/workspace/experts", label: "전문가 검수", icon: UserCheck },
  { key: "logistics", href: "/workspace/logistics", label: "통관·물류", icon: Ship }
];

const utilityNavItems: AppNavItem[] = [
  { key: "knowledge", href: "/knowledge", label: "통합검색", ariaLabel: "성분·통관·라벨·규정 통합검색", icon: Search },
  { key: "admin", href: "/admin", label: "관리", ariaLabel: "운영 관리", icon: BadgeCheck }
];

type AppSidebarProps = {
  active: AppNavKey;
};

export function AppSidebar({ active }: AppSidebarProps) {
  return (
    <aside className="lp-sidebar" aria-label="LabelPass 핵심 내비게이션" data-shell-sidebar="persistent">
      <div className="lp-brand">
        <span aria-hidden="true">合格</span>
        <div>
          <strong>LabelPass</strong>
          <small>대만 수출 · 검토부터 통관까지</small>
        </div>
      </div>

      <Link className="lp-newbtn" href="/review" data-shell-new-review="true">
        <ClipboardCheck size={16} />
        새 라벨 검토
      </Link>

      <nav className="lp-nav" aria-label="핵심 업무" data-shell-nav="primary" data-shell-nav-count={primaryNavItems.length}>
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const className = item.key === active ? "active" : undefined;

          return (
            <Link
              key={item.key}
              className={className}
              href={item.href}
              aria-label={item.ariaLabel ?? item.label}
              data-shell-nav-item={item.key}
              data-shell-nav-tier="primary"
              title={item.hint ? `${item.label} — ${item.hint}` : item.ariaLabel ?? item.label}
              aria-current={item.key === active ? "page" : undefined}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <span className="lp-utility-label">도구</span>
      <nav className="lp-utility-nav" aria-label="검색·운영 도구" data-shell-nav="utility" data-shell-nav-count={utilityNavItems.length}>
        {utilityNavItems.map((item) => {
          const Icon = item.icon;
          const className = item.key === active ? "active" : undefined;

          return (
            <Link
              key={item.key}
              className={className}
              href={item.href}
              aria-label={item.ariaLabel ?? item.label}
              data-shell-nav-item={item.key}
              data-shell-nav-tier="utility"
              title={item.ariaLabel ?? item.label}
              aria-current={item.key === active ? "page" : undefined}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="lp-plan">
        <b>대만 규제 상시 반영</b>
        <span>모든 판정에 근거 조문·룰셋 버전·확인일이 함께 남습니다.</span>
        <Link className="lp-plan-link" href="/knowledge">규정 근거 살펴보기 →</Link>
      </div>
    </aside>
  );
}
