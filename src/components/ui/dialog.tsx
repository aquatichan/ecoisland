import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
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
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-[rise_200ms_ease-out]" />
      <D.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[86vh] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-lg outline-none data-[state=open]:animate-[rise_240ms_var(--ease-out-soft)]",
          wide && "w-[min(92vw,760px)]",
          className,
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <D.Title className="t-h2">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1.5 text-[14px] text-fg-3">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</D.Description>
            )}
          </div>
          <D.Close className="-m-1 rounded-md p-1.5 text-fg-3 hover:bg-surface-2 hover:text-fg" aria-label="Close">
            <X className="size-[18px]" />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}
