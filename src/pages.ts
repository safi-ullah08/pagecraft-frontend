import type { PageMargin } from "@pagecraft/model";

// Page presets in millimetres (CSS supports `mm` directly, so sheet dimensions
// are physically accurate with no px conversion). Drives the editor page sheets.
export const PAGE_SIZES = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  Letter: { w: 216, h: 279 },
  Legal: { w: 216, h: 356 },
} as const;

export type PageSize = keyof typeof PAGE_SIZES;

// Exact page dimensions in mm — the source of truth (a docx can be any size, not
// just a preset). Presets above are a convenience selector that fill these in.
export type PageDims = { w: number; h: number };
export const A4: PageDims = PAGE_SIZES.A4;

// The preset whose dims match exactly, or null (a "Custom" size, e.g. from a docx).
export function presetOf(p: PageDims): PageSize | null {
  return (Object.keys(PAGE_SIZES) as PageSize[]).find((k) => PAGE_SIZES[k].w === p.w && PAGE_SIZES[k].h === p.h) ?? null;
}

// Fallback page margin, for a skin that declares no `@page { margin: … }`. The
// real margin is per-theme and comes from the skin itself (themes.themeMargin /
// the model's styles/pageMargin.ts) — this only has to agree with gridBaseCss's
// `--pc-margin` default. ponytail: pageSize is still fixed per document; wiring
// that per-theme is the rest of the P4 design/token pass.
export const PAGE_MARGIN_MM = 18;

// The printable box inside the margins, in mm — the 12x12 grid's area. ONE
// definition, shared by the editor sheet, fit/split measurement, the flow→grid
// import and the layout engine, so none of them can disagree about page geometry.
export function contentBoxMm(dim: PageDims, m: PageMargin): PageDims {
  return { w: dim.w - m.left - m.right, h: dim.h - m.top - m.bottom };
}
