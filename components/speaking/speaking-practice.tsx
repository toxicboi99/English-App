"use client";

import { useMemo, useRef, useState } from "react";
import { Mic, Square, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Feedback = {
  score: number;
  matchedWords: number;
  totalWords: number;
  missingWords: string[];
  extraWords: string[];
  feedback: string;
};

type SpeechRecognitionResultLike = {
  transcript: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult:
    | ((event: { results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>> }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function SpeakingPractice() {
  const [targetText, setTargetText] = useState(
    "I am improving my English every day because consistent practice makes me more confident.",
  );
  const [spokenText, setSpokenText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [aiImprovement, setAiImprovement] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const recognitionSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    [],
  );

  function startListening() {
    if (!recognitionSupported) {
      setStatus("Speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setStatus("Speech recognition is not available.");
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("Listening... speak the sentence out loud.");
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ");
      setSpokenText(transcript.trim());
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatus("Listening stopped. Generate feedback to score your response.");
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatus("Speech recognition failed. Please try again.");
    };

    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  async function generateFeedback() {
    const response = await fetch("/api/ai/speaking-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetText,
        spokenText,
      }),
    });

    const result = (await response.json()) as Feedback & { error?: string };

    if (!response.ok) {
      setStatus(result.error ?? "Unable to generate speaking feedback.");
      return;
    }

    setFeedback(result);
    setStatus("Feedback ready.");
  }

  async function improveSentence() {
    const response = await fetch("/api/ai/grammar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: spokenText || targetText,
      }),
    });

    const result = (await response.json()) as {
      correctedText?: string;
      explanation?: string;
      error?: string;
    };

    if (!response.ok) {
      setStatus(result.error ?? "Unable to improve the sentence.");
      return;
    }

    setAiImprovement(
      `${result.correctedText ?? ""}${result.explanation ? ` — ${result.explanation}` : ""}`,
    );
    setStatus("AI sentence improvement generated.");
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-amber-100">
        <Badge className="bg-white/10 text-amber-200">Practice Speaking</Badge>
        <h1 className="mt-4 font-[var(--font-display)] text-4xl text-amber-300">
          Turn your voice into measurable speaking feedback.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          Use the Web Speech API to transcribe your response, compare it with the target
          sentence, and review accuracy feedback in seconds.
        </p>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-5">
          <div>
            <Badge>Prompt</Badge>
            <h2 className="mt-4 text-3xl font-semibold">What you should say</h2>
          </div>
          <Textarea
            className="min-h-[200px] text-base leading-8"
            onChange={(event) => setTargetText(event.target.value)}
            value={targetText}
          />
          <div className="flex flex-wrap gap-3">
            {!isListening ? (
              <Button onClick={startListening}>
                <Mic className="mr-2 h-4 w-4" />
                Start listening
              </Button>
            ) : (
              <Button onClick={stopListening} variant="danger">
                <Square className="mr-2 h-4 w-4" />
                Stop listening
              </Button>
            )}
            <Button onClick={() => void generateFeedback()} variant="secondary">
              Generate score
            </Button>
            <Button onClick={() => void improveSentence()} variant="ghost">
              <Wand2 className="mr-2 h-4 w-4" />
              Improve sentence
            </Button>
          </div>
          <p className="text-sm text-slate-600">
            {status ??
              "Speak clearly into your microphone, then generate a score from the transcript."}
          </p>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-4">
            <div>
              <Badge>Transcript</Badge>
              <h2 className="mt-4 text-2xl font-semibold">What SpeakUp heard</h2>
            </div>
            <div className="rounded-4xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm leading-7 text-slate-700">
                {spokenText || "Your spoken transcript will appear here."}
              </p>
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <Badge>Accuracy</Badge>
              <h2 className="mt-4 text-2xl font-semibold">Score breakdown</h2>
            </div>
            {feedback ? (
              <div className="space-y-4">
                <div className="rounded-4xl bg-cyan-50 p-6 text-cyan-950">
                  <p className="text-5xl font-semibold">{feedback.score}%</p>
                  <p className="mt-2 text-sm">{feedback.feedback}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-4xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-slate-950">Missing words</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {feedback.missingWords.length
                        ? feedback.missingWords.join(", ")
                        : "None"}
                    </p>
                  </div>
                  <div className="rounded-4xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-slate-950">Extra words</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {feedback.extraWords.length
                        ? feedback.extraWords.join(", ")
                        : "None"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Generate feedback to see your score.</p>
            )}
          </Card>

          {aiImprovement ? (
            <Card className="border-amber-100 bg-amber-50">
              <p className="text-sm leading-7 text-amber-900">{aiImprovement}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
