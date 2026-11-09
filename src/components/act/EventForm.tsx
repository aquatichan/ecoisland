// Post or edit a listing: a volunteer event or an eco action, for one class
// or for everyone. Community posts from anyone but admins and ambassadors
// are suggestions an admin reviews first.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { track } from "@/lib/analytics";
import { listingHref, toLocalInput, type Listing } from "@/lib/act";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { CATEGORIES, CATEGORY_IDS, LIMITS, type Category, type EventKind } from "@/shared/act";
import { UNITS } from "@/shared/curriculum";
import { addDays, localDayKey } from "@/shared/dates";

export type ClassOption = { id: string; name: string };

type Draft = {
  kind: EventKind;
  target: string; // "community" or a class id
  title: string;
  summary: string;
  details: string;
  category: Category;
  unit: string;
  startsAt: string;
  endsAt: string;
  startDay: string;
  endDay: string;
  location: string;
  region: string;
  hours: string;
  capacity: string;
  orgName: string;
  orgEmail: string;
  orgUrl: string;
  orgPhone: string;
  signupUrl: string;
};

function tomorrowAt(hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return toLocalInput(d.toISOString());
}

function fromListing(e: Listing): Draft {
  return {
    kind: e.kind,
    target: e.scope === "class" ? (e.class_id ?? "") : "community",
    title: e.title,
    summary: e.summary,
    details: e.details ?? "",
    category: e.category,
    unit: e.unit ? String(e.unit) : "",
    startsAt: toLocalInput(e.starts_at),
    endsAt: toLocalInput(e.ends_at),
    startDay: e.start_day ?? localDayKey(),
    endDay: e.end_day ?? addDays(localDayKey(), 7),
    location: e.location ?? "",
    region: e.region ?? "",
    hours: e.hours ? String(e.hours) : "",
    capacity: e.capacity ? String(e.capacity) : "",
    orgName: e.org_name ?? "",
    orgEmail: e.org_email ?? "",
    orgUrl: e.org_url ?? "",
    orgPhone: e.org_phone ?? "",
    signupUrl: e.signup_url ?? "",
  };
}

export function EventForm({
  open,
  onOpenChange,
  existing,
  classes,
  trusted,
  initialKind = "event",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: Listing | null;
  /** Classes this person teaches (they can post to these). */
  classes: ClassOption[];
  /** Admins and ambassadors publish community listings directly. */
  trusted: boolean;
  initialKind?: EventKind;
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const initial = useMemo<Draft>(
    () =>
      existing
        ? fromListing(existing)
        : {
            kind: initialKind,
            target: classes[0]?.id ?? "community",
            title: "",
            summary: "",
            details: "",
            category: "cleanup",
            unit: "",
            startsAt: tomorrowAt(9),
            endsAt: tomorrowAt(12),
            startDay: localDayKey(),
            endDay: addDays(localDayKey(), 7),
            location: "",
            region: "",
            hours: "3",
            capacity: "",
            orgName: "",
            orgEmail: "",
            orgUrl: "",
            orgPhone: "",
            signupUrl: "",
          },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existing?.id, open],
  );
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInitial, setLastInitial] = useState(initial);
  if (lastInitial !== initial) {
    setLastInitial(initial);
    setD(initial);
    setError(null);
  }
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const community = d.target === "community";
  const isEvent = d.kind === "event";
  const editing = !!existing;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        id: existing?.id,
        scope: community ? "community" : "class",
        classId: community ? undefined : d.target,
        kind: d.kind,
        title: d.title,
        summary: d.summary,
        details: d.details,
        category: d.category,
        unit: d.unit ? Number(d.unit) : null,
        actionId: existing?.action_id ?? null,
        location: d.location,
        region: d.region,
        orgName: d.orgName,
        orgEmail: d.orgEmail,
        orgUrl: d.orgUrl,
        orgPhone: d.orgPhone,
        signupUrl: d.signupUrl,
      };
      if (isEvent) {
        if (!d.startsAt || !d.endsAt) throw new Error("Pick a start and end time.");
        body.startsAt = new Date(d.startsAt).toISOString();
        body.endsAt = new Date(d.endsAt).toISOString();
        body.hours = d.hours ? Number(d.hours) : null;
        body.capacity = d.capacity ? Number(d.capacity) : null;
      } else {
        body.startDay = d.startDay;
        body.endDay = d.endDay;
      }
      const res = await api<{ id: string; status: string }>("event/save", body);
      track(editing ? "event_edited" : "event_posted", { kind: d.kind, scope: body.scope as string, status: res.status });
      onOpenChange(false);
      if (res.status === "pending") {
        toast.show({ tone: "success", title: "Thanks! Your suggestion is in review", body: "An Ecoisland admin will check it, usually within a couple of days." });
      } else {
        toast.show({ tone: "success", title: editing ? "Listing updated" : "Listing posted" });
        if (!editing) navigate(listingHref({ scope: body.scope as string, class_id: community ? null : d.target, id: res.id }));
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const id = (k: string) => `ev-${k}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        wide
        title={editing ? "Edit listing" : isEvent ? "Post a volunteer event" : "Post an eco action"}
        description={
          community && !trusted
            ? "Suggest something for everyone on Ecoisland. An admin reviews suggestions before they go live."
            : isEvent
              ? "A cleanup, planting or other volunteer opportunity with a time and place."
              : "Something students do on their own within a window of days."
        }
      >
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          {!editing && (
            <Field label="Type" className="col-span-2">
              <Segmented<EventKind>
                label="Listing type"
                value={d.kind}
                onChange={(v) => set("kind", v)}
                options={[
                  { value: "event", label: "Volunteer event" },
                  { value: "action", label: "Eco action" },
                ]}
              />
            </Field>
          )}
          <Field label="Who can see it" htmlFor={id("target")} className="col-span-2">
            <Select id={id("target")} value={d.target} onChange={(e) => set("target", e.target.value)} disabled={editing}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (your class)
                </option>
              ))}
              <option value="community">{trusted ? "Everyone on Ecoisland" : "Everyone on Ecoisland (reviewed first)"}</option>
            </Select>
          </Field>
          <Field label="Title" htmlFor={id("title")} className="col-span-2">
            <Input id={id("title")} value={d.title} maxLength={LIMITS.TITLE} placeholder={isEvent ? "Beach cleanup at Golden Gardens" : "Trash audit week"} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="One-line summary" htmlFor={id("summary")} className="col-span-2" hint={`${d.summary.length}/${LIMITS.SUMMARY}`}>
            <Input id={id("summary")} value={d.summary} maxLength={LIMITS.SUMMARY} placeholder="What volunteers will do, in a sentence." onChange={(e) => set("summary", e.target.value)} />
          </Field>
          <Field label="Category" htmlFor={id("category")}>
            <Select id={id("category")} value={d.category} onChange={(e) => set("category", e.target.value as Category)}>
              {CATEGORY_IDS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIES[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Related APES unit" htmlFor={id("unit")} hint="Links to the science behind it.">
            <Select id={id("unit")} value={d.unit} onChange={(e) => set("unit", e.target.value)}>
              <option value="">None</option>
              {UNITS.map((u) => (
                <option key={u.n} value={u.n}>
                  Unit {u.n}: {u.title}
                </option>
              ))}
            </Select>
          </Field>

          {isEvent ? (
            <>
              <Field label="Starts" htmlFor={id("start")}>
                <Input id={id("start")} type="datetime-local" value={d.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
              </Field>
              <Field label="Ends" htmlFor={id("end")}>
                <Input id={id("end")} type="datetime-local" value={d.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
              </Field>
              <Field label="Location" htmlFor={id("location")} className="col-span-2">
                <Input id={id("location")} value={d.location} maxLength={LIMITS.LOCATION} placeholder="Meet at the north parking lot, Golden Gardens Park" onChange={(e) => set("location", e.target.value)} />
              </Field>
              <Field label="City or region" htmlFor={id("region")} hint="Optional">
                <Input id={id("region")} value={d.region} maxLength={LIMITS.REGION} placeholder="Seattle, WA" onChange={(e) => set("region", e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hours" htmlFor={id("hours")} hint="Expected">
                  <Input id={id("hours")} type="number" min={0.25} max={LIMITS.MAX_HOURS_PER_LOG} step={0.25} value={d.hours} onChange={(e) => set("hours", e.target.value)} />
                </Field>
                <Field label="Spots" htmlFor={id("capacity")} hint="Optional">
                  <Input id={id("capacity")} type="number" min={1} step={1} value={d.capacity} onChange={(e) => set("capacity", e.target.value)} />
                </Field>
              </div>
            </>
          ) : (
            <>
              <Field label="First day" htmlFor={id("sday")}>
                <Input id={id("sday")} type="date" value={d.startDay} onChange={(e) => set("startDay", e.target.value)} />
              </Field>
              <Field label="Last day" htmlFor={id("eday")}>
                <Input id={id("eday")} type="date" value={d.endDay} min={d.startDay} onChange={(e) => set("endDay", e.target.value)} />
              </Field>
            </>
          )}

          <div className="col-span-2 mt-1 border-t border-line pt-4">
            <p className="text-sm font-semibold text-fg-2">Organizer</p>
            <p className="text-sm text-fg-3">{isEvent ? (community ? "Add at least one way to contact them or sign up." : "Who runs it, and how to reach them.") : "Optional, if a group is behind it."}</p>
          </div>
          <Field label="Organization" htmlFor={id("org")}>
            <Input id={id("org")} value={d.orgName} maxLength={LIMITS.ORG} placeholder="Friends of Golden Gardens" onChange={(e) => set("orgName", e.target.value)} />
          </Field>
          <Field label="Email" htmlFor={id("email")}>
            <Input id={id("email")} type="email" value={d.orgEmail} maxLength={LIMITS.EMAIL} placeholder="volunteer@example.org" onChange={(e) => set("orgEmail", e.target.value)} />
          </Field>
          <Field label="Website" htmlFor={id("url")}>
            <Input id={id("url")} value={d.orgUrl} maxLength={LIMITS.URL} placeholder="https://example.org" onChange={(e) => set("orgUrl", e.target.value)} />
          </Field>
          <Field label="Phone" htmlFor={id("phone")}>
            <Input id={id("phone")} type="tel" value={d.orgPhone} maxLength={LIMITS.PHONE} placeholder="(206) 555-0142" onChange={(e) => set("orgPhone", e.target.value)} />
          </Field>
          {isEvent && (
            <Field label="Sign-up link" htmlFor={id("signup")} className="col-span-2" hint="If volunteers register with the organizer.">
              <Input id={id("signup")} value={d.signupUrl} maxLength={LIMITS.URL} placeholder="https://example.org/volunteer" onChange={(e) => set("signupUrl", e.target.value)} />
            </Field>
          )}
          <Field label="Details" htmlFor={id("details")} className="col-span-2" hint={isEvent ? "What to bring, who it's for, anything else volunteers should know." : "Steps to follow, and why it matters."}>
            <Textarea id={id("details")} value={d.details} maxLength={LIMITS.DETAILS} rows={5} onChange={(e) => set("details", e.target.value)} />
          </Field>
        </div>
        {error && (
          <p className="mt-4 rounded-lg bg-coral-soft px-3.5 py-2.5 text-base font-medium text-coral" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={d.title.trim().length < 3 || d.summary.trim().length < 10}>
            {editing ? "Save changes" : community && !trusted ? "Send for review" : "Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
