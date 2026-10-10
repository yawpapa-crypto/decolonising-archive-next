"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ minHeight: "70svh", display: "grid", placeItems: "center", textAlign: "center", padding: 24, background: "#f7f5f3", color: "#0d0d0d" }}>
      <div style={{ maxWidth: 520 }}>
        <h1 style={{ fontWeight: 400, fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.1, margin: "0 0 16px" }}>Something went wrong.</h1>
        <p style={{ color: "#6e6a69", lineHeight: 1.55, margin: "0 0 28px" }}>The archive could not load this page. Try again, or return to a place that is working.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={reset} style={{ height: 44, padding: "0 22px", borderRadius: 999, border: 0, background: "#0d0d0d", color: "#f7f5f3", cursor: "pointer", font: "inherit" }}>Try again</button>
          <Link href="/explore" style={{ height: 44, padding: "0 22px", borderRadius: 999, border: "1px solid #d9d5d2", display: "inline-flex", alignItems: "center", color: "inherit", textDecoration: "none" }}>Explore</Link>
        </div>
      </div>
    </main>
  );
}
