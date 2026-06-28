import type { ReactNode } from "react";
import { AdminSectionNav } from "@/components/admin-section-nav";
import { buildPlatformOpsNavBadges, getPlatformOpsSnapshot } from "@/lib/platform-ops-store";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const snapshot = await getPlatformOpsSnapshot();
  const badges = buildPlatformOpsNavBadges(snapshot);

  return (
    <section className="lp-main lp-main-full admin-main">
      <AdminSectionNav badges={badges} />
      {children}
    </section>
  );
}
