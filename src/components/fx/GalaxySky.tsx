// The "Deep space" island sky (React Bits Galaxy), loaded on demand and kept
// inside GLGuard. Sits in the top of its parent, behind the island.
import { Suspense, lazy } from "react";
import { GLGuard } from "@/components/bits/GLGuard";

const Galaxy = lazy(() => import("@/components/bits/Galaxy"));

export function GalaxySky({ className = "absolute inset-x-0 top-0 h-[62%]" }: { className?: string }) {
  return (
    <Suspense fallback={null}>
      <GLGuard className={className}>
        <Galaxy transparent density={1.1} glowIntensity={0.35} saturation={0.6} hueShift={210} mouseInteraction={false} twinkleIntensity={0.4} />
      </GLGuard>
    </Suspense>
  );
}
