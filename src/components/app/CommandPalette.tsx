// ⌘K: jump to any lesson, unit or page from the keyboard.
import * as D from "@radix-ui/react-dialog";
import { BookOpen, CalendarCheck, CornerDownLeft, FileText, Layers, Palmtree, PenLine, Search, Settings, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { ALL_LESSONS, UNITS, unitOfLesson } from "@/shared/curriculum";
import { cn } from "@/lib/utils";

type Item = { id: string; label: string; hint: string; to: string; icon: ComponentType<{ className?: string }>; keywords: string };

export function CommandPalette({ open, onOpenChange, teacher }: { open: boolean; onOpenChange: (o: boolean) => void; teacher: boolean }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo<Item[]>(() => {
    const pages: Item[] = [
      { id: "p-today", label: "Today", hint: "Page", to: "/today", icon: CalendarCheck, keywords: "home dashboard" },
      { id: "p-daily", label: "Start today's daily set", hint: "Practice", to: "/practice?mode=daily", icon: Sparkles, keywords: "daily set streak review" },
      { id: "p-study", label: "Study", hint: "Page", to: "/study", icon: BookOpen, keywords: "units lessons apes" },
      { id: "p-frq", label: "FRQ practice", hint: "Practice", to: "/study/frq", icon: PenLine, keywords: "free response" },
      { id: "p-cards", label: "Flashcards", hint: "Practice", to: "/study/flashcards", icon: Layers, keywords: "vocab vocabulary terms" },
      { id: "p-guide", label: "Exam guide", hint: "Page", to: "/study/guide", icon: FileText, keywords: "resources tips exam structure" },
      { id: "p-island", label: "Your island", hint: "Page", to: "/island", icon: Palmtree, keywords: "shop decorations sky" },
      { id: "p-class", label: teacher ? "Classes" : "Class", hint: "Page", to: "/class", icon: Users, keywords: "leaderboard assignments roster" },
      { id: "p-settings", label: "Settings", hint: "Page", to: "/settings", icon: Settings, keywords: "profile account theme" },
    ];
    const units: Item[] = UNITS.flatMap((u) => [
      { id: `u-${u.n}`, label: `Unit ${u.n}: ${u.title}`, hint: "Unit", to: `/study/unit/${u.n}`, icon: BookOpen, keywords: `unit ${u.n}` },
      { id: `uq-${u.n}`, label: `Unit ${u.n} practice quiz`, hint: "Quiz", to: `/practice?mode=unit&unit=${u.n}`, icon: Sparkles, keywords: `quiz test unit ${u.n}` },
    ]);
    const lessons: Item[] = ALL_LESSONS.map((l) => ({
      id: `l-${l.id}`,
      label: `${l.code} ${l.title}`,
      hint: `Unit ${unitOfLesson(l.id)}`,
      to: `/study/unit/${unitOfLesson(l.id)}/${encodeURIComponent(l.id)}`,
      icon: FileText,
      keywords: "lesson",
    }));
    return [...pages, ...units, ...lessons];
  }, [teacher]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items.slice(0, 9);
    const words = query.split(/\s+/);
    return items.filter((i) => words.every((w) => `${i.label} ${i.keywords} ${i.hint}`.toLowerCase().includes(w))).slice(0, 40);
  }, [items, q]);

  useEffect(() => setIndex(0), [q, open]);
  useEffect(() => {
    if (!open) setQ("");
  }, [open]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const go = (item: Item | undefined) => {
    if (!item) return;
    onOpenChange(false);
    navigate(item.to);
  };

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-overlay/60 backdrop-blur-[2px]" />
        <D.Content className="glass fixed top-[14vh] left-1/2 z-50 w-[620px] -translate-x-1/2 overflow-hidden rounded-xl border shadow-lg outline-none data-[state=open]:animate-[rise_180ms_var(--ease-out-soft)]">
          <D.Title className="sr-only">Search Ecoisland</D.Title>
          <D.Description className="sr-only">Type to find a lesson, unit or page, then press Enter.</D.Description>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="size-[18px] text-fg-3" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setIndex((i) => Math.min(results.length - 1, i + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setIndex((i) => Math.max(0, i - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  go(results[index]);
                }
              }}
              placeholder="Search lessons, units and pages…"
              className="h-14 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-fg-4"
              aria-label="Search"
              role="combobox"
              aria-expanded
              aria-controls="palette-results"
              aria-activedescendant={results[index] ? `pal-${results[index].id}` : undefined}
            />
            <span className="kbd">esc</span>
          </div>
          <div ref={listRef} id="palette-results" role="listbox" className="max-h-[380px] overflow-y-auto p-2">
            {results.length === 0 && <p className="px-3 py-8 text-center text-[14px] text-fg-3">Nothing matches "{q}".</p>}
            {results.map((item, i) => (
              <button
                key={item.id}
                id={`pal-${item.id}`}
                data-index={i}
                role="option"
                aria-selected={i === index}
                onMouseMove={() => setIndex(i)}
                onClick={() => go(item)}
                className={cn("flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[14px]", i === index ? "bg-surface-2 text-fg" : "text-fg-2")}
              >
                <item.icon className="size-4 shrink-0 text-fg-3" />
                <span className="flex-1 truncate font-medium">{item.label}</span>
                <span className="text-[12.5px] text-fg-4">{item.hint}</span>
                {i === index && <CornerDownLeft className="size-3.5 text-fg-3" aria-hidden />}
              </button>
            ))}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
