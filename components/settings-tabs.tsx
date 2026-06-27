"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const tabs = [
  { href: "/settings/company", label: "Company" },
  { href: "/settings/terms", label: "Terms" },
  { href: "/settings/profile", label: "My Profile" }
];

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-5 flex gap-2 overflow-x-auto border-b border-line">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={clsx(
            "border-b-2 px-4 py-3 text-sm font-bold",
            pathname === tab.href
              ? "border-gold text-navy"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
