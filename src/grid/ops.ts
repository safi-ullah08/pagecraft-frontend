import { COLS, ROWS, type BlockStyleTokens, type BlockType, type GridArea, type GridBlock, type GridSection } from "./types.ts";
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

export function addBlock(section: GridSection, block: BlockType, at?: GridArea): { section: GridSection; id: string } {
  const bid = id();
  const area = clampArea(at ?? BLOCKS[block].defaultArea, BLOCKS[block].min);
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

// Snap a block's row span so the box wraps its content exactly (to the nearest
// whole cell), keeping its top-left. Used by "Fit" and auto-fit-on-edit-exit.
export function fitBlockRows(section: GridSection, blockId: string, rows: number): GridSection {
  return patch(section, blockId, (b) => clampBlockRows(b, rows));
}
function clampBlockRows(b: GridBlock, rows: number): GridBlock {
  return { ...b, area: clampArea({ ...b.area, rowEnd: b.area.rowStart + rows }, BLOCKS[b.block].min) };
}

export function updateBlockContent(section: GridSection, blockId: string, content: unknown): GridSection {
  return patch(section, blockId, (b) => ({ ...b, content: content as GridBlock["content"] }));
}

// Merge a style-token patch; drop keys set back to undefined (reset-to-theme) so
// the stored style stays minimal (and empty {} disappears).
export function updateBlockStyle(section: GridSection, blockId: string, tokens: Partial<BlockStyleTokens>): GridSection {
  return patch(section, blockId, (b) => {
    const merged: Record<string, unknown> = { ...b.style, ...tokens };
    for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
    return { ...b, style: Object.keys(merged).length ? (merged as BlockStyleTokens) : undefined };
  });
}

export function removeBlock(section: GridSection, blockId: string): GridSection {
  return { ...section, blocks: section.blocks.filter((b) => b.id !== blockId) };
}

export function removeBlocks(section: GridSection, ids: string[]): GridSection {
  const set = new Set(ids);
  return { ...section, blocks: section.blocks.filter((b) => !set.has(b.id)) };
}

// After `anchorId`'s area changed (typically grew to fit overflow), push blocks
// it now overlaps DOWNWARD to make room — cascading to blocks they in turn push
// into. Only ever moves blocks down (monotonic → always terminates); a block that
// would leave the page clamps at the bottom. A block that overlaps the anchor from
// ABOVE is left alone (we only open space below the growing block).
export function pushDownOverlaps(section: GridSection, anchorId: string): GridSection {
  const byId = new Map(section.blocks.map((b) => [b.id, { ...b, area: { ...b.area } }]));
  const anchor = byId.get(anchorId);
  if (!anchor) return section;
  const colsOverlap = (a: GridArea, b: GridArea) => a.colStart < b.colEnd && b.colStart < a.colEnd;
  const rowsOverlap = (a: GridArea, b: GridArea) => a.rowStart < b.rowEnd && b.rowStart < a.rowEnd;
  const queue = [anchorId];
  let steps = 0;
  const guard = section.blocks.length * (ROWS + 1) + 1; // monotonic, but bound it anyway
  while (queue.length && steps++ < guard) {
    const a = byId.get(queue.shift()!)!;
    for (const x of byId.values()) {
      if (x.id === a.id) continue;
      if (x.area.rowStart >= a.area.rowStart && colsOverlap(a.area, x.area) && rowsOverlap(a.area, x.area)) {
        const shift = a.area.rowEnd - x.area.rowStart; // push x's top to a's bottom
        if (shift <= 0) continue;
        const h = x.area.rowEnd - x.area.rowStart;
        x.area.rowStart += shift;
        x.area.rowEnd += shift;
        if (x.area.rowEnd > ROWS + 1) { x.area.rowEnd = ROWS + 1; x.area.rowStart = ROWS + 1 - h; } // clamp at bottom
        queue.push(x.id);
      }
    }
  }
  return { ...section, blocks: section.blocks.map((b) => byId.get(b.id)!) };
}

// Move every block in `ids` by the same cell delta (group move), each clamped.
export function moveBlocks(section: GridSection, ids: string[], dCol: number, dRow: number): GridSection {
  const set = new Set(ids);
  return {
    ...section,
    blocks: section.blocks.map((b) =>
      set.has(b.id)
        ? { ...b, area: clampArea({ rowStart: b.area.rowStart + dRow, colStart: b.area.colStart + dCol, rowEnd: b.area.rowEnd + dRow, colEnd: b.area.colEnd + dCol }, BLOCKS[b.block].min) }
        : b,
    ),
  };
}

// Copies with fresh ids, nudged one cell down-right (paste/duplicate feel).
export function cloneBlocks(blocks: GridBlock[]): GridBlock[] {
  return blocks.map((b) => ({
    ...structuredClone(b),
    id: id(),
    area: clampArea({ rowStart: b.area.rowStart + 1, colStart: b.area.colStart + 1, rowEnd: b.area.rowEnd + 1, colEnd: b.area.colEnd + 1 }, BLOCKS[b.block].min),
  }));
}
