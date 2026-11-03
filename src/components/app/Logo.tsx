import { cn } from "@/lib/utils";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id="eco-logo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#25935f" />
          <stop offset="1" stopColor="#176843" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#eco-logo)" />
      <circle cx="44.5" cy="19.5" r="6.5" fill="#f6cf6a" />
      <path d="M31.4 33.6V22.2" stroke="#eaf7ef" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M31.4 26.4c-5.6.2-9.4-3-10-8.6 5.8-.3 9.6 3 10 8.6Z" fill="#eaf7ef" />
      <path d="M31.6 23.8c.6-5.2 4.2-8.2 9.4-8 .2 5.3-3.6 8.4-9.4 8Z" fill="#bfe8cf" />
      <path d="M11 42.5c4.2-6.6 11.6-10.2 20.8-10.2 9.3 0 16.8 3.6 21.2 10.2Z" fill="#eaf7ef" />
      <path d="M9 48.6c3.1-2.2 6.3-2.2 9.4 0s6.3 2.2 9.4 0 6.3-2.2 9.4 0 6.3 2.2 9.4 0 4.7-1.6 7.4-.6" fill="none" stroke="#9fdcbc" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={28} />
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
