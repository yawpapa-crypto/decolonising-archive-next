import assert from "node:assert/strict";
import test from "node:test";
import { isPublicRecordRouteRecord } from "./record-visibility.ts";

test("record routes are visible only for explicitly published records", () => {
  assert.equal(isPublicRecordRouteRecord(null), false);
  assert.equal(isPublicRecordRouteRecord(undefined), false);
  assert.equal(isPublicRecordRouteRecord({ published: false } as never), false);
  assert.equal(isPublicRecordRouteRecord({} as never), false);
  assert.equal(isPublicRecordRouteRecord({ published: true } as never), true);
});
