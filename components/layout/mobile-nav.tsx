"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/create-video", label: "Create Video" },
  { href: "/feed", label: "Feed" },
  { href: "/friends", label: "Friends" },
  { href: "/debate-rooms", label: "Debate Rooms" },
  { href: "/dictionary", label: "Dictionary" },
  { href: "/practice-speaking", label: "Speaking" },
] as const;

export function MobileNav({ canAccessAdmin }: { canAccessAdmin: boolean }) {
  const pathname = usePathname();
  const navItems = canAccessAdmin ? [...items, { href: "/admin", label: "Admin" }] : items;

  return (
    <div className="mb-6 lg:hidden">
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {navItems.map((item) => (
            <Link
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "bg-slate-950 text-amber-100"
                  : "bg-white/80 text-slate-700 ring-1 ring-slate-200",
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
