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

// ponytail: a fixed page margin for the editor sheet. Per-theme margins live in
// the skins' @page; wiring those (and pageSize) into the PDF export is the P4
// design/token pass — for now the editor sheet uses one sensible margin.
export const PAGE_MARGIN_MM = 18;
