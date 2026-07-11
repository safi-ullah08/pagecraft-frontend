import { serialize, renderTypedBlock, type SideValues } from "@pagecraft/model";
import type { JSONContent } from "@tiptap/react";
import { themeSkinCss } from "../themes.ts";
import { scopeThemeCss } from "../scope-css.ts";
import { PAGE_SIZES, PAGE_MARGIN_MM, type PageSize } from "../pages.ts";
import { COLS, ROWS, type GridBlock } from "./types.ts";
import { BLOCKS } from "./blocks.ts";

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
export function blockWidthPx(cols: number, pageSize: PageSize): number {
  const dim = PAGE_SIZES[pageSize];
  const gap = GAP_MM * MM;
  const contentW = (dim.w - 2 * PAGE_MARGIN_MM) * MM;
  const colW = (contentW - (COLS - 1) * gap) / COLS;
  return cols * colW + (cols - 1) * gap;
}

// whole rows needed to hold `heightPx` of content (accounts for row gaps)
export function heightToRows(heightPx: number, pageSize: PageSize): number {
  const dim = PAGE_SIZES[pageSize];
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
