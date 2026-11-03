import { ArrowLeft, ExternalLink, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Page } from "@/components/app/Guards";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
import { resources as loadResources, type Resources } from "@/lib/content";
import { useDocumentTitle } from "@/lib/hooks";

export default function Guide() {
  const [r, setR] = useState<Resources | null>(null);
  useDocumentTitle("Exam guide");
  useEffect(() => {
    void loadResources().then(setR).catch(() => setR({}));
  }, []);
  if (!r) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }
  const mc = r.exam_structure?.multiple_choice;
  const frq = r.exam_structure?.free_response;
  return (
    <Page className="mx-auto max-w-[980px]">
      <Link to="/study" className="mb-5 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-fg-3 hover:text-fg">
        <ArrowLeft className="size-4" /> Study
      </Link>
      <p className="t-eyebrow">AP Environmental Science</p>
      <h1 className="t-h1 mt-2.5">Exam guide</h1>
      <p className="mt-2 text-[15px] text-fg-3">How the exam works, what each unit is worth, and how to pick up the points readers look for.</p>

      <div className="mt-8 grid grid-cols-2 gap-4">
        {[
          { title: "Multiple choice", s: mc },
          { title: "Free response", s: frq },
        ].map(({ title, s }) =>
          s ? (
            <Card key={title} className="p-6">
              <p className="t-eyebrow">{title}</p>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="font-display t-num text-[40px] font-[600] text-fg">{s.questions}</span>
                <span className="text-[14px] text-fg-3">
                  questions · {s.minutes} minutes · {s.weight}
                </span>
              </p>
              {s.types && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-fg-2">
                  {s.types.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
              {s.note && <p className="mt-3 text-[13.5px] text-fg-3">{s.note}</p>}
            </Card>
          ) : null,
        )}
      </div>

      {r.unit_weights && (
        <Card className="mt-6 p-6">
          <h2 className="t-h3">What each unit is worth</h2>
          <ul className="mt-4 space-y-2.5">
            {r.unit_weights.map((u) => {
              const top = Number(u.examWeight.split(/[-–]/).pop()?.replace("%", "")) || 0;
              return (
                <li key={u.unit} className="grid grid-cols-[64px_1fr_220px_64px] items-center gap-4 text-[14px]">
                  <span className="text-fg-3">Unit {u.unit}</span>
                  <Link to={`/study/unit/${u.unit}`} className="truncate font-medium text-fg hover:underline">
                    {u.title}
                  </Link>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-3">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${(top / 20) * 100}%` }} />
                  </span>
                  <span className="t-num text-right text-fg-2">{u.examWeight}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {r.tips_and_tricks && (
        <Card className="mt-6 p-6">
          <h2 className="t-h3">Tips from high scorers</h2>
          <ul className="mt-4 space-y-3">
            {r.tips_and_tricks.map((t, i) => (
              <li key={i} className="flex gap-3 text-[14.5px] leading-relaxed text-fg-2">
                <Lightbulb className="mt-1 size-4 shrink-0 text-sun" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {r.helpful_websites && (
        <Card className="mt-6 p-6">
          <h2 className="t-h3">Other good resources</h2>
          <ul className="mt-4 divide-y divide-line">
            {r.helpful_websites.map((w) => (
              <li key={w.name} className="flex items-start justify-between gap-6 py-3">
                <div>
                  <p className="text-[14.5px] font-semibold text-fg">{w.name}</p>
                  {w.note && <p className="mt-0.5 text-[13.5px] text-fg-3">{w.note}</p>}
                </div>
                {w.url && (
                  <a href={w.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-brand-ink hover:underline">
                    Open <ExternalLink className="size-3.5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Page>
  );
}
