import { motion } from "framer-motion";
import { Check, Clock, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_STYLE, TONE_CLASS, dateTile, formatHours, listingHref, whenLabel, type Listing } from "@/lib/act";
import { cn } from "@/lib/utils";

export function EventCard({ e, going, done, index = 0 }: { e: Listing; going: boolean; done: boolean; index?: number }) {
  const style = CATEGORY_STYLE[e.category] ?? CATEGORY_STYLE.other;
  const Icon = style.icon;
  const tile = dateTile(e);
  const cancelled = e.status === "cancelled";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}>
      <Link
        to={listingHref(e)}
        className={cn(
          "card group flex h-full gap-4 p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md",
          cancelled && "opacity-70",
        )}
      >
        <div className="flex w-14 shrink-0 flex-col items-center">
          <div className="w-full overflow-hidden rounded-[12px] border border-line bg-surface text-center shadow-xs">
            <p className={cn("py-0.5 text-[10.5px] font-bold tracking-[0.08em]", TONE_CLASS[style.tone])}>{tile.month}</p>
            <p className="font-display t-num py-1 text-[22px] leading-none font-[600] text-fg">{tile.day}</p>
          </div>
          <span className={cn("mt-2.5 grid size-8 place-items-center rounded-full", TONE_CLASS[style.tone])} aria-hidden>
            <Icon className="size-4" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={e.kind === "action" ? "sun" : "ocean"}>{e.kind === "action" ? "Eco action" : "Volunteer event"}</Badge>
            {e.scope === "class" ? <Badge tone="outline">{e.class_name || "Your class"}</Badge> : <Badge tone="outline">Community</Badge>}
            {cancelled && <Badge tone="coral">Cancelled</Badge>}
            {done && (
              <Badge tone="brand">
                <Check /> Done
              </Badge>
            )}
            {going && !done && (
              <Badge tone="brand">
                <Check /> Going
              </Badge>
            )}
          </div>
          <h3 className="mt-2.5 text-[16px] leading-snug font-semibold text-fg group-hover:text-brand-ink">{e.title}</h3>
          <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-fg-3">{e.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-fg-3">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden /> {whenLabel(e)}
            </span>
            {e.location && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{e.location}</span>
              </span>
            )}
            {e.kind === "event" && (e.going_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" aria-hidden /> {e.going_count} going
              </span>
            )}
            {e.kind === "event" && e.hours ? <span>{formatHours(e.hours)}</span> : null}
            {e.org_name && <span className="truncate">{e.org_name}</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
