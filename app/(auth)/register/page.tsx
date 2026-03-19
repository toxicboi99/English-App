import { AuthForm } from "@/components/auth/auth-form";
import { Badge } from "@/components/ui/badge";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Badge>Create your profile</Badge>
      <div>
        <h1 className="font-[var(--font-display)] text-4xl">Join SpeakUp</h1>
        <p className="mt-3 text-base text-slate-600">
          Build an English learning identity that blends video practice, social
          accountability, and AI-based guidance.
        </p>
      </div>
      <AuthForm mode="register" />
    </div>
  );
}
