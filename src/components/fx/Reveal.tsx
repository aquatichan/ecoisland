// A section that fades (and lifts a little) into place the first time it scrolls into view.
// Reduced motion shows it immediately: see useReveal.
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { useReveal } from "./motion";

type RevealProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children?: ReactNode;
  /** ms to wait before the transition starts, to stagger neighbours. */
  delay?: number;
  /** Fade only, no lift: for full-bleed bands whose edges shouldn't slide. */
  lift?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function Reveal<T extends ElementType = "div">({ as, className, children, delay = 0, lift = true, ...rest }: RevealProps<T>) {
  const Tag: ElementType = as ?? "div";
  const { ref, shown } = useReveal();
  return (
    <Tag
      ref={ref}
      data-reveal={shown ? "shown" : "hidden"}
      className={cn(
        "transition-[opacity,translate] duration-700 ease-out-soft motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : cn("opacity-0", lift && "translate-y-4"),
        className,
      )}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
