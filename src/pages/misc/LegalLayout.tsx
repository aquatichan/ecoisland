import { ArrowLeft, Mail } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/app/Logo";
import { useDocumentTitle } from "@/lib/hooks";

export const CONTACT_EMAIL = "aaronhanqin@gmail.com";

export type Section = { title: string; body: string[] };

export function LegalLayout({
  title,
  intro,
  updated,
  summary,
  sections,
  other,
  footer,
}: {
  title: string;
  intro: string;
  updated: string;
  summary: { label: string; text: string }[];
  sections: Section[];
  other: { to: string; label: string };
  footer: ReactNode;
}) {
  useDocumentTitle(title);
  return (
    <div className="min-h-dvh bg-bg">
      <header className="glass sticky top-0 z-10 border-b">
        <div className="mx-auto flex h-16 max-w-[880px] items-center justify-between px-5">
          <Link to="/" aria-label="Ecoisland home">
            <Logo />
          </Link>
          <Link to={other.to} className="text-[14px] font-semibold text-fg-3 hover:text-fg">
            {other.label}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[880px] px-5 py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-fg-3 hover:text-fg">
          <ArrowLeft className="size-4" /> Home
        </Link>
        <h1 className="t-h1 mt-6">{title}</h1>
        <p className="mt-3 max-w-[60ch] text-[16px] text-fg-3">{intro}</p>
        <p className="mt-2 text-[13px] text-fg-4">Last updated {updated}</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {summary.map((s) => (
            <div key={s.label} className="card p-5">
              <p className="text-[14px] font-semibold text-fg">{s.label}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-3">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-9">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="t-h2 text-[21px]">{s.title}</h2>
              <div className="mt-3 space-y-2.5 text-[15px] leading-relaxed text-fg-2">
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="card mt-12 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[52ch] text-[14.5px] text-fg-2">{footer}</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[11px] bg-brand px-4 text-[14px] font-semibold text-brand-fg">
            <Mail className="size-4" /> Email us
          </a>
        </section>
      </main>
    </div>
  );
}
