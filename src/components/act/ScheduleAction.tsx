// Schedule a ready-made eco action for a class (or, for admins and
// ambassadors, for everyone) in one step.
import { Check } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { track } from "@/lib/analytics";
import { CATEGORY_STYLE, TONE_CLASS, listingHref } from "@/lib/act";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ECO_ACTIONS, actionDetails } from "@/shared/actions";
import { addDays, localDayKey } from "@/shared/dates";
import type { ClassOption } from "./EventForm";

export function ScheduleAction({ open, onOpenChange, classes, trusted }: { open: boolean; onOpenChange: (open: boolean) => void; classes: ClassOption[]; trusted: boolean }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [picked, setPicked] = useState(ECO_ACTIONS[0].id);
  const [target, setTarget] = useState(classes[0]?.id ?? "community");
  const action = ECO_ACTIONS.find((a) => a.id === picked) ?? ECO_ACTIONS[0];
  const [startDay, setStartDay] = useState(localDayKey());
  const [endDay, setEndDay] = useState(addDays(localDayKey(), action.days - 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (id: string) => {
    setPicked(id);
    const a = ECO_ACTIONS.find((x) => x.id === id);
    if (a) setEndDay(addDays(startDay, a.days - 1));
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const community = target === "community";
      const res = await api<{ id: string; status: string }>("event/save", {
        scope: community ? "community" : "class",
        classId: community ? undefined : target,
        kind: "action",
        actionId: action.id,
        title: action.title,
        summary: action.summary,
        details: actionDetails(action),
        category: action.category,
        unit: action.unit,
        startDay,
        endDay,
      });
      track("action_scheduled", { action: action.id, scope: community ? "community" : "class" });
      onOpenChange(false);
      toast.show({ tone: "success", title: `${action.title} is scheduled`, body: community ? undefined : "Your class sees it in Act, and their write-ups land in Field notes." });
      navigate(listingHref({ scope: community ? "community" : "class", class_id: community ? null : target, id: res.id }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent wide title="Schedule an eco action" description="Each one applies a unit's science outside class and ends with a short write-up.">
        <div className="grid max-h-[340px] grid-cols-2 gap-2.5 overflow-y-auto pr-1" role="radiogroup" aria-label="Eco actions">
          {ECO_ACTIONS.map((a) => {
            const style = CATEGORY_STYLE[a.category];
            const on = a.id === picked;
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pick(a.id)}
                className={cn(
                  "flex items-start gap-3 rounded-[13px] border p-3.5 text-left transition-colors",
                  on ? "border-brand bg-brand-soft/50" : "border-line hover:border-line-strong hover:bg-surface-2/50",
                )}
              >
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", TONE_CLASS[style.tone])} aria-hidden>
                  <style.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[14px] font-semibold text-fg">
                    {a.title}
                    {on && <Check className="size-4 text-brand" aria-hidden />}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-fg-3">{a.summary}</span>
                  <span className="mt-1.5 block text-[11.5px] font-semibold text-fg-4">Unit {a.unit}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4">
          <Field label="For" htmlFor="sa-target">
            <Select id="sa-target" value={target} onChange={(e) => setTarget(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {trusted && <option value="community">Everyone on Ecoisland</option>}
            </Select>
          </Field>
          <Field label="First day" htmlFor="sa-start">
            <Input id="sa-start" type="date" value={startDay} onChange={(e) => setStartDay(e.target.value)} />
          </Field>
          <Field label="Last day" htmlFor="sa-end">
            <Input id="sa-end" type="date" value={endDay} min={startDay} onChange={(e) => setEndDay(e.target.value)} />
          </Field>
        </div>
        {error && (
          <p className="mt-4 rounded-lg bg-coral-soft px-3.5 py-2.5 text-[13.5px] font-medium text-coral" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={classes.length === 0 && !trusted}>
            Schedule {action.title}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
