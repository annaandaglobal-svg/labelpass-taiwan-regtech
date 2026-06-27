import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminSectionNav } from "@/components/admin-section-nav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="admin-shell">
      <AppSidebar active="admin" />
      <section className="admin-main">
        <AdminSectionNav />
        {children}
      </section>
    </main>
  );
}
