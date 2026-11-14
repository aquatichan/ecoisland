// The button's look, kept apart from the component so a unit test can read it
// (see test/unit/button-focus.test.ts).
//
// Focus ring: the app's one focus style is `box-shadow: var(--ring)` on
// :focus-visible (src/index.css). A `shadow-*` utility on a button outranks that
// rule, because utilities sit above the base layer. So a button that sets its own
// resting shadow must also compose the shared --ring token over it when focused;
// otherwise the ring disappears. Variants with no shadow of their own (soft, ghost,
// danger) need nothing: the global rule already reaches them.
//
// Buttons are pills. The two raised ones (primary, sun) sit on a darker edge and sink onto
// it when pressed, like a button in a game.
//
// The classes are written out in full, not built from parts, so Tailwind can see them.
import { cva } from "class-variance-authority";

export const button = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,box-shadow,color,transform,opacity,filter] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // The main action: a raised pill with a darker edge under it, which it sinks onto when pressed.
        // The edge and the glow are worked out on the button itself, so they follow the brand in force.
        primary:
          "bg-brand text-brand-fg [--btn-edge:color-mix(in_srgb,var(--brand-strong)_68%,var(--fg))] [--btn-glow:color-mix(in_srgb,var(--brand)_55%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_3px_0_var(--btn-edge),0_10px_18px_-8px_var(--btn-glow)] focus-visible:shadow-[var(--ring),inset_0_1px_0_rgba(255,255,255,0.28),0_3px_0_var(--btn-edge),0_10px_18px_-8px_var(--btn-glow)] hover:bg-brand-strong active:translate-y-0.5 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_0_var(--btn-edge)] disabled:shadow-none",
        // The gold call to action (the landing page's closing button, a reward to claim).
        sun: "bg-sun text-fg [--btn-edge:color-mix(in_srgb,var(--sun)_60%,var(--fg))] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_3px_0_var(--btn-edge)] focus-visible:shadow-[var(--ring),inset_0_1px_0_rgba(255,255,255,0.45),0_3px_0_var(--btn-edge)] hover:brightness-105 active:translate-y-0.5 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_0_var(--btn-edge)] disabled:shadow-none",
        secondary: "border border-line-strong bg-surface text-fg shadow-xs focus-visible:shadow-[var(--ring),var(--shadow-xs)] hover:bg-surface-2",
        soft: "bg-brand-soft text-brand-ink hover:bg-[color-mix(in_srgb,var(--brand)_20%,transparent)]",
        ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg",
        danger: "bg-coral text-coral-fg hover:bg-coral-strong",
        "danger-soft": "bg-coral-soft text-coral hover:bg-[color-mix(in_srgb,var(--coral)_18%,transparent)]",
      },
      size: {
        sm: "h-8 rounded-full px-3.5 text-sm [&_svg]:size-3.5",
        md: "h-10 rounded-full px-4.5 text-base [&_svg]:size-4",
        lg: "h-12 rounded-full px-6 text-md [&_svg]:size-4.5",
        icon: "size-9 rounded-full [&_svg]:size-4.5",
        "icon-sm": "size-8 rounded-full [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export { button as buttonVariants };
