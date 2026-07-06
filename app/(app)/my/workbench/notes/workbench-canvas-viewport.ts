/** Viewport-centred spawn placement — keeps new objects in view, away from chrome. */

const SPAWN_INSET = {
  left: 112,
  top: 96,
  right: 340,
  bottom: 100,
};

let spawnStack = 0;

export function resetCanvasSpawnStack() {
  spawnStack = 0;
}

export function getSpawnWorldPoint(
  viewport: HTMLElement | null,
  pan: { x: number; y: number },
  zoom: number,
  objectWidth: number,
  objectHeight: number,
): { x: number; y: number } {
  if (!viewport) {
    const offset = (spawnStack++ % 8) * 24;
    return { x: 320 + offset, y: 240 + offset };
  }

  const scale = zoom / 100;
  const visibleW = Math.max(120, viewport.clientWidth - SPAWN_INSET.left - SPAWN_INSET.right);
  const visibleH = Math.max(120, viewport.clientHeight - SPAWN_INSET.top - SPAWN_INSET.bottom);
  const centerX = (SPAWN_INSET.left + visibleW / 2 - pan.x) / scale;
  const centerY = (SPAWN_INSET.top + visibleH / 2 - pan.y) / scale;
  const offset = (spawnStack++ % 8) * 28;

  return {
    x: Math.max(24, centerX - objectWidth / 2 + offset),
    y: Math.max(24, centerY - objectHeight / 2 + offset),
  };
}
