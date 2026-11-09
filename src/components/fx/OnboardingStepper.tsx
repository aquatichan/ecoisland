// The onboarding stepper (React Bits Stepper) dressed in Ecoisland's tokens.
// Its frame, tiles and ink are CSS variables, so they follow src/index.css.
import type { ComponentProps, CSSProperties } from "react";
import Stepper from "@/components/bits/Stepper";

export { Step } from "@/components/bits/Stepper";

const STYLE = {
  "--stepper-frame": "var(--surface)",
  "--stepper-frame-edge": "var(--line)",
  "--stepper-frame-highlight": "transparent",
  "--stepper-frame-shadow": "var(--shadow-sm)",
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
  // The light theme brightens the green on hover (1.3), which puts white text at 3.4:1. Darken it instead, as our own
  // primary button does, so the label passes AA when hovered.
  "--stepper-solid-hover": "brightness(0.9)",
} as CSSProperties;

// The banners' corner (--radius-2xl, 28px) and shadow, so the frame is the same container as a page's banner.
const RADIUS_2XL = 28;

type StepperProps = ComponentProps<typeof Stepper>;

export function OnboardingStepper(props: Omit<StepperProps, "theme" | "style">) {
  return <Stepper theme="light" width={620} radius={RADIUS_2XL} {...props} style={STYLE} />;
}
