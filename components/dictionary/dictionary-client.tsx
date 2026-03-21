"use client";

import { startTransition, useDeferredValue, useState } from "react";
import useSWR from "swr";
import { BookmarkPlus, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { learningLevels } from "@/lib/constants";
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

type CreateWordResponse = {
  created: boolean;
  error?: string;
  word: {
    id: string;
    word: string;
  };
};

export function DictionaryClient({
  initialData,
  initialQuery,
}: {
  initialData: DictionaryResponse;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<string | null>(null);
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [exampleSentence, setExampleSentence] = useState("");
  const [level, setLevel] = useState<(typeof learningLevels)[number]>("BEGINNER");
  const [savingWordId, setSavingWordId] = useState<string | null>(null);
  const [isCreatingWord, setIsCreatingWord] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const { data, mutate } = useSWR<DictionaryResponse>(
    `/api/dictionary?q=${encodeURIComponent(deferredQuery)}`,
    fetcher,
    { fallbackData: initialData },
  );

  async function saveWord(wordId: string) {
    setSavingWordId(wordId);

    try {
      const response = await fetch("/api/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
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
    } catch {
      setStatus("Unable to save the word right now. Please try again.");
    } finally {
      setSavingWordId(null);
    }
  }

  async function createWord() {
    const trimmedWord = word.trim();
    const trimmedDefinition = definition.trim();

    if (!trimmedWord) {
      setStatus("Enter a word before adding it to the dictionary.");
      return;
    }

    if (trimmedDefinition.length < 3) {
      setStatus("Add a short definition so the new word is useful in search results.");
      return;
    }

    setIsCreatingWord(true);

    try {
      const response = await fetch("/api/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          word: trimmedWord,
          definition: trimmedDefinition,
          partOfSpeech: partOfSpeech.trim() || undefined,
          phonetic: phonetic.trim() || undefined,
          exampleSentence: exampleSentence.trim() || undefined,
          level,
          notes: "Added from the dictionary page.",
        }),
      });

      const result = (await response.json()) as CreateWordResponse;

      if (!response.ok || !result.word) {
        setStatus(result.error ?? "Unable to add the word.");
        return;
      }

      setStatus(
        result.created
          ? `${result.word.word} was added and saved to your vocabulary.`
          : `${result.word.word} already existed and was saved to your vocabulary.`,
      );
      setQuery(result.word.word);
      setWord("");
      setDefinition("");
      setPartOfSpeech("");
      setPhonetic("");
      setExampleSentence("");
      setLevel("BEGINNER");
      startTransition(() => {
        void mutate();
      });
    } catch {
      setStatus("Unable to add the word right now. Please try again.");
    } finally {
      setIsCreatingWord(false);
    }
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
          Search the shared dictionary, add missing words, and keep your own
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
            {payload.words.length ? (
              payload.words.map((entry) => (
                <div
                  className="rounded-4xl border border-slate-200 bg-slate-50 p-5"
                  key={entry.id}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-semibold text-slate-950">
                          {entry.word}
                        </h3>
                        <Badge>{entry.level}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {[entry.partOfSpeech, entry.phonetic].filter(Boolean).join(" | ")}
                      </p>
                    </div>
                    <Button
                      disabled={Boolean(entry.userWords.length) || savingWordId === entry.id}
                      onClick={() => void saveWord(entry.id)}
                      variant="ghost"
                    >
                      <BookmarkPlus className="mr-2 h-4 w-4" />
                      {entry.userWords.length
                        ? "Saved"
                        : savingWordId === entry.id
                          ? "Saving..."
                          : "Save word"}
                    </Button>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-700">
                    {entry.definition}
                  </p>
                  {entry.exampleSentence ? (
                    <p className="mt-3 rounded-3xl bg-white p-4 text-sm italic text-slate-600">
                      {entry.exampleSentence}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-4xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                {query.trim()
                  ? `No words matched "${query.trim()}". Add it from the form on the right and it will become searchable here.`
                  : "Search for a word to see dictionary results."}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-4">
            <div>
              <Badge>Add A Word</Badge>
              <h2 className="mt-4 text-2xl font-semibold">Create a searchable entry</h2>
            </div>

            <Input
              onChange={(event) => setWord(event.target.value)}
              placeholder="Word"
              value={word}
            />
            <Textarea
              className="min-h-28"
              onChange={(event) => setDefinition(event.target.value)}
              placeholder="Definition"
              value={definition}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                onChange={(event) => setPartOfSpeech(event.target.value)}
                placeholder="Part of speech"
                value={partOfSpeech}
              />
              <Input
                onChange={(event) => setPhonetic(event.target.value)}
                placeholder="Phonetic"
                value={phonetic}
              />
            </div>

            <Textarea
              className="min-h-24"
              onChange={(event) => setExampleSentence(event.target.value)}
              placeholder="Example sentence (optional)"
              value={exampleSentence}
            />

            <Select
              onChange={(event) =>
                setLevel(event.target.value as (typeof learningLevels)[number])
              }
              value={level}
            >
              {learningLevels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>

            <Button disabled={isCreatingWord} onClick={() => void createWord()}>
              <Plus className="mr-2 h-4 w-4" />
              {isCreatingWord ? "Adding..." : "Add word"}
            </Button>
          </Card>

          <Card className="space-y-4">
            <div>
              <Badge>Your Vocabulary</Badge>
              <h2 className="mt-4 text-2xl font-semibold">Saved for review</h2>
            </div>
            <div className="space-y-4">
              {payload.savedWords.length ? (
                payload.savedWords.map((entry) => (
                  <div
                    className="rounded-4xl border border-slate-200 bg-slate-50 p-5"
                    key={entry.id}
                  >
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
    </div>
  );
}
