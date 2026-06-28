import Link from "next/link";
import { BadgeCheck, Boxes, ClipboardCheck, Languages, Search } from "lucide-react";

export type AppNavKey = "review" | "workspace" | "knowledge" | "aliases" | "admin";

type AppNavItem = {
  key: AppNavKey;
  href: string;
  label: string;
  ariaLabel?: string;
  icon: typeof ClipboardCheck;
};

const primaryNavItems: AppNavItem[] = [
  { key: "workspace", href: "/workspace", label: "워크스페이스", icon: Boxes },
  { key: "review", href: "/", label: "검토", icon: ClipboardCheck },
  { key: "knowledge", href: "/knowledge", label: "지식 검색", icon: Search }
];

const utilityNavItems: AppNavItem[] = [
  { key: "aliases", href: "/knowledge/aliases", label: "용어 검수", icon: Languages },
  { key: "admin", href: "/admin", label: "관리", ariaLabel: "운영 관리", icon: BadgeCheck }
];

type AppSidebarProps = {
  active: AppNavKey;
};

export function AppSidebar({ active }: AppSidebarProps) {
  return (
    <aside className="lp-sidebar" aria-label="LabelPass 핵심 내비게이션" data-shell-sidebar="persistent">
      <div className="lp-brand">
        <span>LP</span>
        <div>
          <strong>LabelPass</strong>
          <small>Taiwan RegTech</small>
        </div>
      </div>

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
              title={item.ariaLabel ?? item.label}
              aria-current={item.key === active ? "page" : undefined}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <span className="lp-utility-label">내부 도구</span>
      <nav className="lp-utility-nav" aria-label="운영 업무" data-shell-nav="utility" data-shell-nav-count={utilityNavItems.length}>
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

      <div className="lp-sidebar-note">
        <b>대만 우선 범위</b>
        <span>화장품 PIF, 식품 라벨, 첨가물, 수입검사, HS/CCC를 한 흐름으로 묶습니다.</span>
      </div>
    </aside>
  );
}
