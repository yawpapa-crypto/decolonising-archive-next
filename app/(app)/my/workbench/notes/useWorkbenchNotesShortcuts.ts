"use client";

import { useEffect } from "react";

function isModKey(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey;
}

export function useWorkbenchNotesShortcuts(handlers: {
  enabled: boolean;
  onSave: () => void;
  onToggleFocus: () => void;
  onOpenCommand: () => void;
  onOpenSwitcher: () => void;
  onToggleList: () => void;
  onCloseOverlay: () => void;
  focusMode: boolean;
  overlayOpen: boolean;
}) {
  useEffect(() => {
    if (!handlers.enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      const mod = isModKey(event);
      const key = event.key.toLowerCase();

      if (mod && key === "s") {
        event.preventDefault();
        handlers.onSave();
        return;
      }

      if (mod && key === "k") {
        event.preventDefault();
        handlers.onOpenCommand();
        return;
      }

      if (mod && event.shiftKey && key === "p") {
        event.preventDefault();
        handlers.onOpenSwitcher();
        return;
      }

      if (mod && event.key === "\\") {
        event.preventDefault();
        handlers.onToggleFocus();
        return;
      }

      if (mod && key === "b" && handlers.focusMode) {
        event.preventDefault();
        handlers.onToggleList();
        return;
      }

      if (event.key === "Escape") {
        if (handlers.overlayOpen) {
          event.preventDefault();
          handlers.onCloseOverlay();
          return;
        }
        if (handlers.focusMode) {
          event.preventDefault();
          handlers.onToggleFocus();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
