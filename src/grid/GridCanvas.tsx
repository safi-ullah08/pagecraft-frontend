import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import { extensions, blockStyleProps, renderTypedBlock } from "@pagecraft/model";
import { COLS, ROWS, type GridArea, type GridBlock, type GridSection } from "./types.ts";
import { BLOCKS } from "./blocks.ts";
import { moveBlock, resizeBlock, updateBlockContent, removeBlock, clampArea } from "./ops.ts";
import { PAGE_SIZES, PAGE_MARGIN_MM, type PageSize } from "../pages.ts";

// Recreated grid designer with temp/src's interaction feel on OUR stack:
// single click = SELECT (outline + handles), double click = EDIT (inline Tiptap);
// the whole block is the drag surface (smooth translate, snap on drop); only the
// selected block shows chrome; resize from right / bottom / corner. See UX-PARITY.md.
const ACCENT = "#E07A5F";
const DRAG_THRESHOLD = 4; // px before a press becomes a drag (else it's a click)

type Drag =
  | { id: string; kind: "move"; dx: number; dy: number }
  | { id: string; kind: "resize"; area: GridArea };

export function GridCanvas({ section, sectionId, onChange, onMoveAcross, pageSize, selected, onSelect, editingId, onEdit, showGrid }: {
  section: GridSection;
  sectionId: string;
  onChange: (s: GridSection) => void;
  onMoveAcross: (blockId: string, toSectionId: string, area: GridArea) => void;
  pageSize: PageSize;
  selected: string | null;
  onSelect: (id: string | null) => void;
  editingId: string | null;
  onEdit: (id: string | null) => void;
  showGrid: boolean;
}) {
  const dim = PAGE_SIZES[pageSize];
  const gridRef = useRef<HTMLDivElement>(null);
  // Live preview kept LOCAL so a drag re-renders only this canvas, not every
  // Tiptap editor. move → pixel translate (smooth follow); resize → snapped area.
  const [drag, setDrag] = useState<Drag | null>(null);

  const cells = () => {
    const r = gridRef.current!.getBoundingClientRect();
    return { r, cellW: r.width / COLS, cellH: r.height / ROWS };
  };
  const otherGridAt = (x: number, y: number): HTMLElement | null => {
    const g = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-sec]") as HTMLElement | null;
    return g && g.getAttribute("data-sec") !== sectionId ? g : null;
  };

  // Whole-block move: press anywhere on the block (when not editing). A press with
  // no movement is a plain select; movement past the threshold becomes a drag.
  const startMove = (e: React.PointerEvent, b: GridBlock) => {
    if (editingId === b.id) return; // editing → let Tiptap handle the pointer
    const grid = gridRef.current;
    if (!grid) return;
    const { cellW, cellH } = cells();
    const startX = e.clientX, startY = e.clientY, orig = b.area, min = BLOCKS[b.block].min;
    let moved = false;
    let hot: HTMLElement | null = null;
    const clearHot = () => { if (hot) { hot.style.outline = ""; hot.style.outlineOffset = ""; hot = null; } };

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
      moved = true;
      ev.preventDefault();
      const other = otherGridAt(ev.clientX, ev.clientY);
      if (other) { if (hot !== other) { clearHot(); other.style.outline = `2px solid ${ACCENT}`; other.style.outlineOffset = "-2px"; hot = other; } }
      else clearHot();
      setDrag({ id: b.id, kind: "move", dx, dy });
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      clearHot();
      setDrag(null);
      onSelect(b.id); // press always selects (drag or click)
      if (!moved) return;
      const other = otherGridAt(ev.clientX, ev.clientY);
      if (other) { // dropped on another page → transfer
        const r = other.getBoundingClientRect();
        const w = orig.colEnd - orig.colStart, h = orig.rowEnd - orig.rowStart;
        const colStart = Math.floor((ev.clientX - r.left) / (r.width / COLS)) + 1;
        const rowStart = Math.floor((ev.clientY - r.top) / (r.height / ROWS)) + 1;
        onMoveAcross(b.id, other.getAttribute("data-sec")!, clampArea({ colStart, rowStart, colEnd: colStart + w, rowEnd: rowStart + h }, min));
        return;
      }
      const dc = Math.round((ev.clientX - startX) / cellW), dr = Math.round((ev.clientY - startY) / cellH);
      onChange(moveBlock(section, b.id, clampArea({ rowStart: orig.rowStart + dr, colStart: orig.colStart + dc, rowEnd: orig.rowEnd + dr, colEnd: orig.colEnd + dc }, min)));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Resize from an edge/corner handle (snapped live preview).
  const startResize = (e: React.PointerEvent, b: GridBlock, side: "right" | "bottom" | "corner") => {
    e.preventDefault();
    e.stopPropagation();
    if (!gridRef.current) return;
    const { cellW, cellH } = cells();
    const startX = e.clientX, startY = e.clientY, orig = b.area, min = BLOCKS[b.block].min;
    let last = orig;
    const onMove = (ev: PointerEvent) => {
      const dc = Math.round((ev.clientX - startX) / cellW), dr = Math.round((ev.clientY - startY) / cellH);
      const raw = { ...orig };
      if (side === "right" || side === "corner") raw.colEnd = orig.colEnd + dc;
      if (side === "bottom" || side === "corner") raw.rowEnd = orig.rowEnd + dr;
      last = clampArea(raw, min);
      setDrag({ id: b.id, kind: "resize", area: last });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDrag(null);
      onChange(resizeBlock(section, b.id, last));
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
      {/* palette lives in the right bar (ControlsPanel › Blocks) */}
      <div className="editor-surface" style={sheet} onPointerDown={() => { onSelect(null); onEdit(null); }}>
        <div ref={gridRef} data-sec={sectionId} style={{ height: "100%", display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)`, gap: "4mm" }}>
          {/* faint grid guides */}
          {showGrid && <div style={{ gridArea: `1 / 1 / ${ROWS + 1} / ${COLS + 1}`, pointerEvents: "none",
            background: "repeating-linear-gradient(to right, transparent 0, transparent calc(100%/12 - 1px), rgba(0,0,0,.05) calc(100%/12 - 1px), rgba(0,0,0,.05) calc(100%/12))" }} />}
          {section.blocks.map((b) => {
            const d = drag?.id === b.id ? drag : null;
            const area = d?.kind === "resize" ? d.area : b.area;
            const translate = d?.kind === "move" ? `translate(${d.dx}px, ${d.dy}px)` : undefined;
            return (
              <BlockView key={b.id} b={{ ...b, area }} translate={translate}
                selected={selected === b.id} editing={editingId === b.id}
                onStartMove={(e) => startMove(e, b)}
                onStartResize={(e, side) => startResize(e, b, side)}
                onSelect={() => onSelect(b.id)}
                onEdit={() => onEdit(b.id)}
                onContent={(c) => onChange(updateBlockContent(section, b.id, c))}
                onDelete={() => { onChange(removeBlock(section, b.id)); onSelect(null); }} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BlockView({ b, translate, selected, editing, onStartMove, onStartResize, onSelect, onEdit, onContent, onDelete }: {
  b: GridBlock;
  translate?: string;
  selected: boolean;
  editing: boolean;
  onStartMove: (e: React.PointerEvent) => void;
  onStartResize: (e: React.PointerEvent, side: "right" | "bottom" | "corner") => void;
  onSelect: () => void;
  onEdit: () => void;
  onContent: (c: unknown) => void;
  onDelete: () => void;
}) {
  const { rowStart, colStart, rowEnd, colEnd } = b.area;
  const dragging = !!translate;
  const reg = BLOCKS[b.block];
  // overflow affordance: dashed bar when the content is taller than its box
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const check = () => setOverflow(el.scrollHeight > el.clientHeight + 2);
    check();
    const obs = new ResizeObserver(check);
    obs.observe(el);
    return () => obs.disconnect();
  }, [b.area, b.content]);
  return (
    <div
      onPointerDown={(e) => { if (editing) return; e.stopPropagation(); onStartMove(e); }}
      onClick={(e) => { e.stopPropagation(); if (!editing) onSelect(); }}
      onDoubleClick={(e) => { e.stopPropagation(); onSelect(); if (reg.text) onEdit(); }}
      onDragStart={(e) => e.preventDefault()} // kill native drag (images etc.) so our pointer drag wins
      style={{
        gridArea: `${rowStart} / ${colStart} / ${rowEnd} / ${colEnd}`, position: "relative",
        cursor: editing ? "text" : dragging ? "grabbing" : "grab",
        outline: selected ? `2px solid ${ACCENT}` : "none", outlineOffset: 1,
        transform: translate, opacity: dragging ? 0.6 : 1, zIndex: selected ? 5 : 1,
        // while not editing, a press-drag must move the block — never select text
        userSelect: editing ? "auto" : "none", WebkitUserSelect: editing ? "auto" : "none",
      }}
    >
      <div ref={contentRef} style={{ height: "100%", overflow: "hidden", ...(blockStyleProps(b.style) as React.CSSProperties) }}>
        <BlockBody b={b} editing={editing} onContent={onContent} />
      </div>
      {overflow && !dragging && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 20, pointerEvents: "none",
          background: `linear-gradient(transparent, ${ACCENT}40)`, borderBottom: `2px dashed ${ACCENT}` }} />
      )}
      {selected && !dragging && (
        <>
          <ResizeHandle side="right" onStart={onStartResize} />
          <ResizeHandle side="bottom" onStart={onStartResize} />
          <ResizeHandle side="corner" onStart={onStartResize} />
          <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Remove block"
            style={{ position: "absolute", top: -10, right: -10, width: 20, height: 20, borderRadius: "50%", background: ACCENT, color: "#fff", border: "none", fontSize: 12, lineHeight: 1, cursor: "pointer", zIndex: 10, boxShadow: "0 1px 3px rgba(0,0,0,.4)" }}>×</button>
        </>
      )}
    </div>
  );
}

function ResizeHandle({ side, onStart }: { side: "right" | "bottom" | "corner"; onStart: (e: React.PointerEvent, side: "right" | "bottom" | "corner") => void }) {
  const base: React.CSSProperties = { position: "absolute", zIndex: 8 };
  const style: React.CSSProperties =
    side === "right" ? { ...base, top: 0, right: -4, width: 8, height: "100%", cursor: "ew-resize" }
    : side === "bottom" ? { ...base, left: 0, bottom: -4, width: "100%", height: 8, cursor: "ns-resize" }
    : { ...base, right: -5, bottom: -5, width: 12, height: 12, cursor: "nwse-resize", background: ACCENT, borderRadius: 2 };
  return <div onPointerDown={(e) => onStart(e, side)} style={style} />;
}

function BlockBody({ b, editing, onContent }: { b: GridBlock; editing: boolean; onContent: (c: unknown) => void }) {
  if (BLOCKS[b.block].text) return <BlockText content={b.content as JSONContent} editable={editing} onContent={onContent} />;
  if (b.block === "image") {
    const src = (b.content as { src?: string }).src;
    return src
      ? <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", WebkitUserDrag: "none" } as React.CSSProperties} />
      : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 12, background: "#f4f4f4" }}>Image</div>;
  }
  if (b.block === "divider") return <hr style={{ margin: "auto 0" }} />;
  if (b.block === "spacer") return null;
  const html = renderTypedBlock(b.block, b.content);
  return html != null ? <div style={{ height: "100%", overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: html }} /> : null;
}

// Per-block Tiptap. Interactive ONLY while editing — otherwise pointer-events:none
// so clicks fall through to the block wrapper (select/drag), matching temp's
// select-vs-edit split. Focuses on entering edit mode.
function BlockText({ content, editable, onContent }: { content: JSONContent; editable: boolean; onContent: (c: unknown) => void }) {
  const editor = useEditor({
    extensions,
    content,
    editable,
    onUpdate: ({ editor }) => onContent(editor.getJSON()),
  });
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
    if (editable) editor.commands.focus("end");
  }, [editable, editor]);
  return <div style={{ height: "100%", pointerEvents: editable ? "auto" : "none" }}><EditorContent editor={editor} /></div>;
}
