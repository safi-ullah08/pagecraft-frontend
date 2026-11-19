import { parseBlocks as modelParseBlocks } from "@pagecraft/model";
import type { JSONContent } from "@tiptap/react";
import type { PageDims } from "../pages.ts";
import { collectImageSrcs, domMeasure } from "./domMeasure.ts";
import type { GridSection } from "./types.ts";

// Browser side of flow→grid. The shared algorithm (mapping + pagination) lives in
// @pagecraft/model; the DOM measurer it needs is domMeasure.ts, shared with the
// slotted template engine (layoutDoc.ts).
export { collectImageSrcs, preloadDims } from "./domMeasure.ts";

export async function parseBlocks(chapters: JSONContent[], theme: string, dim: PageDims): Promise<GridSection[]> {
  const srcs = new Set<string>();
  chapters.forEach((c) => collectImageSrcs(c, srcs));
  const { geom, measure, dispose } = await domMeasure(srcs, theme, dim);
  try {
    return modelParseBlocks(chapters, geom, measure) as GridSection[];
  } finally {
    dispose();
  }
}
