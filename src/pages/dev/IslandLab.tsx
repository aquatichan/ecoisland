// Development-only gallery of island states, for checking the artwork.
import { useState } from "react";
import { demoGrowth } from "@/components/island/demo";
import { IslandScene } from "@/components/island/IslandScene";
import { DECOR, SKIES, type SkyId } from "@/shared/catalog";

const XP = [0, 25, 150, 420, 900, 2400];

export default function IslandLab() {
  const params = new URLSearchParams(window.location.search);
  const [sky] = useState<SkyId>((params.get("sky") as SkyId) || "day");
  const health = Number(params.get("health") ?? 1);
  const all = params.get("all") === "1";
  const single = params.get("xp");
  const only = params.get("decor")?.split(",");
  const decor = all || only ? DECOR.filter((d) => !only || only.includes(d.id)).map((d) => ({ id: d.id, x: d.x, y: d.y })) : [];
  const landmarks = all ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [];
  if (single) {
    return (
      <div className="p-4">
        <IslandScene growth={demoGrowth(Number(single))} health={health} sky={sky} decor={decor} landmarks={landmarks} animate={false} className="aspect-[5/3] w-[1200px] rounded-xl" />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {XP.map((xp) => (
        <IslandScene key={xp} growth={demoGrowth(xp)} health={health} sky={sky} decor={decor} landmarks={landmarks} animate={false} className="aspect-[5/3] rounded-xl" />
      ))}
      <p className="col-span-3 text-sm text-fg-3">Skies: {SKIES.map((s) => s.id).join(", ")}</p>
    </div>
  );
}
