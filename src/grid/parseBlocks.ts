import { serialize, parseBlocks as modelParseBlocks } from "@pagecraft/model";
import type { JSONContent } from "@tiptap/react";
import { themeSkinCss } from "../themes.ts";
import { scopeThemeCss } from "../scope-css.ts";
import { PAGE_MARGIN_MM, type PageDims } from "../pages.ts";
import { ROWS, COLS, type GridSection } from "./types.ts";

// Browser side of flow→grid. The shared algorithm (mapping + pagination) lives in
// @pagecraft/model; here we supply the DOM measurer it needs. Text is measured by
// rendering off-screen at the page content width; images report their NATURAL size
// (preloaded up front) so each image block keeps its imported dimensions/aspect.
const MM = 96 / 25.4; // CSS px per mm at 96dpi
const IMAGE_FALLBACK_ROWS = 5; // if an image can't be loaded, fall back to a sensible span

function collectImageSrcs(node: JSONContent, acc: Set<string>) {
  const src = node.attrs?.src;
  if ((node.type === "image" || node.type === "figure") && typeof src === "string" && src) acc.add(src);
  node.content?.forEach((c) => collectImageSrcs(c, acc));
}

// Load every referenced image to learn its natural width/height (src here is the
// display URL, which the browser can fetch). Failures resolve empty → fallback size.
function preloadDims(srcs: string[]): Promise<Map<string, { w: number; h: number }>> {
  const map = new Map<string, { w: number; h: number }>();
  return Promise.all(
    srcs.map((src) => new Promise<void>((res) => {
      const im = new Image();
      im.onload = () => { map.set(src, { w: im.naturalWidth, h: im.naturalHeight }); res(); };
      im.onerror = () => res();
      im.src = src;
    })),
  ).then(() => map);
}

export async function parseBlocks(chapters: JSONContent[], theme: string, dim: PageDims): Promise<GridSection[]> {
  const gap = 4 * MM; // must match the editor grid gap (GridCanvas) and gridBaseCss --pc-gap
  const contentW = (dim.w - 2 * PAGE_MARGIN_MM) * MM;
  const contentH = (dim.h - 2 * PAGE_MARGIN_MM) * MM;
  // per-row/col CONTENT height/width (gaps eat into the track), so a block sized to
  // N rows actually holds its content — matches how the grid renders + measure.ts.
  const rowPx = (contentH - (ROWS - 1) * gap) / ROWS;
  const colPx = (contentW - (COLS - 1) * gap) / COLS;

  const srcs = new Set<string>();
  chapters.forEach((c) => collectImageSrcs(c, srcs));
  const dims = await preloadDims([...srcs]);

  const style = document.createElement("style");
  style.textContent = scopeThemeCss(themeSkinCss(theme), ".pc-measure");
  const meas = document.createElement("div");
  meas.className = "pc-measure";
  meas.style.cssText = `position:absolute;left:-99999px;top:0;width:${contentW}px;visibility:hidden`;
  document.body.append(style, meas);
  // wait for theme fonts, else text measures with fallback fonts (usually shorter)
  // and frames come out under-sized → they overflow once the real font paints.
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* ignore */ } }
  try {
    return modelParseBlocks(chapters, { rowPx, colPx }, (d) => {
      const only = d.content?.length === 1 ? d.content[0] : null;
      if (only?.type === "image") {
        const nat = dims.get(only.attrs?.src);
        const w = Math.min(nat?.w ?? contentW, contentW); // never wider than the page
        const h = nat ? (w * nat.h) / nat.w : rowPx * IMAGE_FALLBACK_ROWS;
        return { w, h };
      }
      meas.innerHTML = serialize(d);
      return { w: contentW, h: meas.offsetHeight };
    }) as GridSection[];
  } finally {
    meas.remove();
    style.remove();
  }
}
