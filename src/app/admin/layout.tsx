import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, BriefcaseBusiness, ClipboardList, Handshake, Settings, Truck, Users } from "lucide-react";
import { adminNav } from "@/lib/platform-admin";

const navIcons: Record<string, ReactNode> = {
  "/admin": <Settings size={16} />,
  "/admin/companies": <BriefcaseBusiness size={16} />,
  "/admin/users": <Users size={16} />,
  "/admin/reviews": <ClipboardList size={16} />,
  "/admin/experts": <Handshake size={16} />,
  "/admin/logistics": <Truck size={16} />
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="admin-shell">
      <aside className="admin-sidebar" aria-label="관리자 메뉴">
        <Link className="admin-back" href="/">
          <ArrowLeft size={16} />
          검토 콘솔
        </Link>
        <div className="admin-brand">
          <span>OPS</span>
          <div>
            <strong>LabelPass Admin</strong>
            <small>운영·매칭·선적 관리</small>
          </div>
        </div>
        <nav className="admin-nav" aria-label="관리자 화면">
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href}>
              {navIcons[item.href]}
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="admin-sidebar-note">
          조직 권한과 플랫폼 권한을 분리해 회사 데이터, 전문가 상담, 물류 요청을 안전하게 관리합니다.
        </p>
      </aside>
      <section className="admin-main">{children}</section>
    </main>
  );
}
