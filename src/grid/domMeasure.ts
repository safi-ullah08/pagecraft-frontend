import { serialize } from "@pagecraft/model";
import type { JSONContent } from "@tiptap/react";
import { themeMargin, themeSkinCss } from "../themes.ts";
import { scopeThemeCss } from "../scope-css.ts";
import { contentBoxMm, type PageDims } from "../pages.ts";
import { ROWS, COLS } from "./types.ts";

// The DOM measurer both layout engines inject: flow→grid pagination
// (parseBlocks.ts) and slotted template layout (layoutDoc.ts). It lived in both
// files, byte for byte, until a fix to one left the other sizing captioned
// figures by their caption alone — photos crammed into a single grid row with
// the next block printed on top. One copy now.
const MM = 96 / 25.4; // CSS px per mm at 96dpi
const IMAGE_FALLBACK_ROWS = 5; // an image we couldn't load still reserves a sensible span

export type Geometry = { rowPx: number; colPx: number };
export type Measure = (doc: JSONContent, cols: number) => { w: number; h: number };

export function collectImageSrcs(node: JSONContent, acc: Set<string>) {
  const src = node.attrs?.src;
  if ((node.type === "image" || node.type === "figure") && typeof src === "string" && src) acc.add(src);
  node.content?.forEach((c) => collectImageSrcs(c, acc));
}

// Load every referenced image to learn its natural width/height (src here is the
// display URL, which the browser can fetch). Failures resolve empty → fallback size.
export function preloadDims(srcs: string[]): Promise<Map<string, { w: number; h: number }>> {
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

// Text is measured by rendering off-screen at the asked column width; images
// report their NATURAL size (preloaded up front) so each keeps its imported
// aspect. Call dispose() when the pass is done.
export async function domMeasure(srcs: Set<string>, theme: string, dim: PageDims): Promise<{
  geom: Geometry;
  measure: Measure;
  dispose: () => void;
}> {
  const gap = 4 * MM; // must match the editor grid gap (GridCanvas) and gridBaseCss --pc-gap
  const box = contentBoxMm(dim, themeMargin(theme));
  const contentW = box.w * MM;
  const contentH = box.h * MM;
  // per-row/col CONTENT height/width (gaps eat into the track), so a block sized to
  // N rows actually holds its content — matches how the grid renders + measure.ts.
  const rowPx = (contentH - (ROWS - 1) * gap) / ROWS;
  const colPx = (contentW - (COLS - 1) * gap) / COLS;

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

  // Width-aware: the probe is resized per call to the asked column span (slot
  // layout measures the same nodes at several widths). widthFor(COLS) equals
  // contentW by construction — colPx is derived from it. Cached by (cols, doc):
  // measurement is the hot path and slot layout re-asks far more than the old
  // linear pass did.
  const widthFor = (cols: number) => cols * colPx + (cols - 1) * gap;
  const cache = new Map<string, { w: number; h: number }>();
  const sizeOf = (src: string | null, maxW: number) => {
    const nat = dims.get(src ?? "");
    const w = Math.min(nat?.w ?? maxW, maxW); // never wider than asked
    return { w, h: nat ? (w * nat.h) / nat.w : rowPx * IMAGE_FALLBACK_ROWS };
  };

  const measure: Measure = (d, cols) => {
    const maxW = widthFor(Math.max(1, Math.min(COLS, cols)));
    const only = d.content?.length === 1 ? d.content[0] : null;
    if (only?.type === "image") return sizeOf(only.attrs?.src ?? null, maxW);

    const key = `${cols}:${JSON.stringify(d)}`;
    const hit = cache.get(key);
    if (hit) return hit;
    meas.style.width = `${maxW}px`;
    meas.innerHTML = serialize(d);
    // An <img> contributes no height until the browser has laid it out, so a
    // captioned figure measured this way came back as its CAPTION alone. Give
    // every image the size we preloaded, exactly as the branch above does.
    meas.querySelectorAll("img").forEach((im) => {
      const { w, h } = sizeOf(im.getAttribute("src"), maxW);
      im.style.width = `${w}px`;
      im.style.height = `${h}px`;
    });
    const out = { w: maxW, h: meas.offsetHeight };
    cache.set(key, out);
    return out;
  };

  return { geom: { rowPx, colPx }, measure, dispose: () => { meas.remove(); style.remove(); } };
}
