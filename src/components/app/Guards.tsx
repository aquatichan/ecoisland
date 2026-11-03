import { RotateCcw } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { isOnboarded, useSession } from "@/lib/session";
import { AppShell } from "./AppShell";
import { LogoMark } from "./Logo";

export function FullPageLoader({ label = "Loading Ecoisland" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg" role="status" aria-label={label}>
      <LogoMark size={44} className="animate-pulse" />
    </div>
  );
}

function ServerError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-8">
      <div className="card max-w-[460px] p-8 text-center">
        <LogoMark size={36} className="mx-auto" />
        <h1 className="t-h2 mt-5">Can't reach Ecoisland right now</h1>
        <p className="mt-2 text-[14.5px] text-fg-3">{message}</p>
        <Button className="mt-6" onClick={retry}>
          <RotateCcw /> Try again
        </Button>
      </div>
    </main>
  );
}

/** Signed in and onboarded; renders the app frame. */
export function RequireProfile() {
  const { status, profile, error, retry } = useSession();
  const location = useLocation();
  if (status === "loading") return <FullPageLoader />;
  if (status === "error") return <ServerError message={error ?? "Please try again in a moment."} retry={retry} />;
  if (status === "signed_out" || !isOnboarded(profile)) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/start?next=${encodeURIComponent(next)}`} replace />;
  }
  return (
    <AppShell>
      <Suspense fallback={<PagePlaceholder />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

export function PagePlaceholder() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="skeleton h-9 w-64" />
      <div className="skeleton h-48 w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-4">
        <div className="skeleton h-32 rounded-xl" />
        <div className="skeleton h-32 rounded-xl" />
        <div className="skeleton h-32 rounded-xl" />
      </div>
    </div>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`animate-rise ${className ?? ""}`}>{children}</div>;
}
