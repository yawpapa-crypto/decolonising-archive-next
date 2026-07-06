"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type Point = { x: number; y: number };

type DragState = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

type Options = {
  storageKey: string;
  width: number;
  enabled: boolean;
  getDefaultPosition: () => Point;
};

function readStoredPosition(storageKey: string): Point | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x?: number; y?: number };
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return null;
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

export function useFloatingPanelPosition({
  storageKey,
  width,
  enabled,
  getDefaultPosition,
}: Options) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const positionRef = useRef(position);
  const dragRef = useRef<DragState | null>(null);
  const didInitRef = useRef(false);

  positionRef.current = position;

  const clamp = useCallback(
    (x: number, y: number) => {
      const panel = panelRef.current;
      const panelWidth = panel?.offsetWidth ?? width;
      const panelHeight = panel?.offsetHeight ?? 420;
      const maxX = Math.max(8, window.innerWidth - panelWidth - 8);
      const maxY = Math.max(8, window.innerHeight - panelHeight - 8);

      return {
        x: Math.min(Math.max(8, x), maxX),
        y: Math.min(Math.max(8, y), maxY),
      };
    },
    [width],
  );

  const applyPosition = useCallback((next: Point) => {
    const panel = panelRef.current;
    if (panel) {
      panel.style.left = `${next.x}px`;
      panel.style.top = `${next.y}px`;
    }
  }, []);

  const place = useCallback(
    (next?: Point) => {
      const resolved = clamp(
        next?.x ?? getDefaultPosition().x,
        next?.y ?? getDefaultPosition().y,
      );
      positionRef.current = resolved;
      setPosition(resolved);
      applyPosition(resolved);
      setReady(true);
    },
    [applyPosition, clamp, getDefaultPosition],
  );

  useEffect(() => {
    if (!enabled) {
      didInitRef.current = false;
      setReady(false);
      return;
    }

    if (didInitRef.current) return;
    didInitRef.current = true;

    const stored = readStoredPosition(storageKey);
    const fallback = getDefaultPosition();
    place(stored ? clamp(stored.x, stored.y) : fallback);
  }, [enabled, place, storageKey, clamp, getDefaultPosition]);

  useEffect(() => {
    if (!enabled || !ready) return;
    window.localStorage.setItem(storageKey, JSON.stringify(position));
  }, [enabled, ready, position, storageKey]);

  useEffect(() => {
    if (!enabled || !ready) return;

    const handleResize = () => {
      const next = clamp(positionRef.current.x, positionRef.current.y);
      positionRef.current = next;
      setPosition(next);
      applyPosition(next);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [enabled, ready, clamp, applyPosition]);

  const resetPosition = useCallback(() => {
    place(getDefaultPosition());
  }, [place, getDefaultPosition]);

  const onPanelPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-drag-handle]")) return;
      if (target.closest("[data-no-drag]")) return;

      const panel = panelRef.current;
      if (!panel) return;

      event.preventDefault();
      panel.setPointerCapture(event.pointerId);
      panel.classList.add("is-dragging");

      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: positionRef.current.x,
        originY: positionRef.current.y,
      };

      const onMove = (moveEvent: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        const next = clamp(
          drag.originX + moveEvent.clientX - drag.startX,
          drag.originY + moveEvent.clientY - drag.startY,
        );
        positionRef.current = next;
        applyPosition(next);
      };

      const onUp = (upEvent: PointerEvent) => {
        if (panel.hasPointerCapture(upEvent.pointerId)) {
          panel.releasePointerCapture(upEvent.pointerId);
        }
        panel.classList.remove("is-dragging");
        dragRef.current = null;
        setPosition({ ...positionRef.current });
        panel.removeEventListener("pointermove", onMove);
        panel.removeEventListener("pointerup", onUp);
        panel.removeEventListener("pointercancel", onUp);
      };

      panel.addEventListener("pointermove", onMove);
      panel.addEventListener("pointerup", onUp);
      panel.addEventListener("pointercancel", onUp);
    },
    [applyPosition, clamp],
  );

  return {
    panelRef,
    position,
    ready,
    onPanelPointerDown,
    resetPosition,
  };
}
