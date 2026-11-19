import { layout, type LayoutPlan, type LayoutSpec, type LayoutResult } from "@pagecraft/model";
import type { PageDims } from "../pages.ts";
import { collectImageSrcs, domMeasure } from "./domMeasure.ts";

// Browser side of the layout ENGINE — the same measurer as the flow→grid import
// (domMeasure.ts), driving model layout() instead of parseBlocks(). Applies a
// slotted template to an imported document's chapters.
export async function runLayout(plan: LayoutPlan, spec: LayoutSpec, theme: string, dim: PageDims): Promise<LayoutResult> {
  const srcs = new Set<string>();
  for (const c of plan.chapters) for (const n of c.nodes) collectImageSrcs(n, srcs);
  const { geom, measure, dispose } = await domMeasure(srcs, theme, dim);
  try {
    return layout(plan, spec, geom, measure);
  } finally {
    dispose();
  }
}
