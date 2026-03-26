import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LegalLinks } from "@/components/legal/legal-links";

export type LegalSection = {
  title: string;
  items: string[];
};

type LegalPageProps = {
  badge: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export function LegalPage({
  badge,
  title,
  intro,
  lastUpdated,
  sections,
}: LegalPageProps) {
  return (
    <main className="hero-grid relative min-h-screen overflow-hidden">
      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="panel overflow-hidden rounded-[2rem] border-white/80 bg-white/85 p-5 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-cyan-800"
              href="/"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <LegalLinks className="sm:justify-end" />
          </div>

          <div className="mt-8 max-w-3xl space-y-4">
            <Badge>{badge}</Badge>
            <div className="space-y-3">
              <h1 className="font-[var(--font-display)] text-4xl leading-tight text-slate-950 sm:text-5xl">
                {title}
              </h1>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                Last updated {lastUpdated}
              </p>
            </div>
            <p className="text-base leading-8 text-slate-700 sm:text-lg">{intro}</p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {sections.map((section) => (
              <Card
                className="h-full rounded-[1.75rem] border-white/80 bg-white/90 p-5 sm:p-6"
                key={section.title}
              >
                <h2 className="text-xl font-semibold text-slate-950">{section.title}</h2>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700 sm:text-base">
                  {section.items.map((item) => (
                    <li className="flex gap-3" key={item}>
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-700" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
