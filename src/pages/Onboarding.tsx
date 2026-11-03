// Sign in, then four short steps: who you are, your username, your class,
// and you're in. Built on the React Bits Stepper.
import { ArrowRight, Check, Copy, GraduationCap, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Stepper, { Step } from "@/components/bits/Stepper";
import { FullPageLoader } from "@/components/app/Guards";
import { Logo } from "@/components/app/Logo";
import { IslandScene } from "@/components/island/IslandScene";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { track } from "@/lib/analytics";
import { api, errorMessage } from "@/lib/api";
import { useDocumentTitle } from "@/lib/hooks";
import { setUsername, updateProfile, usernameProblem, usernameTaken } from "@/lib/profile";
import { isOnboarded, useSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { UNITS } from "@/shared/curriculum";
import type { Role } from "@/shared/types";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.8Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.3v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28V6.61H1.3A12 12 0 0 0 0 12c0 1.94.46 3.77 1.3 5.39l3.99-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.3 6.61l3.99 3.11C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  );
}

function suggestUsername(name: string | null | undefined): string {
  const s = (name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, 20);
  return s.length >= 3 ? s : "";
}

export default function Onboarding() {
  const { status, profile, authUser, signIn } = useSession();
  const [params] = useSearchParams();
  const next = params.get("next");
  const toast = useToast();
  const [signingIn, setSigningIn] = useState(false);
  // Where to go once setup finishes. Set before the final write so that the
  // redirect below and Setup's own navigation always agree.
  const [finishTarget, setFinishTarget] = useState<string | null>(null);
  useDocumentTitle("Get started");

  if (status === "loading" || (status === "ready" && !profile)) return <FullPageLoader />;
  if (status === "ready" && isOnboarded(profile)) return <Navigate to={finishTarget ?? (next && next.startsWith("/") ? next : "/today")} replace />;

  if (status === "signed_out" || !authUser) {
    return (
      <div className="grid min-h-dvh grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] bg-bg">
        <div className="flex flex-col justify-between px-16 py-12">
          <Link to="/" aria-label="Ecoisland home">
            <Logo />
          </Link>
          <div className="max-w-[440px]">
            <p className="t-eyebrow">Welcome</p>
            <h1 className="t-display mt-4 text-[48px]">Study a little every day. Watch your island grow.</h1>
            <p className="mt-4 text-[16px] text-fg-3">Sign in with your school or personal Google account. It takes about a minute to set up.</p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-8"
              loading={signingIn}
              onClick={async () => {
                setSigningIn(true);
                try {
                  await signIn();
                } catch (err) {
                  toast.show({ tone: "error", title: "Sign-in didn't finish", body: errorMessage(err) });
                } finally {
                  setSigningIn(false);
                }
              }}
            >
              {!signingIn && <GoogleIcon />} Continue with Google
            </Button>
            <p className="mt-5 text-[12.5px] text-fg-4">
              By continuing you agree to the{" "}
              <Link to="/tos" className="underline underline-offset-2 hover:text-fg-2">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-fg-2">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          <p className="text-[12.5px] text-fg-4">Made for AP Environmental Science students and teachers.</p>
        </div>
        <div className="relative m-4 overflow-hidden rounded-2xl border border-line">
          <IslandScene xp={900} health={1} sky="sunset" landmarks={[1, 4, 6]} decor={[{ id: "lighthouse", x: 0.74, y: 0.68 }, { id: "sailboat", x: 0.22, y: 0.85 }]} seed="welcome" className="absolute inset-0 [&>svg]:h-full [&>svg]:w-full" />
        </div>
      </div>
    );
  }

  if (status === "error" || !profile) return <FullPageLoader />;
  return <Setup next={next} onFinish={setFinishTarget} />;
}

function Setup({ next, onFinish }: { next: string | null; onFinish: (target: string) => void }) {
  const { profile } = useSession();
  const p = profile!;
  const navigate = useNavigate();
  const toast = useToast();
  const { resolved } = useTheme();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | null>(p.role ?? null);
  const [username, setName] = useState(p.username && !usernameProblem(p.username) ? p.username : suggestUsername(p.full_name));
  const [nameProblem, setNameProblem] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [joined, setJoined] = useState<{ classId: string; name: string } | null>(null);
  const [className, setClassName] = useState("");
  const [created, setCreated] = useState<{ classId: string; code: string } | null>(null);
  const [focus, setFocus] = useState<number>(p.focus_unit ?? 1);
  const [copied, setCopied] = useState(false);

  // Live username availability.
  useEffect(() => {
    if (step !== 2) return;
    const problem = usernameProblem(username);
    if (problem) {
      setNameProblem(username ? problem : null);
      return;
    }
    if (username.trim().toLowerCase() === p.username_lower) {
      setNameProblem(null);
      return;
    }
    setChecking(true);
    const t = window.setTimeout(async () => {
      try {
        setNameProblem((await usernameTaken(username, p.id)) ? "That username is taken. Try another." : null);
      } catch {
        setNameProblem(null);
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [username, step, p.id, p.username_lower]);

  const canContinue =
    step === 1 ? !!role : step === 2 ? !usernameProblem(username) && !nameProblem && !checking : true;

  const advance = async () => {
    setBusy(true);
    try {
      if (step === 1 && role) {
        await updateProfile(p.id, { role });
        setStep(2);
      } else if (step === 2) {
        await setUsername(p.id, p, username);
        setStep(3);
      } else if (step === 3) {
        if (role === "student" && !joined) await updateProfile(p.id, { focus_unit: focus });
        setStep(4);
      } else if (step === 4) {
        const target = next && next.startsWith("/") ? next : role === "teacher" ? (created ? `/class/${created.classId}` : "/today") : "/practice?mode=daily";
        onFinish(target);
        await updateProfile(p.id, { onboarding_complete: true });
        track("onboarding_complete", { role: role ?? "student", joined: !!joined, created: !!created });
        navigate(target, { replace: true });
        return;
      }
    } catch (err) {
      toast.show({ tone: "error", title: "Something didn't save", body: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    try {
      const res = await api<{ classId: string; name: string }>("class/join", { code });
      track("class_joined", { from: "onboarding" });
      setJoined({ classId: res.classId, name: res.name });
    } catch (err) {
      toast.show({ tone: "error", title: "Couldn't join", body: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    try {
      const res = await api<{ classId: string; code: string }>("class/create", { name: className });
      track("class_created", { from: "onboarding" });
      setCreated(res);
    } catch (err) {
      toast.show({ tone: "error", title: "Couldn't create the class", body: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const stepperStyle = useMemo(
    () =>
      ({
        "--stepper-frame": "var(--surface)",
        "--stepper-frame-edge": "var(--line)",
        "--stepper-frame-highlight": "transparent",
        "--stepper-frame-shadow": "var(--shadow-lg)",
        "--stepper-tile": "var(--surface)",
        "--stepper-tile-edge": "var(--line-strong)",
        "--stepper-tile-highlight": "transparent",
        "--stepper-tile-shadow": "var(--shadow-sm)",
        "--stepper-well": "var(--surface-2)",
        "--stepper-track": "var(--surface-3)",
        "--stepper-ink": "var(--fg)",
        "--stepper-muted": "var(--fg-3)",
        "--stepper-faint": "var(--line-strong)",
        "--stepper-solid": "var(--brand)",
        "--stepper-solid-ink": "var(--brand-fg)",
      }) as CSSProperties,
    [],
  );

  const completeText = role === "teacher" ? (created ? "Go to my class" : "Go to Ecoisland") : "Start my first daily set";

  return (
    <div className="flex min-h-dvh flex-col items-center bg-bg px-6 py-10">
      <Logo className="mb-10" />
      <Stepper
        step={step}
        onStepChange={setStep}
        disableStepIndicators
        theme={resolved}
        width={620}
        radius={26}
        style={stepperStyle}
        nextButtonText={busy ? "Saving…" : "Continue"}
        completeButtonText={busy ? "Saving…" : completeText}
        backButtonText="Back"
        nextButtonProps={{
          disabled: !canContinue || busy,
          onClick: (e) => {
            e.preventDefault();
            void advance();
          },
        }}
      >
        <Step title="You">
          <div className="pt-2 pb-4">
            <h1 className="t-h2">Are you a student or a teacher?</h1>
            <p className="mt-1.5 text-[14.5px] text-fg-3">You can change this later in Settings.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {(
                [
                  { r: "student", icon: UserRound, title: "Student", body: "Daily practice, your own island, and your class's assignments." },
                  { r: "teacher", icon: GraduationCap, title: "Teacher", body: "Create classes, assign work with due dates, and see who's on track." },
                ] as const
              ).map((o) => (
                <button
                  key={o.r}
                  onClick={() => setRole(o.r)}
                  aria-pressed={role === o.r}
                  className={cn("rounded-[16px] border p-5 text-left transition-[border-color,background-color]", role === o.r ? "border-brand bg-brand-soft" : "border-line-strong hover:bg-surface-2")}
                >
                  <o.icon className={cn("size-6", role === o.r ? "text-brand-ink" : "text-fg-3")} />
                  <p className="mt-4 text-[16px] font-semibold text-fg">{o.title}</p>
                  <p className="mt-1 text-[13.5px] text-fg-3">{o.body}</p>
                </button>
              ))}
            </div>
          </div>
        </Step>

        <Step title="Profile">
          <div className="pt-2 pb-4">
            <h1 className="t-h2">Pick a username</h1>
            <p className="mt-1.5 text-[14.5px] text-fg-3">{role === "teacher" ? "Students see this on their class page." : "Your teacher and classmates see this, never your email."}</p>
            <div className="mt-6 flex items-start gap-4">
              <Avatar name={username || p.full_name || "You"} src={p.avatar_url} size={52} />
              <Field label="Username" htmlFor="ob-username" error={nameProblem} hint={!nameProblem && username && !checking ? "Looks good." : "3–20 letters, numbers, periods, dashes or underscores."} className="flex-1">
                <Input
                  id="ob-username"
                  autoFocus
                  value={username}
                  maxLength={20}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canContinue && !busy) void advance();
                  }}
                  aria-invalid={!!nameProblem}
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
            </div>
          </div>
        </Step>

        <Step title="Class">
          <div className="pt-2 pb-4">
            {role === "teacher" ? (
              created ? (
                <>
                  <h1 className="t-h2">Your class is ready</h1>
                  <p className="mt-1.5 text-[14.5px] text-fg-3">Students sign in and enter this code. You can create more classes later.</p>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(created.code);
                        setCopied(true);
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="mt-6 flex w-full items-center justify-between rounded-[16px] border border-line-strong px-6 py-5 hover:bg-surface-2"
                  >
                    <span className="font-mono text-[34px] font-bold tracking-[0.25em] text-fg">{created.code}</span>
                    <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-fg-3">{copied ? <Check className="size-4 text-brand" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}</span>
                  </button>
                </>
              ) : (
                <>
                  <h1 className="t-h2">Create your first class</h1>
                  <p className="mt-1.5 text-[14.5px] text-fg-3">One class per period keeps rosters and leaderboards separate. You can skip this and do it later.</p>
                  <form
                    className="mt-6 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (className.trim().length >= 2) void create();
                    }}
                  >
                    <Input value={className} maxLength={60} onChange={(e) => setClassName(e.target.value)} placeholder="APES · Period 3" aria-label="Class name" autoFocus />
                    <Button type="submit" variant="secondary" loading={busy} disabled={className.trim().length < 2}>
                      Create
                    </Button>
                  </form>
                </>
              )
            ) : joined ? (
              <>
                <h1 className="t-h2 flex items-center gap-2.5">
                  <Check className="size-6 text-brand" strokeWidth={3} /> You're in {joined.name}
                </h1>
                <p className="mt-1.5 text-[14.5px] text-fg-3">Assignments from your teacher will show up on your Today page, and your daily sets follow the unit your class is on.</p>
              </>
            ) : (
              <>
                <h1 className="t-h2">Join your class</h1>
                <p className="mt-1.5 text-[14.5px] text-fg-3">Got a code from your teacher? Enter it here. No code yet? Skip this; you can join later from the Class tab.</p>
                <form
                  className="mt-6 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (code.length === 6) void join();
                  }}
                >
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                    placeholder="K7Q2MX"
                    aria-label="Class code"
                    className="w-[200px] font-mono text-[17px] tracking-[0.22em]"
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus
                  />
                  <Button type="submit" variant="secondary" loading={busy} disabled={code.length !== 6}>
                    Join
                  </Button>
                </form>
                <Field label="Which unit are you studying?" htmlFor="ob-unit" hint="Your daily sets start here." className="mt-6">
                  <Select id="ob-unit" value={focus} onChange={(e) => setFocus(Number(e.target.value))}>
                    {UNITS.map((u) => (
                      <option key={u.n} value={u.n}>
                        Unit {u.n}: {u.title}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )}
          </div>
        </Step>

        <Step title="Done">
          <div className="pt-2 pb-4">
            {role === "teacher" ? (
              <>
                <h1 className="t-h2">You're all set</h1>
                <p className="mt-1.5 text-[14.5px] text-fg-3">
                  {created ? `Share ${created.code} with your students, then post your first assignment.` : "Create a class whenever you're ready from the Classes tab."}
                </p>
                <ul className="mt-5 space-y-2.5 text-[14px] text-fg-2">
                  {["Assign lessons, quizzes, FRQs, daily sets or field quests with due dates", "Completion updates live as students do the work", "Set the class's current unit and test date to focus everyone's practice"].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <ArrowRight className="mt-0.5 size-4 shrink-0 text-brand" /> {t}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h1 className="t-h2">Meet your island</h1>
                <p className="mt-1.5 text-[14.5px] text-fg-3">It starts as bare rock. Every daily set grows it, and missed days dry it out. Your first set takes about five minutes.</p>
                <div className="mt-5 overflow-hidden rounded-[16px] border border-line">
                  <IslandScene xp={p.xp_total ?? 0} health={1} sky="day" seed={p.id} className="aspect-[5/2.4] [&>svg]:h-full" />
                </div>
              </>
            )}
          </div>
        </Step>
      </Stepper>
    </div>
  );
}
