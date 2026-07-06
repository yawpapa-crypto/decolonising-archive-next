"use client";

import { useState } from "react";
import type { CollectionRecordResearchInput } from "@/lib/research/collection-record-research";
import CitationPanel from "@/components/research/CitationPanel";
import { useRecordResearchTools } from "@/components/research/useRecordResearchTools";

type Variant = "bar" | "compact" | "sticky";
type IconName = "cite" | "save" | "saved" | "bookmark" | "list" | "share" | "link";

type Props = {
  input: CollectionRecordResearchInput;
  variant?: Variant;
};

function ResearchIcon({ name }: { name: IconName }) {
  const props = {
    className: "research-action-svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "cite":
      return (
        <svg {...props}>
          <path d="M7 7a3 3 0 0 1 3 3v7H6V10a1 1 0 0 0-1-1H4" />
          <path d="M17 7a3 3 0 0 1 3 3v7h-4v-7a1 1 0 0 0-1-1h-1" />
        </svg>
      );
    case "save":
      return (
        <svg {...props}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "saved":
      return (
        <svg {...props} fill="currentColor" stroke="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "bookmark":
      return (
        <svg {...props}>
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "list":
      return (
        <svg {...props}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case "share":
      return (
        <svg {...props}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      );
    case "link":
      return (
        <svg {...props}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
  }
}

function ActionButton({
  label,
  icon,
  onClick,
  active,
  busy,
  ariaLabel,
}: {
  label: string;
  icon: IconName;
  onClick: () => void;
  active?: boolean;
  busy?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={`research-action-btn${active ? " is-active" : ""}`}
      onClick={onClick}
      disabled={busy}
      aria-label={ariaLabel ?? label}
      aria-current={active ? "true" : undefined}
    >
      <span className="research-action-icon">
        <ResearchIcon name={icon} />
      </span>
      <span className="research-action-label">{label}</span>
    </button>
  );
}

export default function RecordResearchActions({ input, variant = "bar" }: Props) {
  const [citeOpen, setCiteOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const { session, loading, message, busy, toggleBookmark, addToList, copyLink } =
    useRecordResearchTools(input);

  const share = async () => {
    const url = `${window.location.origin}${input.canonicalPath}`;
    const text = `${input.title} — ${input.collectionTitle}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: input.title, text, url });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await copyLink();
  };

  return (
    <>
      <CitationPanel input={input} open={citeOpen} onClose={() => setCiteOpen(false)} />

      <div
        className={`research-actions research-actions--${variant}`}
        role="toolbar"
        aria-label="Research actions"
      >
        <ActionButton label="Cite" icon="cite" onClick={() => setCiteOpen(true)} ariaLabel="Cite this record" />
        <ActionButton
          label={session.bookmarked ? "Saved" : "Save"}
          icon={session.bookmarked ? "saved" : "save"}
          onClick={() => void toggleBookmark()}
          active={session.bookmarked}
          busy={busy === "bookmark" || loading}
          ariaLabel={session.bookmarked ? "Remove saved record" : "Save record"}
        />
        {variant !== "compact" && (
          <ActionButton
            label="Bookmark"
            icon="bookmark"
            onClick={() => void toggleBookmark()}
            active={session.bookmarked}
            busy={busy === "bookmark" || loading}
            ariaLabel="Toggle bookmark"
          />
        )}
        {variant !== "compact" && (
          <div className="research-actions-list-wrap">
            <ActionButton
              label="Add to list"
              icon="list"
              onClick={() => setListOpen((v) => !v)}
              ariaLabel="Add to reading list"
            />
            {listOpen && session.authenticated && session.readingLists.length > 0 && (
              <div className="research-actions-list-menu" role="menu">
                {session.readingLists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    role="menuitem"
                    className="research-actions-list-item"
                    disabled={busy === `list-${list.id}`}
                    onClick={() => {
                      void addToList(list.id);
                      setListOpen(false);
                    }}
                  >
                    {list.title}
                  </button>
                ))}
              </div>
            )}
            {listOpen && session.authenticated && session.readingLists.length === 0 && (
              <div className="research-actions-list-menu">
                <p className="research-actions-list-empty">No lists yet. Create one in your Library.</p>
              </div>
            )}
          </div>
        )}
        {variant === "compact" && (
          <ActionButton
            label="List"
            icon="list"
            onClick={() => {
              if (!session.authenticated) {
                window.location.href = `/auth/sign-in?next=${encodeURIComponent(window.location.pathname)}`;
                return;
              }
              setListOpen((v) => !v);
            }}
            ariaLabel="Add to reading list"
          />
        )}
        {variant !== "compact" && (
          <>
            <ActionButton label="Share" icon="share" onClick={() => void share()} ariaLabel="Share record" />
            <ActionButton label="Copy link" icon="link" onClick={() => void copyLink()} ariaLabel="Copy stable link" />
          </>
        )}
      </div>

      {message && (
        <p className="research-actions-toast" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </>
  );
}
