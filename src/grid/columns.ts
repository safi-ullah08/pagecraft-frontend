import type { LayoutSpec, LayoutPage, LayoutBlock } from "@pagecraft/model";

// Column count lives in a template's FLOW pages (side-by-side `body` slots), so for a
// one-column variant we rewrite only those pages before layout; cover, openers, TOC and
// back matter are untouched.

// Uniform rule for every template: merge the `body` slots into one full-width column
// from the top of the text band down to the first non-body slot (photo, panel, rule),
// which stays in place. Overflow continues onto the next flow page, so no text is lost.
// If an obstacle already sits at the top of the band, fall back to the leftmost body column.

export type ColumnCount = 1 | 2;

const overlapsCols = (a: LayoutBlock, colStart: number, colEnd: number) =>
  a.area.colEnd > colStart && a.area.colStart < colEnd;

function flowPageToSingle(page: LayoutPage): LayoutPage {
  const bodies = page.blocks.filter((b) => b.slot === "body");
  if (bodies.length <= 1) return page; // already one column
  const others = page.blocks.filter((b) => b.slot !== "body");

  const colStart = Math.min(...bodies.map((b) => b.area.colStart));
  const colEnd = Math.max(...bodies.map((b) => b.area.colEnd));
  const rowStart = Math.min(...bodies.map((b) => b.area.rowStart));
  const rowEnd = Math.max(...bodies.map((b) => b.area.rowEnd));

  // the full-width column stops at the first non-body slot sitting inside the band
  const inBand = others.filter((o) => overlapsCols(o, colStart, colEnd));
  const blockedAtTop = inBand.some((o) => o.area.rowStart <= rowStart && o.area.rowEnd > rowStart);
  const limit = inBand
    .filter((o) => o.area.rowStart > rowStart)
    .reduce((lo, o) => Math.min(lo, o.area.rowStart), rowEnd);

  // keep the leftmost body's slot/style; just give it the merged area
  const primary = bodies.reduce((a, b) => (b.area.colStart < a.area.colStart ? b : a));
  const mergedArea = blockedAtTop
    ? primary.area // top is occupied — fall back to the leftmost column
    : { rowStart, colStart, rowEnd: limit, colEnd };

  return { ...page, blocks: [{ ...primary, area: mergedArea }, ...others] };
}

// Rewrite a layout spec for the requested column count. Two columns is the
// template as authored (no change); one column collapses every flow page.
export function withColumnCount(spec: LayoutSpec, columns: ColumnCount): LayoutSpec {
  if (columns === 2) return spec;
  return {
    ...spec,
    pages: spec.pages.map((p) => (p.role === "flow" ? flowPageToSingle(p) : p)),
  };
}
