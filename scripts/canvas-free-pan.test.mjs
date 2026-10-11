import assert from "node:assert/strict";
import {
  applyWheelPan,
  freePanPassedSlop,
  isTouchLikePointer,
} from "../app/(app)/my/workbench/notes/workbench-canvas-viewport-motion.ts";

assert.equal(isTouchLikePointer("touch"), true);
assert.equal(isTouchLikePointer("pen"), true);
assert.equal(isTouchLikePointer("mouse"), false);

assert.equal(freePanPassedSlop(0, 0, 3, 4), false);
assert.equal(freePanPassedSlop(10, 20, 18, 20), true);
assert.equal(freePanPassedSlop(10, 20, 10, 28), true);

const bothAxes = applyWheelPan(100, 80, 12, -7, false, 0);
assert.equal(bothAxes.panX, 100 - 12 * 0.75);
assert.equal(bothAxes.panY, 80 - -7 * 0.75);

console.log("canvas free-pan tests passed");
