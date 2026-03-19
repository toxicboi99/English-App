"use client";

import { useState } from "react";
import useSWR from "swr";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetcher } from "@/lib/fetcher";

type UserCard = {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  level: string;
};

type FriendRequestCard = {
  id: string;
  sender?: UserCard;
  receiver?: UserCard;
};

type FriendsResponse = {
  friends: UserCard[];
  incoming: FriendRequestCard[];
  outgoing: FriendRequestCard[];
  suggestions: UserCard[];
};

export function FriendsClient({ initialData }: { initialData: FriendsResponse }) {
  const { data, mutate } = useSWR<FriendsResponse>("/api/friend", fetcher, {
    fallbackData: initialData,
  });
  const [status, setStatus] = useState<string | null>(null);

  async function performAction(payload: {
    action: "send" | "accept" | "decline" | "cancel";
    userId?: string;
    requestId?: string;
  }) {
    setStatus(null);

    const response = await fetch("/api/friend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus(result.error ?? "Friend action failed.");
      return;
    }

    setStatus("Relationship updated.");
    await mutate();
  }

  const payload = data ?? initialData;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-amber-100">
        <Badge className="bg-white/10 text-amber-200">Friends</Badge>
        <h1 className="mt-4 font-[var(--font-display)] text-4xl text-amber-300">
          Build a learning circle that keeps you practicing.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          Send requests, accept invitations, and surround yourself with people who are
          actively improving their English too.
        </p>
      </Card>

      {status ? (
        <Card className="border-cyan-100 bg-cyan-50">
          <p className="text-sm text-cyan-900">{status}</p>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="space-y-4">
          <div>
            <Badge>Friends</Badge>
            <h2 className="mt-4 text-2xl font-semibold">Your connections</h2>
          </div>
          <div className="space-y-3">
            {payload.friends.length ? (
              payload.friends.map((friend) => (
                <div className="rounded-4xl border border-slate-200 bg-slate-50 p-4" key={friend.id}>
                  <div className="flex items-center gap-3">
                    <Avatar image={friend.profileImage} name={friend.name} />
                    <div>
                      <p className="font-semibold text-slate-950">{friend.name}</p>
                      <p className="text-sm text-slate-500">
                        {friend.level} · {friend.email}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No friends yet. Start with suggestions.</p>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <Badge>Requests</Badge>
            <h2 className="mt-4 text-2xl font-semibold">Incoming requests</h2>
          </div>
          <div className="space-y-3">
            {payload.incoming.length ? (
              payload.incoming.map((request) => (
                <div className="rounded-4xl border border-slate-200 bg-slate-50 p-4" key={request.id}>
                  {request.sender ? (
                    <div className="flex items-center gap-3">
                      <Avatar image={request.sender.profileImage} name={request.sender.name} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-950">{request.sender.name}</p>
                        <p className="text-sm text-slate-500">{request.sender.level}</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-4 flex gap-3">
                    <Button
                      className="flex-1"
                      onClick={() =>
                        void performAction({ action: "accept", requestId: request.id })
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() =>
                        void performAction({ action: "decline", requestId: request.id })
                      }
                      variant="ghost"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No incoming friend requests right now.</p>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm font-semibold text-slate-950">Outgoing requests</p>
            <div className="mt-3 space-y-3">
              {payload.outgoing.length ? (
                payload.outgoing.map((request) => (
                  <div className="rounded-4xl border border-slate-200 bg-white p-4" key={request.id}>
                    {request.receiver ? (
                      <div className="flex items-center gap-3">
                        <Avatar
                          image={request.receiver.profileImage}
                          name={request.receiver.name}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-950">{request.receiver.name}</p>
                          <p className="text-sm text-slate-500">{request.receiver.level}</p>
                        </div>
                      </div>
                    ) : null}
                    <Button
                      className="mt-4 w-full"
                      onClick={() =>
                        void performAction({ action: "cancel", requestId: request.id })
                      }
                      variant="ghost"
                    >
                      Cancel request
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No pending outgoing requests.</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <Badge>Suggestions</Badge>
            <h2 className="mt-4 text-2xl font-semibold">Find more learners</h2>
          </div>
          <div className="space-y-3">
            {payload.suggestions.length ? (
              payload.suggestions.map((user) => (
                <div className="rounded-4xl border border-slate-200 bg-slate-50 p-4" key={user.id}>
                  <div className="flex items-center gap-3">
                    <Avatar image={user.profileImage} name={user.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-950">{user.name}</p>
                      <p className="text-sm text-slate-500">
                        {user.level} · {user.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="mt-4 w-full"
                    onClick={() => void performAction({ action: "send", userId: user.id })}
                  >
                    Add friend
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Suggestions will appear here as more learners join.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
