// Admin review for Ecoisland staff: suggested community events, ambassador
// applications, and live community listings. Admins are added by creating
// admins/{uid} in the Firebase console.
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Check, ExternalLink, Inbox, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Page } from "@/components/app/Guards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { listingHref, useIsAdmin, whenLabel } from "@/lib/act";
import { api, errorMessage } from "@/lib/api";
import { db } from "@/lib/firebase";
import { useDocumentTitle } from "@/lib/hooks";
import { useProfile } from "@/lib/session";
import { useToast } from "@/lib/toast";
import { CATEGORIES, type AmbassadorApplication, type EcoEvent } from "@/shared/act";

type Tab = "suggestions" | "ambassadors" | "live";

function useLive<T>(make: () => ReturnType<typeof query>, key: string) {
  const [items, setItems] = useState<T[] | null>(null);
  useEffect(() => {
    setItems(null);
    return onSnapshot(
      make(),
      (snap) => setItems(snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }))),
      () => setItems([]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return items;
}

export default function Admin() {
  const profile = useProfile();
  useDocumentTitle("Admin");
  const admin = useIsAdmin(profile.id);
  const [tab, setTab] = useState<Tab>("suggestions");
  if (!admin) {
    return (
      <Page>
        <Card className="mx-auto max-w-[520px]">
          <EmptyState icon={Shield} title="Admins only" body="This page is for the Ecoisland team." action={<Button asChild><Link to="/today">Back to Today</Link></Button>} />
        </Card>
      </Page>
    );
  }
  return (
    <Page>
      <header className="mb-6">
        <p className="t-eyebrow">Admin</p>
        <h1 className="t-h1 mt-2.5">Review queue</h1>
      </header>
      <Segmented<Tab>
        label="Admin sections"
        value={tab}
        onChange={setTab}
        className="mb-6"
        options={[
          { value: "suggestions", label: "Suggested events" },
          { value: "ambassadors", label: "Ambassador applications" },
          { value: "live", label: "Live community listings" },
        ]}
      />
      {tab === "suggestions" && <Suggestions />}
      {tab === "ambassadors" && <Applications />}
      {tab === "live" && <LiveListings />}
    </Page>
  );
}

function ReviewButtons({ onReview }: { onReview: (approve: boolean, note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<boolean | null>(null);
  const run = async (approve: boolean) => {
    setBusy(approve);
    await onReview(approve, note);
    setBusy(null);
  };
  return (
    <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
      <Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Note to the person (optional)" className="h-9" aria-label="Review note" />
      <Button size="sm" variant="danger-soft" loading={busy === false} disabled={busy !== null} onClick={() => run(false)}>
        <X /> Decline
      </Button>
      <Button size="sm" loading={busy === true} disabled={busy !== null} onClick={() => run(true)}>
        <Check /> Approve
      </Button>
    </div>
  );
}

function Suggestions() {
  const toast = useToast();
  const items = useLive<EcoEvent>(() => query(collection(db, "events"), where("status", "==", "pending")), "pending");
  if (!items) return <Skeleton className="h-48 rounded-xl" />;
  if (items.length === 0) return <Card><EmptyState icon={Inbox} title="No suggestions waiting" body="Community events suggested by students and teachers show up here." /></Card>;
  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((e) => (
        <Card key={e.id} className="p-6">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={e.kind === "action" ? "sun" : "ocean"}>{e.kind === "action" ? "Eco action" : "Event"}</Badge>
            <Badge tone="outline">{CATEGORIES[e.category]}</Badge>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-fg">{e.title}</h2>
          <p className="mt-1 text-base text-fg-3">{e.summary}</p>
          <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-fg-3">When</dt>
            <dd className="text-fg-2">{whenLabel({ ...e, id: e.id })}</dd>
            {e.location && (
              <>
                <dt className="text-fg-3">Where</dt>
                <dd className="text-fg-2">
                  {e.location}
                  {e.region ? ` · ${e.region}` : ""}
                </dd>
              </>
            )}
            <dt className="text-fg-3">Organizer</dt>
            <dd className="text-fg-2">{[e.org_name, e.org_email, e.org_phone].filter(Boolean).join(" · ") || "Not given"}</dd>
            {e.org_url && (
              <>
                <dt className="text-fg-3">Website</dt>
                <dd className="truncate text-fg-2">
                  <a href={e.org_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-ink hover:underline">
                    {e.org_url} <ExternalLink className="size-3" />
                  </a>
                </dd>
              </>
            )}
            <dt className="text-fg-3">Suggested by</dt>
            <dd className="text-fg-2">{e.created_by_name}</dd>
          </dl>
          {e.details && <p className="mt-3 line-clamp-4 text-sm whitespace-pre-wrap text-fg-3">{e.details}</p>}
          <ReviewButtons
            onReview={async (approve, note) => {
              try {
                await api("event/review", { id: e.id, approve, note });
                toast.show({ tone: approve ? "success" : "info", title: approve ? "Published" : "Declined" });
              } catch (err) {
                toast.show({ tone: "error", title: "That didn't work", body: errorMessage(err) });
              }
            }}
          />
        </Card>
      ))}
    </div>
  );
}

function Applications() {
  const toast = useToast();
  const items = useLive<AmbassadorApplication>(() => query(collection(db, "ambassador_applications"), where("status", "==", "pending")), "apps");
  if (!items) return <Skeleton className="h-48 rounded-xl" />;
  if (items.length === 0) return <Card><EmptyState icon={Inbox} title="No applications waiting" body="New ambassador applications show up here." /></Card>;
  return (
    <div className="space-y-4">
      {items.map((a) => (
        <Card key={a.uid} className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">
                {a.full_name} <span className="font-normal text-fg-3">@{a.username}</span>
              </h2>
              <p className="mt-0.5 text-sm text-fg-3">
                {a.school} · {a.grade} · {a.region} · {a.email}
              </p>
            </div>
            <span className="text-sm text-fg-3">{new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          </div>
          <p className="mt-4 text-sm font-semibold text-fg-3">Why</p>
          <p className="mt-1 text-base leading-relaxed whitespace-pre-wrap text-fg-2">{a.why}</p>
          {a.idea && (
            <>
              <p className="mt-3 text-sm font-semibold text-fg-3">Event idea</p>
              <p className="mt-1 text-base leading-relaxed whitespace-pre-wrap text-fg-2">{a.idea}</p>
            </>
          )}
          {a.sponsor && <p className="mt-3 text-sm text-fg-3">Sponsor: {a.sponsor}</p>}
          <ReviewButtons
            onReview={async (approve, note) => {
              try {
                await api("ambassador/review", { uid: a.uid, approve, note });
                toast.show({ tone: approve ? "success" : "info", title: approve ? `${a.full_name} is an ambassador` : "Application declined" });
              } catch (err) {
                toast.show({ tone: "error", title: "That didn't work", body: errorMessage(err) });
              }
            }}
          />
        </Card>
      ))}
    </div>
  );
}

function LiveListings() {
  const items = useLive<EcoEvent>(() => query(collection(db, "events"), where("status", "==", "published")), "live");
  if (!items) return <Skeleton className="h-48 rounded-xl" />;
  if (items.length === 0) return <Card><EmptyState icon={Inbox} title="No live community listings" body="Published community events and eco actions show up here." /></Card>;
  return (
    <Card className="divide-y divide-line">
      {items.map((e) => (
        <Link key={e.id} to={listingHref({ scope: "community", id: e.id })} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-2/50">
          <div className="min-w-0 flex-1">
            <p className="truncate text-md font-semibold text-fg">{e.title}</p>
            <p className="text-sm text-fg-3">
              {whenLabel({ ...e, id: e.id })} · {e.created_by_name}
            </p>
          </div>
          <Badge tone="outline">{e.kind === "action" ? "Eco action" : `${e.going_count ?? 0} going`}</Badge>
        </Link>
      ))}
    </Card>
  );
}
