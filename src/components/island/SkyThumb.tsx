// The preview on a sky card in the market: the sky's thumbnail art, or its gradient if it has none.
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SkyId } from "@/shared/catalog";
import { ART } from "./assets";
import { SKY_LOOKS } from "./skies";

export function SkyThumb({ id, animated }: { id: SkyId; animated?: boolean }) {
  const art = ART[`sky-${id}-thumb`];
  const look = SKY_LOOKS[id];
  return (
    <div className="relative h-[64px]" style={art ? undefined : { background: `linear-gradient(${look.sky[0]}, ${look.sky[1]} 60%, ${look.sea[1]} 61%, ${look.sea[2]})` }}>
      {art && <img src={art.src} width={art.w} height={art.h} alt="" draggable={false} loading="lazy" decoding="async" className="size-full object-cover" />}
      {animated && (
        <Badge tone="neutral" className="absolute top-1.5 right-1.5 h-5 bg-black/35 text-2xs text-white">
          <Sparkles /> Animated
        </Badge>
      )}
    </div>
  );
}
