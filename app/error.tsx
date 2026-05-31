"use client";

import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Root error boundary — catches any unhandled server or client component error.
 * Renders INSIDE the root layout, so no <html>/<body> tags here.
 * Without this file a thrown server component leaves loading.tsx visible forever.
 */
export default function RootError({ error, reset }: ErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[RootError boundary]", error);
    }
  }, [error]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "48px 24px", maxWidth: 540 }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
      <p style={{ color: "#555", marginBottom: "1.5rem", lineHeight: 1.5 }}>
        The page encountered an error. This is usually a temporary issue.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "8px 18px",
          background: "#101318",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: "0.875rem",
        }}
      >
        Try again
      </button>
      {process.env.NODE_ENV !== "production" && (
        <pre style={{ marginTop: 24, fontSize: "0.75rem", color: "#888", whiteSpace: "pre-wrap" }}>
          {error.message}
          {error.digest ? `\nDigest: ${error.digest}` : ""}
        </pre>
      )}
    </div>
  );
}
