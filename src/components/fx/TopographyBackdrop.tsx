// The animated contour-line backdrop (React Bits Topography), in Ecoisland's
// brand color. Wraps it in GLGuard so devices without WebGL 2 just see the
// plain page. Override any prop; the defaults are the landing page's look.
import { GLGuard } from "@/components/bits/GLGuard";
import Topography, { type TopographyProps } from "@/components/bits/Topography";
import { COLORS } from "@/lib/tokens";

export function TopographyBackdrop(props: TopographyProps) {
  return (
    <GLGuard>
      <Topography color={COLORS.brand} lightMode opacity={0.4} lineCount={22} speed={0.25} mouseInteraction {...props} />
    </GLGuard>
  );
}
