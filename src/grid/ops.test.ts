import { test } from "node:test";
import assert from "node:assert/strict";
import { pushDownOverlaps, mergeInto } from "./ops.ts";
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

// --- mergeInto ---
const doc = (...ps: string[]) => ({ type: "doc", content: ps.map((t) => ({ type: "paragraph", content: [{ type: "text", text: t }] })) });
const tblk = (id: string, ...ps: string[]): GridBlock => ({ id, area: { rowStart: 1, colStart: 1, rowEnd: 3, colEnd: 7 }, block: "textFrame", content: doc(...ps) });
const texts = (s: GridSection, id: string) => (s.blocks.find((b) => b.id === id)!.content as { content: { content: { text: string }[] }[] }).content.map((n) => n.content[0]!.text);

test("mergeInto appends the source's paragraphs into the target and removes the source", () => {
  const out = mergeInto(sec(tblk("T", "one", "two"), tblk("S", "three")), "S", "T");
  assert.equal(out.blocks.length, 1); // source gone
  assert.deepEqual(texts(out, "T"), ["one", "two", "three"]);
});

test("mergeInto inserts at a given index", () => {
  const out = mergeInto(sec(tblk("T", "one", "two"), tblk("S", "X")), "S", "T", 1);
  assert.deepEqual(texts(out, "T"), ["one", "X", "two"]);
});

test("mergeInto is a no-op for a non-text source (e.g. image)", () => {
  const img: GridBlock = { id: "I", area: { rowStart: 1, colStart: 1, rowEnd: 3, colEnd: 7 }, block: "image", content: { src: "x" } };
  const out = mergeInto(sec(tblk("T", "one"), img), "I", "T");
  assert.equal(out.blocks.length, 2); // nothing merged, nothing removed
});

// --- minArea: blocks that Break splits must be allowed down to one row -----------
import { minArea, moveBlock, resizeBlock, fitBlockRows, cloneBlocks } from "./ops.ts";

const one = (block: GridBlock["block"]): GridSection =>
  ({ type: "grid", blocks: [{ id: "a", area: { rowStart: 3, colStart: 1, rowEnd: 4, colEnd: 13 }, block, content: {} }] });
const rowsOf = (s: GridSection) => s.blocks[0]!.area.rowEnd - s.blocks[0]!.area.rowStart;

test("text frames and contents lists may be one row; the column floor is kept", () => {
  assert.equal(minArea("textFrame").rows, 1);
  assert.equal(minArea("tocList").rows, 1);
  assert.equal(minArea("textFrame").cols, 2);
  assert.equal(minArea("tocList").cols, 4);
});

test("a one-row text frame stays one row through move, resize, fit and paste", () => {
  for (const type of ["textFrame", "tocList"] as const) {
    const s = one(type);
    assert.equal(rowsOf(moveBlock(s, "a", { rowStart: 5, colStart: 1, rowEnd: 6, colEnd: 13 })), 1, `${type} move`);
    assert.equal(rowsOf(resizeBlock(s, "a", { rowStart: 3, colStart: 1, rowEnd: 4, colEnd: 13 })), 1, `${type} resize`);
    assert.equal(rowsOf(fitBlockRows(s, "a", 1)), 1, `${type} fit`);
    assert.equal(cloneBlocks(s.blocks)[0]!.area.rowEnd - cloneBlocks(s.blocks)[0]!.area.rowStart, 1, `${type} paste`);
  }
});

test("other blocks keep their registry minimum", () => {
  const s = one("list");
  assert.ok(rowsOf(fitBlockRows(s, "a", 1)) >= 2, "a list is still clamped to its own floor");
});
