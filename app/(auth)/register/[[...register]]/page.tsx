import { SignUp } from "@clerk/nextjs";

import { clerkAppearance } from "@/components/auth/clerk-appearance";
import { Badge } from "@/components/ui/badge";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-lg space-y-5 sm:space-y-6">
      <Badge>Email verification</Badge>
      <div>
        <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl">
          Create your SpeakUp account
        </h1>
        <p className="mt-3 text-base text-slate-600">
          Clerk will send a code to your email during signup, so only verified
          learners can enter the app and its live debate rooms.
        </p>
      </div>

      <div className="rounded-3xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
        Gmail works great here, but any valid email inbox you can verify is fine.
      </div>

      <SignUp
        appearance={clerkAppearance}
        fallbackRedirectUrl="/dashboard"
        path="/register"
        routing="path"
        signInUrl="/login"
      />
    </div>
  );
}
