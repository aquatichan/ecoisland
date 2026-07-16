import React from "react";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Catches render errors from any page so a single broken component shows a
 * friendly recovery card instead of white-screening the whole app.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Ecoisland page crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "radial-gradient(ellipse at 50% 0%, #062d1e 0%, #020c08 70%)" }}
      >
        <div
          className="max-w-md w-full rounded-3xl p-8 text-center"
          style={{ background: "rgba(8,24,16,0.9)", border: "1.5px solid rgba(0,200,150,0.25)" }}
        >
          <div className="text-5xl mb-4">🌊</div>
          <h1 className="text-2xl font-black text-white mb-2">Rough tides hit this island</h1>
          <p className="text-slate-400 text-sm mb-6">
            Something went wrong loading this page. Your progress and Treecoins are safe — try
            reloading, or head back to your Dashboard.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-black"
              style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)" }}
            >
              Reload Page
            </button>
            <button
              onClick={() => { window.location.href = "/dashboard"; }}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-white"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
