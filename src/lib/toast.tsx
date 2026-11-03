import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "./utils";

type Tone = "success" | "info" | "error";
type Toast = { id: number; tone: Tone; title: string; body?: string };
type ToastApi = { show: (t: Omit<Toast, "id">) => void };

const ToastContext = createContext<ToastApi>({ show: () => {} });

const ICONS = { success: CheckCircle2, info: Info, error: TriangleAlert };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = next.current++;
      setToasts((list) => [...list.slice(-3), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.tone === "error" ? 7000 : 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.16 } }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="glass pointer-events-auto flex w-[380px] items-start gap-3 rounded-lg border px-4 py-3 shadow-lg"
                role={t.tone === "error" ? "alert" : "status"}
              >
                <Icon
                  className={cn("mt-0.5 size-[18px] shrink-0", t.tone === "success" && "text-brand", t.tone === "info" && "text-ocean", t.tone === "error" && "text-coral")}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-fg">{t.title}</p>
                  {t.body && <p className="mt-0.5 text-[13px] text-fg-3">{t.body}</p>}
                </div>
                <button onClick={() => dismiss(t.id)} className="rounded-md p-1 text-fg-4 hover:bg-surface-2 hover:text-fg-2" aria-label="Dismiss">
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
