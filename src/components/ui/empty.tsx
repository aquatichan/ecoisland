import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, body, action, className }: { icon?: LucideIcon; title: ReactNode; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {Icon && (
        <div className="mb-4 grid size-11 place-items-center rounded-md bg-surface-2 text-fg-3">
          <Icon className="size-5" aria-hidden />
        </div>
      )}
      <p className="text-md font-semibold text-fg">{title}</p>
      {body && <p className="mt-1.5 max-w-[42ch] text-base text-fg-3">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block size-5 animate-spin rounded-full border-2 border-line-strong border-t-brand", className)}
      role="status"
      aria-label="Loading"
    />
  );
}
