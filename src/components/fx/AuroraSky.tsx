// The "Northern lights" island sky (React Bits Aurora), loaded on demand and
// kept inside GLGuard. Sits in the top of its parent, behind the island.
import { Suspense, lazy } from "react";
import { GLGuard } from "@/components/bits/GLGuard";
import { FX } from "@/lib/tokens";

const Aurora = lazy(() => import("@/components/bits/Aurora"));

export function AuroraSky({ className = "absolute inset-x-0 top-0 h-[62%]" }: { className?: string }) {
  return (
    <Suspense fallback={null}>
      <GLGuard className={className}>
        <Aurora colorStops={[...FX.aurora]} amplitude={1.1} blend={0.6} speed={0.6} />
      </GLGuard>
    </Suspense>
  );
}
