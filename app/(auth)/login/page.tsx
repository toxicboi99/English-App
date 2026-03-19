import { AuthForm } from "@/components/auth/auth-form";
import { Badge } from "@/components/ui/badge";

export default async function LoginPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Badge>Welcome back</Badge>
      <div>
        <h1 className="font-[var(--font-display)] text-4xl">Log in to SpeakUp</h1>
        <p className="mt-3 text-base text-slate-600">
          Continue your speaking streak, social feed, and vocabulary growth.
        </p>
      </div>
      <AuthForm mode="login" />
    </div>
  );
}
