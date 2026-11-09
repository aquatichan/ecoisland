import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const button = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,box-shadow,color,transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.12)] hover:bg-brand-strong",
        secondary: "border border-line-strong bg-surface text-fg shadow-xs hover:bg-surface-2",
        soft: "bg-brand-soft text-brand-ink hover:bg-[color-mix(in_srgb,var(--brand)_20%,transparent)]",
        ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg",
        danger: "bg-coral text-white hover:bg-[color-mix(in_srgb,var(--coral)_88%,black)]",
        "danger-soft": "bg-coral-soft text-coral hover:bg-[color-mix(in_srgb,var(--coral)_18%,transparent)]",
      },
      size: {
        sm: "h-8 rounded-sm px-3 text-sm [&_svg]:size-3.5",
        md: "h-10 rounded-md px-4 text-base [&_svg]:size-4",
        lg: "h-12 rounded-md px-5 text-md [&_svg]:size-[18px]",
        icon: "size-9 rounded-md [&_svg]:size-[18px]",
        "icon-sm": "size-8 rounded-sm [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & { asChild?: boolean; loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild, loading, disabled, children, ...props },
  ref,
) {
  if (asChild) {
    return (
      <Slot ref={ref} className={cn(button({ variant, size }), className)} {...props}>
        {children}
      </Slot>
    );
  }
  return (
    <button ref={ref} className={cn(button({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export { button as buttonVariants };
