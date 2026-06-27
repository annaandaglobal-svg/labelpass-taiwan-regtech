import Link from "next/link";
import { BadgeCheck, ClipboardCheck, Languages, Search } from "lucide-react";

type AppNavKey = "review" | "knowledge" | "aliases" | "admin";

const navItems: Array<{
  key: AppNavKey;
  href: string;
  label: string;
  icon: typeof ClipboardCheck;
}> = [
  { key: "review", href: "/", label: "검토 콘솔", icon: ClipboardCheck },
  { key: "knowledge", href: "/knowledge", label: "지식 검색", icon: Search },
  { key: "aliases", href: "/knowledge/aliases", label: "용어 정리", icon: Languages },
  { key: "admin", href: "/admin", label: "운영 관리", icon: BadgeCheck }
];

type AppSidebarProps = {
  active: AppNavKey;
};

export function AppSidebar({ active }: AppSidebarProps) {
  return (
    <aside className="lp-sidebar" aria-label="LabelPass 핵심 내비게이션" data-shell-nav="primary">
      <div className="lp-brand">
        <span>LP</span>
        <div>
          <strong>LabelPass</strong>
          <small>Taiwan RegTech</small>
        </div>
      </div>

      <nav className="lp-nav" aria-label="핵심 업무" data-shell-nav-count={navItems.length}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const className = item.key === active ? "active" : undefined;

          return (
            <Link
              key={item.key}
              className={className}
              href={item.href}
              data-shell-nav-item={item.key}
              aria-current={item.key === active ? "page" : undefined}
            >
              <Icon size={17} />
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
