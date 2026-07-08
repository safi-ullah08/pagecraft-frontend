import { COLS, ROWS, type BlockType, type GridArea, type GridBlock, type GridSection } from "./types.ts";
import { BLOCKS } from "./blocks.ts";

// Pure grid ops (GridSection -> GridSection). The canvas computes new areas from
// pointer deltas and calls these; the store persists the returned section.
// ponytail: blocks may overlap (z-order = document order) — collision packing is
// polish, not MVP. Clamp only keeps every block inside the 12×12 page.

const id = () => Math.random().toString(36).slice(2, 10);

// Keep an area inside the grid (1..COLS+1 / 1..ROWS+1) while preserving its size.
export function clampArea(a: GridArea, min = { cols: 1, rows: 1 }): GridArea {
  let w = Math.max(min.cols, a.colEnd - a.colStart);
  let h = Math.max(min.rows, a.rowEnd - a.rowStart);
  w = Math.min(w, COLS);
  h = Math.min(h, ROWS);
  const colStart = Math.min(Math.max(1, a.colStart), COLS + 1 - w);
  const rowStart = Math.min(Math.max(1, a.rowStart), ROWS + 1 - h);
  return { colStart, rowStart, colEnd: colStart + w, rowEnd: rowStart + h };
}

export function addBlock(section: GridSection, block: BlockType): { section: GridSection; id: string } {
  const bid = id();
  const area = clampArea(BLOCKS[block].defaultArea, BLOCKS[block].min);
  const b: GridBlock = { id: bid, area, block, content: structuredClone(BLOCKS[block].defaultContent) as GridBlock["content"] };
  return { section: { ...section, blocks: [...section.blocks, b] }, id: bid };
}

function patch(section: GridSection, blockId: string, fn: (b: GridBlock) => GridBlock): GridSection {
  return { ...section, blocks: section.blocks.map((b) => (b.id === blockId ? fn(b) : b)) };
}

export function moveBlock(section: GridSection, blockId: string, area: GridArea): GridSection {
  return patch(section, blockId, (b) => ({ ...b, area: clampArea(area, BLOCKS[b.block].min) }));
}

export function resizeBlock(section: GridSection, blockId: string, area: GridArea): GridSection {
  return moveBlock(section, blockId, area); // same clamp path; resize just changes the end edges
}

export function updateBlockContent(section: GridSection, blockId: string, content: unknown): GridSection {
  return patch(section, blockId, (b) => ({ ...b, content: content as GridBlock["content"] }));
}

export function removeBlock(section: GridSection, blockId: string): GridSection {
  return { ...section, blocks: section.blocks.filter((b) => b.id !== blockId) };
}
