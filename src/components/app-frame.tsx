"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import type { AppNavKey } from "@/components/app-sidebar";
import type { ReactNode } from "react";

function activeNavForPath(pathname: string): AppNavKey {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/knowledge")) return "knowledge";
  if (pathname.startsWith("/workspace")) return "workspace";
  return "review";
}

function shellClassFor(active: AppNavKey) {
  if (active === "admin") return "admin-shell";
  if (active === "workspace") return "workspace-shell";
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
