import { serialize, renderTypedBlock, type SideValues } from "@pagecraft/model";
import type { JSONContent } from "@tiptap/react";
import { themeSkinCss } from "../themes.ts";
import { scopeThemeCss } from "../scope-css.ts";
import { PAGE_MARGIN_MM, type PageDims } from "../pages.ts";
import { COLS, ROWS, type GridBlock } from "./types.ts";
import { BLOCKS } from "./blocks.ts";
import { splitInlineAt, countWords } from "./split-inline.ts";

// Content measurement for fit-to-content (and later split). Geometry mirrors the
// editor canvas (GridCanvas): margin = PAGE_MARGIN_MM, cell gap = 4mm, so a fit
// matches what's on screen. ponytail: parseBlocks keeps its own reusable measuring
// surface for import perf; this one-shot is fine for a single block's fit.
const MM = 96 / 25.4; // CSS px per mm at 96dpi
const GAP_MM = 4; // must match GridCanvas grid gap

// The HTML a block renders (same as canvas/PDF): text via serialize, custom blocks
// via renderTypedBlock. null for blocks with no measurable flow (image/divider/spacer).
export function blockHtml(block: GridBlock): string | null {
  const c = block.content as JSONContent;
  if (BLOCKS[block.block].text && c?.type === "doc") return serialize(c);
  return renderTypedBlock(block.block, block.content);
}

// total px on the horizontal / vertical axes for a padding|margin token
export function sidesX(v?: number | SideValues): number { return typeof v === "number" ? 2 * v : v ? (v.left ?? 0) + (v.right ?? 0) : 0; }
export function sidesY(v?: number | SideValues): number { return typeof v === "number" ? 2 * v : v ? (v.top ?? 0) + (v.bottom ?? 0) : 0; }

// px content width of a block spanning `cols` columns
export function blockWidthPx(cols: number, dim: PageDims): number {
  const gap = GAP_MM * MM;
  const contentW = (dim.w - 2 * PAGE_MARGIN_MM) * MM;
  const colW = (contentW - (COLS - 1) * gap) / COLS;
  return cols * colW + (cols - 1) * gap;
}

// rendered px height of a block spanning `rows` rows (accounts for row gaps)
export function blockHeightPx(rows: number, dim: PageDims): number {
  const gap = GAP_MM * MM;
  const contentH = (dim.h - 2 * PAGE_MARGIN_MM) * MM;
  const rowH = (contentH - (ROWS - 1) * gap) / ROWS;
  return rows * rowH + (rows - 1) * gap;
}

// Largest node count k (>=1) whose serialized nodes[0..k] fit within maxHpx at
// widthPx — the split boundary. k === nodes.length means it all fits.
export function splitIndex(nodes: JSONContent[], widthPx: number, maxHpx: number, theme: string): number {
  let k = 1;
  for (let i = 1; i <= nodes.length; i++) {
    const h = measureHtmlHeight(serialize({ type: "doc", content: nodes.slice(0, i) }), widthPx, theme);
    if (i === 1 || h <= maxHpx) k = i;
    else break;
  }
  return k;
}

// Split a text-frame doc so part A fits within maxHpx, part B is the overflow.
// Splits between paragraphs where possible; if the FIRST overflowing paragraph is
// itself too tall, splits it INTERNALLY at the largest word count that still fits
// (binary search). B is empty when everything fits. DOM-measured (browser only).
export function splitTextFrameAt(doc: JSONContent, widthPx: number, maxHpx: number, theme: string): [JSONContent, JSONContent] {
  const nodes = doc.content ?? [];
  const fits = (ns: JSONContent[]) => measureHtmlHeight(serialize({ type: "doc", content: ns }), widthPx, theme) <= maxHpx;
  let k = 0;
  for (let i = 1; i <= nodes.length; i++) { if (fits(nodes.slice(0, i))) k = i; else break; }
  if (k === nodes.length) return [doc, { ...doc, content: [] }]; // all fits

  const head = nodes.slice(0, k);
  const overflow = nodes[k];
  if (overflow && (overflow.type === "paragraph" || overflow.type === "heading") && countWords(overflow) >= 2) {
    let lo = 1, hi = countWords(overflow) - 1, best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (fits([...head, splitInlineAt(overflow, mid)[0]])) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    if (best >= 1) {
      const [a, b] = splitInlineAt(overflow, best);
      return [{ ...doc, content: [...head, a] }, { ...doc, content: [b, ...nodes.slice(k + 1)] }];
    }
  }
  const at = Math.max(1, k); // fall back to a node boundary (never lose the block)
  return [{ ...doc, content: nodes.slice(0, at) }, { ...doc, content: nodes.slice(at) }];
}

// whole rows needed to hold `heightPx` of content (accounts for row gaps)
export function heightToRows(heightPx: number, dim: PageDims): number {
  const gap = GAP_MM * MM;
  const contentH = (dim.h - 2 * PAGE_MARGIN_MM) * MM;
  const rowH = (contentH - (ROWS - 1) * gap) / ROWS;
  return Math.max(1, Math.ceil((heightPx + gap) / (rowH + gap)));
}

// Rendered height (px) of HTML at a given content width, skinned like the export so
// it matches the on-screen block. One-shot off-screen surface.
export function measureHtmlHeight(html: string, widthPx: number, theme: string): number {
  const style = document.createElement("style");
  style.textContent = scopeThemeCss(themeSkinCss(theme), ".pc-measure");
  const meas = document.createElement("div");
  meas.className = "pc-measure";
  meas.style.cssText = `position:absolute;left:-99999px;top:0;width:${Math.max(1, widthPx)}px;visibility:hidden`;
  document.body.append(style, meas);
  try {
    meas.innerHTML = html;
    return meas.offsetHeight;
  } finally {
    meas.remove();
    style.remove();
  }
}
