import { Component, type ErrorInfo, type ReactNode } from "react";
import { track } from "@/lib/analytics";

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
    track("app_error", { message: error.message.slice(0, 100), path: window.location.pathname });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg p-8">
        <div className="card max-w-[440px] p-8 text-center">
          <p className="t-eyebrow">Something broke</p>
          <h1 className="t-h2 mt-3">This page hit an error.</h1>
          <p className="mt-2 text-md text-fg-3">Your progress is saved on the server. Reloading usually fixes it.</p>
          <div className="mt-6 flex justify-center gap-2">
            <button className="h-10 rounded-md bg-brand px-4 text-base font-semibold text-brand-fg" onClick={() => window.location.reload()}>
              Reload
            </button>
            <a className="inline-flex h-10 items-center rounded-md border border-line-strong px-4 text-base font-semibold text-fg" href="/today">
              Go to Today
            </a>
          </div>
        </div>
      </main>
    );
  }
}
