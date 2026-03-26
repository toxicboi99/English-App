import Link from "next/link";
import {
  BookOpen,
  Camera,
  MessageCircle,
  Sparkles,
  Users,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LegalLinks } from "@/components/legal/legal-links";

const features = [
  {
    icon: Camera,
    title: "Record guided speaking videos",
    description:
      "Read dialogue on-screen, practice naturally, and turn each take into a shareable learning post.",
  },
  {
    icon: Video,
    title: "Publish to an embedded feed",
    description:
      "Upload to YouTube as unlisted, keep playback inside SpeakUp, and build your public learning streak.",
  },
  {
    icon: Users,
    title: "Learn socially",
    description:
      "Add friends, react to progress, and stay accountable through a language-first social graph.",
  },
  {
    icon: MessageCircle,
    title: "Debate in live rooms",
    description:
      "Spin up 2-4 person debate rooms for real-time English conversation and confidence building.",
  },
  {
    icon: BookOpen,
    title: "Save your vocabulary",
    description:
      "Search the global dictionary, build your personal word bank, and revisit useful examples later.",
  },
  {
    icon: Sparkles,
    title: "Get AI speaking support",
    description:
      "Use speech-to-text scoring, optional grammar upgrades, and targeted fluency feedback.",
  },
] as const;

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <section className="hero-grid mx-auto min-h-screen max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="panel relative overflow-hidden rounded-[2rem] border-white/80 bg-white/75 p-5 sm:p-8 md:p-10 lg:rounded-[2.5rem] lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.15),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(11,114,133,0.13),transparent_26%)]" />
          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            <div className="space-y-8">
              <Badge className="bg-amber-100 text-amber-900">AI Social English Platform</Badge>
              <div className="space-y-5">
                <h1 className="max-w-3xl font-[var(--font-display)] text-4xl leading-tight text-slate-950 sm:text-5xl lg:text-7xl">
                  SpeakUp turns English practice into a social habit.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">
                  One place to record speaking videos, publish your progress, debate
                  live, save vocabulary, and get AI-powered feedback on how you sound.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                <Link className="w-full sm:w-auto" href="/register">
                  <Button className="w-full px-7 py-3 text-base sm:w-auto">
                    Start Learning
                  </Button>
                </Link>
                <Link className="w-full sm:w-auto" href="/login">
                  <Button className="w-full px-7 py-3 text-base sm:w-auto" variant="ghost">
                    Log In
                  </Button>
                </Link>
              </div>

              <LegalLinks />

              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="bg-slate-950 text-amber-100">
                  <p className="text-3xl font-semibold text-amber-300">6</p>
                  <p className="mt-2 text-sm text-slate-300">Integrated learning modules</p>
                </Card>
                <Card className="bg-cyan-50">
                  <p className="text-3xl font-semibold text-cyan-900">AI</p>
                  <p className="mt-2 text-sm text-slate-700">Speaking and grammar coaching</p>
                </Card>
                <Card className="bg-amber-50">
                  <p className="text-3xl font-semibold text-amber-900">Live</p>
                  <p className="mt-2 text-sm text-slate-700">Debate rooms for real conversation</p>
                </Card>
              </div>
            </div>

            <div className="grid gap-4 self-center md:grid-cols-2">
              {features.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <Card
                    className="animate-fadeUp border-white/80 bg-white/85"
                    key={feature.title}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-amber-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-5 text-xl font-semibold">{feature.title}</h2>
                    <p className="mt-3 text-sm leading-7">{feature.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
