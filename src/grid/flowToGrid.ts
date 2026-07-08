import { serialize } from "@pagecraft/model";
import type { JSONContent } from "@tiptap/react";
import { themeSkinCss } from "../themes.ts";
import { scopeThemeCss } from "../scope-css.ts";
import { PAGE_SIZES, PAGE_MARGIN_MM, type PageSize } from "../pages.ts";
import type { GridSection } from "./types.ts";

// Flow → grid (model A, first pass): split each imported chapter into page-fitting
// chunks and wrap each chunk in a full-page `textFrame` block on its own grid page.
// Pagination is BY MEASUREMENT — render each top-level node off-screen at the page
// content width, accumulate until it would overflow the page height, then break.
// ponytail: node-boundary splits (a paragraph never splits mid-way, so a page may
// end slightly short); good enough. Re-paginating after edits is a later pass.
const MM = 96 / 25.4; // CSS px per mm at 96dpi

const id = () => Math.random().toString(36).slice(2, 10);

export function flowToGrid(chapters: JSONContent[], theme: string, pageSize: PageSize): GridSection[] {
  const dim = PAGE_SIZES[pageSize];
  const contentW = (dim.w - 2 * PAGE_MARGIN_MM) * MM;
  const contentH = (dim.h - 2 * PAGE_MARGIN_MM) * MM * 0.94; // slack so nothing clips at the fold

  // one off-screen measuring surface, skinned like the output so heights match
  const style = document.createElement("style");
  style.textContent = scopeThemeCss(themeSkinCss(theme), ".pc-measure");
  const meas = document.createElement("div");
  meas.className = "pc-measure";
  meas.style.cssText = `position:absolute;left:-99999px;top:0;width:${contentW}px;visibility:hidden`;
  document.body.append(style, meas);

  const frame = (nodes: JSONContent[]): GridSection => ({
    type: "grid",
    blocks: [{
      id: id(),
      area: { rowStart: 1, colStart: 1, rowEnd: 13, colEnd: 13 }, // full page
      block: "textFrame",
      content: { type: "doc", content: nodes },
    }],
  });

  const pages: GridSection[] = [];
  for (const chapter of chapters) {
    let cur: JSONContent[] = [];
    let curH = 0;
    for (const node of chapter.content ?? []) {
      meas.innerHTML = serialize({ type: "doc", content: [node] });
      const h = meas.offsetHeight;
      if (curH + h > contentH && cur.length) { pages.push(frame(cur)); cur = []; curH = 0; }
      cur.push(node);
      curH += h;
    }
    if (cur.length) pages.push(frame(cur)); // chapter always ends the current page
  }

  meas.remove();
  style.remove();
  return pages.length ? pages : [frame([{ type: "paragraph" }])]; // never zero pages
}
