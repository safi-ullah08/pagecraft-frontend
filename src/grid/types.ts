import type { JSONContent } from "@tiptap/react";
import type { BlockStyleTokens, BlockType } from "@pagecraft/model";

export type { BlockStyleTokens, BlockType };

// Mirrors @pagecraft/model's grid types (the worker + gridSerialize consume the
// same shape). A grid SECTION is one page of placed blocks on a 12×12 grid.
export const COLS = 12;
export const ROWS = 12;

export type GridArea = { rowStart: number; colStart: number; rowEnd: number; colEnd: number };

// BlockType now lives in @pagecraft/model (re-exported above).

// Text blocks carry a Tiptap doc; non-text blocks carry typed props. `style` holds
// per-block visual overrides from the inspector (undefined = inherit theme).
export type GridBlock = { id: string; area: GridArea; block: BlockType; content: JSONContent | Record<string, unknown>; style?: BlockStyleTokens };

export type GridSection = { type: "grid"; blocks: GridBlock[] };

export function isGridSection(content: unknown): content is GridSection {
  return !!content && (content as { type?: string }).type === "grid";
}

export function emptyGridSection(): GridSection {
  return { type: "grid", blocks: [] };
}
