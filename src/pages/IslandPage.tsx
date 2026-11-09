import { Check, CheckCircle2, Lock, Move, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Page } from "@/components/app/Guards";
import { Treecoin } from "@/components/app/Logo";
import { DecorPreview } from "@/components/island/Decor";
import { IslandScene } from "@/components/island/IslandScene";
import { LANDMARK_INFO } from "@/components/island/Landmarks";
import { SKY_PALETTES, islandPalette } from "@/components/island/palette";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { track } from "@/lib/analytics";
import { api, errorMessage, type PurchaseResult } from "@/lib/api";
import { useDocumentTitle, useToday } from "@/lib/hooks";
import { updateProfile } from "@/lib/profile";
import { useProfile } from "@/lib/session";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { DECOR, MAX_PLACED_DECOR, SKIES, findDecor, findSky, type DecorId, type SkyId } from "@/shared/catalog";
import { MASTERY_PCT, islandHealth, masteredUnits, stageProgress } from "@/shared/economy";
import { UNITS } from "@/shared/curriculum";
import type { PlacedDecor } from "@/shared/types";

type Tab = "landmarks" | "shop" | "arrange";

export default function IslandPage() {
  const profile = useProfile();
  const today = useToday();
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
  const health = islandHealth(profile.last_set_day, today);
  const progress = stageProgress(xp);
  const owned = useMemo(() => new Set(profile.owned_items ?? []), [profile.owned_items]);
  const sky = findSky(profile.island_skybox)?.id ?? "day";
  const mastered = masteredUnits(profile.unit_best);
  const coins = profile.treecoins ?? 0;
  const p = useMemo(() => islandPalette(1), []);
  const islandName = profile.island_name?.trim() || `${profile.username || "Your"}'s island`;

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
      track("purchase", { item: id });
      const asSky = findSky(id);
      if (asSky) {
        await updateProfile(profile.id, { island_skybox: asSky.id });
      } else {
        const d = findDecor(id);
        if (d && decor.length < MAX_PLACED_DECOR) saveDecor([...decor, { id: d.id, x: d.x, y: d.y }]);
      }
      toast.show({ tone: "success", title: `${label} is yours`, body: asSky ? "Your sky has changed." : "It's on your island. Switch to Arrange to move it." });
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
      <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-6">
        <div>
          <Card className="overflow-hidden">
            <div className="relative">
              <IslandScene
                xp={xp}
                health={health.value}
                sky={sky}
                decor={decor}
                landmarks={mastered}
                seed={profile.id}
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
            <div className="flex items-center gap-6 border-t border-line p-6">
              <div className="min-w-0 flex-1">
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
                      className="font-display w-full max-w-[340px] border-b border-brand bg-transparent text-3xl font-[560] text-fg outline-none"
                      aria-label="Island name"
                    />
                  </form>
                ) : (
                  <button onClick={() => setEditingName(true)} className="group flex items-center gap-2 text-left" aria-label="Rename your island">
                    <h1 className="t-h2 truncate">{islandName}</h1>
                    <Pencil className="size-4 text-fg-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                )}
                <p className="mt-1 text-base text-fg-3">
                  {progress.stage.name} · {progress.stage.blurb}
                </p>
              </div>
              <div className="w-[300px]">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-fg-2">{progress.next ? `Next: ${progress.next.name}` : "Fully grown"}</span>
                  <span className="t-num text-fg-3">{progress.next ? `${progress.toNext} XP to go` : `${xp.toLocaleString()} XP`}</span>
                </div>
                <ProgressBar value={progress.pct} label="Growth to next stage" />
              </div>
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

        <Card className="flex max-h-[calc(100dvh-120px)] flex-col self-start overflow-hidden sticky top-24">
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
                      <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-md", have ? "bg-brand-soft text-brand-ink" : "bg-surface-2 text-fg-4")}>
                        {have ? <CheckCircle2 className="size-4" /> : <Lock className="size-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-fg">{LANDMARK_INFO[u.n].name}</p>
                        <p className="text-sm text-fg-3">
                          Unit {u.n} · {have ? "Unlocked" : best !== undefined ? `Best ${best}%, need ${MASTERY_PCT}%` : `Score ${MASTERY_PCT}% on the unit quiz`}
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
                  <p className="mb-3 text-sm font-semibold text-fg-2">Skies</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {SKIES.map((s) => {
                      const has = s.price === 0 || owned.has(s.id);
                      const inUse = sky === s.id;
                      const sp = SKY_PALETTES[s.id];
                      return (
                        <div key={s.id} className={cn("overflow-hidden rounded-md border", inUse ? "border-brand ring-2 ring-brand/25" : "border-line")}>
                          <div className="relative h-[64px]" style={{ background: `linear-gradient(${sp.top}, ${sp.mid} 60%, ${sp.water[1]} 61%, ${sp.water[2]})` }}>
                            {s.animated && (
                              <Badge tone="neutral" className="absolute top-1.5 right-1.5 h-5 bg-black/35 text-2xs text-white">
                                <Sparkles /> Animated
                              </Badge>
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className="truncate text-sm font-semibold text-fg">{s.name}</p>
                            {inUse ? (
                              <p className="mt-1.5 flex h-7 items-center gap-1 text-sm font-semibold text-brand-ink">
                                <Check className="size-3.5" /> In use
                              </p>
                            ) : has ? (
                              <Button size="sm" variant="secondary" className="mt-1.5 h-7 w-full" onClick={() => applySky(s.id)}>
                                Use
                              </Button>
                            ) : (
                              <Button size="sm" variant="soft" className="mt-1.5 h-7 w-full" disabled={coins < s.price} loading={buying === s.id} onClick={() => void buy(s.id, s.name)}>
                                <Treecoin size={13} /> {s.price}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <section>
                  <p className="mb-3 text-sm font-semibold text-fg-2">Decorations</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {DECOR.map((d) => {
                      const has = owned.has(d.id);
                      const count = decor.filter((x) => x.id === d.id).length;
                      return (
                        <div key={d.id} className="rounded-md border border-line p-2.5" title={d.description}>
                          <div className="h-[72px] rounded-sm bg-surface-2/70 p-2">
                            <DecorPreview id={d.id} p={p} />
                          </div>
                          <p className="mt-2 truncate text-sm font-semibold text-fg">{d.name}</p>
                          {has ? (
                            <Button size="sm" variant="secondary" className="mt-1.5 h-7 w-full" onClick={() => place(d.id)}>
                              {count > 0 ? `Place another (${count})` : "Place"}
                            </Button>
                          ) : (
                            <Button size="sm" variant="soft" className="mt-1.5 h-7 w-full" disabled={coins < d.price} loading={buying === d.id} onClick={() => void buy(d.id, d.name)}>
                              <Treecoin size={13} /> {d.price}
                            </Button>
                          )}
                        </div>
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
                          <span className="size-9 rounded-sm bg-surface-2 p-1">
                            <DecorPreview id={d.id} p={p} />
                          </span>
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
