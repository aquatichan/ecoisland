import { cn } from "@/lib/utils";

/** The Ecoisland logo (the original artwork, public/ecoisland_logo_new.png). */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo-64.png"
      srcSet="/logo-64.png 64w, /logo-192.png 192w"
      sizes={`${size}px`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      draggable={false}
      className={cn("shrink-0 object-contain select-none", className)}
    />
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={32} />
      <span className="font-display text-[19px] font-[600] tracking-[-0.02em] text-fg">Ecoisland</span>
    </span>
  );
}

/** Treecoin: a gold coin stamped with a leaf. */
export function Treecoin({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} className={cn("shrink-0", className)} aria-hidden>
      <circle cx="10" cy="10" r="9" fill="#e9a52e" />
      <circle cx="10" cy="10" r="7.2" fill="#f6c453" />
      <path d="M10 14.6V9.2M10 11.4c-2.6.1-4-1.4-4.3-4 2.7-.1 4.1 1.4 4.3 4Zm.1-1.2c.3-2.4 2-3.8 4.3-3.7.1 2.5-1.7 3.9-4.3 3.7Z" fill="none" stroke="#9a6406" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
