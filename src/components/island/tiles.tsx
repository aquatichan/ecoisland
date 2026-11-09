// The tile every island market card uses, so the Shop, the Landmarks list and the Arrange list look like one
// thing: the same card, the same well for the picture, the same padding, the same light.
//
//   MarketTile   the card (growth, a sky, a decoration). It carries its marketState, so what it offers is
//                one decision (see marketState in src/shared/island.ts), never a second opinion here.
//   SpriteWell   the well a sprite sits in. Lit from the upper left: the generated sprites are lit from the
//                upper left (design/island-art/README.md), so the well's tint brightens toward that corner
//                and the picture and its backdrop agree about where the light is.
//   SkyWell      the same well, holding a sky's thumbnail.
//
// A locked item is the same picture, greyed by a filter: there is no second set of art.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SkyId } from "@/shared/catalog";
import type { MarketState } from "@/shared/island";
import { ArtThumb } from "./ArtThumb";
import { SkyThumb } from "./SkyThumb";

/** The market card. One class for every kind of item. */
export const TILE = "rounded-md border border-line bg-surface p-2.5";
/** The well a picture sits in, lit from the upper left. */
export const WELL = "block overflow-hidden rounded-sm bg-linear-to-br from-surface-2 to-surface-3";
/** What a sprite's padding is inside its well. */
export const WELL_PAD = "p-2";
/** How a locked item's picture is shown: the same art, greyed. */
export const GREYED = "opacity-60 grayscale";
/** A well in the market grid fills the tile's width; in a list it is a square beside the text. */
export const WELL_SIZE = { grid: "h-18 w-full", row: "size-12 shrink-0" } as const;

export function MarketTile({ id, state, title, selected, children }: { id: string; state: MarketState; title?: string; selected?: boolean; children: ReactNode }) {
  return (
    <div data-tile data-item={id} data-state={state} title={title} className={cn(TILE, selected && "border-brand ring-2 ring-brand/25")}>
      {children}
    </div>
  );
}

export function SpriteWell({ art, locked, size = "grid" }: { art: string; locked?: boolean; size?: keyof typeof WELL_SIZE }) {
  return (
    <span data-well className={cn(WELL, WELL_PAD, WELL_SIZE[size])}>
      <ArtThumb art={art} className={locked ? GREYED : undefined} />
    </span>
  );
}

export function SkyWell({ id, animated, locked }: { id: SkyId; animated?: boolean; locked?: boolean }) {
  return (
    <span data-well className={cn(WELL, WELL_SIZE.grid)}>
      <SkyThumb id={id} animated={animated} locked={locked} />
    </span>
  );
}
