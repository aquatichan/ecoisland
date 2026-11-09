// Click sparks (React Bits ClickSpark) in Ecoisland's brand, sun and ocean
// colors. Same props and ref handle as ClickSpark; pass sparkColor to override.
import { forwardRef } from "react";
import ClickSpark, { type ClickSparkHandle, type ClickSparkProps } from "@/components/bits/ClickSpark";
import { FX } from "@/lib/tokens";

export type { ClickSparkHandle };

export const SparkLayer = forwardRef<ClickSparkHandle, ClickSparkProps>(function SparkLayer(props, ref) {
  return <ClickSpark ref={ref} sparkColor={[...FX.sparks]} {...props} />;
});
