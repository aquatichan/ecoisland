// Dialogs for logging volunteer hours, finishing an eco action, and (for
// teachers) verifying hours.
import { Check, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ClipboardCheck } from "lucide-react";
import { track } from "@/lib/analytics";
import { formatHours, type Listing } from "@/lib/act";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { ACT_REWARD, HOURS_FLAG_LABEL, LIMITS, eventDays, hoursReward, type HoursLog } from "@/shared/act";
import { findAction } from "@/shared/actions";
import { formatDay, localDayKey } from "@/shared/dates";

export type VerifierOption = { classId: string; label: string };

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="mt-4 rounded-lg bg-coral-soft px-3.5 py-2.5 text-base font-medium text-coral" role="alert">
      {error}
    </p>
  );
}

export function LogHoursDialog({
  open,
  onOpenChange,
  listing,
  verifiers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The event the hours are for; leave out for volunteering elsewhere. */
  listing?: Listing | null;
  /** The student's classes, whose teachers can verify hours. */
  verifiers: VerifierOption[];
}) {
  const toast = useToast();
  const days = listing ? eventDays(listing) : null;
  const [title, setTitle] = useState("");
  const [org, setOrg] = useState("");
  const [date, setDate] = useState(days?.start ?? localDayKey());
  const [hours, setHours] = useState(listing?.hours ? String(listing.hours) : "2");
  const [text, setText] = useState("");
  const [verifier, setVerifier] = useState(verifiers[0]?.classId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ status: string }>("hours/log", {
        event: listing ? { scope: listing.scope, classId: listing.class_id ?? undefined, id: listing.id } : undefined,
        title: listing ? undefined : title,
        orgName: listing ? undefined : org,
        date,
        hours: Number(hours),
        text,
        classId: verifier || undefined,
      });
      track("hours_logged", { hours: Number(hours), verified: res.status === "pending" });
      onOpenChange(false);
      toast.show({
        tone: "success",
        title: `${formatHours(Number(hours))} logged`,
        body: res.status === "pending" ? "Your teacher will check and verify them." : "Saved as self-reported. Pick a class next time to get them verified.",
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reward = hoursReward();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Log volunteer hours" description={listing ? listing.title : "For volunteering you did anywhere, in or out of Ecoisland."}>
        <div className="grid grid-cols-2 gap-4">
          {!listing && (
            <>
              <Field label="What was it?" htmlFor="lh-title" className="col-span-2">
                <Input id="lh-title" value={title} maxLength={LIMITS.TITLE} placeholder="Creek restoration day" onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="Organization" htmlFor="lh-org" className="col-span-2">
                <Input id="lh-org" value={org} maxLength={LIMITS.ORG} placeholder="Who ran it" onChange={(e) => setOrg(e.target.value)} />
              </Field>
            </>
          )}
          <Field label="Date" htmlFor="lh-date">
            <Input id="lh-date" type="date" value={date} max={localDayKey()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Hours" htmlFor="lh-hours" hint="In quarter hours">
            <Input id="lh-hours" type="number" min={0.25} max={LIMITS.MAX_HOURS_PER_LOG} step={0.25} value={hours} onChange={(e) => setHours(e.target.value)} />
          </Field>
          <Field label="What did you do?" htmlFor="lh-text" className="col-span-2" hint={text.trim().length < LIMITS.HOURS_TEXT_MIN ? `${LIMITS.HOURS_TEXT_MIN - text.trim().length} more characters` : undefined}>
            <Textarea id="lh-text" value={text} maxLength={LIMITS.HOURS_TEXT_MAX} rows={4} placeholder="Pulled invasive blackberry along 200 feet of the creek and planted 15 native shrubs." onChange={(e) => setText(e.target.value)} />
          </Field>
          <Field label="Who verifies it" htmlFor="lh-verifier" className="col-span-2" hint={verifier ? `A verified entry earns ${reward.tc} Treecoins and ${reward.xp} XP, however many hours it covers. Only log the time you really spent.` : "Self-reported hours stay on your list but don't go on your verified record."}>
            <Select id="lh-verifier" value={verifier} onChange={(e) => setVerifier(e.target.value)}>
              {verifiers.map((v) => (
                <option key={v.classId} value={v.classId}>
                  {v.label}
                </option>
              ))}
              <option value="">No one (self-reported)</option>
            </Select>
          </Field>
        </div>
        <ErrorNote error={error} />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={text.trim().length < LIMITS.HOURS_TEXT_MIN || (!listing && (title.trim().length < 3 || org.trim().length < 2))}>
            Log hours
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CompleteActionDialog({ open, onOpenChange, listing }: { open: boolean; onOpenChange: (open: boolean) => void; listing: Listing }) {
  const toast = useToast();
  const template = findAction(listing.action_id);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = text.trim().length;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("action/complete", { scope: listing.scope, classId: listing.class_id ?? undefined, id: listing.id, text });
      track("action_done", { action: listing.action_id ?? "custom" });
      onOpenChange(false);
      toast.show({ tone: "success", title: "Eco action done", body: `+${ACT_REWARD.ACTION_TC} Treecoins and ${ACT_REWARD.ACTION_XP} XP. Your write-up is in your class's field notes.` });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Finish: ${listing.title}`} description={template?.prompt ?? "What did you do, and what did you notice?"}>
        <Field label="Your write-up" htmlFor="ca-text" hint={count < LIMITS.REFLECTION_MIN ? `${LIMITS.REFLECTION_MIN - count} more characters` : `${count}/${LIMITS.REFLECTION_MAX}`}>
          <Textarea id="ca-text" value={text} rows={6} maxLength={LIMITS.REFLECTION_MAX} onChange={(e) => setText(e.target.value)} />
        </Field>
        <p className="mt-3 text-sm text-fg-3">Your teacher and classmates can read it in Field notes.</p>
        <ErrorNote error={error} />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={count < LIMITS.REFLECTION_MIN}>
            <Check /> Mark done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** A teacher's queue of hours waiting for verification. */
export function HoursReviewList({ logs }: { logs: HoursLog[] }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const review = async (log: HoursLog, approve: boolean) => {
    setBusy(log.id);
    try {
      await api("hours/review", { id: log.id, approve, note: approve ? undefined : note });
      track("hours_reviewed", { approve });
      toast.show({ tone: approve ? "success" : "info", title: approve ? `Verified ${formatHours(log.hours)} for ${log.name}` : `Declined ${log.name}'s hours` });
      setDeclining(null);
      setNote("");
    } catch (err) {
      toast.show({ tone: "error", title: "That didn't work", body: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  if (logs.length === 0) {
    return <EmptyState icon={ClipboardCheck} title="All caught up" body="When students log volunteer hours with your class, they'll wait here for you to verify." />;
  }
  return (
    <ul className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="rounded-lg border border-line p-4">
          <div className="flex items-start gap-3">
            <Avatar name={log.name} size={34} />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-fg">
                {log.name} · {formatHours(log.hours)}
              </p>
              <p className="text-sm text-fg-3">
                {log.title} · {log.org_name} · {formatDay(log.date, { month: "short", day: "numeric", year: "numeric" })}
                {log.class_name ? ` · ${log.class_name}` : ""}
              </p>
              <p className="mt-2 text-base leading-relaxed whitespace-pre-wrap text-fg-2">{log.text}</p>
              {(log.flags ?? []).length > 0 && (
                <ul className="mt-2.5 space-y-1">
                  {(log.flags ?? []).map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-sm font-medium text-sun-ink">
                      <TriangleAlert className="size-3.5 shrink-0" aria-hidden /> {HOURS_FLAG_LABEL[f] ?? f}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-fg-3">Submitted {new Date(log.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
            </div>
          </div>
          {declining === log.id ? (
            <div className="mt-3 flex items-center gap-2">
              <Input value={note} maxLength={300} placeholder="Why? (optional, the student sees this)" onChange={(e) => setNote(e.target.value)} className="h-9" aria-label="Reason for declining" />
              <Button size="sm" variant="danger-soft" loading={busy === log.id} onClick={() => review(log, false)}>
                Decline
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDeclining(null)}>
                Back
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setDeclining(log.id)} disabled={busy === log.id}>
                <X /> Decline
              </Button>
              <Button size="sm" loading={busy === log.id} onClick={() => review(log, true)}>
                <Check /> Verify
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ReviewHoursDialog({ open, onOpenChange, logs }: { open: boolean; onOpenChange: (open: boolean) => void; logs: HoursLog[] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent wide title="Verify volunteer hours" description="Only verify hours you have reason to believe. Verified entries go on the student's service record and can't be edited or deleted afterwards. Flags point out entries worth a second look.">
        <HoursReviewList logs={logs} />
      </DialogContent>
    </Dialog>
  );
}
