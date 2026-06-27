"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BriefcaseBusiness, ClipboardList, CreditCard, Gauge, Handshake, Settings, Truck, Users } from "lucide-react";
import { adminNav } from "@/lib/platform-admin";
import type { PlatformOpsNavBadges } from "@/lib/platform-ops-store";

const navIcons: Record<string, ReactNode> = {
  "/admin": <Gauge size={15} />,
  "/admin/companies": <BriefcaseBusiness size={15} />,
  "/admin/users": <Users size={15} />,
  "/admin/reviews": <ClipboardList size={15} />,
  "/admin/experts": <Handshake size={15} />,
  "/admin/payments": <CreditCard size={15} />,
  "/admin/logistics": <Truck size={15} />,
  "/admin/settings": <Settings size={15} />
};

export function AdminSectionNav({ badges = {} }: { badges?: PlatformOpsNavBadges }) {
  const pathname = usePathname();

  return (
    <nav className="admin-section-nav" aria-label="운영 관리 하위 화면" data-shell-nav="admin-secondary" data-admin-section-count={adminNav.length}>
      {adminNav.map((item) => {
        const isActive = pathname === item.href;
        const badge = badges[item.href];

        return (
          <Link
            key={item.href}
            className={isActive ? "active" : undefined}
            href={item.href}
            data-admin-section={item.href}
            data-admin-section-has-badge={badge ? "true" : undefined}
            aria-current={isActive ? "page" : undefined}
            aria-label={badge ? `${item.label}, ${badge.label}` : item.label}
          >
            {navIcons[item.href]}
            <span>{item.label}</span>
            {badge ? (
              <em className={`admin-section-badge ${badge.tone}`} title={badge.label} aria-hidden="true">
                {badge.count > 99 ? "99+" : badge.count}
              </em>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
