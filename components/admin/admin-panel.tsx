"use client";

import { startTransition, type FormEvent, useState } from "react";
import useSWR from "swr";
import { ShieldCheck, Users, Video, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { learningLevels } from "@/lib/constants";
import { fetcher } from "@/lib/fetcher";
import { formatRelative } from "@/lib/utils";

type AdminPrompt = {
  id: string;
  title: string;
  description: string | null;
  script: string;
  level: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  level: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  postsCount: number;
  savedWordsCount: number;
};

type AdminPost = {
  id: string;
  title: string;
  description: string;
  learningLevel: string;
  youtubeVideoId: string | null;
  youtubeUrl: string | null;
  videoStatus: string;
  isVerified: boolean;
  visibility: string;
  moderationNotes: string | null;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  author: {
    id: string;
    name: string;
    email: string;
    level: string;
  };
};

type AdminResponse = {
  stats: {
    promptCount: number;
    userCount: number;
    activeUserCount: number;
    hiddenPostCount: number;
    verifiedPostCount: number;
  };
  prompts: AdminPrompt[];
  users: AdminUser[];
  posts: AdminPost[];
};

function toBoolean(value: FormDataEntryValue | null) {
  return value === "true";
}

function toNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AdminPanel({
  currentUserId,
  initialData,
}: {
  currentUserId: string;
  initialData: AdminResponse;
}) {
  const { data, mutate } = useSWR<AdminResponse>("/api/admin", fetcher, {
    fallbackData: initialData,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const payload = data ?? initialData;

  async function runAction(actionKey: string, successMessage: string, body: unknown) {
    setBusyKey(actionKey);
    setStatus(null);

    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Admin update failed.");
      }

      setStatus(successMessage);
      startTransition(() => {
        void mutate();
      });
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Admin update failed.");
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreatePrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const didSucceed = await runAction("create-prompt", "Recording prompt added.", {
      action: "createPrompt",
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim() || undefined,
      script: String(formData.get("script") || "").trim(),
      level: String(formData.get("level") || "BEGINNER"),
      sortOrder: toNumber(formData.get("sortOrder")),
      isActive: toBoolean(formData.get("isActive")),
    });

    if (didSucceed) {
      form.reset();
    }
  }

  async function handleUpdatePrompt(event: FormEvent<HTMLFormElement>, promptId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runAction(`prompt-${promptId}`, "Prompt updated.", {
      action: "updatePrompt",
      promptId,
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim() || undefined,
      script: String(formData.get("script") || "").trim(),
      level: String(formData.get("level") || "BEGINNER"),
      sortOrder: toNumber(formData.get("sortOrder")),
      isActive: toBoolean(formData.get("isActive")),
    });
  }

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runAction(`user-${userId}`, "User settings updated.", {
      action: "updateUser",
      userId,
      level: String(formData.get("level") || "BEGINNER"),
      role: String(formData.get("role") || "USER"),
      isActive: toBoolean(formData.get("isActive")),
    });
  }

  async function handleUpdatePost(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runAction(`post-${postId}`, "Feed controls updated.", {
      action: "updatePost",
      postId,
      isVerified: toBoolean(formData.get("isVerified")),
      visibility: String(formData.get("visibility") || "VISIBLE"),
      moderationNotes: String(formData.get("moderationNotes") || "").trim() || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-amber-100 md:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Badge className="bg-white/10 text-amber-200">Admin Panel</Badge>
            <div>
              <h1 className="font-[var(--font-display)] text-4xl text-amber-300 md:text-5xl">
                Control prompts, users, and feed quality from one place.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                Add teleprompter prompts, manage learner access, and verify or hide feed
                posts without leaving the app.
              </p>
            </div>
          </div>
          <div className="rounded-4xl border border-white/10 bg-white/5 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Live control</p>
            <p className="mt-3 text-sm text-slate-200">
              Changes here update the recording studio, user access, and community feed.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Prompts</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{payload.stats.promptCount}</p>
          <p className="mt-2 text-sm text-slate-600">Teleprompter entries in the library.</p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Users</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{payload.stats.userCount}</p>
          <p className="mt-2 text-sm text-slate-600">Registered learners on the platform.</p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Active Users</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">
            {payload.stats.activeUserCount}
          </p>
          <p className="mt-2 text-sm text-slate-600">Accounts currently allowed to sign in.</p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Verified Posts</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">
            {payload.stats.verifiedPostCount}
          </p>
          <p className="mt-2 text-sm text-slate-600">Feed entries marked as verified.</p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Hidden Posts</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">
            {payload.stats.hiddenPostCount}
          </p>
          <p className="mt-2 text-sm text-slate-600">Feed entries removed from the public feed.</p>
        </Card>
      </div>

      {status ? (
        <div className="rounded-4xl border border-cyan-100 bg-cyan-50 px-5 py-4 text-sm text-cyan-900">
          {status}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <div>
              <Badge>Add Prompt</Badge>
              <h2 className="mt-4 text-3xl font-semibold">Recording prompt library</h2>
            </div>

            <form className="space-y-4" onSubmit={(event) => void handleCreatePrompt(event)}>
              <Input name="title" placeholder="Prompt title" required />
              <Textarea
                className="min-h-24"
                name="description"
                placeholder="Short helper note for learners"
              />
              <Textarea
                className="min-h-40"
                name="script"
                placeholder="Teleprompter script"
                required
              />
              <div className="grid gap-3 md:grid-cols-3">
                <Select defaultValue="BEGINNER" name="level">
                  {learningLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </Select>
                <Input defaultValue="0" min="0" name="sortOrder" type="number" />
                <Select defaultValue="true" name="isActive">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </div>
              <Button disabled={busyKey === "create-prompt"} type="submit">
                <Wand2 className="mr-2 h-4 w-4" />
                {busyKey === "create-prompt" ? "Saving..." : "Add prompt"}
              </Button>
            </form>
          </Card>

          <div className="space-y-4">
            {payload.prompts.length ? (
              payload.prompts.map((prompt) => (
                <Card className="space-y-4" key={prompt.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-slate-950">{prompt.title}</h3>
                        <Badge className={prompt.isActive ? "" : "bg-slate-200 text-slate-700"}>
                          {prompt.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {prompt.level} • Added {formatRelative(prompt.createdAt)}
                        {prompt.createdBy ? ` by ${prompt.createdBy.name}` : ""}
                      </p>
                    </div>
                  </div>

                  <form
                    className="space-y-4"
                    onSubmit={(event) => void handleUpdatePrompt(event, prompt.id)}
                  >
                    <Input defaultValue={prompt.title} name="title" required />
                    <Textarea
                      className="min-h-24"
                      defaultValue={prompt.description ?? ""}
                      name="description"
                    />
                    <Textarea
                      className="min-h-40"
                      defaultValue={prompt.script}
                      name="script"
                      required
                    />
                    <div className="grid gap-3 md:grid-cols-3">
                      <Select defaultValue={prompt.level} name="level">
                        {learningLevels.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </Select>
                      <Input
                        defaultValue={String(prompt.sortOrder)}
                        min="0"
                        name="sortOrder"
                        type="number"
                      />
                      <Select defaultValue={String(prompt.isActive)} name="isActive">
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </Select>
                    </div>
                    <Button disabled={busyKey === `prompt-${prompt.id}`} type="submit">
                      {busyKey === `prompt-${prompt.id}` ? "Updating..." : "Save prompt"}
                    </Button>
                  </form>
                </Card>
              ))
            ) : (
              <Card>
                <p className="text-sm text-slate-600">
                  No admin-managed prompts yet. Add your first teleprompter prompt above.
                </p>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="space-y-5">
            <div>
              <Badge>User Control</Badge>
              <h2 className="mt-4 text-3xl font-semibold">Manage access and roles</h2>
            </div>
            <div className="space-y-4">
              {payload.users.map((user) => (
                <form
                  className="rounded-4xl border border-slate-200 bg-slate-50 p-5"
                  key={user.id}
                  onSubmit={(event) => void handleUpdateUser(event, user.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold text-slate-950">{user.name}</p>
                        <Badge
                          className={
                            user.isActive
                              ? user.role === "ADMIN"
                                ? "bg-amber-100 text-amber-800"
                                : ""
                              : "bg-rose-100 text-rose-700"
                          }
                        >
                          {user.isActive ? user.role : "Suspended"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{user.email}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Joined {formatRelative(user.createdAt)} • {user.postsCount} posts •{" "}
                        {user.savedWordsCount} saved words
                      </p>
                    </div>
                    {user.id === currentUserId ? (
                      <Badge className="bg-slate-200 text-slate-700">You</Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <Select defaultValue={user.level} name="level">
                      {learningLevels.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </Select>
                    <Select defaultValue={user.role} name="role">
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </Select>
                    <Select defaultValue={String(user.isActive)} name="isActive">
                      <option value="true">Active</option>
                      <option value="false">Suspended</option>
                    </Select>
                  </div>

                  <Button
                    className="mt-4"
                    disabled={busyKey === `user-${user.id}`}
                    type="submit"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    {busyKey === `user-${user.id}` ? "Saving..." : "Save user"}
                  </Button>
                </form>
              ))}
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <Badge>Feed Control</Badge>
              <h2 className="mt-4 text-3xl font-semibold">Verify and moderate posts</h2>
            </div>
            <div className="space-y-4">
              {payload.posts.map((post) => (
                <form
                  className="rounded-4xl border border-slate-200 bg-slate-50 p-5"
                  key={post.id}
                  onSubmit={(event) => void handleUpdatePost(event, post.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold text-slate-950">{post.title}</p>
                        {post.isVerified ? (
                          <Badge className="bg-emerald-50 text-emerald-700">Verified</Badge>
                        ) : null}
                        {post.visibility === "HIDDEN" ? (
                          <Badge className="bg-rose-100 text-rose-700">Hidden</Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {post.author.name} • {post.learningLevel} • {formatRelative(post.createdAt)}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {post.likesCount} likes • {post.commentsCount} comments • {post.videoStatus}
                      </p>
                    </div>
                    {post.youtubeUrl ? (
                      <a
                        className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-100"
                        href={post.youtubeUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Watch video
                      </a>
                    ) : null}
                  </div>

                  <p className="mt-4 text-sm leading-7 text-slate-700">{post.description}</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Select defaultValue={String(post.isVerified)} name="isVerified">
                      <option value="false">Not verified</option>
                      <option value="true">Verified</option>
                    </Select>
                    <Select defaultValue={post.visibility} name="visibility">
                      <option value="VISIBLE">Visible in feed</option>
                      <option value="HIDDEN">Hidden from feed</option>
                    </Select>
                  </div>

                  <Textarea
                    className="mt-4 min-h-24"
                    defaultValue={post.moderationNotes ?? ""}
                    name="moderationNotes"
                    placeholder="Internal moderation note"
                  />

                  <Button
                    className="mt-4"
                    disabled={busyKey === `post-${post.id}`}
                    type="submit"
                    variant="secondary"
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {busyKey === `post-${post.id}` ? "Saving..." : "Save feed control"}
                  </Button>
                </form>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
