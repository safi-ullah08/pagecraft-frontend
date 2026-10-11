import { test } from "node:test";
import assert from "node:assert/strict";
import type { LayoutSpec } from "@pagecraft/model";
import { withColumnCount } from "./columns.ts";

// run: cd pagecraft-backend && node --import tsx --test ../pagecraft-frontend/src/grid/columns.test.ts

const area = (rowStart: number, colStart: number, rowEnd: number, colEnd: number) =>
  ({ rowStart, colStart, rowEnd, colEnd });
const bodies = (page: LayoutSpec["pages"][number]) => page.blocks.filter((b) => b.slot === "body");

test("two columns leaves the spec untouched", () => {
  const spec: LayoutSpec = { pages: [{ role: "flow", blocks: [
    { area: area(1, 2, 12, 7), slot: "body" },
    { area: area(1, 7, 12, 12), slot: "body" },
  ] }] };
  assert.equal(withColumnCount(spec, 2), spec);
});

test("single column merges side-by-side body slots into one full-width column", () => {
  const spec: LayoutSpec = { pages: [{ role: "flow", blocks: [
    { area: area(1, 2, 12, 7), slot: "body", style: { fontSize: 15 } },
    { area: area(1, 7, 12, 12), slot: "body" },
  ] }] };
  const out = withColumnCount(spec, 1);
  const b = bodies(out.pages[0]!);
  assert.equal(b.length, 1);
  assert.deepEqual(b[0]!.area, area(1, 2, 12, 12));
  assert.deepEqual(b[0]!.style, { fontSize: 15 }); // keeps the leftmost body's style
});

test("single column stops the full-width column at a photo, keeping the photo", () => {
  // wellness page 4 shape: tall left text, short right text, photo bottom-right
  const spec: LayoutSpec = { pages: [{ role: "flow", blocks: [
    { area: area(1, 2, 13, 7), slot: "body" },
    { area: area(1, 7, 7, 12), slot: "body" },
    { area: area(7, 7, 13, 12), image: true } as never,
  ] }] };
  const out = withColumnCount(spec, 1);
  const page = out.pages[0]!;
  const b = bodies(page);
  assert.equal(b.length, 1);
  assert.deepEqual(b[0]!.area, area(1, 2, 7, 12)); // full width above the photo
  assert.ok(page.blocks.some((x) => (x as { image?: true }).image)); // photo survives
});

test("single column leaves non-flow pages alone", () => {
  const front: LayoutSpec["pages"][number] = { role: "front", blocks: [
    { area: area(1, 2, 12, 7), slot: "body" },
    { area: area(1, 7, 12, 12), slot: "body" },
  ] };
  const out = withColumnCount({ pages: [front] }, 1);
  assert.equal(out.pages[0], front);
});

test("single column is a no-op when a flow page already has one body slot", () => {
  const spec: LayoutSpec = { pages: [{ role: "flow", blocks: [
    { area: area(1, 2, 9, 12), slot: "body" },
    { area: area(9, 2, 12, 7), image: true } as never,
    { area: area(9, 7, 12, 12), image: true } as never,
  ] }] };
  const out = withColumnCount(spec, 1);
  assert.equal(bodies(out.pages[0]!).length, 1);
  assert.deepEqual(bodies(out.pages[0]!)[0]!.area, area(1, 2, 9, 12));
});
