// The preview on a sky card in the market: the sky's thumbnail art, or its gradient if it has none. It
// fills the well it sits in (see tiles.tsx). A locked sky is greyed by a filter on the picture only; the
// "Animated" chip stays in full colour, on glass, so its text never sits on bare art.
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkyId } from "@/shared/catalog";
import { ART } from "./assets";
import { SKY_LOOKS } from "./skies";

export function SkyThumb({ id, animated, locked }: { id: SkyId; animated?: boolean; locked?: boolean }) {
  const art = ART[`sky-${id}-thumb`];
  const look = SKY_LOOKS[id];
  const grey = locked ? "opacity-60 grayscale" : undefined;
  return (
    <span className="relative block size-full">
      {art ? (
        <img src={art.src} width={art.w} height={art.h} alt="" draggable={false} loading="lazy" decoding="async" className={cn("size-full object-cover", grey)} />
      ) : (
        <span aria-hidden className={cn("block size-full", grey)} style={{ background: `linear-gradient(${look.sky[0]}, ${look.sky[1]} 60%, ${look.sea[1]} 61%, ${look.sea[2]})` }} />
      )}
      {animated && (
        <span className="glass absolute top-1.5 right-1.5 inline-flex h-5 items-center gap-1 rounded-full border px-2 text-2xs font-semibold text-fg-2 [&_svg]:size-3">
          <Sparkles aria-hidden /> Animated
        </span>
      )}
    </span>
  );
}
