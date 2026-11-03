import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { interactive?: boolean }>(function Card(
  { className, interactive, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "card",
        interactive && "transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-px hover:border-line-strong hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
});

export function CardHeader({ title, action, eyebrow, className }: { title: ReactNode; action?: ReactNode; eyebrow?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="t-eyebrow mb-2">{eyebrow}</p>}
        <h2 className="t-h3">{title}</h2>
      </div>
      {action}
    </div>
  );
}
