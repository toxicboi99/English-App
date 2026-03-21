"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, Camera, CircleStop, PlayCircle, UploadCloud, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type UploadResponse = {
  videoId: string;
  url: string;
  embedUrl: string;
  error?: string;
};

type RecordingPromptOption = {
  id: string;
  title: string;
  description: string | null;
  script: string;
  level: string;
};

function getInitialStatus(
  youtubeState: string | null,
  reason: string | null,
  youtubeConnected: boolean,
) {
  if (youtubeState === "connected" || youtubeConnected) {
    return "YouTube account connected. Your next upload will go to YouTube as unlisted.";
  }

  if (youtubeState === "error") {
    return `YouTube connection failed${reason ? `: ${reason}` : ""}. Try connecting again.`;
  }

  if (youtubeState === "missing") {
    return "YouTube did not finish connecting. Try connecting again before uploading.";
  }

  return null;
}

function getSupportedRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const preferredMimeTypes = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function getUploadFileExtension(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "mp4";
  }

  if (mimeType.includes("ogg")) {
    return "ogv";
  }

  return "webm";
}

function sanitizeFileName(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "speakup-practice";
}

export function VideoStudio({
  prompts,
  youtubeConnected,
}: {
  prompts: RecordingPromptOption[];
  youtubeConnected: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const youtubeState = searchParams.get("youtube");
  const youtubeReason = searchParams.get("reason");
  const canUpload = youtubeConnected || youtubeState === "connected";
  const initialPrompt = prompts[0];
  const initialLevel = initialPrompt?.level ?? "BEGINNER";
  const livePreviewRef = useRef<HTMLVideoElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string>(initialPrompt.id);
  const [title, setTitle] = useState<string>(initialPrompt.title);
  const [description, setDescription] = useState<string>(
    "I practiced this speaking prompt on SpeakUp.",
  );
  const [script, setScript] = useState<string>(initialPrompt.script);
  const [learningLevel, setLearningLevel] = useState<string>(initialLevel);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [status, setStatus] = useState<string | null>(
    getInitialStatus(youtubeState, youtubeReason, youtubeConnected),
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isImprovingDescription, setIsImprovingDescription] = useState(false);
  const [grammarFeedback, setGrammarFeedback] = useState<{
    correctedText: string;
    explanation: string;
  } | null>(null);
  const filteredPrompts = prompts.filter((prompt) => prompt.level === learningLevel);
  const selectedPrompt =
    filteredPrompts.find((prompt) => prompt.id === selectedPromptId) ??
    filteredPrompts[0] ??
    null;

  function applyPrompt(prompt: RecordingPromptOption) {
    setSelectedPromptId(prompt.id);
    setTitle(prompt.title);
    setScript(prompt.script);
    setLearningLevel(prompt.level);
  }

  useEffect(() => {
    return () => {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [recordedUrl]);

  useEffect(() => {
    if (!filteredPrompts.length) {
      return;
    }

    if (!filteredPrompts.some((prompt) => prompt.id === selectedPromptId)) {
      const fallbackPrompt = filteredPrompts[0];

      setSelectedPromptId(fallbackPrompt.id);
      setTitle(fallbackPrompt.title);
      setScript(fallbackPrompt.script);
    }
  }, [filteredPrompts, selectedPromptId]);

  function clearExistingRecording() {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }

    setRecordedBlob(null);
    setRecordedUrl(null);
    setUploadResult(null);
  }

  function stopStreamPreview() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (livePreviewRef.current) {
      livePreviewRef.current.srcObject = null;
    }
  }

  function hasValidPostDetails() {
    if (title.trim().length < 3) {
      setStatus("Title must be at least 3 characters before uploading.");
      return false;
    }

    if (description.trim().length < 10) {
      setStatus("Description must be at least 10 characters before uploading.");
      return false;
    }

    return true;
  }

  async function startRecording() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setStatus("This browser does not support video recording.");
      return;
    }

    try {
      clearExistingRecording();
      setGrammarFeedback(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      const mimeType = getSupportedRecorderMimeType();

      streamRef.current = stream;
      if (livePreviewRef.current) {
        livePreviewRef.current.srcObject = stream;
        await livePreviewRef.current.play().catch(() => undefined);
      }

      chunksRef.current = [];
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blobType = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });

        recorderRef.current = null;

        if (!blob.size) {
          stopStreamPreview();
          setRecordedBlob(null);
          setRecordedUrl(null);
          setStatus("Recording finished, but no video data was captured. Please try again.");
          return;
        }

        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        stopStreamPreview();
      };

      recorder.start();
      setStatus("Recording started. Speak slowly and follow the on-screen script.");
      setIsRecording(true);
    } catch {
      stopStreamPreview();
      setStatus("Camera or microphone access is unavailable. Allow permission and try again.");
    }
  }

  function stopRecording() {
    if (!recorderRef.current || recorderRef.current.state === "inactive") {
      return;
    }

    recorderRef.current.stop();
    setIsRecording(false);
    setStatus("Recording stopped. Preview your take and upload when ready.");
  }

  async function improveDescription() {
    if (description.trim().length < 2) {
      setStatus("Write a short description before asking for AI feedback.");
      return;
    }

    setIsImprovingDescription(true);
    setGrammarFeedback(null);
    setStatus("Generating AI writing feedback...");

    try {
      const response = await fetch("/api/ai/grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description }),
      });

      const data = (await response.json()) as {
        correctedText?: string;
        explanation?: string;
        error?: string;
      };

      if (!response.ok || !data.correctedText) {
        setStatus(data.error ?? "AI feedback failed. Please try again.");
        return;
      }

      setDescription(data.correctedText);
      setGrammarFeedback({
        correctedText: data.correctedText,
        explanation: data.explanation ?? "",
      });
      setStatus("Description updated with AI feedback.");
    } catch {
      setStatus("AI feedback failed. Please try again.");
    } finally {
      setIsImprovingDescription(false);
    }
  }

  async function uploadVideo() {
    if (!recordedBlob) {
      setStatus("Record a practice video before uploading.");
      return;
    }

    if (!hasValidPostDetails()) {
      return;
    }

    if (!canUpload) {
      setStatus("Connect YouTube first so uploads can be sent as unlisted videos.");
      return;
    }

    setIsUploading(true);
    setStatus("Uploading your practice video to YouTube...");

    const mimeType = recordedBlob.type || "video/webm";
    const extension = getUploadFileExtension(mimeType);
    const formData = new FormData();
    formData.append(
      "file",
      new File([recordedBlob], `${sanitizeFileName(title)}.${extension}`, {
        type: mimeType,
      }),
    );
    formData.append("title", title.trim());
    formData.append("description", description.trim());

    try {
      const response = await fetch("/api/youtube/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as UploadResponse;

      if (!response.ok || !data.videoId) {
        throw new Error(data.error ?? "Video upload failed.");
      }

      setUploadResult(data);
      setStatus("Upload complete. Your video is now ready to publish into the feed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Video upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function publishPost() {
    if (!uploadResult) {
      setStatus("Upload the video to YouTube before creating the post.");
      return;
    }

    if (!hasValidPostDetails()) {
      return;
    }

    setIsPublishing(true);
    setStatus("Publishing your learning post...");

    try {
      const response = await fetch("/api/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          script: script.trim(),
          learningLevel,
          youtubeVideoId: uploadResult.videoId,
          youtubeUrl: uploadResult.url,
          videoStatus: "UPLOADED",
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to publish the post.");
      }

      setStatus("Your practice post is live in the feed.");
      startTransition(() => {
        router.push("/feed");
        router.refresh();
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to publish post.");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-amber-100 md:p-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="mt-4 text-3xl font-semibold">Video Studio</Badge>
            <h1 className="mt-4 font-[var(--font-display)] text-4xl">
              Record, refine, and publish your English practice.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              Keep the prompt on-screen while recording, upload the result to YouTube as
              unlisted, then turn it into a social learning post.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.6fr_0.4fr]">
        <Card className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Badge>Recording Prompt</Badge>
              <h2 className="mt-4 text-3xl font-semibold">Teleprompter</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              onChange={(event) => setLearningLevel(event.target.value)}
              value={learningLevel}
            >
              <option value="BEGINNER">BEGINNER</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="ADVANCED">ADVANCED</option>
              <option value="FLUENT">FLUENT</option>
            </Select>

            <Select
              className="w-full"
              disabled={!filteredPrompts.length}
              onChange={(event) => {
                const prompt = filteredPrompts.find((item) => item.id === event.target.value);

                if (prompt) {
                  applyPrompt(prompt);
                }
              }}
              value={filteredPrompts.some((prompt) => prompt.id === selectedPromptId) ? selectedPromptId : ""}
            >
              {filteredPrompts.length ? (
                filteredPrompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.title}
                  </option>
                ))
              ) : (
                <option value="">No teleprompter scripts for this level</option>
              )}
            </Select>
          </div>

          <p className="text-sm text-slate-600">
            Showing only {learningLevel.toLowerCase()} teleprompter scripts.
          </p>

          {selectedPrompt?.description ? (
            <p className="text-sm text-slate-600">
              {selectedPrompt.description}
            </p>
          ) : null}

          {!filteredPrompts.length ? (
            <div className="rounded-4xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              No saved teleprompter prompt matches this level yet. You can still type your own
              script below.
            </div>
          ) : null}

          {!isRecording ? (
            <Textarea
              className="min-h-[220px] text-base leading-8"
              onChange={(event) => setScript(event.target.value)}
              value={script}
            />
          ) : null}

          <Card className="space-y-5">
            <div>
              <Badge>Camera View</Badge>
              <h2 className="mt-4 text-3xl font-semibold">Live capture</h2>
            </div>

            <div className="relative overflow-hidden rounded-[1.8rem] bg-slate-950">
              <video
                ref={livePreviewRef}
                autoPlay
                muted
                playsInline
                className="h-[70vh] w-full object-cover"
              />

              <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
                <div
                  className={`w-[90%] text-center text-lg leading-8 text-white ${
                    isRecording ? "animate-scroll" : ""
                  }`}
                  style={{
                    animationDuration: `${Math.max(script.split(" ").length / 2, 10)}s`,
                  }}
                  onAnimationEnd={() => {
                    if (isRecording) {
                      stopRecording();
                    }
                  }}
                >
                  {script}
                </div>
              </div>

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/70" />
            </div>

            <p className="text-sm text-slate-600">{status}</p>
          </Card>

          <div className="flex gap-3">
            {!isRecording ? (
              <Button onClick={() => void startRecording()}>
                <Camera className="mr-2 h-4 w-4" />
                Record
              </Button>
            ) : (
              <Button onClick={stopRecording}>
                <CircleStop className="mr-2 h-4 w-4" />
                Stop
              </Button>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-5">
            <div>
              <Badge>Post Details</Badge>
              <h2 className="mt-4 text-3xl font-semibold">Title and description</h2>
            </div>

            <Input onChange={(event) => setTitle(event.target.value)} value={title} />
            <Textarea
              className="min-h-32"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
            <Select
              onChange={(event) => setLearningLevel(event.target.value)}
              value={learningLevel}
            >
              <option value="BEGINNER">BEGINNER</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="ADVANCED">ADVANCED</option>
              <option value="FLUENT">FLUENT</option>
            </Select>

            <Button
              disabled={isImprovingDescription}
              onClick={() => void improveDescription()}
              variant="ghost"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              {isImprovingDescription ? "Improving..." : "Improve with AI"}
            </Button>

            {grammarFeedback ? (
              <div className="rounded-4xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
                  AI Enhancement
                </p>
                <p className="mt-3 text-sm leading-7 text-amber-900">
                  {grammarFeedback.explanation}
                </p>
              </div>
            ) : null}
          </Card>

          <Card className="space-y-5">
            <div>
              <Badge>Recorded Take</Badge>
              <h2 className="mt-4 text-3xl font-semibold">Preview and publish</h2>
            </div>

            <div className="overflow-hidden rounded-[1.8rem] bg-slate-950">
              {recordedUrl ? (
                <video className="aspect-video w-full object-cover" controls src={recordedUrl} />
              ) : (
                <div className="flex aspect-video items-center justify-center text-sm text-slate-300">
                  Your recorded video preview will appear here after recording.
                </div>
              )}
            </div>

            {uploadResult ? (
              <div className="rounded-4xl border border-cyan-100 bg-cyan-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">
                  Upload complete
                </p>
                <p className="mt-3 text-sm text-cyan-900">Video ID: {uploadResult.videoId}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                disabled={!recordedBlob || isUploading}
                onClick={() => void uploadVideo()}
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                {isUploading ? "Uploading..." : "Upload to YouTube👉 5 Coins"}
              </Button>

              <Button
                disabled={!isUploading || isPublishing}
                onClick={() => void publishPost()}
                
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                {isPublishing ? "Publishing..." : "Publish to feed"}
              </Button>
            </div>

            {!canUpload ? (
              <div className="rounded-4xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <div className="flex items-start gap-3">
                  <Bot className="mt-0.5 h-5 w-5 text-slate-700" />
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700">
                      Connect YouTube before uploading. After that, Publish to feed will
                      start working too.
                    </p>
                    <Link
                      className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-slate-800"
                      href="/api/youtube/oauth/start"
                    >
                      Connect YouTube
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
