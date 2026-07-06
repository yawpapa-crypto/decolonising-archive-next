/** Shared mobile document UX helpers (Notion fluid width + Word fit-to-width). */

export const NOTES_MOBILE_MAX_WIDTH = 900;
export const NOTES_PHONE_MAX_WIDTH = 640;
export const NOTES_SMALL_PHONE_MAX_WIDTH = 390;
export const LANDSCAPE_PHONE_MAX_HEIGHT = 430;

export const DOCUMENT_ZOOM_PRESETS = [50, 75, 100, 125, 150, 200] as const;

export type DocumentViewportProfile = {
  isMobile: boolean;
  isPhone: boolean;
  isSmallPhone: boolean;
  isLandscapePhone: boolean;
  maxDocumentZoom: number;
};

export function getDocumentViewportProfile(
  width = typeof window !== "undefined" ? window.innerWidth : 1280,
  height = typeof window !== "undefined" ? window.innerHeight : 800,
): DocumentViewportProfile {
  const isMobile = width <= NOTES_MOBILE_MAX_WIDTH;
  const isPhone = width <= NOTES_PHONE_MAX_WIDTH;
  const isSmallPhone = width <= NOTES_SMALL_PHONE_MAX_WIDTH;
  const isLandscapePhone = isPhone && height <= LANDSCAPE_PHONE_MAX_HEIGHT && width > height;

  let maxDocumentZoom = 200;
  if (isLandscapePhone || isPhone) maxDocumentZoom = 100;
  else if (isMobile) maxDocumentZoom = 110;

  return { isMobile, isPhone, isSmallPhone, isLandscapePhone, maxDocumentZoom };
}

export function clampDocumentZoom(zoom: number, profile: DocumentViewportProfile): number {
  return Math.min(profile.maxDocumentZoom, Math.max(50, zoom));
}

export function getDocumentZoomPresets(profile: DocumentViewportProfile): number[] {
  return DOCUMENT_ZOOM_PRESETS.filter((value) => value <= profile.maxDocumentZoom);
}

export type CitationPopoverRect = {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
};

export type CitationPopoverLayout =
  | {
      mode: "sheet";
      bottom: number;
      maxHeight: number;
    }
  | {
      mode: "popover";
      top: number;
      left: number;
      width: number;
      maxHeight: number;
    };

/** Bottom nav + safe inset clearance used by floating controls. */
export function mobileBottomChromeInset(): number {
  return 88 + 12;
}

export function getCitationPopoverLayout(
  rect: CitationPopoverRect,
  viewportWidth: number,
  viewportHeight: number,
  measuredHeight = 320,
): CitationPopoverLayout {
  const profile = getDocumentViewportProfile(viewportWidth, viewportHeight);
  const bottomInset = mobileBottomChromeInset();

  if (profile.isPhone) {
    return {
      mode: "sheet",
      bottom: bottomInset,
      maxHeight: Math.min(
        Math.round(viewportHeight * 0.72),
        viewportHeight - bottomInset - 16,
      ),
    };
  }

  const margin = profile.isSmallPhone ? 8 : 12;
  const width = Math.min(320, viewportWidth - margin * 2);
  const height = Math.min(measuredHeight, viewportHeight - bottomInset - margin * 2);
  const rawLeft = rect.left + rect.width / 2 - width / 2;
  const left = Math.max(margin, Math.min(rawLeft, viewportWidth - width - margin));

  const spaceBelow = viewportHeight - rect.bottom - bottomInset - margin;
  const spaceAbove = rect.top - margin;
  const placeAbove = spaceBelow < height && spaceAbove >= spaceBelow;

  let top = placeAbove ? rect.top - height - 8 : rect.bottom + 8;
  const maxTop = viewportHeight - bottomInset - height - margin;
  top = Math.max(margin, Math.min(top, maxTop));

  return { mode: "popover", top, left, width, maxHeight: height };
}
