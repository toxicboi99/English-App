"use client";

import { useState } from "react";
import useSWR from "swr";
import { Heart, MessageSquare, Send } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetcher } from "@/lib/fetcher";
import { formatRelative } from "@/lib/utils";

type FeedPost = {
  id: string;
  title: string;
  description: string;
  script: string | null;
  learningLevel: string;
  youtubeVideoId: string | null;
  localVideoUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  likedByMe: boolean;
  author: {
    id: string;
    name: string;
    profileImage: string | null;
    level: string;
  };
  likes: Array<{ id: string; userId: string }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      profileImage: string | null;
    };
  }>;
};

type FeedResponse = {
  posts: FeedPost[];
};

export function FeedClient({ initialPosts }: { initialPosts: FeedPost[] }) {
  const { data, isLoading, mutate } = useSWR<FeedResponse>("/api/post", fetcher, {
    fallbackData: { posts: initialPosts },
  });
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const posts = data?.posts ?? [];

  async function handleLike(postId: string) {
    await fetch("/api/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });

    await mutate();
  }

  async function handleComment(postId: string) {
    const content = commentDrafts[postId]?.trim();

    if (!content) {
      return;
    }

    await fetch("/api/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, content }),
    });

    setCommentDrafts((previous) => ({ ...previous, [postId]: "" }));
    await mutate();
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-amber-100">
        <Badge className="bg-white/10 text-amber-200">Community Feed</Badge>
        <h1 className="mt-4 font-[var(--font-display)] text-4xl text-amber-300">
          Learn from every voice on the platform.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          Watch learner videos inside SpeakUp, leave meaningful reactions, and keep the
          conversation moving forward.
        </p>
      </Card>

      {isLoading && !posts.length ? (
        <Card>
          <p>Loading the latest practice videos...</p>
        </Card>
      ) : null}

      {posts.map((post) => (
        <Card className="space-y-5" key={post.id}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-3">
              <Avatar image={post.author.profileImage} name={post.author.name} />
              <div>
                <p className="font-semibold text-slate-950">{post.author.name}</p>
                <p className="text-sm text-slate-500">
                  {post.author.level} · {formatRelative(post.createdAt)}
                </p>
              </div>
            </div>
            <Badge>{post.learningLevel}</Badge>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">{post.title}</h2>
            <p className="mt-3 text-base leading-8">{post.description}</p>
          </div>

          <div className="overflow-hidden rounded-[1.8rem] bg-slate-950">
            {post.youtubeVideoId ? (
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full"
                src={`https://www.youtube.com/embed/${post.youtubeVideoId}`}
                title={post.title}
              />
            ) : post.localVideoUrl ? (
              <video className="aspect-video w-full" controls src={post.localVideoUrl} />
            ) : (
              <div className="flex aspect-video items-center justify-center text-slate-300">
                Video unavailable
              </div>
            )}
          </div>

          {post.script ? (
            <div className="rounded-4xl border border-cyan-100 bg-cyan-50 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Practice script</p>
              <p className="mt-3 text-sm leading-7 text-cyan-900">{post.script}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <button
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold transition ${
                post.likedByMe
                  ? "bg-rose-50 text-rose-600"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              onClick={() => void handleLike(post.id)}
              type="button"
            >
              <Heart className={`h-4 w-4 ${post.likedByMe ? "fill-current" : ""}`} />
              {post.likes.length}
            </button>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 font-semibold">
              <MessageSquare className="h-4 w-4" />
              {post.comments.length} comments
            </span>
          </div>

          <div className="space-y-3 rounded-4xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex gap-3">
              <Input
                onChange={(event) =>
                  setCommentDrafts((previous) => ({
                    ...previous,
                    [post.id]: event.target.value,
                  }))
                }
                placeholder="Add a supportive comment..."
                value={commentDrafts[post.id] ?? ""}
              />
              <Button
                className="px-4"
                onClick={() => void handleComment(post.id)}
                variant="secondary"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {post.comments.length ? (
                post.comments.map((comment) => (
                  <div
                    className="rounded-3xl border border-white bg-white p-4"
                    key={comment.id}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        image={comment.user.profileImage}
                        name={comment.user.name}
                        size={36}
                      />
                      <div>
                        <p className="font-semibold text-slate-950">{comment.user.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatRelative(comment.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{comment.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No comments yet. Be the first to respond.</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
