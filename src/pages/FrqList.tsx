import { ArrowLeft, ExternalLink, PenLine } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Page } from "@/components/app/Guards";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tray } from "@/components/ui/tray";
import { Skeleton } from "@/components/ui/empty";
import { frqs as loadFrqs, type Frq } from "@/lib/content";
import { useDocumentTitle } from "@/lib/hooks";
import { useProfile } from "@/lib/session";
import { UNITS, safeKey } from "@/shared/curriculum";
import { REWARD } from "@/shared/economy";

export default function FrqList() {
  const profile = useProfile();
  const [frqs, setFrqs] = useState<Frq[] | null>(null);
  useDocumentTitle("FRQ practice");
  useEffect(() => {
    void loadFrqs().then(setFrqs).catch(() => setFrqs([]));
  }, []);

  return (
    <Page>
      <Link to="/study" className="plate mb-4 text-base font-medium text-fg-2 hover:text-fg">
        <ArrowLeft className="size-4" /> Study
      </Link>
      <header className="page-hero flex-row items-end justify-between gap-6">
        <div className="max-w-1/2">
          <p className="t-eyebrow text-fg-2">Free response</p>
          <h1 className="t-hero mt-2.5">FRQ practice</h1>
          <p className="mt-2 max-w-[62ch] text-md text-fg-2">
            Original AP-style questions. Write your answer to every part and it's scored point by point against the rubric, with feedback on what earned credit. Up to {REWARD.FRQ_DAILY_CAP} graded FRQs earn Treecoins each day.
          </p>
        </div>
        <a
          href="https://nerd-notes.com/every-ap-environmental-sciences-apes-frq-sorted-by-unit/"
          target="_blank"
          rel="noopener noreferrer"
          className="plate shrink-0 text-base font-semibold text-brand-ink hover:underline"
        >
          Official past FRQs by unit <ExternalLink className="size-3.5" />
        </a>
      </header>
      {!frqs ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {UNITS.map((u) => {
            const list = frqs.filter((f) => f.unit === u.n);
            if (list.length === 0) return null;
            return (
              <Tray key={u.n} title={`Unit ${u.n} · ${u.title}`}>
                <div className="grid grid-cols-3 gap-3">
                  {list.map((f) => {
                    const best = profile.frq_best?.[safeKey(f.id)];
                    const points = f.parts.reduce((s, p) => s + p.points, 0);
                    return (
                      <Card key={f.id} interactive className="p-0">
                        <Link to={`/study/frq/${encodeURIComponent(f.id)}`} className="flex h-full flex-col p-5">
                          <div className="flex items-center justify-between">
                            <span className="grid size-9 place-items-center rounded-md bg-sun-soft text-sun-ink">
                              <PenLine className="size-4" />
                            </span>
                            {best !== undefined ? <Badge tone="brand">Best {best}%</Badge> : <Badge tone="outline">{points} points</Badge>}
                          </div>
                          <p className="mt-4 text-md leading-snug font-semibold text-fg">{f.title}</p>
                          <p className="mt-auto pt-3 text-sm text-fg-3">{f.parts.length} parts</p>
                        </Link>
                      </Card>
                    );
                  })}
                </div>
              </Tray>
            );
          })}
        </div>
      )}
    </Page>
  );
}
