"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, Camera, CircleStop, PlayCircle, UploadCloud, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const samplePrompts = [
  {
    title: "My Daily Routine",
    script:
      "My daily routine is very simple. I wake up early in the morning at 6 o’clock. First, I brush my teeth and take a bath. Then I have my breakfast. After that, I go to college. I attend my classes and learn new things. In the afternoon, I come back home and take lunch. In the evening, I do my homework and sometimes play games. At night, I have dinner with my family and go to sleep early.",
  },
  {
    title: "Importance of Education",
    script:
      "Education is very important in our life. It helps us to gain knowledge and skills. Education makes a person wise and confident. It also helps us to get a good job and live a better life. An educated person can understand what is right and wrong. Education also helps in the development of society and the country. Therefore, everyone should get education.",
  },
  {
    title: "My Hobby",
    script:
      "My hobby is playing cricket. I like to play cricket in my free time. It keeps me active and healthy. I play with my friends in the playground. Cricket also teaches teamwork and discipline. I enjoy watching cricket matches on TV. My favorite player is Virat Kohli.",
  },
] as const;

type UploadResponse = {
  videoId: string;
  url: string;
  embedUrl: string;
};

export function VideoStudio({ youtubeConnected }: { youtubeConnected: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const livePreviewRef = useRef<HTMLVideoElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [title, setTitle] = useState<string>("My English practice");
  const [description, setDescription] = useState<string>(
    "I practiced this speaking prompt on SpeakUp.",
  );
  const [script, setScript] = useState<string>(samplePrompts[0].script);
  const [learningLevel, setLearningLevel] = useState<string>("BEGINNER");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [status, setStatus] = useState<string | null>(
    searchParams.get("youtube") === "connected"
      ? "YouTube account connected. Your next upload will go to YouTube as unlisted."
      : null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [grammarFeedback, setGrammarFeedback] = useState<{
    correctedText: string;
    explanation: string;
  } | null>(null);

  const canUpload = useMemo(
    () => youtubeConnected || Boolean(searchParams.get("youtube") === "connected"),
    [searchParams, youtubeConnected],
  );

  useEffect(() => {
    return () => {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [recordedUrl]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      streamRef.current = stream;
      if (livePreviewRef.current) {
        livePreviewRef.current.srcObject = stream;
        await livePreviewRef.current.play().catch(() => undefined);
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });

      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        if (livePreviewRef.current) {
          livePreviewRef.current.srcObject = null;
        }
      };

      recorder.start();
      setUploadResult(null);
      setStatus("Recording started. Speak slowly and follow the on-screen script.");
      setIsRecording(true);
    } catch {
      setStatus(
        "Camera or microphone access is unavailable. Allow permission and try again.",
      );
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setIsRecording(false);
    setStatus("Recording stopped. Preview your take and upload when ready.");
  }

  async function improveDescription() {
    setGrammarFeedback(null);
    setStatus("Generating AI writing feedback...");

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
  }

  async function uploadVideo() {
    if (!recordedBlob) {
      setStatus("Record a practice video before uploading.");
      return;
    }

    if (!canUpload) {
      setStatus("Connect YouTube first so uploads can be sent as unlisted videos.");
      return;
    }

    setIsUploading(true);
    setStatus("Uploading your practice video to YouTube...");

    const formData = new FormData();
    formData.append(
      "file",
      new File([recordedBlob], `${title.replace(/\s+/g, "-").toLowerCase()}.webm`, {
        type: recordedBlob.type || "video/webm",
      }),
    );
    formData.append("title", title);
    formData.append("description", description);

    try {
      const response = await fetch("/api/youtube/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as UploadResponse & { error?: string };

      if (!response.ok) {
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

    setIsPublishing(true);
    setStatus("Publishing your learning post...");

    try {
      const response = await fetch("/api/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          script,
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
      {/* LEFT SIDE */}
      <Card className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Badge>Recording Prompt</Badge>
            <h2 className="mt-4 text-3xl font-semibold">Teleprompter</h2>
          </div>

          {/* SAFE SELECT */}
          <select
            className="w-full max-w-xs rounded-md border p-2"
            onChange={(event) => {
              const prompt = samplePrompts.find(
                (item) => item.title === event.target.value
              );
              if (prompt) {
                setTitle(prompt.title);
                setScript(prompt.script);
              }
            }}
          >
            {samplePrompts.map((prompt) => (
              <option key={prompt.title} value={prompt.title}>
                {prompt.title}
              </option>
            ))}
          </select>
        </div>

        <Input value={title} onChange={(e) => setTitle(e.target.value)} />

        {!isRecording && (
          <Textarea
            className="min-h-[220px] text-base leading-8"
            value={script}
            onChange={(e) => setScript(e.target.value)}
          />
        )}

        {/* CAMERA CARD */}
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
              className="w-full h-[70vh] object-cover"
            />

            {/* TELEPROMPTER */}
            <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
              <div
                className={`${
                  isRecording ? "animate-scroll" : ""
                } w-[90%] text-center text-white text-lg leading-8`}
                style={{
                  animationDuration: `${Math.max(
                    script.split(" ").length / 2,
                    10
                  )}s`,
                }}
                onAnimationEnd={() => {
                  if (isRecording) stopRecording();
                }}
              >
                {script}
              </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/70 pointer-events-none" />
          </div>

          <p className="text-sm text-slate-600">{status}</p>
        </Card>

        {/* BUTTONS */}
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

        {/* GRAMMAR FEEDBACK (FIXED POSITION) */}
        {grammarFeedback && (
          <div className="rounded-4xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
              AI Enhancement
            </p>
            <p className="mt-3 text-sm leading-7 text-amber-900">
              {grammarFeedback.explanation}
            </p>
          </div>
        )}
      </Card>

      {/* RIGHT SIDE */}
      <div className="space-y-6">
        <Card className="space-y-5">
          <div>
            <Badge>Recorded Take</Badge>
            <h2 className="mt-4 text-3xl font-semibold">
              Preview and publish
            </h2>
          </div>

          <div className="overflow-hidden rounded-[1.8rem] bg-slate-950">
            {recordedUrl ? (
              <video
                className="aspect-video w-full object-cover"
                controls
                src={recordedUrl}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center text-sm text-slate-300">
                Your recorded video preview will appear here after recording.
              </div>
            )}
          </div>

          {uploadResult && (
            <div className="rounded-4xl border border-cyan-100 bg-cyan-50 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">
                Upload complete
              </p>
              <p className="mt-3 text-sm text-cyan-900">
                Video ID: {uploadResult.videoId}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              disabled={!recordedBlob || isUploading}
              onClick={() => void uploadVideo()}
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              {isUploading ? "Uploading..." : "Upload to YouTube"}
            </Button>

            <Button
              disabled={!uploadResult || isPublishing}
              onClick={() => void publishPost()}
              variant="secondary"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              {isPublishing ? "Publishing..." : "Publish to feed"}
            </Button>
          </div>

          {!canUpload && (
            <div className="rounded-4xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <Bot className="mt-0.5 h-5 w-5 text-slate-700" />
                <p className="text-sm text-slate-700">
                  Connect YouTube to upload videos.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  </div>
);
}