"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clearResearchActivity } from "@/lib/workbench-activity-actions";

export default function IntelligencePrivacyPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClearActivity() {
    if (!window.confirm("Clear all tracked research activity for your account?")) return;
    setMessage(null);
    startTransition(async () => {
      const result = await clearResearchActivity();
      if (!result.ok) {
        setMessage(result.error ?? "Could not clear activity.");
        return;
      }
      setMessage("Research activity cleared.");
      router.refresh();
    });
  }

  return (
    <details className="ri-section-shell ri-privacy-panel" aria-label="Privacy and activity">
      <summary className="ri-privacy-panel__summary">
        <span>Privacy & data use</span>
      </summary>
      <p className="ri-section-intro">
        Research Intelligence uses only your authenticated account data. Activity is scoped to your
        user ID via row-level security and is used to generate insights on this page.
      </p>

      <div className="ri-privacy-actions">
        <button
          type="button"
          className="ri-btn ri-btn--danger"
          disabled={isPending}
          onClick={handleClearActivity}
        >
          Clear research activity
        </button>
        {message ? <p className="ri-inline-message">{message}</p> : null}
      </div>
    </details>
  );
}
