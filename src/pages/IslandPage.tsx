import { Check, CheckCircle2, Lock, Move, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArtBackdrop } from "@/components/app/ArtBackdrop";
import { Page } from "@/components/app/Guards";
import { Treecoin } from "@/components/app/Logo";
import { IslandScene } from "@/components/island/IslandScene";
import { MarketTile, SkyWell, SpriteWell } from "@/components/island/tiles";
import type { PlateScrim } from "@/components/landing/plates";
import { LANDMARK_INFO, landmarkArt } from "@/shared/landmarks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { track } from "@/lib/analytics";
import { api, errorMessage, type PurchaseResult } from "@/lib/api";
import { useDocumentTitle } from "@/lib/hooks";
import { useIslandHealth } from "@/lib/island";
import { updateProfile } from "@/lib/profile";
import { useProfile } from "@/lib/session";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { DECOR, GROWTH, MAX_PLACED_DECOR, SKIES, findDecor, findSky, type DecorId, type SkyId } from "@/shared/catalog";
import { MASTERY_PCT, findUnlock, masteredUnits, stageProgress } from "@/shared/economy";
import { UNITS } from "@/shared/curriculum";
import { marketState, visibleGrowth } from "@/shared/island";
import type { PlacedDecor } from "@/shared/types";

type Tab = "landmarks" | "shop" | "arrange";

// The banner draws the same sky as the island scene below it, so the two read as one place. The island's name
// sits in the left half, so that is where the scrim is (the same treatment as the Today page's greeting).
const BANNER_SCRIM: PlateScrim = { kind: "start", alpha: 0.92, hold: 0.52, fade: 0.16 };

export default function IslandPage() {
  const profile = useProfile();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("shop");
  const [selected, setSelected] = useState<number | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(profile.island_name ?? "");
  // Only decorations the student owns are ever placed (a single, consistently indexed list).
  const ownedDecor = (list: PlacedDecor[] | undefined) => (list ?? []).filter((d) => (profile.owned_items ?? []).includes(d.id));
  const [decor, setDecor] = useState<PlacedDecor[]>(() => ownedDecor(profile.island_decor));
  const pendingSave = useRef<number | null>(null);
  useDocumentTitle("Island");

  // Keep local decor in sync with the live profile when not mid-edit.
  useEffect(() => {
    if (pendingSave.current === null) setDecor(ownedDecor(profile.island_decor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.island_decor, profile.owned_items]);

  const xp = profile.xp_total ?? 0;
  const health = useIslandHealth();
  const progress = stageProgress(xp);
  // What was claimed in this visit counts at once: the profile snapshot can trail the purchase by a moment,
  // and an item the student owns must never show a price.
  const [claimed, setClaimed] = useState<ReadonlySet<string>>(() => new Set());
  const owned = useMemo(() => new Set([...(profile.owned_items ?? []), ...claimed]), [profile.owned_items, claimed]);
  const sky = findSky(profile.island_skybox)?.id ?? "day";
  const mastered = masteredUnits(profile.unit_best);
  const coins = profile.treecoins ?? 0;
  const islandName = profile.island_name?.trim() || `${profile.username || "Your"}'s island`;

  // One place decides what each market card offers. An owned item never gets a price button.
  const stateOf = (id: string) => marketState(id, owned, xp);
  const getButton = (id: string, name: string, price: number) => {
    const state = stateOf(id);
    if (state === "owned") return null;
    if (state === "locked") {
      const need = (findUnlock(id)?.minXp ?? 0).toLocaleString();
      return (
        <Button size="sm" variant="ghost" className="mt-1.5 h-7 w-full disabled:opacity-100" disabled title={`Opens at ${need} XP`}>
          <Lock className="size-3.5" /> {need} XP
        </Button>
      );
    }
    return (
      <Button size="sm" variant="soft" className="mt-1.5 h-7 w-full disabled:bg-surface-2 disabled:text-fg-3 disabled:opacity-100" disabled={coins < price} loading={buying === id} onClick={() => void buy(id, name)}>
        {state === "free" ? "Free" : <><Treecoin size={13} /> {price}</>}
      </Button>
    );
  };

  const saveDecor = (next: PlacedDecor[]) => {
    setDecor(next);
    if (pendingSave.current) window.clearTimeout(pendingSave.current);
    pendingSave.current = window.setTimeout(() => {
      pendingSave.current = null;
      updateProfile(profile.id, { island_decor: next }).catch((err) => toast.show({ tone: "error", title: "Couldn't save your layout", body: errorMessage(err) }));
    }, 350);
  };

  const buy = async (id: string, label: string) => {
    setBuying(id);
    try {
      await api<PurchaseResult>("purchase", { item: id });
      setClaimed((prev) => new Set(prev).add(id));
      track("purchase", { item: id });
      const asSky = findSky(id);
      if (asSky) {
        await updateProfile(profile.id, { island_skybox: asSky.id });
      } else {
        const d = findDecor(id);
        if (d && decor.length < MAX_PLACED_DECOR) saveDecor([...decor, { id: d.id, x: d.x, y: d.y }]);
      }
      const placedDecor = !asSky && !!findDecor(id);
      toast.show({ tone: "success", title: `${label} is yours`, body: asSky ? "Your sky has changed." : placedDecor ? "It's on your island. Switch to Arrange to move it." : "It's growing on your island." });
    } catch (err) {
      toast.show({ tone: "error", title: "Purchase didn't go through", body: errorMessage(err) });
    } finally {
      setBuying(null);
    }
  };

  const applySky = (id: SkyId) => void updateProfile(profile.id, { island_skybox: id }).catch((err) => toast.show({ tone: "error", title: "Couldn't change the sky", body: errorMessage(err) }));

  const place = (id: DecorId) => {
    const d = findDecor(id)!;
    if (decor.length >= MAX_PLACED_DECOR) {
      toast.show({ tone: "info", title: `Up to ${MAX_PLACED_DECOR} decorations fit on an island` });
      return;
    }
    saveDecor([...decor, { id, x: d.x, y: d.y }]);
  };

  const remove = (index: number) => {
    saveDecor(decor.filter((_, i) => i !== index));
    setSelected(null);
  };

  const saveName = async () => {
    setEditingName(false);
    const n = name.trim().slice(0, 32);
    if (n === (profile.island_name ?? "")) return;
    await updateProfile(profile.id, { island_name: n }).catch(() => undefined);
  };

  return (
    <Page>
      <header className="relative isolate overflow-hidden rounded-2xl border border-line px-8 py-9 shadow-sm">
        <ArtBackdrop art={`sky-${sky}`} scrim={BANNER_SCRIM} />
        <div className="flex items-end justify-between gap-8">
          <div className="min-w-0 max-w-1/2">
            {editingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveName();
                }}
                className="flex items-center gap-2"
              >
                <input
                  autoFocus
                  value={name}
                  maxLength={32}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => void saveName()}
                  className="font-display w-full max-w-85 border-b border-brand bg-transparent text-3xl font-[560] text-fg outline-none"
                  aria-label="Island name"
                />
              </form>
            ) : (
              <button onClick={() => setEditingName(true)} className="group flex items-center gap-2 text-left" aria-label="Rename your island">
                <h1 className="t-h1 truncate">{islandName}</h1>
                <Pencil className="size-4 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}
            <p className="mt-1 text-base text-fg-2">
              {progress.stage.name} · {progress.stage.blurb}
            </p>
          </div>
          <div className="glass w-75 shrink-0 rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-fg-2">{progress.next ? `Next: ${progress.next.name}` : "Fully grown"}</span>
              <span className="t-num text-fg-3">{progress.next ? `${progress.toNext} XP to go` : `${xp.toLocaleString()} XP`}</span>
            </div>
            <ProgressBar value={progress.pct} label="Growth to next stage" />
          </div>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_23.75rem] gap-6">
        <div>
          <Card className="overflow-hidden">
            <div className="relative">
              <IslandScene
                health={health.value}
                sky={sky}
                growth={visibleGrowth(profile.owned_items)}
                decor={decor}
                landmarks={mastered}
                editable={tab === "arrange"}
                selected={selected}
                onSelect={setSelected}
                onMoveDecor={(i, x, y) => saveDecor(decor.map((d, k) => (k === i ? { ...d, x, y } : d)))}
                className="aspect-[5/3]"
                label={`${islandName}: ${progress.stage.name}, ${health.label.toLowerCase()}`}
              />
              {tab === "arrange" && (
                <div className="glass pointer-events-none absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap text-fg-2 shadow-md">
                  <Move className="size-4 shrink-0" /> Drag to move, or select one and use the arrow keys
                </div>
              )}
            </div>
          </Card>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <Card className="p-5">
              <p className="t-eyebrow">Health</p>
              <p className={cn("mt-2.5 text-xl font-semibold", health.label === "Thriving" ? "text-brand-ink" : health.label === "Thirsty" ? "text-sun-ink" : "text-coral")}>{health.label}</p>
              <p className="mt-1 text-sm text-fg-3">
                {health.daysMissed === 0 ? "Watered by your daily sets." : `${health.daysMissed} missed ${health.daysMissed === 1 ? "day" : "days"}. One daily set restores it.`}
              </p>
              {health.daysMissed > 0 && (
                <Button size="sm" className="mt-3" asChild>
                  <Link to="/practice?mode=daily">Water it now</Link>
                </Button>
              )}
            </Card>
            <Card className="p-5">
              <p className="t-eyebrow">Growth</p>
              <p className="font-display t-num mt-2 text-3xl font-[600] text-fg">{xp.toLocaleString()} XP</p>
              <p className="mt-0.5 text-sm text-fg-3">Every question, lesson and quest adds XP. Your island never shrinks.</p>
            </Card>
            <Card className="p-5">
              <p className="t-eyebrow">Landmarks</p>
              <p className="font-display t-num mt-2 text-3xl font-[600] text-fg">
                {mastered.length}
                <span className="text-lg text-fg-3"> / 9</span>
              </p>
              <p className="mt-0.5 text-sm text-fg-3">One for each unit you master at {MASTERY_PCT}%.</p>
            </Card>
          </div>
        </div>

        <Card className="sticky top-24 flex max-h-[calc(100dvh-7.5rem)] flex-col self-start overflow-hidden">
          <div className="border-b border-line p-5">
            <div className="flex items-center justify-between">
              <Segmented<Tab>
                label="Island panels"
                value={tab}
                onChange={(t) => {
                  setTab(t);
                  setSelected(null);
                }}
                options={[
                  { value: "shop", label: "Shop" },
                  { value: "landmarks", label: "Landmarks" },
                  { value: "arrange", label: "Arrange" },
                ]}
              />
              <span className="inline-flex items-center gap-1.5 text-base font-semibold text-fg">
                <Treecoin size={17} /> <span className="t-num">{coins.toLocaleString()}</span>
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {tab === "landmarks" && (
              <ul className="space-y-1">
                {UNITS.map((u) => {
                  const have = mastered.includes(u.n);
                  const best = profile.unit_best?.[`u${u.n}`];
                  return (
                    <li key={u.n} className="flex items-start gap-3 rounded-md p-2.5 hover:bg-surface-2/60">
                      <SpriteWell art={landmarkArt(u.n)} locked={!have} size="row" />
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-fg">{LANDMARK_INFO[u.n].name}</p>
                        <p className="flex items-center gap-1.5 text-sm text-fg-3">
                          {have ? <CheckCircle2 className="size-3.5 shrink-0 text-brand-ink" aria-hidden /> : <Lock className="size-3.5 shrink-0" aria-hidden />}
                          <span>
                            Unit {u.n} · {have ? "Unlocked" : best !== undefined ? `Best ${best}%, need ${MASTERY_PCT}%` : `Score ${MASTERY_PCT}% on the unit quiz`}
                          </span>
                        </p>
                      </div>
                      {!have && (
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/practice?mode=unit&unit=${u.n}`}>Quiz</Link>
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {tab === "shop" && (
              <div className="space-y-7">
                <section>
                  <p className="mb-3 text-sm font-semibold text-fg-2">Growth</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {GROWTH.map((g) => (
                      <MarketTile key={g.id} id={g.id} state={stateOf(g.id)} title={g.description}>
                        <SpriteWell art={g.art} locked={stateOf(g.id) === "locked"} />
                        <p className="mt-2 truncate text-sm font-semibold text-fg">{g.name}</p>
                        {stateOf(g.id) === "owned" ? (
                          <p className="mt-1.5 flex h-7 items-center gap-1 text-sm font-semibold text-brand-ink">
                            <Check className="size-3.5" /> On your island
                          </p>
                        ) : (
                          getButton(g.id, g.name, g.price)
                        )}
                      </MarketTile>
                    ))}
                  </div>
                </section>
                <section>
                  <p className="mb-3 text-sm font-semibold text-fg-2">Skies</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {SKIES.map((s) => {
                      const inUse = sky === s.id;
                      return (
                        <MarketTile key={s.id} id={s.id} state={stateOf(s.id)} selected={inUse}>
                          <SkyWell id={s.id} animated={s.animated} locked={stateOf(s.id) === "locked"} />
                          <p className="mt-2 truncate text-sm font-semibold text-fg">{s.name}</p>
                          {stateOf(s.id) === "owned" ? (
                            inUse ? (
                              <p className="mt-1.5 flex h-7 items-center gap-1 text-sm font-semibold text-brand-ink">
                                <Check className="size-3.5" /> In use
                              </p>
                            ) : (
                              <Button size="sm" variant="secondary" className="mt-1.5 h-7 w-full" onClick={() => applySky(s.id)}>
                                Use
                              </Button>
                            )
                          ) : (
                            getButton(s.id, s.name, s.price)
                          )}
                        </MarketTile>
                      );
                    })}
                  </div>
                </section>
                <section>
                  <p className="mb-3 text-sm font-semibold text-fg-2">Decorations</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {DECOR.map((d) => {
                      const count = decor.filter((x) => x.id === d.id).length;
                      return (
                        <MarketTile key={d.id} id={d.id} state={stateOf(d.id)} title={d.description}>
                          <SpriteWell art={d.art} locked={stateOf(d.id) === "locked"} />
                          <p className="mt-2 truncate text-sm font-semibold text-fg">{d.name}</p>
                          {stateOf(d.id) === "owned" ? (
                            <Button size="sm" variant="secondary" className="mt-1.5 h-7 w-full" onClick={() => place(d.id)}>
                              {count > 0 ? `Place another (${count})` : "Place"}
                            </Button>
                          ) : (
                            getButton(d.id, d.name, d.price)
                          )}
                        </MarketTile>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-sm text-fg-3">Treecoins come from daily sets, quizzes, lessons, FRQs and field quests.</p>
                </section>
              </div>
            )}

            {tab === "arrange" && (
              <div>
                {decor.length === 0 ? (
                  <p className="text-base text-fg-3">Nothing placed yet. Buy something in the Shop and it lands on your island.</p>
                ) : (
                  <ul className="space-y-1">
                    {decor.map((d, i) => (
                      <li
                        key={`${d.id}-${i}`}
                        className={cn("flex items-center gap-3 rounded-md px-2.5 py-2", selected === i ? "bg-brand-soft" : "hover:bg-surface-2/70")}
                      >
                        <button className="flex flex-1 items-center gap-3 text-left" onClick={() => setSelected(selected === i ? null : i)}>
                          <SpriteWell art={findDecor(d.id)?.art ?? ""} size="row" />
                          <span className="text-base font-medium text-fg">{findDecor(d.id)?.name}</span>
                        </button>
                        <Button variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label={`Remove ${findDecor(d.id)?.name}`}>
                          <Trash2 />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-5 flex gap-2">
                  <Button variant="secondary" onClick={() => setTab("shop")}>
                    <X /> Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Page>
  );
}
