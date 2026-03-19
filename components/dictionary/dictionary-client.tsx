"use client";

import { startTransition, useDeferredValue, useState } from "react";
import useSWR from "swr";
import { BookmarkPlus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetcher } from "@/lib/fetcher";

type DictionaryWord = {
  id: string;
  word: string;
  definition: string;
  partOfSpeech: string | null;
  phonetic: string | null;
  exampleSentence: string | null;
  level: string;
  userWords: Array<{ id: string; mastered: boolean; notes: string | null }>;
};

type SavedWord = {
  id: string;
  notes: string | null;
  mastered: boolean;
  dictionaryWord: {
    id: string;
    word: string;
    definition: string;
    exampleSentence: string | null;
    level: string;
  };
};

type DictionaryResponse = {
  words: DictionaryWord[];
  savedWords: SavedWord[];
};

export function DictionaryClient({
  initialData,
  initialQuery,
}: {
  initialData: DictionaryResponse;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const { data, mutate } = useSWR<DictionaryResponse>(
    `/api/dictionary?q=${encodeURIComponent(deferredQuery)}`,
    fetcher,
    { fallbackData: initialData },
  );
  const [status, setStatus] = useState<string | null>(null);

  async function saveWord(wordId: string) {
    const response = await fetch("/api/dictionary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dictionaryWordId: wordId,
        notes: "Saved from the dictionary page.",
      }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus(result.error ?? "Unable to save the word.");
      return;
    }

    setStatus("Word saved to your personal vocabulary.");
    startTransition(() => {
      void mutate();
    });
  }

  const payload = data ?? initialData;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-amber-100">
        <Badge className="bg-white/10 text-amber-200">Dictionary</Badge>
        <h1 className="mt-4 font-[var(--font-display)] text-4xl text-amber-300">
          Search words with context, then save the ones worth keeping.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          Use case-insensitive search across the global dictionary and build a personal
          vocabulary list tied to your account.
        </p>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-11"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by word or definition..."
              value={query}
            />
          </div>
        </div>
        {status ? <p className="text-sm text-cyan-900">{status}</p> : null}
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div>
            <Badge>Global Words</Badge>
            <h2 className="mt-4 text-2xl font-semibold">Search results</h2>
          </div>
          <div className="space-y-4">
            {payload.words.map((word) => (
              <div className="rounded-4xl border border-slate-200 bg-slate-50 p-5" key={word.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-semibold text-slate-950">{word.word}</h3>
                      <Badge>{word.level}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {[word.partOfSpeech, word.phonetic].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button onClick={() => void saveWord(word.id)} variant="ghost">
                    <BookmarkPlus className="mr-2 h-4 w-4" />
                    {word.userWords.length ? "Saved" : "Save word"}
                  </Button>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-700">{word.definition}</p>
                {word.exampleSentence ? (
                  <p className="mt-3 rounded-3xl bg-white p-4 text-sm italic text-slate-600">
                    {word.exampleSentence}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <Badge>Your Vocabulary</Badge>
            <h2 className="mt-4 text-2xl font-semibold">Saved for review</h2>
          </div>
          <div className="space-y-4">
            {payload.savedWords.length ? (
              payload.savedWords.map((entry) => (
                <div className="rounded-4xl border border-slate-200 bg-slate-50 p-5" key={entry.id}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xl font-semibold text-slate-950">
                        {entry.dictionaryWord.word}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {entry.dictionaryWord.level}
                      </p>
                    </div>
                    <Badge>{entry.mastered ? "Mastered" : "Saved"}</Badge>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-700">
                    {entry.dictionaryWord.definition}
                  </p>
                  {entry.dictionaryWord.exampleSentence ? (
                    <p className="mt-3 text-sm italic text-slate-600">
                      {entry.dictionaryWord.exampleSentence}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Words you save will appear here.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
