import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { accentAttr, type Accent } from "@/lib/accent";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  wide,
  accent,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  wide?: boolean;
  /** A dialog renders in a portal, outside the page that opened it. Pass the page's accent to carry it in. */
  accent?: Accent;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-scrim data-[state=open]:animate-[rise_200ms_ease-out]" />
      <D.Content
        {...accentAttr(accent)}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[86vh] w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-lg outline-none data-[state=open]:animate-[rise_240ms_var(--ease-out-soft)]",
          wide ? "max-w-dialog-wide" : "max-w-dialog",
          className,
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <D.Title className="t-h2">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1.5 text-base text-fg-3">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</D.Description>
            )}
          </div>
          <D.Close className="-m-1 rounded-md p-1.5 text-fg-3 hover:bg-surface-2 hover:text-fg" aria-label="Close">
            <X className="size-4.5" />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}
