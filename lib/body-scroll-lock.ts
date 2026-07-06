/**
 * Coordinates body scroll lock + scrollbar-gap compensation when multiple
 * overlays (mobile menu, library filter drawer, workspace drawer) can open.
 * Call with `on` true/false per reason; padding is recalculated whenever any lock remains.
 */
export type BodyScrollLockReason = "menu" | "filters" | "workspace";

const REASON_CLASS: Record<BodyScrollLockReason, string> = {
  menu: "menu-open",
  filters: "filters-open",
  workspace: "workspace-drawer-open",
};

function isBodyScrollLocked(): boolean {
  if (typeof document === "undefined") return false;
  const body = document.body;
  return (
    body.classList.contains("menu-open") ||
    body.classList.contains("filters-open") ||
    body.classList.contains("workspace-drawer-open") ||
    body.classList.contains("modal-open") ||
    body.classList.contains("drawer-open")
  );
}

function applyScrollbarPadding(): void {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!isBodyScrollLocked()) {
    body.style.paddingRight = "";
    return;
  }
  const gap = window.innerWidth - document.documentElement.clientWidth;
  body.style.paddingRight = gap > 0 ? `${gap}px` : "";
}

/** Recalculate scrollbar gutter when the viewport changes while a lock is active. */
export function refreshBodyScrollLockPadding(): void {
  applyScrollbarPadding();
}

export function setBodyScrollLock(
  reason: BodyScrollLockReason,
  locked: boolean,
): void {
  if (typeof document === "undefined") return;
  const body = document.body;
  const cls = REASON_CLASS[reason];
  if (locked) body.classList.add(cls);
  else body.classList.remove(cls);
  applyScrollbarPadding();
}
