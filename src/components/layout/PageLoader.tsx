"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const LOADER_TIMEOUT_MS = 8000;
const LOADER_EXIT_MS = 200;

const DEFAULT_LABEL = "Loading archive…";

type LoadingStartDetail = { message?: string };

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

function labelFromHref(href: string): string {
  try {
    const url = new URL(href, window.location.href);
    const path = url.pathname;
    if (path === "/" || path === "/home") return "Opening home…";
    if (path.startsWith("/library")) return "Opening library…";
    if (path.startsWith("/sources")) return "Opening sources…";
    if (path.startsWith("/about")) return "Opening about…";
    if (path.startsWith("/records/")) return "Opening record…";
    if (path.startsWith("/workspace")) return "Opening workspace…";
    if (path.startsWith("/my/workbench")) return "Opening workbench…";
    if (path.startsWith("/my/")) return "Loading your workspace…";
    if (path.startsWith("/curator")) return "Opening curator tools…";
    if (path.startsWith("/admin")) return "Opening admin…";
    if (path.startsWith("/auth")) return "Loading…";
    return "Loading…";
  } catch {
    return DEFAULT_LABEL;
  }
}

export default function PageLoader() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [label, setLabel] = useState(DEFAULT_LABEL);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const exitRef = useRef<number | null>(null);
  const prevPathRef = useRef<string | null>(null);
  const overlayShownRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
      setLabel(DEFAULT_LABEL);
      exitRef.current = null;
    }, LOADER_EXIT_MS);
  }, [clearExitTimer]);

  const stopLoading = useCallback(() => {
    clearHardTimeout();
    if (!overlayShownRef.current) return;
    overlayShownRef.current = false;
    beginExit();
  }, [beginExit, clearHardTimeout]);

  const startLoading = useCallback((message: string = DEFAULT_LABEL) => {
    clearHardTimeout();
    clearExitTimer();
    setLabel(message);
    overlayShownRef.current = true;
    setExiting(false);
    setActive(true);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      window.dispatchEvent(new Event("app:loading:end"));
      overlayShownRef.current = false;
      setActive(false);
      setExiting(false);
      setLabel(DEFAULT_LABEL);
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
    if (!overlayShownRef.current) return;
    overlayShownRef.current = false;
    queueMicrotask(() => {
      beginExit();
    });
  }, [pathname, beginExit, clearHardTimeout]);

  useEffect(() => {
    const onStart = (event: Event) => {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as LoadingStartDetail | undefined)
          : undefined;
      const message =
        typeof detail?.message === "string" && detail.message.trim()
          ? detail.message.trim()
          : DEFAULT_LABEL;
      startLoading(message);
    };
    const onEnd = () => stopLoading();

    window.addEventListener("app:loading:start", onStart as EventListener);
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

      startLoading(labelFromHref(anchor.href));
    };

    const onBeforeUnload = () => {
      setLabel("Leaving site…");
      startLoading("Leaving site…");
    };

    const onPageShow = () => {
      stopLoading();
    };

    document.addEventListener("click", onClickCapture, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("app:loading:start", onStart as EventListener);
      window.removeEventListener("app:loading:end", onEnd);
      document.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pageshow", onPageShow);
      clearHardTimeout();
      clearExitTimer();
    };
  }, [startLoading, stopLoading, clearHardTimeout, clearExitTimer]);

  if (!active && !exiting) return null;

  const overlayClass = [
    "page-loader-overlay",
    exiting ? "page-loader-overlay--exit" : "",
    reducedMotion ? "page-loader-overlay--reduced-motion" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={overlayClass}
      role="status"
      aria-live="polite"
      aria-busy={active && !exiting}
      aria-label={label}
    >
      <div className="page-loader-card">
        <div className="page-loader-mark" aria-hidden="true">
          <div className="page-loader-spinner">
            <span />
          </div>
        </div>
        <p className="page-loader-label">{label}</p>
      </div>
    </div>
  );
}
