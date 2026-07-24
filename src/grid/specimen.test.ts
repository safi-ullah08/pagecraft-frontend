import { test } from "node:test";
import assert from "node:assert/strict";
import { extractSpecimen, specimenHtml } from "./specimen.ts";
import { buildTocSection } from "./toc.ts";
import { buildCover } from "./covers.ts";

// run: cd pagecraft-backend && node --import tsx --test ../pagecraft-frontend/src/grid/specimen.test.ts

const at = (rowStart: number, colStart = 1) => ({ rowStart, colStart, rowEnd: rowStart + 1, colEnd: colStart + 1 });
const blk = (nodes: unknown[], row = 1, col = 1) =>
  ({ id: String(row) + col, area: at(row, col), block: "textFrame", content: { type: "doc", content: nodes } });
const h = (text: string) => ({ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text }] });
const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const sec = (...blocks: unknown[]) => ({ content: { type: "grid", blocks } });

const LONG = "The quick brown fox jumps over the lazy dog every single morning";

test("uses the document's own heading and paragraphs", () => {
  const s = extractSpecimen([sec(blk([h("Real Chapter"), p(LONG), p(LONG + " twice")]))]);
  assert.equal(s.heading, "Real Chapter");
  assert.equal(s.paragraphs.length, 2);
  assert.match(s.paragraphs[0]!, /quick brown fox/);
});

test("falls back to sample text for an empty document", () => {
  const s = extractSpecimen([]);
  assert.equal(s.heading, "Chapter One");
  assert.ok(s.paragraphs.length >= 1);
});

test("skips the cover and the contents page", () => {
  const s = extractSpecimen([
    { content: buildCover("centered") },
    { content: buildTocSection([{ text: "x", level: 1, page: 2 }]) },
    sec(blk([h("Body Heading"), p(LONG)])),
  ]);
  assert.equal(s.heading, "Body Heading"); // not "Your title" or "Contents"
});

test("ignores one-word fragments that tell you nothing about measure", () => {
  const s = extractSpecimen([sec(blk([h("H"), p("short"), p(LONG)]))]);
  assert.equal(s.paragraphs.length, 1);
  assert.match(s.paragraphs[0]!, /quick brown/);
});

test("reads across pages in reading order", () => {
  const s = extractSpecimen([sec(blk([p(LONG)], 5, 1), blk([h("Top Heading")], 1, 1))]);
  assert.equal(s.heading, "Top Heading"); // row 1 before row 5, despite array order
});

test("long paragraphs are truncated on a word boundary", () => {
  const s = extractSpecimen([sec(blk([h("H"), p("word ".repeat(200))]))]);
  assert.ok(s.paragraphs[0]!.length <= 321);
  assert.match(s.paragraphs[0]!, /…$/);
});

test("specimen HTML escapes user text", () => {
  const html = specimenHtml({ heading: "<script>x</script>", paragraphs: ["a & b"] });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /a &amp; b/);
});
