"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ConnectionState,
  LiveKitRoom,
  ParticipantTile,
  PreJoin,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { getTrackReferenceId } from "@livekit/components-core";
import { Track } from "livekit-client";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type LocalUserChoices = {
  videoEnabled: boolean;
  audioEnabled: boolean;
  videoDeviceId: string;
  audioDeviceId: string;
  username: string;
};

type RoomStageProps = {
  room: {
    id: string;
    name: string;
    topic: string | null;
    status: string;
    provider: string;
    slug: string;
    maxParticipants: number;
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
  currentUserName: string;
};

type RoomTokenPayload = {
  provider: string;
  token: string | null;
  serverUrl: string | null;
  mode: "livekit" | "browser-local";
  roomName: string;
  message?: string;
  error?: string;
};

function LiveRoomGrid() {
  const cameraTracks = useTracks([Track.Source.Camera]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge>Live session</Badge>
        <div className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
          <ConnectionState />
        </div>
      </div>

      {cameraTracks.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {cameraTracks.map((trackRef) => (
            <ParticipantTile
              className="overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-950"
              key={getTrackReferenceId(trackRef)}
              trackRef={trackRef}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-6 text-sm leading-7 text-slate-300">
          No camera feeds are published yet. Turn on your camera in the device controls,
          or wait for another learner to join with video enabled.
        </div>
      )}
    </div>
  );
}

export function RoomStage({
  room,
  currentUserId,
  currentUserName,
}: RoomStageProps) {
  const router = useRouter();
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasLeftRoomRef = useRef(false);

  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCamEnabled, setIsCamEnabled] = useState(true);
  const [status, setStatus] = useState(
    "Prepare your camera and microphone, then enter the room mode that fits this provider.",
  );
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [roomToken, setRoomToken] = useState<RoomTokenPayload | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [joinChoices, setJoinChoices] = useState<LocalUserChoices | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRoomToken() {
      try {
        const response = await fetch("/api/room/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: room.id }),
        });
        const payload = (await response.json()) as RoomTokenPayload;

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setProviderMessage(payload.error ?? "Unable to prepare the room session.");
          return;
        }

        setRoomToken(payload);
        setProviderMessage(payload.message ?? null);
        setStatus(
          payload.mode === "livekit"
            ? "Run the device check, then enter the live room."
            : "This room is using browser-local preview mode.",
        );
      } catch {
        if (isMounted) {
          setProviderMessage("Unable to prepare the room session right now.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingToken(false);
        }
      }
    }

    void loadRoomToken();

    return () => {
      isMounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [room.id]);

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
        "Your local preview is active. Invite a partner into a LiveKit room for a real online session.",
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
    if (!hasLeftRoomRef.current) {
      hasLeftRoomRef.current = true;

      await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "leave",
          roomId: room.id,
        }),
      }).catch(() => undefined);
    }

    router.push("/debate-rooms");
    router.refresh();
  }

  const isLiveKitRoom =
    roomToken?.mode === "livekit" && Boolean(roomToken.token && roomToken.serverUrl);

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
            <Badge className="bg-white/10 text-amber-200">
              {room.participants.length}/{room.maxParticipants} learners
            </Badge>
          </div>
        </div>
      </Card>

      {providerMessage ? (
        <Card className="border-amber-100 bg-amber-50">
          <p className="text-sm leading-7 text-amber-900">{providerMessage}</p>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          {isLoadingToken ? (
            <Card>
              <Badge>Preparing</Badge>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Checking the room provider, credentials, and live-session access.
              </p>
            </Card>
          ) : isLiveKitRoom && roomToken?.token && roomToken.serverUrl ? (
            joinChoices ? (
              <Card className="space-y-5 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Badge>LiveKit</Badge>
                    <h2 className="mt-4 text-3xl font-semibold">Live debate room</h2>
                  </div>
                  <Button onClick={() => void leaveRoom()} variant="danger">
                    <PhoneOff className="mr-2 h-4 w-4" />
                    Leave room
                  </Button>
                </div>
                <p className="text-sm leading-7 text-slate-600">{status}</p>
                <div className="overflow-hidden rounded-[1.8rem] bg-slate-950">
                  <LiveKitRoom
                    audio={joinChoices.audioEnabled}
                    className="lk-speakup-room"
                    connect
                    onConnected={() => {
                      setStatus("You are live in the room. Speak clearly and take turns.");
                    }}
                    onDisconnected={() => {
                      void leaveRoom();
                    }}
                    onError={(error) => {
                      setStatus(error.message);
                    }}
                    serverUrl={roomToken.serverUrl}
                    token={roomToken.token}
                    video={joinChoices.videoEnabled}
                  >
                    <LiveRoomGrid />
                    <RoomAudioRenderer />
                  </LiveKitRoom>
                </div>
              </Card>
            ) : (
              <Card className="space-y-5">
                <div>
                  <Badge>Pre-Join</Badge>
                  <h2 className="mt-4 text-3xl font-semibold">Check your devices</h2>
                </div>
                <p className="text-sm leading-7 text-slate-600">
                  Confirm your mic, camera, and display name before entering the live session.
                </p>
                <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-4">
                  <PreJoin
                    defaults={{
                      audioEnabled: true,
                      videoEnabled: true,
                      username: currentUserName,
                    }}
                    joinLabel="Enter live room"
                    onSubmit={(values) => {
                      setJoinChoices(values as LocalUserChoices);
                    }}
                  />
                </div>
              </Card>
            )
          ) : (
            <Card className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Badge>Browser Local</Badge>
                  <h2 className="mt-4 text-3xl font-semibold">Local camera preview</h2>
                </div>
                <Button onClick={() => void leaveRoom()} variant="danger">
                  <PhoneOff className="mr-2 h-4 w-4" />
                  Leave room
                </Button>
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
              </div>
            </Card>
          )}
        </div>

        <Card className="space-y-4">
          <div>
            <Badge>Participants</Badge>
            <h2 className="mt-4 text-2xl font-semibold">Who is here</h2>
          </div>
          <div className="space-y-3">
            {room.participants.map((participant) => (
              <div className="rounded-4xl border border-slate-200 bg-slate-50 p-4" key={participant.id}>
                <div className="flex items-center gap-3">
                  <Avatar image={participant.user.profileImage} name={participant.user.name} />
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
