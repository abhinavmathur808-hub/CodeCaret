import { Component } from "react";

/* ══════════════════════════════════════════════════════════════
   AppErrorBoundary — the last line of defence for a render error.

   Without it, an exception anywhere in the tree unmounts the whole
   app and leaves a blank page with no way forward. This shows what
   happened in plain words and offers the two ways out that work:
   reload, or go back to the start.

   The 3D scenes have their own, narrower boundaries (StageBoundary,
   the landing scene); this one catches everything else.
   ══════════════════════════════════════════════════════════════ */

export default class AppErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("CodeCaret hit an error it could not recover from:", error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main
        role="alert"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px 16px",
          background: "var(--cc-bg, #0a0a0a)",
          color: "var(--cc-text, #fff)",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 440 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.9rem", margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ color: "var(--cc-text-2, #bbb)", lineHeight: 1.55, margin: "0 0 22px" }}>
            The page hit an error it couldn&apos;t recover from. Your saved laps and settings are safe.
            Reloading usually fixes it.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: 0,
                background: "var(--cc-accent, #e10600)",
                color: "var(--cc-on-accent, #fff)",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
              }}
            >
              Reload
            </button>
            <a
              href="/"
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "1px solid var(--cc-border-strong, #444)",
                color: "inherit",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "0.95rem",
                textDecoration: "none",
              }}
            >
              Go to the home page
            </a>
          </div>
        </div>
      </main>
    );
  }
}
