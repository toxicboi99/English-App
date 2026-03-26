import Link from "next/link";

import { cn } from "@/lib/utils";

type LegalLinksProps = {
  className?: string;
};

const legalLinkClassName =
  "text-sm font-medium text-slate-600 underline-offset-4 transition hover:text-cyan-800 hover:underline";

export function LegalLinks({ className }: LegalLinksProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <Link className={legalLinkClassName} href="/privacy-policy">
        Privacy Policy
      </Link>
      <Link className={legalLinkClassName} href="/terms-conditions">
        Terms &amp; Conditions
      </Link>
    </div>
  );
}
