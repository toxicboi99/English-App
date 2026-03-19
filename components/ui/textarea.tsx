import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[120px] w-full rounded-3xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100",
        className,
      )}
      {...props}
    />
  );
}
