// Ecoisland Ambassadors: students and educators who organize real events in
// their area. Approved ambassadors can post community events directly.
import { ArrowLeft, Award, BadgeCheck, CalendarPlus, Clock, FileText, HandHeart, Megaphone, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { EventForm } from "@/components/act/EventForm";
import { Page } from "@/components/app/Guards";
import { Treecoin } from "@/components/app/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/empty";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { track } from "@/lib/analytics";
import { useAmbassadorApplication } from "@/lib/act";
import { api, errorMessage } from "@/lib/api";
import { useDocumentTitle } from "@/lib/hooks";
import { useProfile } from "@/lib/session";
import { useToast } from "@/lib/toast";
import { ACT_REWARD, GRADES, LIMITS } from "@/shared/act";

const BENEFITS = [
  { icon: HandHeart, title: "Earn volunteer hours", body: "Organizing and running events counts toward your service hours." },
  { icon: FileText, title: "Letters of recommendation", body: "Active ambassadors can ask the Ecoisland team for a personal letter." },
  { icon: Megaphone, title: "Post community events", body: "Your cleanups and plantings go live for everyone on Ecoisland right away." },
  { icon: Award, title: "Stand out", body: "An ambassador badge on your class leaderboard, and real leadership to put on applications." },
];

const GRADE_LABEL: Record<string, string> = { "9": "9th grade", "10": "10th grade", "11": "11th grade", "12": "12th grade", college: "College", educator: "Teacher or educator", other: "Other" };

export default function Ambassador() {
  const profile = useProfile();
  useDocumentTitle("Ambassadors");
  const { application, loading } = useAmbassadorApplication(profile.id);
  const [posting, setPosting] = useState(false);
  const [reapply, setReapply] = useState(false);

  return (
    <Page className="mx-auto max-w-[1040px]">
      <Link to="/act" className="mb-5 inline-flex items-center gap-1.5 text-base font-medium text-fg-3 hover:text-fg">
        <ArrowLeft className="size-4" /> Act
      </Link>
      <div className="grid grid-cols-[minmax(0,1fr)_420px] gap-8">
        <div>
          <p className="t-eyebrow">Ecoisland Ambassadors</p>
          <h1 className="t-display mt-3 max-w-[16ch]">Lead the work in your community</h1>
          <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-fg-3">
            Ambassadors organize cleanups, plantings and other real projects where they live, and bring their schools along. Ecoisland gives you the tools to post events, find volunteers and track their hours.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-lg border border-line bg-surface p-5">
                <span className="grid size-9 place-items-center rounded-md bg-brand-soft text-brand-ink" aria-hidden>
                  <b.icon className="size-[18px]" />
                </span>
                <p className="mt-3 text-md font-semibold text-fg">{b.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-fg-3">{b.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 flex items-center gap-2 text-base text-fg-3">
            <Treecoin size={16} /> Approved ambassadors also get {ACT_REWARD.AMBASSADOR_TC} Treecoins for their island.
          </p>
        </div>

        <div className="self-start">
          {loading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : profile.ambassador ? (
            <Card className="p-7">
              <Badge tone="brand">
                <BadgeCheck /> Ambassador
              </Badge>
              <h2 className="t-h2 mt-4">You're an Ecoisland Ambassador</h2>
              <p className="mt-2 text-base text-fg-3">
                {profile.ambassador_region ? `For ${profile.ambassador_region}. ` : ""}Community events you post go live right away. Keep them accurate, and cancel anything that changes.
              </p>
              <Button className="mt-6 w-full" size="lg" onClick={() => setPosting(true)}>
                <CalendarPlus /> Post a community event
              </Button>
              <Button variant="secondary" className="mt-2.5 w-full" asChild>
                <Link to="/act">See what's happening</Link>
              </Button>
            </Card>
          ) : application && !reapply ? (
            <Card className="p-7">
              {application.status === "pending" ? (
                <>
                  <Badge tone="sun">
                    <Clock /> In review
                  </Badge>
                  <h2 className="t-h2 mt-4">Thanks for applying</h2>
                  <p className="mt-2 text-base text-fg-3">
                    We read every application. You'll see the decision here, usually within a week. We may email you at {application.email || "your account email"}.
                  </p>
                </>
              ) : application.status === "declined" ? (
                <>
                  <Badge tone="coral">Not this time</Badge>
                  <h2 className="t-h2 mt-4">Your application wasn't approved</h2>
                  {application.review_note && <p className="mt-2 text-base text-fg-2">{application.review_note}</p>}
                  <p className="mt-2 text-base text-fg-3">You're welcome to apply again with more detail about what you'd organize.</p>
                  <Button className="mt-6" onClick={() => setReapply(true)}>
                    Apply again
                  </Button>
                </>
              ) : (
                <p className="text-base text-fg-3">Your application was approved. Refresh the page to see your ambassador tools.</p>
              )}
            </Card>
          ) : (
            <ApplicationForm onDone={() => setReapply(false)} defaultName={profile.full_name ?? ""} teacher={profile.role === "teacher"} />
          )}
        </div>
      </div>
      {posting && <EventForm open onOpenChange={setPosting} classes={[]} trusted />}
    </Page>
  );
}

function ApplicationForm({ onDone, defaultName, teacher }: { onDone: () => void; defaultName: string; teacher: boolean }) {
  const toast = useToast();
  const [fullName, setFullName] = useState(defaultName);
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState(teacher ? "educator" : "");
  const [region, setRegion] = useState("");
  const [why, setWhy] = useState("");
  const [idea, setIdea] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = fullName.trim().length >= 2 && school.trim().length >= 2 && grade && region.trim().length >= 2 && why.trim().length >= LIMITS.AMBASSADOR_WHY_MIN && agree;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("ambassador/apply", { fullName, school, grade, region, why, idea, sponsor, agree });
      track("ambassador_applied");
      toast.show({ tone: "success", title: "Application sent", body: "We'll review it and let you know here." });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-7">
      <h2 className="t-h2">Apply</h2>
      <p className="mt-1.5 text-base text-fg-3">Takes about five minutes. Tell us what you'd like to organize.</p>
      <div className="mt-5 space-y-4">
        <Field label="Full name" htmlFor="am-name">
          <Input id="am-name" value={fullName} maxLength={80} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="School" htmlFor="am-school">
            <Input id="am-school" value={school} maxLength={100} onChange={(e) => setSchool(e.target.value)} />
          </Field>
          <Field label="Grade" htmlFor="am-grade">
            <Select id="am-grade" value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="" disabled>
                Choose
              </option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {GRADE_LABEL[g]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="City or region" htmlFor="am-region" hint="Where you'd organize events.">
          <Input id="am-region" value={region} maxLength={LIMITS.REGION} placeholder="Austin, TX" onChange={(e) => setRegion(e.target.value)} />
        </Field>
        <Field label="Why do you want to be an ambassador?" htmlFor="am-why" hint={why.trim().length < LIMITS.AMBASSADOR_WHY_MIN ? `${LIMITS.AMBASSADOR_WHY_MIN - why.trim().length} more characters` : undefined}>
          <Textarea id="am-why" value={why} maxLength={LIMITS.AMBASSADOR_WHY_MAX} rows={4} onChange={(e) => setWhy(e.target.value)} />
        </Field>
        <Field label="An event you'd organize" htmlFor="am-idea" hint="Optional">
          <Textarea id="am-idea" value={idea} maxLength={LIMITS.AMBASSADOR_IDEA_MAX} rows={3} placeholder="A monthly litter sweep along our creek with the Environmental Club." onChange={(e) => setIdea(e.target.value)} />
        </Field>
        <Field label="Teacher or adult sponsor" htmlFor="am-sponsor" hint="Optional, but it helps.">
          <Input id="am-sponsor" value={sponsor} maxLength={80} placeholder="Ms. Rivera, APES" onChange={(e) => setSponsor(e.target.value)} />
        </Field>
        <label className="flex items-start gap-3 text-base text-fg-2">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" />
          <span>I'll keep listings accurate and safe, follow the <a href="/tos" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-ink underline-offset-2 hover:underline">Terms</a>, and get a parent or guardian's OK for events if I'm under 18.</span>
        </label>
      </div>
      {error && (
        <p className="mt-4 rounded-lg bg-coral-soft px-3.5 py-2.5 text-base font-medium text-coral" role="alert">
          {error}
        </p>
      )}
      <Button className="mt-6 w-full" size="lg" onClick={submit} loading={busy} disabled={!ready}>
        <Sparkles /> Send application
      </Button>
    </Card>
  );
}
