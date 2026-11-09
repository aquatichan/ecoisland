// The left sidebar: the places a student goes, a resizable edge, and a hide
// button. Width and visibility live in src/lib/sidebar.tsx.
//
// The edge is a keyboard-operable separator (ARIA window splitter): drag it,
// use the arrow keys, Home/End, or double-click to reset. Dragging it
// narrower than the hide threshold and letting go hides the sidebar.
import { motion } from "framer-motion";
import { BookOpen, HandHeart, House, PanelLeftClose, Palmtree, Settings, Users } from "lucide-react";
import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { SIDEBAR, resolveDrag, useSidebar, widthForKey } from "@/lib/sidebar";
import { cn, modKey } from "@/lib/utils";
import { Logo } from "./Logo";

const NAV = [
  { to: "/today", label: "Home", icon: House },
  { to: "/study", label: "Study", icon: BookOpen },
  { to: "/act", label: "Act", icon: HandHeart },
  { to: "/island", label: "Island", icon: Palmtree },
  { to: "/class", label: "Class", icon: Users },
];

const SETTINGS = { to: "/settings", label: "Settings", icon: Settings };

/** Pages that belong to a section without living under its path. */
function activePath(pathname: string): string {
  const all = [...NAV, SETTINGS];
  const hit = all.find((n) => pathname === n.to || pathname.startsWith(`${n.to}/`));
  if (hit) return hit.to;
  if (pathname.startsWith("/practice")) return "/study";
  if (pathname.startsWith("/ambassador")) return "/act";
  return "";
}

function NavItem({ to, label, icon: Icon, active }: { to: string; label: string; icon: typeof House; active: boolean }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative z-0 flex h-10 items-center gap-3 rounded-md px-3 text-base font-semibold transition-colors",
        active ? "text-brand-ink" : "text-fg-3 hover:bg-surface-2/70 hover:text-fg",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-pill"
          className="absolute inset-0 -z-10 rounded-md bg-brand-soft"
          transition={{ type: "spring", stiffness: 520, damping: 40 }}
        />
      )}
      <Icon className="size-[18px] shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/** The draggable, focusable edge of the sidebar. */
function ResizeHandle() {
  const { width, setWidth, setResizing, hide, reset } = useSidebar();
  const [willHide, setWillHide] = useState(false);
  const drag = useRef<{ x: number; width: number } | null>(null);

  const finish = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setResizing(false);
    setWillHide(false);
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
    const result = resolveDrag(d.width, e.clientX - d.x);
    if (result.willHide) {
      // Keep the width it had before the drag, so showing it again restores that.
      setWidth(d.width);
      hide();
    } else {
      setWidth(result.width);
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, width };
    setResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const result = resolveDrag(d.width, e.clientX - d.x);
    setWidth(result.width, false);
    setWillHide(result.willHide);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const next = widthForKey(width, e.key, e.shiftKey);
    if (next === null) return;
    e.preventDefault();
    setWidth(next);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={SIDEBAR.MIN}
      aria-valuemax={SIDEBAR.MAX}
      aria-valuenow={width}
      aria-valuetext={`${width} pixels wide`}
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onKeyDown={onKeyDown}
      onDoubleClick={reset}
      className="group absolute inset-y-0 right-0 z-10 flex w-3 cursor-col-resize touch-none justify-end rounded-none outline-none focus-visible:bg-brand/15 focus-visible:shadow-none"
    >
      <span
        aria-hidden
        className={cn(
          "h-full w-[3px] transition-colors group-hover:bg-brand/40 group-focus-visible:w-1 group-focus-visible:bg-brand group-active:bg-brand/60",
          willHide && "bg-coral/60",
        )}
      />
    </div>
  );
}

export function Sidebar({ teacher }: { teacher: boolean }) {
  const { width, hidden, resizing, hide } = useSidebar();
  const { pathname } = useLocation();
  const active = activePath(pathname);

  return (
    <div
      className={cn("sticky top-0 z-30 h-dvh shrink-0 self-start overflow-hidden print:hidden", !resizing && "transition-[width] duration-200 motion-reduce:transition-none")}
      style={{ width: hidden ? 0 : width }}
    >
      <aside id="app-sidebar" aria-label="Sidebar" inert={hidden} className="glass flex h-full flex-col border-r" style={{ width }}>
        <div className="flex h-16 shrink-0 items-center justify-between pr-3 pl-5">
          <Link to="/today" className="rounded-md" aria-label="Ecoisland home">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={() => {
              hide();
              requestAnimationFrame(() => document.getElementById("show-sidebar")?.focus());
            }}
            aria-label="Hide sidebar"
            title={`Hide sidebar (${modKey()}B)`}
            className="inline-flex size-8 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <PanelLeftClose className="size-[18px]" aria-hidden />
          </button>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1 px-3 pt-2">
          {NAV.map((n) => (
            <NavItem key={n.to} {...n} label={n.to === "/class" && teacher ? "Classes" : n.label} active={active === n.to} />
          ))}
        </nav>
        <div className="mt-auto px-3 pb-4">
          <NavItem {...SETTINGS} active={active === SETTINGS.to} />
        </div>
      </aside>
      {!hidden && <ResizeHandle />}
    </div>
  );
}
