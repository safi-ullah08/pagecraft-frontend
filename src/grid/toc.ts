import type { JSONContent } from "@tiptap/react";
import { BLOCKS } from "./blocks.ts";
import { COLS, ROWS, isGridSection, type GridSection } from "./types.ts";
import { isAnyCover } from "./covers.ts";

// Automatic table of contents. In the GRID path every section IS a page, so a
// heading's page number is just its section index — no page-number capture during
// a paged.js render (which is what makes auto-TOC hard for FLOW documents).

export type TocEntry = { text: string; level: number; page: number };

// A generated TOC page carries `toc: true` so it can be refreshed in place rather
// than stacking a second one, and so its own heading never indexes itself.
export type TocSection = GridSection & { toc: true };

export function isTocSection(content: unknown): boolean {
  return isGridSection(content) && (content as { toc?: boolean }).toc === true;
}

const textOf = (n: JSONContent): string =>
  (n.content ?? []).map((c) => (typeof c.text === "string" ? c.text : textOf(c))).join("").trim();

// Headings on one page in READING order (top-to-bottom, then left-to-right) — the
// grid is positional, so array order is not reading order.
function headingsOnPage(content: unknown): { text: string; level: number }[] {
  if (!isGridSection(content)) return [];
  const out: { text: string; level: number }[] = [];
  const ordered = [...(content as GridSection).blocks].sort(
    (a, b) => a.area.rowStart - b.area.rowStart || a.area.colStart - b.area.colStart,
  );
  for (const b of ordered) {
    const doc = b.content as JSONContent | undefined;
    if (!BLOCKS[b.block]?.text || doc?.type !== "doc") continue;
    for (const node of doc.content ?? []) {
      if (node.type !== "heading") continue;
      const text = textOf(node);
      if (text) out.push({ text, level: Number(node.attrs?.level) || 1 });
    }
  }
  return out;
}

// Entries for an ordered list of page contents. `startAt` matches the document's
// page-number setting so the TOC agrees with what's printed on the page. Pages are
// counted whether or not they're grid pages; only the TOC page itself is skipped.
export function collectToc(pages: unknown[], startAt = 1, maxLevel = 6): TocEntry[] {
  const out: TocEntry[] = [];
  pages.forEach((content, i) => {
    // Skip the contents page itself AND the cover — a cover's title is a heading,
    // but "My Book … 1" is not a contents entry. Both still occupy a page number.
    if (isTocSection(content) || isAnyCover(content)) return;
    for (const h of headingsOnPage(content)) {
      if (h.level <= maxLevel) out.push({ text: h.text, level: h.level, page: startAt + i });
    }
  });
  return out;
}

const rid = () => Math.random().toString(36).slice(2, 10);

// The generated entries live in a tocList typed block (dot leaders, tabular
// numbers, per-level indent — all skin-restyled). Filling entries preserves the
// page's DESIGN: a template's contents page keeps its panels/title/areas across
// refreshes; only the tocList block's entries are replaced.
export function hasTocList(section: GridSection): boolean {
  return section.blocks.some((b) => b.block === "tocList");
}
export function fillTocEntries(section: GridSection, entries: TocEntry[]): GridSection {
  return {
    ...section,
    blocks: section.blocks.map((b) =>
      b.block === "tocList" ? { ...b, content: { ...(b.content as object), entries } } : b,
    ),
  };
}

// The DEFAULT contents page (untemplated docs, and templates' `kind:"toc"`
// sugar): a title frame over a tocList. Templates wanting a bespoke design
// author their own page with a `slot:"toc"` block instead.
export function buildTocSection(entries: TocEntry[], title = "Contents"): TocSection {
  const heading: JSONContent = {
    type: "doc",
    content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: title }] }],
  };
  return {
    type: "grid",
    toc: true,
    blocks: [
      {
        id: rid(),
        area: { rowStart: 1, colStart: 2, rowEnd: 3, colEnd: 12 },
        block: "textFrame",
        content: heading,
      },
      {
        id: rid(),
        area: { rowStart: 3, colStart: 2, rowEnd: ROWS + 1, colEnd: 12 },
        block: "tocList",
        content: { entries, leader: "dots", showNumbers: true, maxLevel: 3 },
      },
    ],
  };
}

// An empty marker used to reserve the TOC's own slot while projecting page numbers
// for a TOC that doesn't exist yet (inserting it shifts every later page by one).
export function tocPlaceholder(): TocSection {
  return { type: "grid", toc: true, blocks: [] };
}
