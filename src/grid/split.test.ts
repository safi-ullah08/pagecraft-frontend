import { test } from "node:test";
import assert from "node:assert/strict";
import { splitInlineAt, splitParagraphSentences } from "./split-inline.ts";
import type { JSONContent } from "@tiptap/react";

// run: cd pagecraft-backend && node --import tsx --test ../pagecraft-frontend/src/grid/split.test.ts

const para = (...inline: JSONContent[]): JSONContent => ({ type: "paragraph", content: inline });
const text = (t: string, marks?: { type: string }[]): JSONContent => ({ type: "text", text: t, ...(marks ? { marks } : {}) }) as JSONContent;
const words = (p: JSONContent) => (p.content ?? []).map((n) => n.text).join("");

test("splits a plain paragraph at the given word boundary", () => {
  const [a, b] = splitInlineAt(para(text("one two three four five")), 2);
  assert.equal(words(a).trim(), "one two");
  assert.equal(words(b).trim(), "three four five");
  assert.equal(a.type, "paragraph"); // node type preserved
});

test("preserves marks on each side of the split", () => {
  const bold = [{ type: "bold" }];
  const [a, b] = splitInlineAt(para(text("keep this "), text("bold tail", bold)), 3);
  // word 3 ("bold") falls in the marked node -> B keeps the bold mark
  assert.deepEqual(b.content?.at(-1)?.marks, bold);
  assert.ok(words(a).includes("keep this"));
});

test("counts words across multiple text nodes", () => {
  const [a, b] = splitInlineAt(para(text("a b "), text("c d e")), 3);
  assert.equal(words(a).trim(), "a b c"); // 3 words land in A across both nodes
  assert.equal(words(b).trim(), "d e");
});

test("splitParagraphSentences splits a paragraph into one node per sentence", () => {
  const out = splitParagraphSentences(para(text("One two. Three four! Five six?")));
  assert.equal(out.length, 3);
  assert.equal(words(out[0]!).trim(), "One two.");
  assert.equal(words(out[2]!).trim(), "Five six?");
});

test("splitParagraphSentences returns the node unchanged when there's nothing to split", () => {
  assert.equal(splitParagraphSentences(para(text("no sentence enders here"))).length, 1);
  assert.equal(splitParagraphSentences(para(text("word"))).length, 1);
});

test("a non-text inline node goes to the side the boundary has reached", () => {
  const [a, b] = splitInlineAt(para(text("one two"), { type: "hardBreak" }, text("three")), 2);
  assert.ok((b.content ?? []).some((n) => n.type === "hardBreak"));
});
