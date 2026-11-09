import * as M from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Menu = M.Root;
export const MenuTrigger = M.Trigger;

export function MenuContent({ children, align = "end", className }: { children: ReactNode; align?: "start" | "end" | "center"; className?: string }) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={8}
        className={cn(
          "glass z-50 min-w-[220px] rounded-lg border p-1.5 shadow-lg outline-none data-[state=open]:animate-[rise_160ms_var(--ease-out-soft)]",
          className,
        )}
      >
        {children}
      </M.Content>
    </M.Portal>
  );
}

export function MenuItem({ children, onSelect, danger, className }: { children: ReactNode; onSelect?: () => void; danger?: boolean; className?: string }) {
  return (
    <M.Item
      onSelect={onSelect}
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2.5 rounded-sm px-2.5 text-base font-medium text-fg-2 outline-none select-none data-[highlighted]:bg-surface-2 data-[highlighted]:text-fg [&_svg]:size-4 [&_svg]:text-fg-3",
        danger && "text-coral data-[highlighted]:text-coral [&_svg]:text-coral",
        className,
      )}
    >
      {children}
    </M.Item>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <M.Label className="px-2.5 pt-1.5 pb-2 text-sm text-fg-3">{children}</M.Label>;
}

export function MenuSeparator() {
  return <M.Separator className="my-1.5 h-px bg-line" />;
}
