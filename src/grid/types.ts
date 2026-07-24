import type { JSONContent } from "@tiptap/react";
import type { BlockStyleTokens, BlockType, PageBackground } from "@pagecraft/model";

export type { BlockStyleTokens, BlockType, PageBackground };

// Mirrors @pagecraft/model's grid types (the worker + gridSerialize consume the
// same shape). A grid SECTION is one page of placed blocks on a 12×12 grid.
export const COLS = 12;
export const ROWS = 12;

export type GridArea = { rowStart: number; colStart: number; rowEnd: number; colEnd: number };

// BlockType now lives in @pagecraft/model (re-exported above).

// Text blocks carry a Tiptap doc; non-text blocks carry typed props. `style` holds
// per-block visual overrides from the inspector (undefined = inherit theme).
// `zIndex` is the explicit stacking order; absent = fall back to array position, so
// documents written before layering render exactly as they did.
export type GridBlock = { id: string; area: GridArea; block: BlockType; content: JSONContent | Record<string, unknown>; style?: BlockStyleTokens; zIndex?: number };

// `background` paints the whole page, behind the grid (any page, not just covers).
export type GridSection = { type: "grid"; blocks: GridBlock[]; background?: PageBackground };

export function isGridSection(content: unknown): content is GridSection {
  return !!content && (content as { type?: string }).type === "grid";
}

export function emptyGridSection(): GridSection {
  return { type: "grid", blocks: [] };
}
