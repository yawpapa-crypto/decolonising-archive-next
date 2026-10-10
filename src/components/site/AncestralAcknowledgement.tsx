"use client";

import "./ack.css";
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    window.setTimeout(() => returnFocusRef.current?.focus({ preventScroll: true }), 0);
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

    /* One count per browser session. Shown on the first visit and on every 10th visit after. */
    let counted = false;
    try { counted = window.sessionStorage.getItem("decolonisingArchive:ackCounted") === "1"; } catch { /* ignore */ }
    if (counted) return;
    try { window.sessionStorage.setItem("decolonisingArchive:ackCounted", "1"); } catch { /* ignore */ }
    const visits = readInt(VISITS_KEY) + 1;
    writeInt(VISITS_KEY, visits);
    markAcknowledgementSeen();
    if (visits !== 1 && visits % 10 !== 0) return;
    writeInt(LAST_SHOWN_KEY, visits);
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the modal itself rather than the close button — auto-focusing the
    // X showed a focus ring on mount that read as a stray box.
    window.setTimeout(() => modalRef.current?.focus({ preventScroll: true }), 0);
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
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function onVeilClick(event: MouseEvent<HTMLDivElement>) {
    // Clicking the dim backdrop (but not the modal itself) dismisses.
    if (event.target === veilRef.current) close();
  }

  if (!open) return null;

  return (
    <div ref={veilRef} className="ack-veil" onKeyDown={onKeyDown} onClick={onVeilClick}>
      <div ref={modalRef} className="ack-box" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 id={titleId} className="ack-title">Acknowledgement of Country</h2>
        <p>
          We acknowledge the Woi Wurrung and Boon Wurrung peoples of the eastern Kulin Nations, the Traditional Custodians
          of the lands on which we work and live. We recognise the enduring strength, wisdom, and generosity that have
          continued despite the deep harms of colonisation, and the ways these living knowledges continue to shape and
          enrich this place.
        </p>
        <button type="button" className="ack-close" onClick={close}>Continue</button>
      </div>
    </div>
  );
}
