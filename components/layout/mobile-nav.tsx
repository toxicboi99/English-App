"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/layout/logout-button";
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

export function MobileNav({
  canAccessAdmin,
  user,
}: {
  canAccessAdmin: boolean;
  user: {
    name: string;
    profileImage?: string | null;
    level: string;
    role: string;
  };
}) {
  const pathname = usePathname();
  const navItems = canAccessAdmin ? [...items, { href: "/admin", label: "Admin" }] : items;

  return (
    <div className="mb-6 space-y-4 lg:hidden">
      <div className="panel flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar image={user.profileImage} name={user.name} size={40} />
          <div>
            <p className="font-semibold text-slate-950">{user.name}</p>
            <p className="text-sm text-slate-500">
              {user.level}
              {canAccessAdmin ? " • Admin" : ""}
            </p>
          </div>
        </div>
        <LogoutButton className="shrink-0 px-4" variant="ghost" />
      </div>
      <div className="overflow-x-auto">
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
