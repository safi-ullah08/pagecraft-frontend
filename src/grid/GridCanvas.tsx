import { useRef, useState } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import { extensions, blockStyleProps, renderTypedBlock } from "@pagecraft/model";
import { COLS, ROWS, type BlockType, type GridArea, type GridBlock, type GridSection } from "./types.ts";
import { BLOCKS, BLOCK_ORDER } from "./blocks.ts";
import { addBlock, moveBlock, resizeBlock, updateBlockContent, removeBlock, clampArea } from "./ops.ts";
import { PAGE_SIZES, PAGE_MARGIN_MM, type PageSize } from "../pages.ts";

// Recreated grid designer on OUR stack (temp/src is the visual reference only):
// a fixed page sheet with a 12×12 grid, blocks placed via inline grid-area, moved
// and resized with raw pointer events (no dnd-kit dep), text blocks edited inline
// with per-block Tiptap on the shared schema. Emits the whole GridSection upward.
export function GridCanvas({ section, onChange, pageSize, selected, onSelect }: {
  section: GridSection;
  onChange: (s: GridSection) => void;
  pageSize: PageSize;
  selected: string | null; // lifted to the store so the Inspector targets the same block
  onSelect: (id: string | null) => void;
}) {
  const dim = PAGE_SIZES[pageSize];
  const gridRef = useRef<HTMLDivElement>(null);
  // Live drag/resize preview — kept LOCAL so a drag only re-renders this canvas,
  // not the whole app + every Tiptap editor. Committed to the store on release.
  const [drag, setDrag] = useState<{ id: string; area: GridArea } | null>(null);

  const add = (block: BlockType) => {
    const { section: next, id } = addBlock(section, block);
    onChange(next);
    onSelect(id);
  };

  // Pointer drag: move the whole area (mode "move") or the end edges (mode "resize"),
  // snapping to grid cells from the pointer delta measured against the grid box.
  const startDrag = (e: React.PointerEvent, b: GridBlock, mode: "move" | "resize") => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(b.id);
    const grid = gridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = b.area;

    const min = BLOCKS[b.block].min;
    let last = orig;
    const onMove = (ev: PointerEvent) => {
      const dc = Math.round((ev.clientX - startX) / cellW);
      const dr = Math.round((ev.clientY - startY) / cellH);
      const raw: GridArea = mode === "move"
        ? { rowStart: orig.rowStart + dr, colStart: orig.colStart + dc, rowEnd: orig.rowEnd + dr, colEnd: orig.colEnd + dc }
        : { ...orig, rowEnd: orig.rowEnd + dr, colEnd: orig.colEnd + dc };
      last = clampArea(raw, min);
      setDrag({ id: b.id, area: last }); // local preview only
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDrag(null);
      onChange(mode === "move" ? moveBlock(section, b.id, last) : resizeBlock(section, b.id, last)); // commit once
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const sheet: React.CSSProperties = {
    width: `${dim.w}mm`, height: `${dim.h}mm`, boxSizing: "border-box",
    padding: `${PAGE_MARGIN_MM}mm`, position: "relative", margin: "0 auto",
    background: "#fff", boxShadow: "0 1px 10px rgba(0,0,0,.28)",
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {/* block palette */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 12, flexWrap: "wrap" }}>
        {BLOCK_ORDER.map((t) => (
          <button key={t} onClick={() => add(t)} title={`Add ${BLOCKS[t].label}`}
            style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 10px", background: "#fff", border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>{BLOCKS[t].icon}</span>{BLOCKS[t].label}
          </button>
        ))}
      </div>

      <div className="editor-surface" style={sheet} onPointerDown={() => onSelect(null)}>
        <div ref={gridRef} style={{ height: "100%", display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)`, gap: "4mm" }}>
          {/* faint grid guides */}
          <div style={{ gridArea: `1 / 1 / ${ROWS + 1} / ${COLS + 1}`, pointerEvents: "none",
            background: "repeating-linear-gradient(to right, transparent 0, transparent calc(100%/12 - 1px), rgba(0,0,0,.06) calc(100%/12 - 1px), rgba(0,0,0,.06) calc(100%/12))" }} />
          {section.blocks.map((b) => {
            const bb = drag?.id === b.id ? { ...b, area: drag.area } : b;
            return (
              <BlockView key={b.id} b={bb} selected={selected === b.id}
                onSelect={() => onSelect(b.id)}
                onDragStart={(e, mode) => startDrag(e, b, mode)}
                onContent={(c) => onChange(updateBlockContent(section, b.id, c))}
                onDelete={() => { onChange(removeBlock(section, b.id)); onSelect(null); }} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BlockView({ b, selected, onSelect, onDragStart, onContent, onDelete }: {
  b: GridBlock;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent, mode: "move" | "resize") => void;
  onContent: (c: unknown) => void;
  onDelete: () => void;
}) {
  const { rowStart, colStart, rowEnd, colEnd } = b.area;
  return (
    <div
      onPointerDown={(e) => { e.stopPropagation(); onSelect(); }}
      style={{ gridArea: `${rowStart} / ${colStart} / ${rowEnd} / ${colEnd}`, position: "relative",
        outline: selected ? "2px solid #E07A5F" : "1px dashed rgba(0,0,0,.12)", outlineOffset: -1, overflow: "hidden" }}
    >
      {selected && (
        <>
          {/* drag handle (move) */}
          <div onPointerDown={(e) => onDragStart(e, "move")} title="drag to move"
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, background: "#E07A5F", cursor: "grab", zIndex: 3 }} />
          {/* resize handle */}
          <div onPointerDown={(e) => onDragStart(e, "resize")} title="drag to resize"
            style={{ position: "absolute", right: 0, bottom: 0, width: 12, height: 12, background: "#E07A5F", cursor: "nwse-resize", zIndex: 3 }} />
          <button onClick={onDelete} title="delete"
            style={{ position: "absolute", top: -1, right: -1, width: 16, height: 16, background: "#E07A5F", color: "#fff", border: "none", fontSize: 11, lineHeight: 1, cursor: "pointer", zIndex: 4 }}>×</button>
        </>
      )}
      <div style={{ height: "100%", paddingTop: selected ? 14 : 0, boxSizing: "border-box", overflow: "hidden", ...(blockStyleProps(b.style) as React.CSSProperties) }}>
        <BlockBody b={b} onContent={onContent} />
      </div>
    </div>
  );
}

function BlockBody({ b, onContent }: { b: GridBlock; onContent: (c: unknown) => void }) {
  if (BLOCKS[b.block].text) return <BlockText content={b.content as JSONContent} onContent={onContent} />;
  if (b.block === "image") {
    const src = (b.content as { src?: string }).src;
    return src
      ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 12, background: "#f4f4f4" }}>Image</div>;
  }
  if (b.block === "divider") return <hr style={{ margin: "auto 0" }} />;
  if (b.block === "spacer") return null;
  // custom typed blocks: same HTML the PDF uses (renderTypedBlock)
  const html = renderTypedBlock(b.block, b.content);
  return html != null ? <div style={{ height: "100%", overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: html }} /> : null;
}

function BlockText({ content, onContent }: { content: JSONContent; onContent: (c: unknown) => void }) {
  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor }) => onContent(editor.getJSON()),
  });
  return <EditorContent editor={editor} />;
}
