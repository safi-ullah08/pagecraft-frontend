import type { JSONContent } from "@tiptap/react";

// Pure paragraph-splitting helpers (no DOM / no Vite-only imports) so they're
// unit-testable. The DOM-measured splitTextFrameAt (in measure.ts) uses these.

// Split a paragraph/heading node's inline content after `words` words, preserving
// each text node's marks. Non-text inline nodes (hardBreak, etc.) go atomically to
// whichever side the boundary has reached.
export function splitInlineAt(node: JSONContent, words: number): [JSONContent, JSONContent] {
  const A: JSONContent[] = [], B: JSONContent[] = [];
  let count = 0, done = false;
  for (const inline of node.content ?? []) {
    if (done) { B.push(inline); continue; }
    if (inline.type === "text" && typeof inline.text === "string") {
      let aText = "", bText = "";
      for (const part of inline.text.split(/(\s+)/)) { // keep whitespace tokens
        const isWord = part.trim().length > 0;
        if (!done && isWord && count >= words) done = true;
        if (done) bText += part;
        else { aText += part; if (isWord) count++; }
      }
      if (aText) A.push({ ...inline, text: aText });
      if (bText) B.push({ ...inline, text: bText });
    } else {
      if (!done && count >= words) done = true; // a break at the boundary belongs to B
      (done ? B : A).push(inline);
    }
  }
  return [{ ...node, content: A }, { ...node, content: B }];
}

export const LIST_TYPES = new Set(["bulletList", "orderedList", "taskList"]);

// Split a list node after `take` items into [listA, listB], preserving type/attrs.
// An ordered list's second half continues the numbering (start += take) so a list
// spilled across a page break stays 1,2,3… instead of restarting at 1.
export function splitListAt(node: JSONContent, take: number): [JSONContent, JSONContent] {
  const items = node.content ?? [];
  const a = { ...node, content: items.slice(0, take) };
  const startB = (node.attrs?.start ?? 1) + take;
  const b = { ...node, ...(node.type === "orderedList" ? { attrs: { ...node.attrs, start: startB } } : {}), content: items.slice(take) };
  return [a, b];
}

export function countWords(node: JSONContent): number {
  let n = 0;
  for (const inline of node.content ?? [])
    if (inline.type === "text" && typeof inline.text === "string") n += inline.text.trim().split(/\s+/).filter(Boolean).length;
  return n;
}

// Split a single paragraph into one paragraph per sentence (word-boundary aware,
// marks preserved). Lets Break decompose a lone long paragraph — the common shape
// of an imported text frame. Returns [node] unchanged if there's nothing to split.
export function splitParagraphSentences(node: JSONContent): JSONContent[] {
  const total = countWords(node);
  if (total < 2) return [node];
  const bounds: number[] = []; // word count AFTER each sentence-ending word
  let w = 0;
  for (const inline of node.content ?? []) {
    if (inline.type === "text" && typeof inline.text === "string") {
      for (const part of inline.text.split(/(\s+)/)) {
        const word = part.trim();
        if (!word) continue;
        w++;
        if (/[.!?]["')\]]*$/.test(word)) bounds.push(w);
      }
    }
  }
  const cuts = bounds.filter((b) => b > 0 && b < total);
  if (!cuts.length) return [node];
  const out: JSONContent[] = [];
  let rest = node, consumed = 0;
  for (const b of cuts) {
    const [a, r] = splitInlineAt(rest, b - consumed);
    if (a.content?.length) out.push(a);
    rest = r;
    consumed = b;
  }
  if (rest.content?.length) out.push(rest);
  return out.length > 1 ? out : [node];
}
