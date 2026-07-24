import { test } from "node:test";
import assert from "node:assert/strict";
import { stackOrder, reorderLayer, moveLayerTo } from "./ops.ts";
import type { GridSection, GridBlock } from "./types.ts";

// run: cd pagecraft-backend && node --import tsx --test ../pagecraft-frontend/src/grid/layers.test.ts

const at = { rowStart: 1, colStart: 1, rowEnd: 2, colEnd: 2 };
const b = (id: string, zIndex?: number): GridBlock =>
  ({ id, area: at, block: "textFrame", content: {}, ...(zIndex === undefined ? {} : { zIndex }) }) as GridBlock;
const sec = (...blocks: GridBlock[]): GridSection => ({ type: "grid", blocks });
const ids = (s: GridSection) => stackOrder(s.blocks).map((x) => x.id);

test("without zIndex the array order IS the stacking order", () => {
  assert.deepEqual(ids(sec(b("a"), b("b"), b("c"))), ["a", "b", "c"]);
});

test("explicit zIndex wins over array position", () => {
  assert.deepEqual(ids(sec(b("a", 2), b("b", 0), b("c", 1))), ["b", "c", "a"]);
});

test("bring-to-front / send-to-back move to the ends", () => {
  assert.deepEqual(ids(reorderLayer(sec(b("a"), b("b"), b("c")), "a", "front")), ["b", "c", "a"]);
  assert.deepEqual(ids(reorderLayer(sec(b("a"), b("b"), b("c")), "c", "back")), ["c", "a", "b"]);
});

test("forward / backward move one step and clamp at the ends", () => {
  assert.deepEqual(ids(reorderLayer(sec(b("a"), b("b"), b("c")), "a", "forward")), ["b", "a", "c"]);
  assert.deepEqual(ids(reorderLayer(sec(b("a"), b("b"), b("c")), "b", "backward")), ["b", "a", "c"]);
  // already at the back / front → unchanged (no throw, no wrap-around)
  assert.deepEqual(ids(reorderLayer(sec(b("a"), b("b")), "a", "backward")), ["a", "b"]);
  assert.deepEqual(ids(reorderLayer(sec(b("a"), b("b")), "b", "forward")), ["a", "b"]);
});

test("a layer op normalizes every block's zIndex to 0..n-1", () => {
  const out = reorderLayer(sec(b("a"), b("b", 9), b("c")), "c", "front");
  assert.deepEqual(out.blocks.map((x) => x.zIndex), [0, 1, 2]); // array order matches zIndex
  assert.deepEqual(ids(out), out.blocks.map((x) => x.id));      // the two agree
});

test("moveLayerTo clamps out-of-range targets instead of dropping the block", () => {
  assert.deepEqual(ids(moveLayerTo(sec(b("a"), b("b"), b("c")), "a", 99)), ["b", "c", "a"]);
  assert.deepEqual(ids(moveLayerTo(sec(b("a"), b("b"), b("c")), "c", -5)), ["c", "a", "b"]);
});

test("an unknown block id is a no-op", () => {
  const s = sec(b("a"), b("b"));
  assert.equal(reorderLayer(s, "nope", "front"), s);
});
