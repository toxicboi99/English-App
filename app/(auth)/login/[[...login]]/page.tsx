import { SignIn } from "@clerk/nextjs";

import { clerkAppearance } from "@/components/auth/clerk-appearance";
import { Badge } from "@/components/ui/badge";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-lg space-y-5 sm:space-y-6">
      <Badge>Secure login</Badge>
      <div>
        <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl">Log in to SpeakUp</h1>
        <p className="mt-3 text-base text-slate-600">
          Continue your speaking streak, and if you forget your password, Clerk
          will send a reset code to your email inbox.
        </p>
      </div>

      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Use an email account you can access right now. Your reset and verification
        codes will be delivered there.
      </div>

      <SignIn
        appearance={clerkAppearance}
        fallbackRedirectUrl="/dashboard"
        forceRedirectUrl="/dashboard"
        path="/login"
        routing="path"
        signUpUrl="/register"
      />
    </div>
  );
}
