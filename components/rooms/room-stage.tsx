"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type RoomStageProps = {
  room: {
    id: string;
    name: string;
    topic: string | null;
    status: string;
    provider: string;
    slug: string;
    participants: Array<{
      id: string;
      userId: string;
      user: {
        id: string;
        name: string;
        profileImage: string | null;
      };
    }>;
  };
  currentUserId: string;
};

export function RoomStage({ room, currentUserId }: RoomStageProps) {
  const router = useRouter();
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCamEnabled, setIsCamEnabled] = useState(true);
  const [status, setStatus] = useState(
    "Browser-native room mode is ready. Start your local media to begin practicing.",
  );
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    void fetch("/api/room/token", { method: "POST" })
      .then(async (response) => response.json())
      .then((payload: { message?: string }) => {
        if (payload.message) {
          setProviderMessage(payload.message);
        }
      })
      .catch(() => undefined);

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startLocalMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      streamRef.current = stream;

      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        await previewRef.current.play().catch(() => undefined);
      }

      setStatus(
        "Your local media is active. Invite other learners into the room link for live practice.",
      );
    } catch {
      setStatus("Camera or microphone permissions are blocked for this room.");
    }
  }

  function toggleMic() {
    const next = !isMicEnabled;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setIsMicEnabled(next);
  }

  function toggleCam() {
    const next = !isCamEnabled;
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setIsCamEnabled(next);
  }

  async function leaveRoom() {
    await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "leave",
        roomId: room.id,
      }),
    });

    router.push("/debate-rooms");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-amber-100">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge className="bg-white/10 text-amber-200">Room Stage</Badge>
            <h1 className="mt-4 font-[var(--font-display)] text-4xl text-amber-300">
              {room.name}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              {room.topic || "Use this space for structured English conversation practice."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-amber-100 text-amber-900">{room.provider}</Badge>
            <Badge className="bg-white/10 text-amber-200">{room.status}</Badge>
          </div>
        </div>
      </Card>

      {providerMessage ? (
        <Card className="border-amber-100 bg-amber-50">
          <p className="text-sm leading-7 text-amber-900">{providerMessage}</p>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5">
          <div>
            <Badge>Video Stage</Badge>
            <h2 className="mt-4 text-3xl font-semibold">Local camera preview</h2>
          </div>
          <div className="overflow-hidden rounded-[1.8rem] bg-slate-950">
            <video
              autoPlay
              className="aspect-video w-full bg-slate-950 object-cover"
              muted
              playsInline
              ref={previewRef}
            />
          </div>
          <p className="text-sm leading-7 text-slate-600">{status}</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void startLocalMedia()}>
              <Video className="mr-2 h-4 w-4" />
              Start local media
            </Button>
            <Button onClick={toggleMic} variant="ghost">
              {isMicEnabled ? (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Mic on
                </>
              ) : (
                <>
                  <MicOff className="mr-2 h-4 w-4" />
                  Mic off
                </>
              )}
            </Button>
            <Button onClick={toggleCam} variant="ghost">
              {isCamEnabled ? (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Camera on
                </>
              ) : (
                <>
                  <VideoOff className="mr-2 h-4 w-4" />
                  Camera off
                </>
              )}
            </Button>
            <Button onClick={() => void leaveRoom()} variant="danger">
              <PhoneOff className="mr-2 h-4 w-4" />
              Leave room
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <Badge>Participants</Badge>
            <h2 className="mt-4 text-2xl font-semibold">Who is here</h2>
          </div>
          <div className="space-y-3">
            {room.participants.map((participant) => (
              <div className="rounded-4xl border border-slate-200 bg-slate-50 p-4" key={participant.id}>
                <div className="flex items-center gap-3">
                  <Avatar
                    image={participant.user.profileImage}
                    name={participant.user.name}
                  />
                  <div>
                    <p className="font-semibold text-slate-950">{participant.user.name}</p>
                    <p className="text-sm text-slate-500">
                      {participant.userId === currentUserId ? "You" : "Participant"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
