// Renders WebGL effects only where WebGL 2 works, and swaps in a fallback if
// the GPU context is ever lost (some school Chromebooks disable hardware
// acceleration). Without this a failed canvas shows Chrome's broken-canvas icon.
import { useEffect, useRef, useState, type ReactNode } from "react";

let supported: boolean | null = null;

export function canUseWebGL2(): boolean {
  if (supported !== null) return supported;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    supported = !!gl && !gl.isContextLost();
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    supported = false;
  }
  return supported;
}

export function GLGuard({ children, fallback = null, className }: { children: ReactNode; fallback?: ReactNode; className?: string }) {
  const [ok, setOk] = useState(canUseWebGL2);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onLost = () => setOk(false);
    // webglcontextlost does not bubble, so listen during capture.
    el.addEventListener("webglcontextlost", onLost, true);
    return () => el.removeEventListener("webglcontextlost", onLost, true);
  }, [ok]);
  if (!ok) return <>{fallback}</>;
  return (
    <div ref={ref} className={className ?? "absolute inset-0"}>
      {children}
    </div>
  );
}
