import type { JSONContent } from "@tiptap/react";

// Mirrors @pagecraft/model's grid types (the worker + gridSerialize consume the
// same shape). A grid SECTION is one page of placed blocks on a 12×12 grid.
export const COLS = 12;
export const ROWS = 12;

export type GridArea = { rowStart: number; colStart: number; rowEnd: number; colEnd: number };

export type BlockType = "paragraph" | "heading" | "image" | "callout" | "pullQuote" | "divider" | "spacer";

// Text blocks carry a Tiptap doc; non-text blocks carry typed props.
export type GridBlock = { id: string; area: GridArea; block: BlockType; content: JSONContent | Record<string, unknown> };

export type GridSection = { type: "grid"; blocks: GridBlock[] };

export function isGridSection(content: unknown): content is GridSection {
  return !!content && (content as { type?: string }).type === "grid";
}

export function emptyGridSection(): GridSection {
  return { type: "grid", blocks: [] };
}
