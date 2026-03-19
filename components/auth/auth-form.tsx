"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload =
      mode === "register"
        ? {
            name: String(formData.get("name") || ""),
            email: String(formData.get("email") || ""),
            password: String(formData.get("password") || ""),
            profileImage: String(formData.get("profileImage") || ""),
            bio: String(formData.get("bio") || ""),
            level: String(formData.get("level") || "BEGINNER"),
          }
        : {
            email: String(formData.get("email") || ""),
            password: String(formData.get("password") || ""),
          };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Authentication failed.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Authentication failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {mode === "register" ? (
        <>
          <Input name="name" placeholder="Full name" required />
          <Input name="profileImage" placeholder="Profile image URL (optional)" />
          <Textarea
            maxLength={280}
            name="bio"
            placeholder="Tell the community what kind of English you want to improve."
          />
          <Select defaultValue="BEGINNER" name="level">
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
            <option value="FLUENT">Fluent</option>
          </Select>
        </>
      ) : null}

      <Input name="email" placeholder="Email address" required type="email" />
      <Input name="password" placeholder="Password" required type="password" />

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Button className="w-full" disabled={isLoading} type="submit">
        {isLoading
          ? mode === "login"
            ? "Signing in..."
            : "Creating account..."
          : mode === "login"
            ? "Log in"
            : "Create account"}
      </Button>

      <p className="text-center text-sm text-slate-600">
        {mode === "login" ? "New to SpeakUp?" : "Already have an account?"}{" "}
        <Link
          className="font-semibold text-cyan-700 transition hover:text-cyan-900"
          href={mode === "login" ? "/register" : "/login"}
        >
          {mode === "login" ? "Create one" : "Log in"}
        </Link>
      </p>
    </form>
  );
}
