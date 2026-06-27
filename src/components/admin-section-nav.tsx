"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BriefcaseBusiness, ClipboardList, CreditCard, Gauge, Handshake, Settings, Truck, Users } from "lucide-react";
import { adminNav } from "@/lib/platform-admin";

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

export function AdminSectionNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav admin-section-nav" aria-label="운영 관리 하위 화면">
      {adminNav.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            className={isActive ? "active" : undefined}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
          >
            {navIcons[item.href]}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
