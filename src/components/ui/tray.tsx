import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A tray: the translucent glass pane under one feature group (see .tray in src/index.css). Its cards sit inside
 * it 12px apart; a title, when it has one, is a heading in --fg straight on the tray, with an optional action
 * beside it.
 */
export function Tray({ title, action, className, children, ...props }: Omit<HTMLAttributes<HTMLElement>, "title"> & { title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cn("tray", className)} {...props}>
      {(title || action) && (
        <div className="tray-head">
          {title ? <h2 className="t-h3 text-fg">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
