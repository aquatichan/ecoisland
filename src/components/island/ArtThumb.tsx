// A small preview of an item's art, for the market and the arrange list.
import { cn } from "@/lib/utils";
import { ART } from "./assets";

export function ArtThumb({ art, className }: { art: string; className?: string }) {
  const asset = ART[art];
  if (!asset) return <span aria-hidden className={cn("block size-full", className)} />;
  return <img src={asset.src} width={asset.w} height={asset.h} alt="" draggable={false} loading="lazy" decoding="async" className={cn("size-full object-contain", className)} />;
}
