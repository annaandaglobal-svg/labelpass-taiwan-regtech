"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import type { AppNavKey } from "@/components/app-sidebar";
import type { ReactNode } from "react";

// The developer (관리) and expert portals are separate audiences. They get their own minimal
// chrome — a portal bar + a way back to the customer app — instead of the customer sidebar,
// so the three portals are clearly separated rather than mixed into one shell.
function PortalShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="portal-shell">
      <header className="portal-bar" data-shell-sidebar="portal">
        <div className="portal-id">
          <span className="portal-seal" aria-hidden="true">合格</span>
          <div>
            <strong>LabelPass</strong>
            <small>{label}</small>
          </div>
        </div>
        <Link className="portal-back" href="/">
          <ArrowLeft size={14} />
          사용자 화면
        </Link>
      </header>
      <main className="portal-main">{children}</main>
    </div>
  );
}

function activeNavForPath(pathname: string): AppNavKey {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/knowledge")) return "knowledge";
  if (pathname.startsWith("/workspace/experts")) return "experts";
  if (pathname.startsWith("/workspace/logistics")) return "logistics";
  if (pathname.startsWith("/customs")) return "customs";
  // 인허가 서류 spans the licensing checklist and the PIF application.
  if (pathname.startsWith("/licensing") || pathname.startsWith("/workspace/pif")) return "licensing";
  if (pathname.startsWith("/review")) return "review";
  if (pathname.startsWith("/workspace")) return "products";
  return "home";
}

function shellClassFor(active: AppNavKey) {
  if (active === "admin") return "admin-shell";
  if (active === "products" || active === "experts" || active === "logistics") return "workspace-shell";
  return undefined;
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";

  if (pathname.startsWith("/admin")) {
    return <PortalShell label="개발자 포털 · 운영 관리">{children}</PortalShell>;
  }
  if (pathname.startsWith("/expert")) {
    return <PortalShell label="전문가 포털 · 상담·검수">{children}</PortalShell>;
  }

  const active = activeNavForPath(pathname);
  return (
    <AppShell active={active} className={shellClassFor(active)}>
      {children}
    </AppShell>
  );
}
