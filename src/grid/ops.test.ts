import { test } from "node:test";
import assert from "node:assert/strict";
import { pushDownOverlaps } from "./ops.ts";
import type { GridSection, GridBlock } from "./types.ts";

// run: cd pagecraft-backend && node --import tsx --test ../pagecraft-frontend/src/grid/ops.test.ts

const blk = (id: string, rowStart: number, colStart: number, rowEnd: number, colEnd: number): GridBlock =>
  ({ id, area: { rowStart, colStart, rowEnd, colEnd }, block: "paragraph", content: {} });
const sec = (...blocks: GridBlock[]): GridSection => ({ type: "grid", blocks });
const area = (s: GridSection, id: string) => s.blocks.find((b) => b.id === id)!.area;

test("a block overlapped from above is pushed down to the anchor's bottom", () => {
  // A (rows 1–5) grew over B (rows 3–5) in the same columns
  const out = pushDownOverlaps(sec(blk("A", 1, 1, 5, 7), blk("B", 3, 1, 5, 7)), "A");
  assert.deepEqual(area(out, "B"), { rowStart: 5, colStart: 1, rowEnd: 7, colEnd: 7 }); // height 2 preserved
  assert.deepEqual(area(out, "A"), { rowStart: 1, colStart: 1, rowEnd: 5, colEnd: 7 }); // anchor unchanged
});

test("the push cascades to blocks the pushed block then overlaps", () => {
  const out = pushDownOverlaps(sec(blk("A", 1, 1, 5, 7), blk("B", 3, 1, 5, 7), blk("C", 5, 1, 7, 7)), "A");
  assert.equal(area(out, "B").rowStart, 5);
  assert.equal(area(out, "C").rowStart, 7); // B pushed into C, C pushed further
});

test("blocks in non-overlapping columns are left alone", () => {
  const out = pushDownOverlaps(sec(blk("A", 1, 1, 5, 7), blk("D", 3, 7, 5, 13)), "A");
  assert.deepEqual(area(out, "D"), { rowStart: 3, colStart: 7, rowEnd: 5, colEnd: 13 });
});

test("a block overlapping the anchor from above is not pushed (only room below opens)", () => {
  const out = pushDownOverlaps(sec(blk("A", 5, 1, 9, 7), blk("E", 1, 1, 6, 7)), "A");
  assert.equal(area(out, "E").rowStart, 1); // untouched
});

test("a pushed block clamps at the page bottom instead of leaving the page", () => {
  const out = pushDownOverlaps(sec(blk("A", 1, 1, 13, 7), blk("B", 11, 1, 13, 7)), "A");
  const b = area(out, "B");
  assert.ok(b.rowEnd <= 13, `rowEnd ${b.rowEnd} must stay on the page`);
  assert.equal(b.rowEnd - b.rowStart, 2); // height preserved
});
