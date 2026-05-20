"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "workbench-ai-cite-trigger-position";
const BUTTON_WIDTH_PX = 96;
const BUTTON_HEIGHT_PX = 52;
const DRAG_THRESHOLD_PX = 6;
const DRAWER_WIDTH_PX = 310;
const DRAWER_GAP_PX = 10;

type Props = {
  visible: boolean;
  active: boolean;
  disabled: boolean;
  formatDrawerOpen: boolean;
  onToggle: () => void;
};

function readStoredPosition(): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x?: number; y?: number };
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    return null;
  }
  return null;
}

function defaultPosition(formatDrawerOpen: boolean) {
  const drawerInset = formatDrawerOpen ? DRAWER_WIDTH_PX + DRAWER_GAP_PX : 0;
  const margin = 24;
  const bottomInset = 32;

  return {
    x: Math.max(
      margin,
      window.innerWidth - drawerInset - BUTTON_WIDTH_PX - margin,
    ),
    y: Math.max(
      72,
      window.innerHeight - BUTTON_HEIGHT_PX - bottomInset - 72,
    ),
  };
}

function clampPosition(x: number, y: number) {
  const maxX = Math.max(12, window.innerWidth - BUTTON_WIDTH_PX - 12);
  const maxY = Math.max(56, window.innerHeight - BUTTON_HEIGHT_PX - 12);

  return {
    x: Math.min(Math.max(12, x), maxX),
    y: Math.min(Math.max(56, y), maxY),
  };
}

export default function AICitationFloatingTrigger({
  visible,
  active,
  disabled,
  formatDrawerOpen,
  onToggle,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [positionReady, setPositionReady] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const didDragRef = useRef(false);
  const didInitRef = useRef(false);

  const placeTrigger = useCallback(
    (next?: { x: number; y: number }) => {
      const resolved = clampPosition(
        next?.x ?? defaultPosition(formatDrawerOpen).x,
        next?.y ?? defaultPosition(formatDrawerOpen).y,
      );
      setPosition(resolved);
      setPositionReady(true);
    },
    [formatDrawerOpen],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!visible) {
      didInitRef.current = false;
      setPositionReady(false);
      return;
    }

    if (didInitRef.current) return;
    didInitRef.current = true;

    const stored = readStoredPosition();
    placeTrigger(stored ?? undefined);
  }, [visible, placeTrigger]);

  useEffect(() => {
    if (!visible || !positionReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  }, [visible, position, positionReady]);

  useEffect(() => {
    if (!visible || !positionReady) return;

    const handleResize = () => {
      setPosition((current) => clampPosition(current.x, current.y));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [visible, positionReady]);

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled) return;

    didDragRef.current = false;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (
      !didDragRef.current &&
      Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX
    ) {
      return;
    }

    didDragRef.current = true;
    setPosition(
      clampPosition(drag.originX + deltaX, drag.originY + deltaY),
    );
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleClick() {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (disabled) return;
    onToggle();
  }

  if (!mounted || !visible) return null;

  return createPortal(
    <button
      type="button"
      className={`ai-citation-floating-trigger${active ? " is-active" : ""}`}
      style={
        {
          left: position.x,
          top: position.y,
          opacity: positionReady ? 1 : 0,
        } as CSSProperties
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      aria-expanded={active}
      aria-controls="workbench-ai-citation-assistant"
      aria-label={active ? "Close AI citation assistant" : "Open AI citation assistant"}
      title="Drag to move · Click to open AI citations"
      disabled={disabled}
    >
      <span className="ai-citation-floating-trigger__label">AI Cite</span>
    </button>,
    document.body,
  );
}
