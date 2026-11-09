// The public home page: what Ecoisland is, shown with the real island.
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarCheck,
  Check,
  Clock,
  Flame,
  GraduationCap,
  HandHeart,
  ListChecks,
  MapPin,
  MessageCircle,
  PenLine,
  Recycle,
  Sparkles,
  BrushCleaning,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BlurText from "@/components/bits/BlurText";
import CountUp from "@/components/bits/CountUp";
import Magnet from "@/components/bits/Magnet";
import { TopographyBackdrop } from "@/components/fx/TopographyBackdrop";
import { Logo, Treecoin } from "@/components/app/Logo";
import { IslandScene } from "@/components/island/IslandScene";
import { LANDMARK_INFO } from "@/components/island/Landmarks";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { useDocumentTitle } from "@/lib/hooks";
import { isOnboarded, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { UNITS } from "@/shared/curriculum";
import { STAGES, stageForXp } from "@/shared/economy";
import type { SkyId } from "@/shared/catalog";

const SHOWCASE: { xp: number; caption: string; landmarks: number[]; sky: SkyId }[] = [
  { xp: 0, caption: "Day 1", landmarks: [], sky: "dawn" },
  { xp: 60, caption: "After 2 daily sets", landmarks: [], sky: "day" },
  { xp: 210, caption: "After a week", landmarks: [1], sky: "day" },
  { xp: 520, caption: "After three weeks", landmarks: [1, 2], sky: "sunset" },
  { xp: 950, caption: "After six weeks", landmarks: [1, 2, 3, 4], sky: "day" },
  { xp: 1650, caption: "By the exam", landmarks: [1, 2, 3, 4, 5, 6, 7, 8, 9], sky: "night" },
];

function useCycle(length: number, ms: number, start = 0) {
  const [i, setI] = useState(start);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % length), ms);
    return () => window.clearInterval(id);
  }, [length, ms]);
  return [i, setI] as const;
}

function Header() {
  const { status, profile } = useSession();
  const inApp = status === "ready" && isOnboarded(profile);
  return (
    <header className="glass sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-8">
        <Link to="/" aria-label="Ecoisland home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-base font-medium text-fg-3" aria-label="Sections">
          {[
            ["#how", "How it works"],
            ["#teachers", "For teachers"],
            ["#landmarks", "Landmarks"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-sm px-3 py-2 hover:bg-surface-2 hover:text-fg">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {inApp ? (
            <Button asChild>
              <Link to="/today">
                Open Ecoisland <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/start">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/start">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  // Open on a grown island, then loop through the year from day one.
  const [i, setI] = useCycle(SHOWCASE.length, 2600, 4);
  const s = SHOWCASE[i];
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="absolute inset-0" aria-hidden>
        <TopographyBackdrop />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_28%_42%,var(--bg)_12%,transparent_58%)]" />
      </div>
      <div className="relative mx-auto grid min-h-[calc(100dvh-64px)] max-w-[1200px] grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-center gap-14 px-8 py-16">
        <div>
          <p className="t-eyebrow">For AP Environmental Science</p>
          <h1 className="t-display mt-5 text-6xl">
            <BlurText text="Study APES five minutes a day." animateBy="words" delay={60} className="inline" />{" "}
            <span className="text-brand-ink">
              <BlurText text="Watch your island grow." animateBy="words" delay={60} className="inline" />
            </span>
          </h1>
          <p className="mt-6 max-w-[48ch] text-xl leading-relaxed text-fg-3">
            A short daily set built with spaced repetition, the assignments your teacher posts, and an island that thrives when you show up and wilts when you don't.
          </p>
          <div className="mt-9 flex items-center gap-3">
            <Magnet padding={60} magnetStrength={4}>
              <Button size="lg" asChild>
                <Link to="/start">
                  Start studying free <ArrowRight />
                </Link>
              </Button>
            </Magnet>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/start">
                <GraduationCap /> I'm a teacher
              </Link>
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-base text-fg-3">
            {["Free for students and teachers", "Made for laptops and Chromebooks", "All 9 units, 108 lessons"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-4 text-brand" strokeWidth={2.6} /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
            <IslandScene xp={s.xp} health={1} sky={s.sky} landmarks={s.landmarks} seed="showcase" className="aspect-[5/3]" label="An Ecoisland growing over a school year" />
            <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4">
              <div>
                <p className="text-md font-semibold text-fg">{stageForXp(s.xp).name}</p>
                <p className="text-sm text-fg-3">{s.caption}</p>
              </div>
              <div className="flex gap-1.5" role="tablist" aria-label="Island growth stages">
                {SHOWCASE.map((x, k) => (
                  <button
                    key={x.caption}
                    role="tab"
                    aria-selected={k === i}
                    aria-label={x.caption}
                    onClick={() => setI(k)}
                    className={cn("h-2 rounded-full transition-all", k === i ? "w-6 bg-brand" : "w-2 bg-surface-3 hover:bg-fg-4")}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuestionMock() {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
      <p className="text-xs font-semibold text-fg-3">Daily set · 4 / 10</p>
      <p className="mt-2 text-base leading-snug font-semibold text-fg">Which layer of soil is richest in organic matter?</p>
      <div className="mt-3 space-y-1.5">
        {["O horizon", "B horizon", "C horizon"].map((t, k) => (
          <div key={t} className={cn("flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-sm", k === 0 ? "border-brand bg-brand-soft text-fg" : "border-line text-fg-3")}>
            <span className={cn("grid size-4 place-items-center rounded-2xs text-2xs font-bold", k === 0 ? "bg-brand text-brand-fg" : "border border-line-strong")}>{k === 0 ? <Check className="size-2.5" strokeWidth={4} /> : "BCD"[k - 1]}</span>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-[1200px] scroll-mt-20 px-8 py-28">
      <p className="t-eyebrow">How it works</p>
      <h2 className="t-h1 mt-3 max-w-[22ch]">A habit you can keep, and something to show for it.</h2>
      <div className="mt-14 grid grid-cols-3 gap-6">
        <div className="card flex flex-col p-6">
          <QuestionMock />
          <h3 className="mt-6 text-xl font-semibold text-fg">1. Do today's set</h3>
          <p className="mt-2 text-md text-fg-3">Ten questions from your class's current unit. The ones you miss come back on a schedule until they stick.</p>
        </div>
        <div className="card flex flex-col p-6">
          <div className="grid grid-cols-3 gap-2">
            {[0, 160, 900].map((xp) => (
              <div key={xp} className="overflow-hidden rounded-md border border-line">
                <IslandScene xp={xp} health={1} sky="day" seed="how" animate={false} className="aspect-square" />
              </div>
            ))}
          </div>
          <h3 className="mt-6 text-xl font-semibold text-fg">2. Your island grows</h3>
          <p className="mt-2 text-md text-fg-3">Every question, lesson and quest adds XP. Plants take root, then trees, then a whole ecosystem: {STAGES.length} stages in all.</p>
        </div>
        <div className="card flex flex-col p-6">
          <div className="grid grid-cols-2 gap-2">
            <div className="overflow-hidden rounded-md border border-line">
              <IslandScene xp={700} health={1} sky="day" seed="wilt" animate={false} className="aspect-[4/3]" />
            </div>
            <div className="overflow-hidden rounded-md border border-line">
              <IslandScene xp={700} health={0.2} sky="day" seed="wilt" animate={false} className="aspect-[4/3]" />
            </div>
          </div>
          <h3 className="mt-6 text-xl font-semibold text-fg">3. Skip days and it wilts</h3>
          <p className="mt-2 text-md text-fg-3">Miss a day and your island gets thirsty. Miss three and it dries out. One daily set brings it right back.</p>
        </div>
      </div>
    </section>
  );
}

function Course() {
  const stats = [
    { n: 9, label: "units, matched to the AP course", icon: BookOpen },
    { n: 108, label: "lessons written for students", icon: CalendarCheck },
    { n: 1221, label: "practice questions, many with real data", icon: ListChecks },
    { n: 27, label: "FRQs graded against a rubric", icon: PenLine },
  ];
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto grid max-w-[1200px] grid-cols-4 gap-8 px-8 py-16">
        {stats.map((s) => (
          <div key={s.label}>
            <s.icon className="size-5 text-brand" aria-hidden />
            <p className="font-display t-num mt-4 text-5xl leading-none font-[600] text-fg">
              <span className="sr-only">{s.n.toLocaleString()}</span>
              <span aria-hidden>
                <CountUp to={s.n} duration={1.4} separator="," />
              </span>
            </p>
            <p className="mt-2 text-md text-fg-3">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Teachers() {
  const rows = [
    { name: "Avery Chen", streak: 12, done: 5, active: "Today" },
    { name: "Jordan Patel", streak: 6, done: 4, active: "Today" },
    { name: "Sam Okafor", streak: 0, done: 2, active: "4 days ago", idle: true },
    { name: "Maya Rivera", streak: 9, done: 5, active: "Yesterday" },
  ];
  return (
    <section id="teachers" className="mx-auto grid max-w-[1200px] scroll-mt-20 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-16 px-8 py-28">
      <div>
        <p className="t-eyebrow">For teachers</p>
        <h2 className="t-h1 mt-3">Assign the work. See who's done it.</h2>
        <p className="mt-4 text-lg text-fg-3">Create a class and share a six-character code. Students join in seconds, and everything they do counts toward what you assigned.</p>
        <ul className="mt-8 space-y-4">
          {[
            { icon: ListChecks, t: "Assign lessons, lesson or unit quizzes, FRQs, daily sets or field quests, each with a due date." },
            { icon: Users, t: "Watch completion fill in live. See who's late, who's on a streak, and who hasn't started." },
            { icon: CalendarCheck, t: "Set the current unit and the test date. Every student's daily set focuses on that unit." },
            { icon: MessageCircle, t: "Turn on a class chat you moderate, schedule eco actions, and verify students' volunteer hours." },
          ].map((x) => (
            <li key={x.t} className="flex gap-3.5 text-md text-fg-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-soft text-brand-ink">
                <x.icon className="size-4" />
              </span>
              {x.t}
            </li>
          ))}
        </ul>
        <Button className="mt-9" size="lg" asChild>
          <Link to="/start">
            <GraduationCap /> Set up your class
          </Link>
        </Button>
      </div>
      <div className="card overflow-hidden" aria-label="Example class roster">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <p className="text-md font-semibold text-fg">APES · Period 3</p>
            <p className="text-sm text-fg-3">Unit 4: Earth Systems and Resources</p>
          </div>
          <span className="rounded-sm border border-line-strong px-2.5 py-1 font-mono text-sm font-semibold tracking-[0.14em] text-fg-2">K7Q2MX</span>
        </div>
        <div className="border-b border-line px-6 py-4">
          <div className="flex items-center justify-between text-base">
            <span className="font-semibold text-fg">Read 4.2 Soil Formation and Erosion</span>
            <span className="t-num text-fg-3">22/26 done</span>
          </div>
          <ProgressBar value={85} className="mt-2.5 h-1.5" label="Example completion" />
        </div>
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center gap-3 px-6 py-3 text-base">
              <Avatar name={r.name} size={28} />
              <span className="flex-1 font-semibold text-fg">{r.name}</span>
              <span className="flex w-14 items-center gap-1 text-fg-2">
                <Flame className={cn("size-3.5", r.streak ? "text-sun" : "text-fg-4")} /> {r.streak}
              </span>
              <span className={cn("w-24", r.idle ? "font-semibold text-coral" : "text-fg-3")}>{r.active}</span>
              <span className="t-num w-12 text-right text-fg-2">{r.done}/5</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Landmarks() {
  return (
    <section id="landmarks" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-[1200px] px-8 py-28">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-center gap-14">
          <div>
            <p className="t-eyebrow">Landmarks</p>
            <h2 className="t-h1 mt-3">Master a unit, change your island.</h2>
            <p className="mt-4 text-lg text-fg-3">Score 70% on a unit quiz and a landmark from that unit appears. By May, your island is a map of everything you've learned.</p>
            <div className="mt-6 flex items-center gap-2 text-base text-fg-2">
              <Treecoin size={18} /> Treecoins from studying buy skies and decorations too.
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line shadow-lg">
            <IslandScene xp={1650} health={1} sky="sunset" landmarks={[1, 2, 3, 4, 5, 6, 7, 8, 9]} decor={[{ id: "dock", x: 0.73, y: 0.84 }]} seed="landmarks" className="aspect-[5/3]" />
          </div>
        </div>
        <ul className="mt-14 grid grid-cols-3 gap-3">
          {UNITS.map((u) => (
            <li key={u.n} className="flex items-start gap-3 rounded-lg border border-line p-4">
              <Badge tone="brand" className="mt-0.5 shrink-0">
                Unit {u.n}
              </Badge>
              <div>
                <p className="text-md font-semibold text-fg">{LANDMARK_INFO[u.n].name}</p>
                <p className="text-sm text-fg-3">{u.title}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ActSection() {
  const cards = [
    { icon: BrushCleaning, tone: "bg-ocean-soft text-ocean", month: "NOV", day: "14", kind: "Volunteer event", title: "Creek cleanup", meta: "9:00 AM · Thornton Creek trailhead", going: "18 going" },
    { icon: Recycle, tone: "bg-brand-soft text-brand-ink", month: "NOV", day: "17", kind: "Eco action", title: "Trash audit", meta: "Unit 8 · one week", going: "APES · Period 3" },
  ];
  return (
    <section id="act" className="mx-auto grid max-w-[1200px] scroll-mt-20 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-16 px-8 py-28">
      <div>
        <p className="t-eyebrow">Act</p>
        <h2 className="t-h1 mt-3">Then take it outside.</h2>
        <p className="mt-4 text-lg text-fg-3">Every unit ends somewhere real. Find volunteer events near you, do eco actions that use what you just learned, and build a service record your teacher has verified.</p>
        <ul className="mt-8 space-y-4">
          {[
            { icon: Recycle, t: "Twelve eco actions, each tied to an APES unit: a trash audit, a home energy hunt, a pollinator count." },
            { icon: HandHeart, t: "RSVP to cleanups and plantings, contact the organizer, and log your hours afterwards." },
            { icon: Award, t: "Ambassadors organize events in their own area and post them for everyone." },
          ].map((x) => (
            <li key={x.t} className="flex gap-3.5 text-md text-fg-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-soft text-brand-ink">
                <x.icon className="size-4" />
              </span>
              {x.t}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative" aria-label="Example listings in Act">
        <div className="space-y-4">
          {cards.map((c, i) => (
            <div key={c.title} className={cn("card flex gap-4 p-5 shadow-md", i === 1 && "ml-10")}>
              <div className="flex w-14 shrink-0 flex-col items-center">
                <div className="w-full overflow-hidden rounded-md border border-line text-center">
                  <p className={cn("py-0.5 text-2xs font-bold tracking-[0.08em]", c.tone)}>{c.month}</p>
                  <p className="font-display py-1 text-2xl leading-none font-[600] text-fg">{c.day}</p>
                </div>
                <span className={cn("mt-2.5 grid size-8 place-items-center rounded-full", c.tone)}>
                  <c.icon className="size-4" />
                </span>
              </div>
              <div className="min-w-0">
                <Badge tone={c.kind === "Eco action" ? "sun" : "ocean"}>{c.kind}</Badge>
                <p className="mt-2.5 text-lg font-semibold text-fg">{c.title}</p>
                <p className="mt-2 flex items-center gap-4 text-sm text-fg-3">
                  <span className="inline-flex items-center gap-1.5">
                    {c.kind === "Eco action" ? <Clock className="size-3.5" /> : <MapPin className="size-3.5" />} {c.meta}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" /> {c.going}
                  </span>
                </p>
              </div>
            </div>
          ))}
          <div className="card ml-20 flex items-center gap-4 p-5 shadow-md">
            <HandHeart className="size-5 text-brand" />
            <div>
              <p className="font-display t-num text-3xl leading-none font-[600] text-fg">
                24.5 <span className="font-sans text-base font-normal text-fg-3">volunteer hours, verified</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-[1200px] px-8 py-28 text-center">
      <Sparkles className="mx-auto size-6 text-brand" aria-hidden />
      <h2 className="t-display mx-auto mt-5 max-w-[18ch] text-6xl">Your island is waiting.</h2>
      <p className="mx-auto mt-4 max-w-[46ch] text-lg text-fg-3">Sign in with Google, join your class with its code, and do your first daily set. It takes about five minutes.</p>
      <Button size="lg" className="mt-9" asChild>
        <Link to="/start">
          Get started <ArrowRight />
        </Link>
      </Button>
    </section>
  );
}

export default function Landing() {
  useDocumentTitle("");
  useEffect(() => {
    document.title = "Ecoisland: AP Environmental Science, five minutes a day";
  }, []);
  return (
    <div className="min-h-dvh bg-bg">
      <Header />
      <Hero />
      <HowItWorks />
      <Course />
      <Teachers />
      <Landmarks />
      <ActSection />
      <FinalCta />
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-8 py-8 text-base text-fg-3">
          <span className="flex items-center gap-3">
            <Logo />
            <span>Made by a high school student, for students.</span>
          </span>
          <span className="flex gap-5">
            <Link to="/privacy-policy" className="hover:text-fg">
              Privacy
            </Link>
            <Link to="/tos" className="hover:text-fg">
              Terms
            </Link>
            <span>© 2026 Ecoisland</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
