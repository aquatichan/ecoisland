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
// The classes are written out in full, not built from parts, so Tailwind can see them.
import { cva } from "class-variance-authority";

export const button = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,box-shadow,color,transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-brand-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.12)] focus-visible:shadow-[var(--ring),inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.12)] hover:bg-brand-strong",
        secondary: "border border-line-strong bg-surface text-fg shadow-xs focus-visible:shadow-[var(--ring),var(--shadow-xs)] hover:bg-surface-2",
        soft: "bg-brand-soft text-brand-ink hover:bg-[color-mix(in_srgb,var(--brand)_20%,transparent)]",
        ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg",
        danger: "bg-coral text-coral-fg hover:bg-coral-strong",
        "danger-soft": "bg-coral-soft text-coral hover:bg-[color-mix(in_srgb,var(--coral)_18%,transparent)]",
      },
      size: {
        sm: "h-8 rounded-sm px-3 text-sm [&_svg]:size-3.5",
        md: "h-10 rounded-md px-4 text-base [&_svg]:size-4",
        lg: "h-12 rounded-md px-5 text-md [&_svg]:size-4.5",
        icon: "size-9 rounded-md [&_svg]:size-4.5",
        "icon-sm": "size-8 rounded-sm [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export { button as buttonVariants };
