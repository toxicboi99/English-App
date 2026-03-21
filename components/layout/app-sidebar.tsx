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

import { Avatar } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/layout/logout-button";
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

export function AppSidebar({
  canAccessAdmin,
  user,
}: {
  canAccessAdmin: boolean;
  user: {
    name: string;
    email: string;
    profileImage?: string | null;
    level: string;
    role: string;
  };
}) {
  const pathname = usePathname();
  const navItems =
    canAccessAdmin
      ? [...items, { href: "/admin", label: "Admin Panel", icon: ShieldCheck }]
      : items;

  return (
    <aside className="panel sticky top-6 hidden h-[calc(100vh-3rem)] w-80 shrink-0 flex-col justify-between overflow-hidden p-6 lg:flex">
      <div className="space-y-8">
        <div className="rounded-4xl bg-slate-950 p-5 text-amber-100">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">SpeakUp</p>
          <h1 className="mt-3 text-3xl font-semibold text-amber-300">English that lives.</h1>
          <p className="mt-3 text-sm text-slate-300">
            Practice on camera, learn socially, and build fluency every day.
          </p>
        </div>

        <nav className="space-y-2">
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
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-4xl border border-slate-200 bg-white/90 p-4">
        <div className="flex items-center gap-3">
          <Avatar image={user.profileImage} name={user.name} />
          <div>
            <p className="font-semibold text-slate-950">{user.name}</p>
            <p className="text-sm text-slate-500">
              {user.level}
              {canAccessAdmin ? " • Admin" : ""}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600">{user.email}</p>
        <LogoutButton className="mt-4 w-full" variant="ghost" />
      </div>
    </aside>
  );
}
