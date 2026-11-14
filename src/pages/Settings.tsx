import { deleteUser } from "firebase/auth";
import { Award, Check, Copy, GraduationCap, LogOut, Mail, Sprout, Trash2, Upload, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Page } from "@/components/app/Guards";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { api, errorMessage, serverHealth } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { useDocumentTitle } from "@/lib/hooks";
import { setUsername, updateProfile, uploadAvatar, usernameProblem, usernameTaken } from "@/lib/profile";
import { useProfile, useSession } from "@/lib/session";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Role } from "@/shared/types";


// The tile inside a section (an account type, an invitation, the delete zone): one shape, tinted or bordered per use.
const INNER = "rounded-md border p-5";

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-24 p-6">
      <h2 className="t-h3">{title}</h2>
      {description && <p className="mt-1 text-base text-fg-3">{description}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

const NAV = [
  { id: "profile", label: "Profile" },
  { id: "account-type", label: "Account type" },
  { id: "grow", label: "Grow Ecoisland" },
  { id: "account", label: "Account" },
];

export default function Settings() {
  const profile = useProfile();
  useDocumentTitle("Settings");
  return (
    <Page>
      <header className="page-hero">
        <div className="max-w-1/2">
          <p className="t-eyebrow text-fg-2">Settings</p>
          <h1 className="t-hero mt-2.5">Your account</h1>
        </div>
      </header>
      <div className="tray grid grid-cols-[12.5rem_minmax(0,1fr)] items-start gap-3">
        <nav className="card sticky top-24 self-start p-2" aria-label="Settings sections">
          <ul className="space-y-0.5">
            {NAV.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} className="block rounded-md px-3 py-2 text-base font-medium text-fg-3 hover:bg-surface-2 hover:text-fg">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-3">
          <ProfileSection key={profile.username_lower ?? "p"} />
          <RoleSection />
          <RemindersSection />
          <GrowSection />
          <AccountSection />
        </div>
      </div>
    </Page>
  );
}

function ProfileSection() {
  const profile = useProfile();
  const toast = useToast();
  const [name, setName] = useState(profile.username ?? "");
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const changed = name.trim() !== (profile.username ?? "");

  useEffect(() => {
    if (!changed) {
      setProblem(null);
      return;
    }
    const p = usernameProblem(name);
    if (p) {
      setProblem(p);
      return;
    }
    setChecking(true);
    const t = window.setTimeout(async () => {
      try {
        setProblem((await usernameTaken(name, profile.id)) ? "That username is taken." : null);
      } catch {
        setProblem(null);
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [name, changed, profile.id]);

  const save = async () => {
    setSaving(true);
    try {
      await setUsername(profile.id, profile, name);
      toast.show({ tone: "success", title: "Username updated" });
    } catch (err) {
      toast.show({ tone: "error", title: "Couldn't save", body: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(profile.id, file);
      await updateProfile(profile.id, { avatar_url: url });
      toast.show({ tone: "success", title: "Profile picture updated" });
    } catch (err) {
      toast.show({ tone: "error", title: "Upload failed", body: errorMessage(err) });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Section id="profile" title="Profile" description="This is how your teacher and classmates see you.">
      <div className="flex items-center gap-5">
        <Avatar name={profile.username || profile.full_name || "You"} src={profile.avatar_url} size={64} />
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
            <Upload /> Upload photo
          </Button>
          {profile.avatar_url && (
            <Button variant="ghost" size="sm" onClick={() => void updateProfile(profile.id, { avatar_url: "" })}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <div className="mt-6 flex items-end gap-3">
        <Field label="Username" htmlFor="set-username" error={problem} hint={!problem && changed && !checking ? "Available" : "3–20 letters, numbers, periods, dashes or underscores."} className="flex-1">
          <Input id="set-username" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} aria-invalid={!!problem} autoComplete="off" />
        </Field>
        <Button onClick={save} loading={saving} disabled={!changed || !!problem || checking} className="mb-6.5 disabled:bg-surface-2 disabled:text-fg-3 disabled:opacity-100">
          Save
        </Button>
      </div>
      <p className="mt-2 text-sm text-fg-3">Signed in as {profile.email || auth.currentUser?.email}. Your email is never shown to other students.</p>
    </Section>
  );
}

function RoleSection() {
  const profile = useProfile();
  const toast = useToast();
  const role: Role = profile.role ?? "student";
  const blocked = role === "teacher" && (profile.teaching_ids?.length ?? 0) > 0;
  const change = async (r: Role) => {
    if (r === role) return;
    try {
      await updateProfile(profile.id, { role: r });
      toast.show({ tone: "success", title: r === "teacher" ? "Teacher tools are on" : "Switched to a student account" });
    } catch (err) {
      toast.show({ tone: "error", title: "Couldn't switch", body: errorMessage(err) });
    }
  };
  return (
    <Section id="account-type" title="Account type" description="Teachers create classes and assign work. Students join classes and study.">
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { r: "student", icon: UserRound, title: "Student", body: "Daily sets, your island, class assignments." },
            { r: "teacher", icon: GraduationCap, title: "Teacher", body: "Create classes, assign work, see progress." },
          ] as const
        ).map((o) => (
          <button
            key={o.r}
            onClick={() => void change(o.r)}
            disabled={blocked && o.r === "student"}
            aria-pressed={role === o.r}
            className={cn(INNER, "flex items-start gap-3 text-left transition-colors disabled:bg-surface-2", role === o.r ? "border-brand bg-brand-soft" : "border-line-strong hover:bg-surface-2")}
          >
            <o.icon className={`mt-0.5 size-5 ${role === o.r ? "text-brand-ink" : "text-fg-3"}`} />
            <span>
              <span className="block text-md font-semibold text-fg">{o.title}</span>
              <span className="block text-sm text-fg-3">{o.body}</span>
            </span>
          </button>
        ))}
      </div>
      {blocked && <p className="mt-3 text-sm text-fg-3">Delete or hand over your classes before switching back to a student account.</p>}
    </Section>
  );
}

function RemindersSection() {
  const profile = useProfile();
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    void serverHealth().then((h) => setAvailable(!!h?.reminders));
  }, []);
  if (!available) return null;
  return (
    <Section id="reminders" title="Reminders" description="An optional email when your streak is about to end. At most one a day.">
      <label className="flex items-center justify-between gap-6">
        <span>
          <span className="block text-md font-medium text-fg">Email me if my island is about to wilt</span>
          <span className="block text-sm text-fg-3">Sent to {profile.email || "your Google email"}. Turn it off any time.</span>
        </span>
        <Switch checked={!!profile.email_reminders} onChange={(v) => void updateProfile(profile.id, { email_reminders: v })} label="Email reminders" />
      </label>
    </Section>
  );
}

function GrowSection() {
  const profile = useProfile();
  const [copied, setCopied] = useState<"link" | "note" | null>(null);
  const link = window.location.origin;
  const teacherNote = `Hi! I've been using Ecoisland (${link}) to study for APES. It's free: you create a class, students join with a code, and you can assign lessons, quizzes and FRQs with due dates and see who's done them. Would you try it with our class?`;
  const copy = async (what: "link" | "note") => {
    try {
      await navigator.clipboard.writeText(what === "link" ? link : teacherNote);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* ignore */
    }
  };
  const teacher = profile.role === "teacher";
  return (
    <Section
      id="grow"
      title="Grow Ecoisland"
      description={teacher ? "Know another APES teacher? Ecoisland is free for every class." : "Ecoisland works best when your whole class is on it. Bring your teacher and classmates."}
    >
      <div className={cn(INNER, "flex items-start gap-4 border-line bg-brand-soft/60")}>
        <Sprout className="mt-0.5 size-5 shrink-0 text-brand-ink" />
        <div className="min-w-0 flex-1">
          <p className="text-md font-semibold text-fg">{teacher ? "Share with a colleague" : "Invite your APES teacher"}</p>
          <p className="mt-1 text-base text-fg-2">
            {teacher ? "Send them the link. They can set up a class in under a minute." : "Teachers can create a class in under a minute. Send yours a note."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!teacher && (
              <Button size="sm" asChild>
                <a href={`mailto:?subject=${encodeURIComponent("Ecoisland for our APES class?")}&body=${encodeURIComponent(teacherNote)}`}>
                  <Mail /> Email your teacher
                </a>
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => void copy(teacher ? "link" : "note")}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : teacher ? "Copy link" : "Copy the note"}
            </Button>
          </div>
        </div>
      </div>
      <div className={cn(INNER, "mt-3 flex items-start gap-4 border-line")}>
        <Award className="mt-0.5 size-5 shrink-0 text-sun" />
        <div className="min-w-0 flex-1">
          <p className="text-md font-semibold text-fg">{profile.ambassador ? "You're an Ecoisland Ambassador" : "Become an Ecoisland Ambassador"}</p>
          <p className="mt-1 text-base text-fg-2">
            {profile.ambassador ? "Post community events for your area from Act." : "Organize real events in your area, post them for everyone, and earn volunteer hours."}
          </p>
          <Button size="sm" variant="secondary" className="mt-4" asChild>
            <Link to="/ambassador">{profile.ambassador ? "Ambassador hub" : "Learn more and apply"}</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}

function AccountSection() {
  const profile = useProfile();
  const { signOut } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const phrase = `delete ${profile.username || "my account"}`;

  const remove = async () => {
    setBusy(true);
    try {
      await api("account/delete");
      const user = auth.currentUser;
      if (user) {
        try {
          await deleteUser(user);
        } catch {
          // The Google sign-in itself needs a recent login to delete; the data is already gone.
          await signOut();
        }
      }
      navigate("/");
    } catch (err) {
      toast.show({ tone: "error", title: "Couldn't delete your account", body: errorMessage(err) });
      setBusy(false);
    }
  };

  return (
    <Section id="account" title="Account">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-md font-medium text-fg">Sign out</p>
          <p className="text-sm text-fg-3">Your progress is saved to your account.</p>
        </div>
        <Button
          variant="secondary"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
        >
          <LogOut /> Sign out
        </Button>
      </div>
      <div className={cn(INNER, "mt-6 border-coral/30")}>
        <p className="text-md font-semibold text-coral">Delete account</p>
        <p className="mt-1 text-base text-fg-3">
          Permanently deletes your profile, island, study history, class memberships, assignment records and field notes{profile.role === "teacher" ? ", and every class you teach" : ""}. This can't be undone.
        </p>
        <Field label={`Type "${phrase}" to confirm`} htmlFor="del-confirm" className="mt-4">
          <Input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        </Field>
        <Button variant="danger" className="mt-4 disabled:bg-surface-2 disabled:text-fg-3 disabled:opacity-100" disabled={confirm.trim().toLowerCase() !== phrase.toLowerCase()} loading={busy} onClick={remove}>
          <Trash2 /> Delete my account
        </Button>
      </div>
    </Section>
  );
}
