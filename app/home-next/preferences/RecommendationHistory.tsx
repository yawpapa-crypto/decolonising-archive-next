"use client";
import { useState } from "react";
export default function RecommendationHistory() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section style={{ marginTop: 32 }}>
      <h2>Discovery history</h2>
      <p>
        Recent record and source opens help shape For You. Searches influence
        the current session only. Your saved material and chosen interests
        remain the strongest signals.
      </p>
      <button
        type="button"
        disabled={busy}
        className="fy-pill fy-pill--outline"
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch("/api/recommendations/events", {
              method: "DELETE",
            });
            if (r.ok) {
              sessionStorage.removeItem("ared-current-intent");
              for (const key of Object.keys(sessionStorage))
                if (key.startsWith("ared-for-you:")) sessionStorage.removeItem(key);
            }
            setMessage(
              r.ok
                ? "Discovery history cleared. Your interests, saves and collections remain."
                : "Could not clear history. Please try again.",
            );
          } catch {
            setMessage("Could not clear history. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Clear discovery history
      </button>
      <p role="status">{message}</p>
    </section>
  );
}
