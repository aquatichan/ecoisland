import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-surface-2 text-fg-2",
  brand: "bg-brand-soft text-brand-ink",
  ocean: "bg-ocean-soft text-ocean",
  sun: "bg-sun-soft text-sun-ink",
  coral: "bg-coral-soft text-coral",
  outline: "border border-line-strong text-fg-3",
} as const;

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof TONES }) {
  return (
    <span
      className={cn("inline-flex h-5.5 items-center gap-1 rounded-full px-2 text-xs font-semibold whitespace-nowrap [&_svg]:size-3", TONES[tone], className)}
      {...props}
    />
  );
}
