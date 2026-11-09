// One volunteer event or eco action: what, when, where, who runs it, how to
// reach them, and the next step (RSVP, log hours, or mark done).
import { collection, onSnapshot } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarPlus,
  Check,
  CircleSlash,
  Clock,
  ExternalLink,
  Globe,
  HandHeart,
  Info,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CompleteActionDialog, LogHoursDialog, type VerifierOption } from "@/components/act/Dialogs";
import { EventForm } from "@/components/act/EventForm";
import { Page } from "@/components/app/Guards";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { track } from "@/lib/analytics";
import { CATEGORY_STYLE, TONE_CLASS, downloadCalendar, formatHours, useIsAdmin, useListing, useMyHours, whenLabel, type Listing } from "@/lib/act";
import { api, errorMessage } from "@/lib/api";
import { useClasses, useDoc } from "@/lib/data";
import { db } from "@/lib/firebase";
import { useDocumentTitle, useToday } from "@/lib/hooks";
import { useProfile } from "@/lib/session";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ACT_REWARD, CATEGORIES, LIMITS, actionOpen, eventPhase, hoursOpen } from "@/shared/act";
import { findAction } from "@/shared/actions";
import { getUnit } from "@/shared/curriculum";
import { addDays, formatDay } from "@/shared/dates";
import type { ClassDoc } from "@/shared/types";

export default function EventDetail() {
  const { id = "", classId = null } = useParams();
  const scope = classId ? "class" : "community";
  const { listing, loading } = useListing(scope, classId, id);
  useDocumentTitle(listing?.title ?? "Act");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }
  if (!listing) {
    return (
      <Page>
        <Card className="mx-auto max-w-[520px]">
          <EmptyState
            icon={HandHeart}
            title="This listing isn't available"
            body="It may have been removed, or it belongs to a class you're not in."
            action={
              <Button asChild>
                <Link to="/act">Back to Act</Link>
              </Button>
            }
          />
        </Card>
      </Page>
    );
  }
  return <Detail listing={listing} />;
}

function Detail({ listing: e }: { listing: Listing }) {
  const profile = useProfile();
  const today = useToday();
  const toast = useToast();
  const admin = useIsAdmin(profile.id);
  const teacher = profile.role === "teacher";
  const { data: cls } = useDoc<ClassDoc>(e.scope === "class" ? `classes/${e.class_id}` : null);
  const isClassTeacher = e.scope === "class" && cls?.teacher_id === profile.id;
  const canManage = e.created_by === profile.id || admin || isClassTeacher;
  const { classes: joined } = useClasses(teacher ? [] : profile.class_ids);
  const hours = useMyHours(profile.id);
  const myLog = hours.items.find((h) => h.event_key === e.key);
  const going = (profile.rsvp_events ?? []).includes(e.key);
  const done = (profile.actions_done ?? []).includes(e.key);
  const phase = eventPhase(e, today);
  const cancelled = e.status === "cancelled";
  const style = CATEGORY_STYLE[e.category] ?? CATEGORY_STYLE.other;
  const template = findAction(e.action_id);
  const unit = e.unit ? getUnit(e.unit) : null;
  const ended = e.kind === "event" && !!e.ends_at && Date.parse(e.ends_at) < Date.now();
  const full = !!e.capacity && (e.going_count ?? 0) >= e.capacity && !going;

  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [logging, setLogging] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const rsvp = async (next: boolean) => {
    setBusy(true);
    try {
      await api("event/rsvp", { scope: e.scope, classId: e.class_id ?? undefined, id: e.id, going: next });
      track("event_rsvp", { going: next, scope: e.scope });
      if (next) toast.show({ tone: "success", title: "You're going", body: "Add it to your calendar so you don't forget." });
    } catch (err) {
      toast.show({ tone: "error", title: "That didn't work", body: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const verifiers: VerifierOption[] = joined.map((c) => ({ classId: c.id, label: `${c.teacher_name} (${c.name})` }));
  const mailto = e.org_email
    ? `mailto:${e.org_email}?subject=${encodeURIComponent(`Volunteering: ${e.title}`)}&body=${encodeURIComponent(`Hi${e.org_name ? ` ${e.org_name}` : ""},\n\nI found "${e.title}" on Ecoisland and I'd like to help. `)}`
    : null;

  return (
    <Page>
      <Link to="/act" className="mb-5 inline-flex items-center gap-1.5 text-base font-medium text-fg-3 hover:text-fg">
        <ArrowLeft className="size-4" /> Act
      </Link>

      {e.status === "pending" && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-sun/30 bg-sun-soft px-4 py-3 text-base text-sun-ink">
          <Info className="size-4 shrink-0" aria-hidden /> Only you can see this suggestion until an Ecoisland admin approves it.
        </div>
      )}
      {e.status === "rejected" && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-coral-soft px-4 py-3 text-base text-coral">
          <CircleSlash className="size-4 shrink-0" aria-hidden /> This suggestion wasn't approved{e.review_note ? `: ${e.review_note}` : "."} You can edit it and send it again.
        </div>
      )}

      <header className="mb-7 flex items-start gap-5">
        <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl", TONE_CLASS[style.tone])} aria-hidden>
          <style.icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={e.kind === "action" ? "sun" : "ocean"}>{e.kind === "action" ? "Eco action" : "Volunteer event"}</Badge>
            <Badge tone="outline">{CATEGORIES[e.category]}</Badge>
            <Badge tone="outline">{e.scope === "class" ? e.class_name || "Your class" : "Community"}</Badge>
            {cancelled && <Badge tone="coral">Cancelled</Badge>}
            {!cancelled && phase === "now" && <Badge tone="brand">Happening now</Badge>}
            {!cancelled && phase === "past" && <Badge tone="neutral">Ended</Badge>}
          </div>
          <h1 className="t-h1 mt-3">{e.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-base text-fg-3">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden /> {whenLabel(e)}
            </span>
            {e.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden /> {e.location}
                {e.region ? ` · ${e.region}` : ""}
              </span>
            )}
            {e.kind === "event" && e.hours ? <span>About {formatHours(e.hours)}</span> : null}
          </div>
        </div>
        {canManage && !cancelled && (
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil /> Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCancelling(true)}>
              <CircleSlash /> Cancel listing
            </Button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="min-w-0 space-y-4">
          <Card className="p-7">
            <p className="text-lg leading-relaxed font-medium text-fg">{e.summary}</p>
            {template ? (
              <>
                <h2 className="t-h3 mt-6">What to do</h2>
                <ol className="mt-3 space-y-2.5">
                  {template.steps.map((s, i) => (
                    <li key={i} className="flex gap-3 text-md leading-relaxed text-fg-2">
                      <span className="t-num mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-fg-3">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
                <div className="mt-6 rounded-lg bg-brand-soft/60 p-5">
                  <p className="text-sm font-semibold text-brand-ink">Why it matters</p>
                  <p className="mt-1.5 text-base leading-relaxed text-fg-2">{template.why}</p>
                </div>
                <p className="mt-5 text-base text-fg-3">
                  <span className="font-semibold text-fg-2">Your write-up:</span> {template.prompt}
                </p>
              </>
            ) : e.details ? (
              <p className="mt-5 text-md leading-relaxed whitespace-pre-wrap text-fg-2">{e.details}</p>
            ) : null}
          </Card>

          {unit && (
            <Link to={`/study/unit/${unit.n}`} className="card flex items-center gap-4 p-5 transition-colors hover:border-line-strong">
              <span className="grid size-10 place-items-center rounded-md bg-ocean-soft text-ocean" aria-hidden>
                <BookOpen className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg-3">Learn the science</p>
                <p className="text-md font-semibold text-fg">
                  Unit {unit.n}: {unit.title}
                </p>
              </div>
              <ArrowRight className="size-4 text-fg-4" aria-hidden />
            </Link>
          )}

          {e.kind === "event" && (
            <div className="flex gap-3 rounded-xl border border-line bg-surface-2/50 p-5 text-base leading-relaxed text-fg-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <p>
                {e.scope === "community" ? `This event is run by ${e.org_name || "its organizer"}, not Ecoisland.` : "Your teacher posted this event."} Check with a parent or guardian before you go, bring a friend,
                and follow the organizer's safety instructions.
              </p>
            </div>
          )}

          {isClassTeacher && <Attendees listing={e} />}
        </div>

        <aside className="space-y-4 self-start">
          <Card className="p-6">
            {e.kind === "event" ? (
              <>
                {(e.going_count ?? 0) > 0 && (
                  <p className="mb-4 flex items-center gap-2 text-base text-fg-3">
                    <Users className="size-4" aria-hidden /> {e.going_count} going
                    {e.capacity ? ` · ${Math.max(0, e.capacity - (e.going_count ?? 0))} spots left` : ""}
                  </p>
                )}
                {cancelled ? (
                  <p className="text-base font-semibold text-coral">This event was cancelled.</p>
                ) : going ? (
                  <div className="flex items-center gap-2">
                    <p className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-brand-soft text-base font-semibold text-brand-ink" role="status">
                      <Check className="size-4" aria-hidden /> You're going
                    </p>
                    {!ended && (
                      <Button variant="ghost" onClick={() => rsvp(false)} loading={busy}>
                        Can't go
                      </Button>
                    )}
                  </div>
                ) : !ended ? (
                  <Button className="w-full" size="lg" onClick={() => rsvp(true)} loading={busy} disabled={full || e.status !== "published"}>
                    {full ? "Event is full" : "I'm going"}
                  </Button>
                ) : (
                  <p className="text-base text-fg-3">This event has ended.</p>
                )}
                {!cancelled && !ended && (
                  <Button variant="secondary" className="mt-2.5 w-full" onClick={() => downloadCalendar(e)}>
                    <CalendarPlus /> Add to calendar
                  </Button>
                )}
                {e.signup_url && !cancelled && (
                  <Button variant="secondary" className="mt-2.5 w-full" asChild>
                    <a href={e.signup_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink /> Register with {e.org_name || "the organizer"}
                    </a>
                  </Button>
                )}
                {!teacher && e.status === "published" && hoursOpen(e) && (
                  <div className="mt-5 border-t border-line pt-5">
                    {myLog ? (
                      <p className="text-base text-fg-2">
                        <span className="font-semibold">{formatHours(myLog.hours)} logged.</span>{" "}
                        {myLog.status === "verified"
                          ? `Verified by ${myLog.teacher_name}.`
                          : myLog.status === "pending"
                            ? `Waiting for ${myLog.teacher_name} to verify.`
                            : myLog.status === "rejected"
                              ? `Not approved${myLog.review_note ? `: ${myLog.review_note}` : "."}`
                              : "Self-reported."}
                      </p>
                    ) : (
                      <>
                        <p className="text-base text-fg-3">Went? Log your hours and your teacher can verify them.</p>
                        <Button className="mt-3 w-full" onClick={() => setLogging(true)}>
                          <HandHeart /> Log your hours
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {(e.done_count ?? 0) > 0 && (
                  <p className="mb-4 flex items-center gap-2 text-base text-fg-3">
                    <Users className="size-4" aria-hidden /> {e.done_count} finished so far
                  </p>
                )}
                {cancelled ? (
                  <p className="text-base font-semibold text-coral">This eco action was cancelled.</p>
                ) : done ? (
                  <p className="flex h-10 items-center justify-center gap-2 rounded-md bg-brand-soft text-base font-semibold text-brand-ink" role="status">
                    <Check className="size-4" aria-hidden /> Done. Nice work.
                  </p>
                ) : teacher && e.scope === "class" ? (
                  <p className="text-base text-fg-3">Students mark this done with a short write-up. You'll find them in your class's Field notes.</p>
                ) : actionOpen(e, today) ? (
                  <>
                    <Button className="w-full" size="lg" onClick={() => setCompleting(true)}>
                      <Check /> Mark done
                    </Button>
                    <p className="mt-2.5 text-center text-sm text-fg-3">
                      +{ACT_REWARD.ACTION_TC} Treecoins and {ACT_REWARD.ACTION_XP} XP
                    </p>
                  </>
                ) : phase === "upcoming" ? (
                  <p className="text-base text-fg-3">Opens {e.start_day ? formatDay(e.start_day, { weekday: "long", month: "short", day: "numeric" }) : "soon"}.</p>
                ) : (
                  <p className="text-base text-fg-3">
                    Closed {e.end_day ? formatDay(addDays(e.end_day, LIMITS.ACTION_GRACE_DAYS), { month: "short", day: "numeric" }) : ""}.
                  </p>
                )}
                {!cancelled && phase !== "past" && (
                  <Button variant="secondary" className="mt-2.5 w-full" onClick={() => downloadCalendar(e)}>
                    <CalendarPlus /> Add to calendar
                  </Button>
                )}
              </>
            )}
          </Card>

          {(e.org_name || e.org_email || e.org_url || e.org_phone) && (
            <Card className="p-6">
              <p className="text-sm font-semibold text-fg-3">Organized by</p>
              <p className="mt-1 text-md font-semibold text-fg">{e.org_name || e.created_by_name}</p>
              <div className="mt-4 space-y-2">
                {mailto && (
                  <Button variant="secondary" className="w-full justify-start" asChild>
                    <a href={mailto} title={e.org_email}>
                      <Mail /> <span className="truncate">Email {e.org_email}</span>
                    </a>
                  </Button>
                )}
                {e.org_url && (
                  <Button variant="secondary" className="w-full justify-start" asChild>
                    <a href={e.org_url} target="_blank" rel="noopener noreferrer" title={e.org_url}>
                      <Globe /> <span className="truncate">{hostOf(e.org_url)}</span>
                    </a>
                  </Button>
                )}
                {e.org_phone && (
                  <Button variant="secondary" className="w-full justify-start" asChild>
                    <a href={`tel:${e.org_phone.replace(/[^0-9+]/g, "")}`}>
                      <Phone /> {e.org_phone}
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          )}

          <p className="px-1 text-sm text-fg-4">
            Posted by {e.created_by_name}
            {e.scope === "class" ? ` for ${e.class_name || "this class"}` : ""} · {new Date(e.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        </aside>
      </div>

      {editing && <EventForm open onOpenChange={setEditing} existing={e} classes={e.scope === "class" && e.class_id ? [{ id: e.class_id, name: e.class_name ?? "Class" }] : []} trusted={admin || profile.ambassador === true} />}
      {logging && <LogHoursDialog open onOpenChange={setLogging} listing={e} verifiers={verifiers} />}
      {completing && <CompleteActionDialog open onOpenChange={setCompleting} listing={e} />}
      <Dialog open={cancelling} onOpenChange={setCancelling}>
        <DialogContent title="Cancel this listing?" description="It stays visible as cancelled, so anyone who planned to come finds out. This can't be undone.">
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelling(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("event/cancel", { scope: e.scope, classId: e.class_id ?? undefined, id: e.id });
                  setCancelling(false);
                  toast.show({ tone: "info", title: "Listing cancelled" });
                } catch (err) {
                  toast.show({ tone: "error", title: "Couldn't cancel", body: errorMessage(err) });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Cancel listing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** For a class's teacher: who said they're going. */
function Attendees({ listing }: { listing: Listing }) {
  const [rows, setRows] = useState<Array<{ uid: string; name: string; at: string }> | null>(null);
  useEffect(() => {
    if (listing.kind !== "event" || !listing.class_id) return;
    return onSnapshot(
      collection(db, "classes", listing.class_id, "events", listing.id, "rsvps"),
      (snap) => setRows(snap.docs.map((d) => d.data() as { uid: string; name: string; at: string })),
      () => setRows([]),
    );
  }, [listing.kind, listing.class_id, listing.id]);
  if (listing.kind !== "event") return null;
  return (
    <Card className="p-6">
      <h2 className="text-md font-semibold text-fg">Going ({rows?.length ?? 0})</h2>
      {rows === null ? (
        <Skeleton className="mt-3 h-10" />
      ) : rows.length === 0 ? (
        <p className="mt-2 text-base text-fg-3">No one has RSVP'd yet.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2.5">
          {rows.map((r) => (
            <li key={r.uid} className="flex items-center gap-2.5 text-base text-fg-2">
              <Avatar name={r.name} size={28} /> {r.name}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
