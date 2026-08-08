import { layout, serialize, type LayoutPlan, type LayoutSpec, type LayoutResult } from "@pagecraft/model";
import type { JSONContent } from "@tiptap/react";
import { themeSkinCss } from "../themes.ts";
import { scopeThemeCss } from "../scope-css.ts";
import { PAGE_MARGIN_MM, type PageDims } from "../pages.ts";
import { COLS, ROWS } from "./types.ts";
import { collectImageSrcs, preloadDims } from "./parseBlocks.ts";

// Browser side of the layout ENGINE — the same probe/measurer setup as the
// flow→grid import (parseBlocks.ts), driving model layout() instead of
// parseBlocks(). Applies a slotted template to an imported document's chapters.
const MM = 96 / 25.4;
const IMAGE_FALLBACK_ROWS = 5;

export async function runLayout(plan: LayoutPlan, spec: LayoutSpec, theme: string, dim: PageDims): Promise<LayoutResult> {
  const gap = 4 * MM; // must match GridCanvas grid gap / gridBaseCss --pc-gap
  const contentW = (dim.w - 2 * PAGE_MARGIN_MM) * MM;
  const contentH = (dim.h - 2 * PAGE_MARGIN_MM) * MM;
  const rowPx = (contentH - (ROWS - 1) * gap) / ROWS;
  const colPx = (contentW - (COLS - 1) * gap) / COLS;

  const srcs = new Set<string>();
  for (const c of plan.chapters) for (const n of c.nodes) collectImageSrcs(n, srcs);
  const dims = await preloadDims([...srcs]);

  const style = document.createElement("style");
  style.textContent = scopeThemeCss(themeSkinCss(theme), ".pc-measure");
  const meas = document.createElement("div");
  meas.className = "pc-measure";
  meas.style.cssText = `position:absolute;left:-99999px;top:0;width:${contentW}px;visibility:hidden`;
  document.body.append(style, meas);
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* ignore */ } }
  const widthFor = (cols: number) => cols * colPx + (cols - 1) * gap;
  const cache = new Map<string, { w: number; h: number }>();
  try {
    return layout(plan, spec, { rowPx, colPx }, (d: JSONContent, cols: number) => {
      const maxW = widthFor(Math.max(1, Math.min(COLS, cols)));
      const only = d.content?.length === 1 ? d.content[0] : null;
      if (only?.type === "image") {
        const nat = dims.get(only.attrs?.src);
        const w = Math.min(nat?.w ?? maxW, maxW);
        const h = nat ? (w * nat.h) / nat.w : rowPx * IMAGE_FALLBACK_ROWS;
        return { w, h };
      }
      const key = `${cols}:${JSON.stringify(d)}`;
      const hit = cache.get(key);
      if (hit) return hit;
      meas.style.width = `${maxW}px`;
      meas.innerHTML = serialize(d);
      const out = { w: maxW, h: meas.offsetHeight };
      cache.set(key, out);
      return out;
    });
  } finally {
    meas.remove();
    style.remove();
  }
}
