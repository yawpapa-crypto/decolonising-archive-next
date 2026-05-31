"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Global error boundary — catches errors in the root layout itself (fonts, CSS imports, etc.).
 * Must include <html> and <body> since it replaces the root layout when active.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[GlobalError boundary]", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "48px 24px", maxWidth: 540 }}>
        <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
        <p style={{ color: "#555", marginBottom: "1.5rem", lineHeight: 1.5 }}>
          An unexpected error occurred. Please try refreshing the page.
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
          Refresh
        </button>
        {process.env.NODE_ENV !== "production" && (
          <pre style={{ marginTop: 24, fontSize: "0.75rem", color: "#888", whiteSpace: "pre-wrap" }}>
            {error.message}
            {error.digest ? `\nDigest: ${error.digest}` : ""}
          </pre>
        )}
      </body>
    </html>
  );
}
