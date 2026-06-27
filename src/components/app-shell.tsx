import type { ReactNode } from "react";
import { AppSidebar, type AppNavKey } from "@/components/app-sidebar";

type AppShellProps = {
  active: AppNavKey;
  className?: string;
  children: ReactNode;
};

export function AppShell({ active, className, children }: AppShellProps) {
  const shellClassName = ["lp-shell", className].filter(Boolean).join(" ");

  return (
    <main className={shellClassName} data-app-shell="persistent">
      <AppSidebar active={active} />
      {children}
    </main>
  );
}
