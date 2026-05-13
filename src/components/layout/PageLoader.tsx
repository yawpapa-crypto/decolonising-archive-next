"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const LOADER_TIMEOUT_MS = 8000;
const LOADER_EXIT_MS = 200;

function shouldTrackAnchor(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute("href");
  if (!href || href === "#") return false;
  if (href.startsWith("#")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (href.startsWith("javascript:")) return false;
  if (anchor.target === "_blank") return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.dataset.noLoader === "true") return false;
  try {
    const url = new URL(anchor.href, window.location.href);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

export default function PageLoader() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [exiting, setExiting] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const exitRef = useRef<number | null>(null);
  const prevPathRef = useRef<string | null>(null);
  const overlayShownRef = useRef(false);

  const clearHardTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearExitTimer = useCallback(() => {
    if (exitRef.current !== null) {
      window.clearTimeout(exitRef.current);
      exitRef.current = null;
    }
  }, []);

  const beginExit = useCallback(() => {
    clearExitTimer();
    setExiting(true);
    exitRef.current = window.setTimeout(() => {
      overlayShownRef.current = false;
      setActive(false);
      setExiting(false);
      exitRef.current = null;
    }, LOADER_EXIT_MS);
  }, [clearExitTimer]);

  const stopLoading = useCallback(() => {
    clearHardTimeout();
    if (!overlayShownRef.current) return;
    overlayShownRef.current = false;
    beginExit();
  }, [beginExit, clearHardTimeout]);

  const startLoading = useCallback(() => {
    clearHardTimeout();
    clearExitTimer();
    overlayShownRef.current = true;
    setExiting(false);
    setActive(true);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      window.dispatchEvent(new Event("app:loading:end"));
      overlayShownRef.current = false;
      setActive(false);
      setExiting(false);
    }, LOADER_TIMEOUT_MS);
  }, [clearHardTimeout, clearExitTimer]);

  useEffect(() => {
    if (prevPathRef.current === null) {
      prevPathRef.current = pathname;
      return;
    }
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    clearHardTimeout();
    if (overlayShownRef.current) {
      overlayShownRef.current = false;
      beginExit();
    }
  }, [pathname, beginExit, clearHardTimeout]);

  useEffect(() => {
    const onStart = () => startLoading();
    const onEnd = () => stopLoading();

    window.addEventListener("app:loading:start", onStart);
    window.addEventListener("app:loading:end", onEnd);

    const onClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const el = event.target;
      if (!(el instanceof Element)) return;
      const anchor = el.closest("a");
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
      if (!shouldTrackAnchor(anchor)) return;

      const url = new URL(anchor.href, window.location.href);
      const next = `${url.pathname}${url.search}${url.hash}`;
      const cur = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (next === cur) return;

      startLoading();
    };

    const onBeforeUnload = () => {
      startLoading();
    };

    const onPageShow = () => {
      stopLoading();
    };

    document.addEventListener("click", onClickCapture, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("app:loading:start", onStart);
      window.removeEventListener("app:loading:end", onEnd);
      document.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pageshow", onPageShow);
      clearHardTimeout();
      clearExitTimer();
    };
  }, [startLoading, stopLoading, clearHardTimeout, clearExitTimer]);

  if (!active && !exiting) return null;

  return (
    <div
      className={`page-loader-overlay${exiting ? " page-loader-overlay--exit" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={active && !exiting}
      aria-label="Loading page"
    >
      <div className="page-loader-card">
        <div className="page-loader-mark" aria-hidden="true">
          <div className="page-loader-spinner">
            <span />
          </div>
        </div>
        <p className="page-loader-label">Loading archive…</p>
      </div>
    </div>
  );
}
