import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-ocean text-amber-100 shadow-lg shadow-cyan-950/10 hover:-translate-y-0.5 hover:bg-cyan-700",
  secondary:
    "bg-slate-950 text-amber-100 hover:-translate-y-0.5 hover:bg-slate-800",
  ghost:
    "bg-white/80 text-slate-900 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:bg-slate-50",
  danger:
    "bg-rose-500 text-amber-100 hover:-translate-y-0.5 hover:bg-rose-600",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        variantStyles[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
