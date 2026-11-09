// The onboarding stepper (React Bits Stepper) dressed in Ecoisland's tokens.
// Its frame, tiles and ink are CSS variables, so they follow src/index.css.
import type { ComponentProps, CSSProperties } from "react";
import Stepper from "@/components/bits/Stepper";

export { Step } from "@/components/bits/Stepper";

const STYLE = {
  "--stepper-frame": "var(--surface)",
  "--stepper-frame-edge": "var(--line)",
  "--stepper-frame-highlight": "transparent",
  "--stepper-frame-shadow": "var(--shadow-lg)",
  "--stepper-tile": "var(--surface)",
  "--stepper-tile-edge": "var(--line-strong)",
  "--stepper-tile-highlight": "transparent",
  "--stepper-tile-shadow": "var(--shadow-sm)",
  "--stepper-well": "var(--surface-2)",
  "--stepper-track": "var(--surface-3)",
  "--stepper-ink": "var(--fg)",
  "--stepper-muted": "var(--fg-3)",
  "--stepper-faint": "var(--line-strong)",
  "--stepper-solid": "var(--brand)",
  "--stepper-solid-ink": "var(--brand-fg)",
} as CSSProperties;

type StepperProps = ComponentProps<typeof Stepper>;

export function OnboardingStepper(props: Omit<StepperProps, "theme" | "style">) {
  return <Stepper theme="light" width={620} radius={26} {...props} style={STYLE} />;
}
