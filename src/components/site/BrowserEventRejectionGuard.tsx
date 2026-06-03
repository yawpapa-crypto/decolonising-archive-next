"use client";

import { useEffect } from "react";

const INSTALL_KEY = "__decolonisingArchiveBrowserEventRejectionGuard";

type GuardedWindow = Window &
  typeof globalThis & {
    [INSTALL_KEY]?: boolean;
  };

function isEventLikeReason(reason: unknown): reason is Event {
  return Boolean(
    reason &&
      typeof reason === "object" &&
      "type" in reason &&
      "target" in reason,
  );
}

function installBrowserEventRejectionGuard() {
  if (typeof window === "undefined") return;

  const guardedWindow = window as GuardedWindow;
  if (guardedWindow[INSTALL_KEY]) return;
  guardedWindow[INSTALL_KEY] = true;

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      if (!isEventLikeReason(event.reason)) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[BrowserEventRejectionGuard] Suppressed browser event promise rejection:",
          event.reason.type,
          event.reason,
        );
      }
    },
    { capture: true },
  );
}

export default function BrowserEventRejectionGuard() {
  installBrowserEventRejectionGuard();

  useEffect(() => {
    installBrowserEventRejectionGuard();
  }, []);

  return null;
}
