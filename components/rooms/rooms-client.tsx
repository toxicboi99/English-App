"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { DoorOpen, PlusCircle, Users } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fetcher } from "@/lib/fetcher";

type Room = {
  id: string;
  name: string;
  slug: string;
  topic: string | null;
  provider: string;
  status: string;
  maxParticipants: number;
  joinedByMe: boolean;
  host: {
    id: string;
    name: string;
    profileImage: string | null;
  };
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

type RoomsResponse = {
  rooms: Room[];
};

const providerLabels: Record<string, string> = {
  LIVEKIT: "LiveKit production",
  WEBRTC: "Browser local",
  HMS: "100ms-ready",
};

export function RoomsClient({ initialRooms }: { initialRooms: Room[] }) {
  const router = useRouter();
  const { data, mutate } = useSWR<RoomsResponse>("/api/room", fetcher, {
    fallbackData: { rooms: initialRooms },
  });
  const [status, setStatus] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const rooms = data?.rooms ?? initialRooms;

  async function createRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsCreating(true);

    const formData = new FormData(event.currentTarget);
    const provider = String(formData.get("provider") || "LIVEKIT");
    const payload = {
      action: "create",
      name: String(formData.get("name") || ""),
      topic: String(formData.get("topic") || ""),
      maxParticipants: Number(formData.get("maxParticipants") || "4"),
      provider,
    };

    const response = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as {
      room?: Room;
      error?: string;
    };

    if (!response.ok || !result.room) {
      setStatus(result.error ?? "Unable to create room.");
      setIsCreating(false);
      return;
    }

    const createdRoom = result.room;

    setStatus(
      createdRoom.provider === "LIVEKIT"
        ? "Room created. Opening the live production stage..."
        : "Room created. Opening the browser-local practice stage...",
    );
    await mutate();
    startTransition(() => {
      router.push(`/debate-rooms/${createdRoom.slug}`);
    });
    setIsCreating(false);
  }

  async function joinRoom(room: Room) {
    setStatus(null);

    const response = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "join",
        roomId: room.id,
      }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus(result.error ?? "Unable to join room.");
      return;
    }

    await mutate();
    startTransition(() => {
      router.push(`/debate-rooms/${room.slug}`);
    });
  }

  async function leaveRoom(roomId: string) {
    const response = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "leave",
        roomId,
      }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus(result.error ?? "Unable to leave room.");
      return;
    }

    setStatus("You left the room.");
    await mutate();
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-amber-100">
        <Badge className="bg-white/10 text-amber-200">Debate Rooms</Badge>
        <h1 className="mt-4 font-[var(--font-display)] text-4xl text-amber-300">
          Go live with production-ready English debate rooms.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          Create 2-4 person rooms with LiveKit for real online sessions, or keep
          a browser-local preview room when you only need a mic and camera check.
        </p>
      </Card>

      <Card className="border-cyan-100 bg-cyan-50">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-950">
              Provider guide
            </p>
            <p className="mt-2 text-sm leading-7 text-cyan-900">
              `WEBRTC` is local-only preview inside the browser. `LIVEKIT` is the
              production path for shared online debate rooms with real participants.
            </p>
          </div>
          <Badge className="self-start bg-cyan-900 text-cyan-50">LiveKit recommended</Badge>
        </div>
      </Card>

      {status ? (
        <Card className="border-cyan-100 bg-cyan-50">
          <p className="text-sm text-cyan-900">{status}</p>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div>
            <Badge>Create Room</Badge>
            <h2 className="mt-4 text-2xl font-semibold">Start a debate</h2>
          </div>
          <form className="mt-5 space-y-4" onSubmit={(event) => void createRoom(event)}>
            <Input name="name" placeholder="Room name" required />
            <Textarea
              name="topic"
              placeholder="Topic or opening debate statement"
              rows={5}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Select defaultValue="4" name="maxParticipants">
                <option value="2">2 participants</option>
                <option value="3">3 participants</option>
                <option value="4">4 participants</option>
              </Select>
              <Select defaultValue="LIVEKIT" name="provider">
                <option value="LIVEKIT">LiveKit production</option>
                <option value="WEBRTC">Browser local preview</option>
              </Select>
            </div>
            <p className="text-sm leading-7 text-slate-500">
              Choose LiveKit for real online sessions. Browser local preview stays
              on your device and is best for solo testing.
            </p>
            <Button className="w-full" disabled={isCreating} type="submit">
              <PlusCircle className="mr-2 h-4 w-4" />
              {isCreating ? "Creating room..." : "Create room"}
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          {rooms.length ? (
            rooms.map((room) => (
              <Card key={room.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-semibold text-slate-950">{room.name}</h3>
                      <Badge>{room.status}</Badge>
                      <Badge className="bg-amber-50 text-amber-800">
                        {providerLabels[room.provider] ?? room.provider}
                      </Badge>
                    </div>
                    <p className="text-sm leading-7 text-slate-700">
                      {room.topic || "Bring your own speaking topic and practice on camera."}
                    </p>
                    <div className="flex items-center gap-3">
                      <Avatar image={room.host.profileImage} name={room.host.name} size={36} />
                      <p className="text-sm text-slate-500">Hosted by {room.host.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <Button onClick={() => void joinRoom(room)}>
                      <DoorOpen className="mr-2 h-4 w-4" />
                      {room.joinedByMe ? "Re-enter room" : "Join room"}
                    </Button>
                    {room.joinedByMe ? (
                      <Button onClick={() => void leaveRoom(room.id)} variant="ghost">
                        Leave
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 rounded-4xl border border-slate-200 bg-slate-50 p-4">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Users className="h-4 w-4" />
                    {room.participants.length}/{room.maxParticipants}
                  </span>
                  <div className="flex -space-x-3">
                    {room.participants.map((participant) => (
                      <Avatar
                        image={participant.user.profileImage}
                        key={participant.id}
                        name={participant.user.name}
                        size={36}
                      />
                    ))}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <p className="text-sm text-slate-600">
                No rooms are live yet. Create the first one and invite a speaking partner.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
