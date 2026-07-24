import type { JSONContent } from "@tiptap/react";
import { isGridSection } from "./types.ts";
import { isTocSection } from "./toc.ts";
import { isAnyCover } from "./covers.ts";

// Pull a small, representative sample of the user's OWN content so the wizard can
// preview a look with their words instead of lorem ipsum. Deliberately tiny — a
// heading and a couple of paragraphs — because previewing a look must never mean
// paginating the whole book.

export type Specimen = { heading: string; paragraphs: string[] };

const FALLBACK: Specimen = {
  heading: "Chapter One",
  paragraphs: [
    "This is how your body text will look. The quick brown fox jumps over the lazy dog, and a second sentence follows so you can judge line spacing and measure.",
    "A second paragraph shows the rhythm between blocks.",
  ],
};

const textOf = (n: JSONContent): string =>
  (n.content ?? []).map((c) => (typeof c.text === "string" ? c.text : textOf(c))).join("").trim();

// Walk a section's blocks in reading order, collecting the first usable heading and
// the first few substantial paragraphs.
function harvest(content: unknown, out: { heading?: string; paragraphs: string[] }) {
  if (!isGridSection(content) || isTocSection(content) || isAnyCover(content)) return;
  const blocks = [...(content as { blocks: { area: { rowStart: number; colStart: number }; content: unknown }[] }).blocks]
    .sort((a, b) => a.area.rowStart - b.area.rowStart || a.area.colStart - b.area.colStart);
  for (const b of blocks) {
    const doc = b.content as JSONContent | undefined;
    if (doc?.type !== "doc") continue;
    for (const node of doc.content ?? []) {
      const text = textOf(node);
      if (!text) continue;
      if (node.type === "heading" && !out.heading) out.heading = text;
      // skip one-word fragments; they tell you nothing about measure or leading
      else if (node.type === "paragraph" && out.paragraphs.length < 2 && text.split(/\s+/).length > 4) {
        out.paragraphs.push(text.length > 320 ? text.slice(0, 320).replace(/\s\S*$/, "…") : text);
      }
    }
  }
}

// Their content if we can find it, otherwise neutral sample text — a brand-new
// blank document still gets a meaningful preview.
export function extractSpecimen(sections: { content: unknown }[]): Specimen {
  const out: { heading?: string; paragraphs: string[] } = { paragraphs: [] };
  for (const s of sections) {
    harvest(s.content, out);
    if (out.heading && out.paragraphs.length >= 2) break; // enough to judge a look
  }
  return {
    heading: out.heading || FALLBACK.heading,
    paragraphs: out.paragraphs.length ? out.paragraphs : FALLBACK.paragraphs,
  };
}

// The specimen as HTML, ready to drop into a themed container. Escaped — this is
// user text going into innerHTML.
export function specimenHtml(s: Specimen): string {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // wrapped in .page-content so the body/measure/drop-cap rules — which target the
  // page containers, not bare tags — actually apply in the preview.
  const inner = `<h1>${esc(s.heading)}</h1>` + s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("");
  return `<div class="page-content">${inner}</div>`;
}
