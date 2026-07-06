"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import type { AppNavKey } from "@/components/app-sidebar";
import type { ReactNode } from "react";

function activeNavForPath(pathname: string): AppNavKey {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/knowledge")) return "knowledge";
  if (pathname.startsWith("/workspace/experts")) return "experts";
  if (pathname.startsWith("/workspace/logistics") || pathname.startsWith("/customs")) return "logistics";
  // 성분 검토·인허가 서류(PIF·licensing) all live under the 내 제품 workspace in the 시안 nav.
  if (
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/review") ||
    pathname.startsWith("/licensing") ||
    pathname.startsWith("/experts")
  ) {
    return "products";
  }
  return "home";
}

function shellClassFor(active: AppNavKey) {
  if (active === "admin") return "admin-shell";
  if (active === "products" || active === "experts" || active === "logistics") return "workspace-shell";
  return undefined;
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const active = activeNavForPath(pathname);

  return (
    <AppShell active={active} className={shellClassFor(active)}>
      {children}
    </AppShell>
  );
}
