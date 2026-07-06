"use client";

import { useEffect, useRef, useState } from "react";
import {
  markOnboardingCompleted,
  fetchOnboardingProgress,
} from "@/lib/onboarding-actions";

const LS_DISMISSED = "da_onboarding_dismissed";
const LS_STEPS = "da_onboarding_steps";

// Flags written by other parts of the app as the user navigates
const LS_SEARCHED = "da_onboarding_search_seen";
const LS_WORKBENCH = "da_onboarding_workbench_seen";
const LS_COMMUNITY = "da_onboarding_community_seen";

type StepId = "search" | "save" | "workbench" | "community" | "profile";

const STEPS: Array<{
  id: StepId;
  label: string;
  description: string;
  href: string;
  action: string;
}> = [
  {
    id: "search",
    label: "Search the archive",
    description: "Use the library search to find sources, records and ideas.",
    href: "/library",
    action: "Go to Library",
  },
  {
    id: "save",
    label: "Save a record",
    description: "Bookmark a source to return to later.",
    href: "/library",
    action: "Browse records",
  },
  {
    id: "workbench",
    label: "Open the Workbench",
    description: "Create a document, board or canvas for your research.",
    href: "/my/workbench",
    action: "Open Workbench",
  },
  {
    id: "community",
    label: "Read the Community",
    description: "Browse reflections, notes and shared reading paths.",
    href: "/community",
    action: "Visit Community",
  },
  {
    id: "profile",
    label: "Complete your profile",
    description: "Add your name, affiliation and bio so others can understand your work.",
    href: "/my/settings",
    action: "Edit profile",
  },
];

type Props = {
  /** profiles.onboarding_completed — skip showing if true */
  initialCompleted?: boolean;
  /** DB signals fetched server-side for steps that have DB sources */
  initialProgress?: {
    hasSaved: boolean;
    hasWorkbench: boolean;
    profileComplete: boolean;
  };
};

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {
    // ignore
  }
}

export default function OnboardingChecklist({
  initialCompleted = false,
  initialProgress,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [completed, setCompleted] = useState<Set<StepId>>(new Set());
  // Track which steps are "auto-detected" (immutable from DB/LS activity)
  const autoRef = useRef<Set<StepId>>(new Set());

  useEffect(() => {
    setMounted(true);
    if (initialCompleted) return;
    if (lsGet(LS_DISMISSED)) return;

    // Build initial completion set from DB signals + localStorage activity
    const auto = new Set<StepId>();
    if (initialProgress?.hasSaved) auto.add("save");
    if (initialProgress?.hasWorkbench) auto.add("workbench");
    if (initialProgress?.profileComplete) auto.add("profile");

    if (lsGet(LS_SEARCHED)) auto.add("search");
    if (lsGet(LS_WORKBENCH)) auto.add("workbench");
    if (lsGet(LS_COMMUNITY)) auto.add("community");

    autoRef.current = auto;

    // Merge with any manually-toggled steps
    const manual = new Set<StepId>();
    const raw = lsGet(LS_STEPS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StepId[];
        parsed.forEach((id) => manual.add(id));
      } catch {
        // ignore bad JSON
      }
    }

    const merged = new Set<StepId>([...auto, ...manual]);
    setCompleted(merged);
    setVisible(true);

    // If all steps already done from prior activity, quietly complete
    if (merged.size >= STEPS.length) {
      void markOnboardingCompleted();
    }
  }, [initialCompleted, initialProgress]);

  // Periodically refresh DB-derived signals (once on mount)
  useEffect(() => {
    if (initialCompleted) return;
    void fetchOnboardingProgress().then((progress) => {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (progress.hasSaved) next.add("save");
        if (progress.hasWorkbench) next.add("workbench");
        if (progress.profileComplete) next.add("profile");
        autoRef.current = new Set([...autoRef.current, ...next]);
        return next;
      });
    });
  }, [initialCompleted]);

  function toggleStep(id: StepId) {
    // Auto-detected steps cannot be unticked manually
    if (autoRef.current.has(id)) return;
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      lsSet(LS_STEPS, JSON.stringify([...next].filter((s) => !autoRef.current.has(s))));
      return next;
    });
  }

  function dismiss() {
    lsSet(LS_DISMISSED, "1");
    setVisible(false);
  }

  function completeAll() {
    setVisible(false);
    lsSet(LS_DISMISSED, "1");
    void markOnboardingCompleted();
  }

  if (!mounted || !visible) return null;

  const doneCount = completed.size;
  const total = STEPS.length;
  const allDone = doneCount >= total;

  return (
    <aside className="onboarding-checklist" aria-label="Getting started checklist">
      <div className="onboarding-checklist__header">
        <div>
          <h2 className="onboarding-checklist__title">Getting started</h2>
          <p className="onboarding-checklist__progress">
            {doneCount} of {total} steps complete
          </p>
        </div>
        <button
          type="button"
          className="onboarding-checklist__close"
          aria-label="Dismiss getting started guide"
          onClick={dismiss}
        >
          ×
        </button>
      </div>

      <div
        className="onboarding-checklist__bar"
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${doneCount} of ${total} steps complete`}
      >
        <div
          className="onboarding-checklist__bar-fill"
          style={{ width: `${(doneCount / total) * 100}%` }}
        />
      </div>

      <ol className="onboarding-checklist__steps">
        {STEPS.map((step) => {
          const done = completed.has(step.id);
          const isAuto = autoRef.current.has(step.id);
          return (
            <li key={step.id} className={`onboarding-checklist__step${done ? " is-done" : ""}`}>
              <button
                type="button"
                className="onboarding-checklist__check"
                aria-pressed={done}
                aria-label={
                  isAuto
                    ? `${step.label} — completed`
                    : done
                    ? `Mark "${step.label}" as not done`
                    : `Mark "${step.label}" as done`
                }
                onClick={() => toggleStep(step.id)}
                disabled={isAuto}
              >
                {done ? "✓" : "○"}
              </button>
              <div className="onboarding-checklist__step-content">
                <strong>{step.label}</strong>
                <span>{step.description}</span>
              </div>
              <a href={step.href} className="onboarding-checklist__step-link">
                {step.action}
              </a>
            </li>
          );
        })}
      </ol>

      {allDone ? (
        <div className="onboarding-checklist__complete" role="status">
          All steps complete. Welcome to the archive.{" "}
          <button type="button" className="onboarding-checklist__dismiss-link" onClick={completeAll}>
            Dismiss
          </button>
        </div>
      ) : null}
    </aside>
  );
}
