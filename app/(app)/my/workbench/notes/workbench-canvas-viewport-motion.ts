/** Canvas viewport pan/zoom feel — percent zoom (100 = 1× scale). */

export const CANVAS_ZOOM_MIN_PERCENT = 20;
export const CANVAS_ZOOM_MAX_PERCENT = 300;
export const CANVAS_ZOOM_BUTTON_STEP_PERCENT = 10;
export const CANVAS_ZOOM_INTENSITY = 0.0024;
export const CANVAS_TRACKPAD_ZOOM_INTENSITY = 0.0018;
export const CANVAS_PAN_WHEEL_SENSITIVITY = 0.85;
export const CANVAS_TRACKPAD_PAN_SENSITIVITY = 0.75;
export const CANVAS_SHIFT_PAN_SENSITIVITY = 0.9;
export const CANVAS_WHEEL_DELTA_CLAMP = 100;
export const CANVAS_VIEWPORT_PERSIST_MS = 700;
export const CANVAS_AUTOSAVE_DELAY_MS = 700;

export function clampCanvasZoomPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 100;
  return Math.min(
    CANVAS_ZOOM_MAX_PERCENT,
    Math.max(CANVAS_ZOOM_MIN_PERCENT, percent),
  );
}

export function zoomScaleFromPercent(percent: number): number {
  return clampCanvasZoomPercent(percent) / 100;
}

export function isLikelyTrackpadWheel(event: {
  deltaMode: number;
  deltaY: number;
}): boolean {
  return event.deltaMode === 0 && Math.abs(event.deltaY) < 40;
}

export function clampWheelDelta(delta: number): number {
  return Math.max(
    -CANVAS_WHEEL_DELTA_CLAMP,
    Math.min(CANVAS_WHEEL_DELTA_CLAMP, delta),
  );
}

export function wheelZoomPercent(
  currentPercent: number,
  deltaY: number,
  deltaMode = 0,
): number {
  const clampedDelta = clampWheelDelta(deltaY);
  const intensity = isLikelyTrackpadWheel({ deltaMode, deltaY })
    ? CANVAS_TRACKPAD_ZOOM_INTENSITY
    : CANVAS_ZOOM_INTENSITY;
  const scale = zoomScaleFromPercent(currentPercent);
  const nextScale = scale * Math.exp(-clampedDelta * intensity);
  return clampCanvasZoomPercent(nextScale * 100);
}

export function buttonZoomInPercent(percent: number): number {
  return clampCanvasZoomPercent(percent + CANVAS_ZOOM_BUTTON_STEP_PERCENT);
}

export function buttonZoomOutPercent(percent: number): number {
  return clampCanvasZoomPercent(percent - CANVAS_ZOOM_BUTTON_STEP_PERCENT);
}

export function panAroundPointer(params: {
  currentZoomPercent: number;
  nextZoomPercent: number;
  panX: number;
  panY: number;
  pointerX: number;
  pointerY: number;
}): { panX: number; panY: number } {
  const oldScale = zoomScaleFromPercent(params.currentZoomPercent);
  const newScale = zoomScaleFromPercent(params.nextZoomPercent);
  const worldX = (params.pointerX - params.panX) / oldScale;
  const worldY = (params.pointerY - params.panY) / oldScale;
  return {
    panX: params.pointerX - worldX * newScale,
    panY: params.pointerY - worldY * newScale,
  };
}

export function applyWheelPan(
  panX: number,
  panY: number,
  deltaX: number,
  deltaY: number,
  shiftKey: boolean,
  deltaMode = 0,
): { panX: number; panY: number } {
  const trackpad = isLikelyTrackpadWheel({ deltaMode, deltaY });
  const panSensitivity = trackpad
    ? CANVAS_TRACKPAD_PAN_SENSITIVITY
    : CANVAS_PAN_WHEEL_SENSITIVITY;
  if (shiftKey) {
    return { panX: panX - deltaY * CANVAS_SHIFT_PAN_SENSITIVITY, panY };
  }
  return {
    panX: panX - deltaX * panSensitivity,
    panY: panY - deltaY * panSensitivity,
  };
}

export function displayZoomPercent(percent: number): number {
  return Math.round(clampCanvasZoomPercent(percent));
}
