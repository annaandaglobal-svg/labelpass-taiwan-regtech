import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminSectionNav } from "@/components/admin-section-nav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="lp-shell admin-shell">
      <AppSidebar active="admin" />
      <section className="lp-main lp-main-full admin-main">
        <AdminSectionNav />
        {children}
      </section>
    </main>
  );
}
