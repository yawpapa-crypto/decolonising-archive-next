"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

/**
 * Visibility rule:
 *   - Show automatically once for a visitor, then persist that acknowledgement.
 *   - The footer acknowledgement button can still open it manually.
 *   - Skip admin and auth-callback routes regardless.
 */
const VISITS_KEY = "decolonisingArchive:acknowledgementVisits";
const LAST_SHOWN_KEY = "decolonisingArchive:acknowledgementLastShownVisit";
const LEGACY_SEEN_KEY = "decolonisingArchive:acknowledgementSeen";
const SEEN_ONCE_KEY = "decolonisingArchive:acknowledgementSeenOnce";
const OPEN_EVENT = "decolonisingArchive:openAcknowledgement";

function readInt(key: string): number {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeInt(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* storage can be unavailable in strict privacy modes */
  }
}

function hasSeenAcknowledgement(): boolean {
  try {
    if (window.localStorage.getItem(SEEN_ONCE_KEY) === "true") return true;
    if (window.localStorage.getItem(LEGACY_SEEN_KEY) === "true") return true;
    return readInt(VISITS_KEY) > 0 || readInt(LAST_SHOWN_KEY) > 0;
  } catch {
    return false;
  }
}

function markAcknowledgementSeen() {
  try {
    window.localStorage.setItem(SEEN_ONCE_KEY, "true");
    window.localStorage.setItem(LEGACY_SEEN_KEY, "true");
  } catch {
    /* storage can be unavailable in strict privacy modes */
  }
}

function getFocusable(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((node) => !node.hasAttribute("aria-hidden"));
}

export function openAncestralAcknowledgement() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function AncestralAcknowledgementButton({
  className,
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className ?? "ancestral-acknowledgement-footer-button"}
      onClick={openAncestralAcknowledgement}
    >
      Acknowledgement
    </button>
  );
}

export default function AncestralAcknowledgementDialog() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const titleId = useId();
  const veilRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    markAcknowledgementSeen();
    setOpen(false);
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }, []);

  // Manual reopen via footer button.
  useEffect(() => {
    function show() {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  // First-mount-per-page-load decision.
  useEffect(() => {
    const path =
      pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
    if (
      path.startsWith("/admin") ||
      path.startsWith("/auth/callback") ||
      path.startsWith("/auth/confirm")
    ) {
      return;
    }

    if (hasSeenAcknowledgement()) {
      markAcknowledgementSeen();
      return;
    }

    markAcknowledgementSeen();
    writeInt(VISITS_KEY, 1);
    writeInt(LAST_SHOWN_KEY, 1);
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the modal itself rather than the close button — auto-focusing the
    // X showed a focus ring on mount that read as a stray box.
    window.setTimeout(() => modalRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = getFocusable(modalRef.current);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onVeilClick(event: MouseEvent<HTMLDivElement>) {
    // Clicking the dim backdrop (but not the modal itself) dismisses.
    if (event.target === veilRef.current) close();
  }

  if (!open) return null;

  return (
    <div
      ref={veilRef}
      className="ancestral-acknowledgement-veil"
      onKeyDown={onKeyDown}
      onClick={onVeilClick}
    >
      <div
        ref={modalRef}
        className="ancestral-acknowledgement-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="ancestral-acknowledgement-head">
          <div className="ancestral-acknowledgement-head-id">
            <span className="ancestral-acknowledgement-head-dot" aria-hidden="true" />
            <span>Acknowledgment</span>
          </div>
          <button
            type="button"
            className="ancestral-acknowledgement-head-close"
            aria-label="Close acknowledgement"
            onClick={close}
          >
            ✕
          </button>
        </div>

        <div className="ancestral-acknowledgement-body">
          <h2 className="ancestral-acknowledgement-hello" id={titleId}>
            We enter this space with <em>respect.</em>
          </h2>
          <p className="ancestral-acknowledgement-hello-sub">
            For the lands, waters, skies and Countries from which knowledge
            comes.
          </p>

          <div className="ancestral-acknowledgement-stanza">
            <p className="is-lead">
              We acknowledge the First Peoples and Custodians of the lands on
              which this work is made and received. We honour Elders past and
              present, and the continuing responsibilities carried through
              Country, story, language, ceremony and care.
            </p>
            <p>
              We also remember the ancestors across Africa and the diaspora —
              those who poured libation before speaking, those who greeted the
              earth before beginning, those who knew that knowledge is never
              separate from spirit, place, body, memory and relation.
            </p>
            <p>
              This archive is not only a record of struggle. It is also a place
              for beauty, invention, refusal, rhythm, survival, imagination and
              return. It honours what has been carried through fire, water,
              migration, silence, song, design and everyday life.
            </p>
          </div>

          <div className="ancestral-acknowledgement-refrain-label">
            A blessing
          </div>
          <div className="ancestral-acknowledgement-blessing">
            <ul>
              <li>May this space be entered slowly.</li>
              <li>May the sources gathered here be treated with care.</li>
              <li>May what has been hidden be met with attention.</li>
              <li>May what has endured be celebrated.</li>
            </ul>
          </div>
        </div>

        <div className="ancestral-acknowledgement-foot">
          <button
            type="button"
            className="ancestral-acknowledgement-enter"
            onClick={close}
          >
            <span>Enter the archive</span>
            <span className="ancestral-acknowledgement-enter-arrow" aria-hidden="true" />
          </button>
          <Link
            className="ancestral-acknowledgement-care-link"
            href="/about"
          >
            Cultural care and responsibility
          </Link>
        </div>
      </div>
    </div>
  );
}
