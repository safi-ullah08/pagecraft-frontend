import { test } from "node:test";
import assert from "node:assert/strict";
import { collectToc, buildTocSection, isTocSection, tocPlaceholder } from "./toc.ts";

// run: cd pagecraft-backend && node --import tsx --test ../pagecraft-frontend/src/grid/toc.test.ts

const at = (rowStart: number, colStart: number) => ({ rowStart, colStart, rowEnd: rowStart + 1, colEnd: colStart + 1 });
const heading = (text: string, level = 1) =>
  ({ type: "doc", content: [{ type: "heading", attrs: { level }, content: [{ type: "text", text }] }] });
const para = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
const page = (...blocks: unknown[]) => ({ type: "grid", blocks });
const blk = (content: unknown, row = 1, col = 1, block = "textFrame") => ({ id: Math.random().toString(36).slice(2), area: at(row, col), block, content });

test("collects headings with their page number", () => {
  const entries = collectToc([page(blk(heading("One"))), page(blk(para("body"))), page(blk(heading("Two", 2)))]);
  assert.deepEqual(entries, [
    { text: "One", level: 1, page: 1 },
    { text: "Two", level: 2, page: 3 },
  ]);
});

test("startAt matches the document's page numbering", () => {
  const entries = collectToc([page(blk(heading("A")))], 5);
  assert.equal(entries[0]!.page, 5);
});

test("headings are read top-to-bottom then left-to-right, not array order", () => {
  // deliberately out of reading order in the array
  const p = page(blk(heading("bottom"), 5, 1), blk(heading("top-right"), 1, 6), blk(heading("top-left"), 1, 1));
  assert.deepEqual(collectToc([p]).map((e) => e.text), ["top-left", "top-right", "bottom"]);
});

test("the TOC page is never indexed, but still occupies a page number", () => {
  const pages = [page(blk(heading("Cover"))), buildTocSection([]), page(blk(heading("Chapter")))];
  const entries = collectToc(pages);
  assert.deepEqual(entries.map((e) => e.text), ["Cover", "Chapter"]);
  assert.equal(entries[1]!.page, 3); // the TOC still counts as page 2
});

test("inserting the TOC shifts later pages by one", () => {
  const content = [page(blk(heading("Cover"))), page(blk(heading("Chapter")))];
  const before = collectToc(content);
  assert.equal(before.find((e) => e.text === "Chapter")!.page, 2);
  // project the insert at index 1 the way the store does
  const projected = [...content];
  projected.splice(1, 0, tocPlaceholder());
  const after = collectToc(projected);
  assert.equal(after.find((e) => e.text === "Chapter")!.page, 3);
});

test("maxLevel filters deep headings", () => {
  const p = page(blk(heading("h1", 1)), blk(heading("h4", 4), 2, 1));
  assert.deepEqual(collectToc([p], 1, 2).map((e) => e.text), ["h1"]);
});

test("non-grid and empty pages are counted but contribute nothing", () => {
  const entries = collectToc([{ type: "doc", content: [] }, page(), page(blk(heading("Third")))]);
  assert.deepEqual(entries, [{ text: "Third", level: 1, page: 3 }]);
});

test("built section is marked, full-page, and lists every entry", () => {
  const sec = buildTocSection([{ text: "Alpha", level: 1, page: 2 }, { text: "Beta", level: 2, page: 4 }]);
  assert.ok(isTocSection(sec));
  assert.equal(sec.blocks.length, 1);
  assert.deepEqual(sec.blocks[0]!.area, { rowStart: 1, colStart: 1, rowEnd: 13, colEnd: 13 });
  const lines = (sec.blocks[0]!.content as { content: { content?: { text: string }[] }[] }).content;
  assert.equal(lines[0]!.content![0]!.text, "Contents");
  assert.match(lines[1]!.content![0]!.text, /Alpha — 2/);
  assert.match(lines[2]!.content![0]!.text, /Beta — 4/); // level 2 indented
});

test("an empty document still builds a valid TOC page", () => {
  const sec = buildTocSection([]);
  assert.ok(isTocSection(sec));
  assert.equal(sec.blocks.length, 1);
});
