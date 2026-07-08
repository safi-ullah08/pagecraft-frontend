// Page presets in millimetres (CSS supports `mm` directly, so sheet dimensions
// are physically accurate with no px conversion). Drives the editor page sheets.
export const PAGE_SIZES = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  Letter: { w: 216, h: 279 },
  Legal: { w: 216, h: 356 },
} as const;

export type PageSize = keyof typeof PAGE_SIZES;

// ponytail: a fixed page margin for the editor sheet. Per-theme margins live in
// the skins' @page; wiring those (and pageSize) into the PDF export is the P4
// design/token pass — for now the editor sheet uses one sensible margin.
export const PAGE_MARGIN_MM = 18;
