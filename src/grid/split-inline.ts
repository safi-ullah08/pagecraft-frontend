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

export function countWords(node: JSONContent): number {
  let n = 0;
  for (const inline of node.content ?? [])
    if (inline.type === "text" && typeof inline.text === "string") n += inline.text.trim().split(/\s+/).filter(Boolean).length;
  return n;
}
