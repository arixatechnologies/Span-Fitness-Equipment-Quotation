"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  FileText,
  Home,
  ImageUp,
  LogOut,
  Settings,
  Tags,
  UserPlus,
  Users
} from "lucide-react";
import clsx from "clsx";
import type { TeamMemberRole } from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/brands", label: "Brands", icon: Tags },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/members", label: "Add Member", icon: UserPlus, adminOnly: true },
  { href: "/image-to-link", label: "Image to Link", icon: ImageUp },
  { href: "/settings/company", label: "Settings", icon: Settings }
];

export function Sidebar({ role = "Admin" }: { role?: TeamMemberRole }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-30 border-b border-line bg-white/95 px-4 py-4 shadow-sm backdrop-blur md:flex md:h-screen md:w-64 md:flex-col md:border-b-0 md:border-r md:py-5">
      <Link href="/dashboard" className="mb-4 flex items-center md:mb-7">
        <Image
          src="/login image/span-logo-transparent.png"
          alt="Span Fitness Equipments"
          width={491}
          height={117}
          priority
          className="h-auto w-44 object-contain"
        />
      </Link>

      <nav className="flex gap-1 overflow-x-auto pb-1 md:block md:flex-1 md:space-y-1 md:overflow-visible md:pb-0">
        {navItems.filter((item) => !item.adminOnly || role === "Admin").map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition",
                active ? "bg-mist text-ink shadow-sm" : "text-slate-700 hover:bg-rose"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden rounded-md border border-line bg-panel p-3 md:block">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
          <BarChart3 className="h-4 w-4" />
          Business Tools
        </div>
        <Link href="/quotations/new" className="btn-primary w-full text-xs">
          Create Quotation
        </Link>
      </div>

    </aside>
  );
}

export function Topbar({
  title,
  subtitle,
  user
}: {
  title: string;
  subtitle?: string;
  user: {
    name: string;
    role: TeamMemberRole;
    profilePhotoUrl?: string;
  };
}) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  }

  return (
    <header className="flex flex-col gap-3 border-b border-line bg-white/90 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:px-7">
      <div className="flex items-center gap-3">
        <button type="button" onClick={goBack} className="btn-secondary shrink-0 px-3 py-1.5">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-black text-slate-950">{title}</h1>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-3 rounded-md border border-line bg-panel px-3 py-2 sm:w-40 sm:flex-col sm:justify-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.profilePhotoUrl || "/login image/span-logo-s.png"}
            alt={`${user.name} profile`}
            className="h-full w-full object-contain p-1"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/login image/span-logo-s.png";
            }}
          />
        </div>
        <div className="min-w-0 text-right sm:text-center">
          <div className="truncate text-sm font-black text-slate-950">{user.name}</div>
          <div className="truncate text-xs text-slate-500">{user.role}</div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-red-700 transition hover:text-red-900"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
