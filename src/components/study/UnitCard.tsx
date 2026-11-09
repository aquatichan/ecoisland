// One unit on the Study page: its title beside its landmark, and how far through it the student is.
// The landmark is the one picture on the card: the unit's own sprite (landmark-1 through landmark-9,
// from the art manifest), in colour once the unit quiz has earned it and greyed while it is still locked.
//
// Everything it shows is passed in. The page works out what was read and whether the unit is mastered;
// this only draws it, so the progress logic stays where it was.
import { Check, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { ART } from "@/components/island/assets";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Unit } from "@/shared/curriculum";
import { MASTERY_PCT } from "@/shared/economy";
import { LANDMARK_INFO, landmarkArt } from "@/shared/landmarks";

export type UnitCardProps = {
  unit: Pick<Unit, "n" | "title" | "examWeight">;
  /** Lessons read, and lessons in the unit. */
  read: number;
  total: number;
  /** The best unit quiz score, if the student has taken it. */
  best: number | undefined;
  mastered: boolean;
  /** The student's focus unit gets a ring. */
  isFocus: boolean;
};

export function UnitCard({ unit, read, total, best, mastered, isFocus }: UnitCardProps) {
  const art = ART[landmarkArt(unit.n)];
  return (
    <Card interactive className={cn("p-0", isFocus && "ring-2 ring-brand/40")}>
      {/* rounded-lg so the focus ring follows the card's corners, not the global 8px */}
      <Link to={`/study/unit/${unit.n}`} className="flex h-full flex-col rounded-lg p-5">
        <div className="flex items-center justify-between">
          <span className="t-eyebrow">Unit {unit.n}</span>
          <span className="text-xs text-fg-3">{unit.examWeight} of exam</span>
        </div>
        <div className="mt-2.5 flex items-start gap-4">
          <p className="min-w-0 flex-1 text-lg leading-snug font-semibold text-fg">{unit.title}</p>
          <div
            data-landmark={unit.n}
            data-earned={mastered}
            className={cn("flex size-20 shrink-0 rounded-md border border-line p-2", mastered ? "bg-linear-to-b from-sky to-surface-2" : "bg-surface-2")}
          >
            <img src={art.src} width={art.w} height={art.h} alt="" draggable={false} decoding="async" className={cn("size-full object-contain", !mastered && "opacity-60 grayscale")} />
          </div>
        </div>
        <div className="mt-auto pt-5">
          <div className="flex items-center gap-3">
            <ProgressBar value={(read / total) * 100} className="h-1.5" label={`Unit ${unit.n} lessons read`} />
            <span className="t-num text-sm text-fg-3">
              {read}/{total}
            </span>
          </div>
          <p className={cn("mt-3 flex items-center gap-1.5 text-sm font-medium", mastered ? "text-brand-ink" : "text-fg-3")}>
            {mastered ? <Check className="size-3.5" strokeWidth={3} /> : <Lock className="size-3.5" />}
            {mastered ? LANDMARK_INFO[unit.n].name : best !== undefined ? `Best ${best}% · ${MASTERY_PCT}% unlocks a landmark` : `${MASTERY_PCT}% on the quiz unlocks a landmark`}
          </p>
        </div>
      </Link>
    </Card>
  );
}
