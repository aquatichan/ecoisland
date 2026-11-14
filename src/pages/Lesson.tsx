// The lesson reader: a quiet, book-like page with the unit's lessons on the
// left. Finishing a lesson is one click and pays Treecoins once.
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Layers, Target, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Page } from "@/components/app/Guards";
import { Treecoin } from "@/components/app/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { track } from "@/lib/analytics";
import { api, errorMessage, type LessonResult } from "@/lib/api";
import { cleanLessonHtml, lessonContent, type Block } from "@/lib/content";
import { useDocumentTitle } from "@/lib/hooks";
import { updateProfile } from "@/lib/profile";
import { useProfile } from "@/lib/session";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { findLesson, neighbours, unitOfLesson } from "@/shared/curriculum";
import { REWARD } from "@/shared/economy";

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function BlockView({ block }: { block: Block }) {
  const html = useMemo(() => ("html" in block ? cleanLessonHtml(block.html) : ""), [block]);
  switch (block.type) {
    case "heading":
      return <h2>{block.text}</h2>;
    case "paragraph":
      return <p dangerouslySetInnerHTML={{ __html: html }} />;
    case "list":
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    case "table":
      return <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />;
    case "image":
      return <img src={block.src} alt="" loading="lazy" />;
  }
}

export default function Lesson() {
  const { lesson: lessonParam = "" } = useParams();
  const lessonId = findLesson(lessonParam) ? lessonParam : safeDecode(lessonParam);
  const found = findLesson(lessonId);
  const profile = useProfile();
  const toast = useToast();
  const [content, setContent] = useState<{ title: string; blocks: Block[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [progress, setProgress] = useState(0);
  useDocumentTitle(found ? `${found.lesson.code} ${found.lesson.title}` : "Lesson");

  useEffect(() => {
    if (!found) return;
    let cancelled = false;
    setContent(null);
    setError(null);
    window.scrollTo({ top: 0 });
    lessonContent(lessonId)
      .then((c) => !cancelled && setContent(c))
      .catch((e) => !cancelled && setError(errorMessage(e)));
    // Remember where the student is, for "Continue reading".
    if (profile.last_lesson?.id !== lessonId) {
      void updateProfile(profile.id, { last_lesson: { id: lessonId, unit: found.unit.n, at: new Date().toISOString() } }).catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // Reading progress: measured at most once a frame, and stored as a whole percent, so scrolling a long lesson
  // re-renders the page about a hundred times in all rather than on every scroll event.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.round(Math.min(100, (window.scrollY / max) * 100)) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [content]);

  // The reading time, counted once per lesson rather than on every render.
  const words = useMemo(
    () => (content ? content.blocks.reduce((n, b) => n + ("html" in b ? b.html : "text" in b ? b.text : "").replace(/<[^>]+>/g, " ").split(/\s+/).length, 0) : 0),
    [content],
  );

  if (!found) return <Navigate to="/study" replace />;
  const { lesson, unit } = found;
  const { prev, next } = neighbours(lessonId);
  const isRead = (profile.lessons_done ?? []).includes(lessonId);
  const minutes = Math.max(2, Math.round(words / 200));

  const markRead = async () => {
    setMarking(true);
    try {
      const res = await api<LessonResult>("reward", { kind: "lesson_read", lesson: lessonId });
      track("lesson_complete", { unit: unit.n });
      toast.show({
        tone: "success",
        title: res.already ? "Already marked as read" : `Lesson complete · +${res.reward.tc} TC`,
        body: res.completed.length ? `Assignment done: ${res.completed.map((c) => c.title).join(", ")}` : lesson.hasQuiz ? "Lock it in with the 10-question lesson quiz." : undefined,
      });
    } catch (err) {
      toast.show({ tone: "error", title: "Couldn't save", body: errorMessage(err) });
    } finally {
      setMarking(false);
    }
  };

  const lessonHref = (id: string) => `/study/unit/${unitOfLesson(id)}/${encodeURIComponent(id)}`;

  return (
    <Page>
      <div className="fixed inset-x-0 top-16 z-30 h-[2px] bg-transparent" aria-hidden>
        <div className="h-full bg-brand transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
      <div className="grid grid-cols-[250px_minmax(0,1fr)] gap-12">
        <aside className="sticky top-24 self-start">
          <Link to={`/study/unit/${unit.n}`} className="plate mb-4 text-base font-medium text-fg-2 hover:text-fg">
            <ArrowLeft className="size-4" /> Unit {unit.n}
          </Link>
          <p className="mt-4 text-base leading-snug font-semibold text-fg">{unit.title}</p>
          <nav className="mt-3 max-h-[calc(100dvh-180px)] space-y-0.5 overflow-y-auto pr-2" aria-label={`Unit ${unit.n} lessons`}>
            {unit.lessons.map((l) => {
              const active = l.id === lessonId;
              const done = (profile.lessons_done ?? []).includes(l.id);
              return (
                <Link
                  key={l.id}
                  to={lessonHref(l.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-start gap-2.5 rounded-sm px-2.5 py-2 text-base leading-snug transition-colors",
                    active ? "bg-brand-soft font-semibold text-brand-ink" : "text-fg-3 hover:bg-surface-2 hover:text-fg-2",
                  )}
                >
                  <span className="t-num w-7 shrink-0 text-fg-3">{l.code}</span>
                  <span className="flex-1">{l.title}</span>
                  {done && <Check className="mt-0.5 size-3.5 shrink-0 text-brand" strokeWidth={3} aria-label="Read" />}
                </Link>
              );
            })}
          </nav>
        </aside>

        <article className="min-w-0 pb-10">
          <header className="mb-10 max-w-[68ch] border-b border-line pb-8">
            <p className="t-eyebrow">
              Unit {unit.n} · Lesson {lesson.code}
            </p>
            <h1 className="t-display mt-4 text-5xl">{lesson.title}</h1>
            <p className="mt-4 flex items-center gap-4 text-base text-fg-3">
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" /> {content ? `${minutes} min read` : "Loading…"}
              </span>
              {isRead && (
                <span className="flex items-center gap-1.5 font-semibold text-brand-ink">
                  <CheckCircle2 className="size-4" /> Read
                </span>
              )}
            </p>
          </header>

          {error ? (
            <Card className="max-w-[68ch]">
              <EmptyState icon={TriangleAlert} title="This lesson didn't load" body={error} action={<Button onClick={() => window.location.reload()}>Reload</Button>} />
            </Card>
          ) : !content ? (
            <div className="max-w-[68ch] space-y-3">
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton key={i} className={cn("h-4", i % 3 === 2 ? "w-2/3" : "w-full")} />
              ))}
            </div>
          ) : (
            <div className="lesson-prose">
              {content.blocks.map((b, i) => (
                <BlockView key={i} block={b} />
              ))}
            </div>
          )}

          {content && (
            <Card className="mt-14 max-w-[68ch] p-7">
              {isRead ? (
                <p className="flex items-center gap-2 text-md font-semibold text-fg">
                  <CheckCircle2 className="size-5 text-brand" /> You've finished this lesson
                </p>
              ) : (
                <>
                  <p className="text-lg font-semibold text-fg">Finished reading?</p>
                  <p className="mt-1 text-base text-fg-3">Mark it read to track your progress and count it toward any assignment.</p>
                </>
              )}
              <div className="mt-5 flex flex-wrap gap-2.5">
                {!isRead && (
                  <Button onClick={markRead} loading={marking}>
                    <Check /> Mark as read · <Treecoin size={15} /> +{REWARD.LESSON_TC}
                  </Button>
                )}
                {lesson.hasQuiz && (
                  <Button variant={isRead ? "primary" : "secondary"} asChild>
                    <Link to={`/practice?mode=lesson&lesson=${encodeURIComponent(lessonId)}`}>
                      <Target /> Lesson quiz
                    </Link>
                  </Button>
                )}
                {lesson.hasQuiz && (
                  <Button variant="ghost" asChild>
                    <Link to={`/study/flashcards?lesson=${encodeURIComponent(lessonId)}`}>
                      <Layers /> Vocab
                    </Link>
                  </Button>
                )}
              </div>
            </Card>
          )}

          <nav className="mt-8 flex max-w-[68ch] justify-between gap-4" aria-label="Lesson navigation">
            {prev ? (
              <Link to={lessonHref(prev.id)} className="group flex max-w-[48%] flex-col rounded-lg border border-line px-4 py-3 hover:border-line-strong">
                <span className="flex items-center gap-1 text-sm text-fg-3">
                  <ArrowLeft className="size-3.5" /> Previous
                </span>
                <span className="mt-1 truncate text-base font-semibold text-fg">
                  {prev.code} {prev.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={lessonHref(next.id)} className="group ml-auto flex max-w-[48%] flex-col items-end rounded-lg border border-line px-4 py-3 text-right hover:border-line-strong">
                <span className="flex items-center gap-1 text-sm text-fg-3">
                  Next <ArrowRight className="size-3.5" />
                </span>
                <span className="mt-1 truncate text-base font-semibold text-fg">
                  {next.code} {next.title}
                </span>
              </Link>
            )}
          </nav>
        </article>
      </div>
    </Page>
  );
}
