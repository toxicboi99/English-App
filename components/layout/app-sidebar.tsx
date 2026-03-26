"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  BookOpen,
  Camera,
  LayoutDashboard,
  MessageCircle,
  Mic2,
  Users,
  Video,
} from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create-video", label: "Create Video", icon: Camera },
  { href: "/feed", label: "Feed", icon: Video },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/debate-rooms", label: "Debate Rooms", icon: MessageCircle },
  { href: "/dictionary", label: "Dictionary", icon: BookOpen },
  { href: "/practice-speaking", label: "Practice Speaking", icon: Mic2 },
] as const;

export function AppSidebar({ canAccessAdmin }: { canAccessAdmin: boolean }) {
  const pathname = usePathname();
  const navItems = canAccessAdmin
    ? [...items, { href: "/admin", label: "Admin Panel", icon: ShieldCheck }]
    : items;

  return (
    <aside className="panel sticky top-4 hidden h-[calc(100dvh-2rem)] w-72 shrink-0 flex-col overflow-hidden p-4 lg:flex xl:w-80 xl:p-6">
      <div className="rounded-4xl bg-slate-950 p-4 text-amber-100 xl:p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-300">SpeakUp</p>
        <h1 className="mt-3 text-2xl font-semibold text-amber-300 xl:text-3xl">
          English that lives.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Practice on camera, learn socially, and build fluency every day.
        </p>
      </div>

      <nav className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              className={cn(
                "flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-semibold transition",
                active
                  ? "bg-cyan-700 text-amber-100 shadow-lg shadow-cyan-900/15"
                  : "text-slate-700 hover:bg-white hover:text-slate-950",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
