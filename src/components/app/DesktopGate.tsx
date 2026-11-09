// Ecoisland is built for laptops and desktops. Small screens get a friendly
// explanation instead of a squeezed layout.
import { Check, Copy, Laptop } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { IslandScene } from "@/components/island/IslandScene";
import { Button } from "@/components/ui/button";
import { LogoMark } from "./Logo";

const MIN_WIDTH = 1024;
// Printing (the volunteer hours record) lays out at paper width, which is
// narrower than MIN_WIDTH, so print always counts as wide enough.
const QUERY = `print, (min-width: ${MIN_WIDTH}px)`;

function useWideEnough() {
  const [wide, setWide] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const m = window.matchMedia(QUERY);
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

export function DesktopGate({ children }: { children: ReactNode }) {
  const wide = useWideEnough();
  const [copied, setCopied] = useState(false);
  if (wide) return <>{children}</>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked: the link is shown on screen anyway */
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-10 text-center">
      <LogoMark size={40} />
      <div className="mt-8 w-full max-w-[420px] overflow-hidden rounded-2xl border border-line shadow-md">
        <IslandScene xp={420} health={1} sky="day" animate={false} className="aspect-[5/3]" label="An Ecoisland" />
      </div>
      <h1 className="t-h1 mt-8 max-w-[18ch]">Oops! Ecoisland needs a bigger screen.</h1>
      <p className="mt-3 max-w-[34ch] text-md text-fg-3">
        It's built for laptops, Chromebooks and desktops. Open <span className="font-semibold text-fg-2">{window.location.host}</span> on a computer, or make this window wider.
      </p>
      <div className="mt-6 flex items-center gap-2">
        <Button variant="secondary" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Link copied" : "Copy link"}
        </Button>
      </div>
      <p className="mt-8 flex items-center gap-2 text-sm text-fg-4">
        <Laptop className="size-4" aria-hidden /> Needs a window at least {MIN_WIDTH}px wide
      </p>
    </main>
  );
}
