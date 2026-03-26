import Link from "next/link";
import {
  BookOpen,
  Camera,
  MessageCircle,
  Mic2,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";

import { LogoutButton } from "@/components/layout/logout-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canAccessAdminPanel, getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { formatRelative } from "@/lib/utils";

const coreModules = [
  {
    href: "/create-video",
    label: "Create Video",
    description: "Record guided practice videos and publish them to your feed.",
    icon: Camera,
  },
  {
    href: "/feed",
    label: "Feed",
    description: "Watch learner posts with embedded YouTube playback and reactions.",
    icon: Video,
  },
  {
    href: "/friends",
    label: "Friends",
    description: "Manage friend requests, discover learners, and grow your circle.",
    icon: Users,
  },
  {
    href: "/debate-rooms",
    label: "Debate Rooms",
    description: "Create or join live discussion rooms for real-time practice.",
    icon: MessageCircle,
  },
  {
    href: "/dictionary",
    label: "Dictionary",
    description: "Search the global dictionary and save personal vocabulary.",
    icon: BookOpen,
  },
  {
    href: "/practice-speaking",
    label: "Practice Speaking",
    description: "Use speech recognition and accuracy scoring to improve delivery.",
    icon: Mic2,
  },
] as const;

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const data = await getDashboardData(user.id);
  const canAccessAdmin = await canAccessAdminPanel(user);
  const modules =
    canAccessAdmin
      ? [
          ...coreModules,
          {
            href: "/admin",
            label: "Admin Panel",
            description: "Manage prompts, user access, and feed moderation controls.",
            icon: ShieldCheck,
          },
        ]
      : coreModules;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-amber-100 md:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Badge className="bg-white/10 text-amber-200">Dashboard</Badge>
            <div>
              <h1 className="font-[var(--font-display)] text-4xl text-amber-300 md:text-5xl">
                {user.name}, let&apos;s make English visible today.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                Record a video, publish your progress, or jump into a conversation room.
                SpeakUp keeps every practice loop connected.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/create-video">
              <Button className="bg-amber-300 text-slate-950 hover:bg-amber-200">
                Start a new practice video
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <Card className="rounded-[2rem] border border-slate-200/90 bg-white/90 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar image={user.profileImage} name={user.name} size={72} />
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold text-slate-950">{user.name}</h2>
              <p className="mt-1 text-lg text-slate-700">
                {user.level}
                {canAccessAdmin ? " | Admin" : ""}
              </p>
              <p className="mt-3 break-all text-base text-slate-600">{user.email}</p>
            </div>
          </div>

          <LogoutButton className="w-full border border-cyan-300 bg-white text-slate-950 hover:bg-cyan-50 sm:w-auto sm:min-w-[180px]" />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Posts</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{data.postsCount}</p>
          <p className="mt-2 text-sm text-slate-600">Video posts published so far.</p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Saved Words</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{data.wordsCount}</p>
          <p className="mt-2 text-sm text-slate-600">Personal vocabulary entries.</p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Friend Requests</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{data.pendingFriends}</p>
          <p className="mt-2 text-sm text-slate-600">Learners waiting on your response.</p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Active Rooms</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{data.activeRooms}</p>
          <p className="mt-2 text-sm text-slate-600">Debate rooms you are currently in.</p>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-1">
        <Card className="space-y-5">
          <div>
            <Badge>Modules</Badge>
            <h2 className="mt-4 text-3xl font-semibold">Six ways to keep momentum</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <Link
                  className="rounded-4xl border border-slate-200 bg-white/70 p-5 transition hover:-translate-y-1 hover:border-cyan-200"
                  href={module.href}
                  key={module.href}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-800">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">{module.label}</h3>
                  <p className="mt-2 text-sm leading-7">{module.description}</p>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <Badge>Recent Posts</Badge>
            <h2 className="mt-4 text-3xl font-semibold">Your latest learning moments</h2>
          </div>
          <div className="space-y-4">
            {data.latestPosts.length ? (
              data.latestPosts.map((post) => (
                <div
                  className="rounded-4xl border border-slate-200 bg-slate-50 p-5"
                  key={post.id}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{post.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {post.learningLevel} | {formatRelative(post.createdAt)}
                      </p>
                    </div>
                    <Link href="/feed">
                      <Button variant="ghost">Open feed</Button>
                    </Link>
                  </div>
                  <div className="mt-4 flex gap-3 text-sm text-slate-600">
                    <span>{post.likes.length} likes</span>
                    <span>{post.comments.length} comments</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-4xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <p className="text-base text-slate-700">
                  Your feed starts with your first speaking upload.
                </p>
                <Link className="mt-4 inline-block" href="/create-video">
                  <Button>Record now</Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
