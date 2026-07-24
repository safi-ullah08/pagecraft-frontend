import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent, BubbleMenu, type Editor, type JSONContent } from "@tiptap/react";
import { extensions, blockStyleProps, blockMargin, renderTypedBlock, scopeCustomCss, stackOrder, type PageNumberConfig } from "@pagecraft/model";
import { COLS, ROWS, type GridArea, type GridBlock, type GridSection } from "./types.ts";
import { BLOCKS } from "./blocks.ts";
import { moveBlock, moveBlocks, resizeBlock, fitBlockRows, pushDownOverlaps, updateBlockContent, removeBlock, setBlockType, reorderLayer, clampArea, type LayerMove } from "./ops.ts";
import { PAGE_MARGIN_MM, type PageDims } from "../pages.ts";

// Recreated grid designer with temp/src's interaction feel on OUR stack:
// single click = SELECT, double click = EDIT (inline Tiptap); the whole block is
// the drag surface. Moving lifts the block into a FLOATING drag layer (a fixed
// portal above every page) so it travels across page boundaries seamlessly, with a
// live landing footprint on the page under the cursor and edge auto-scroll. Resize
// from right / bottom / corner. See UX-PARITY.md.
const ACCENT = "#E07A5F";
const DRAG_THRESHOLD = 4; // px before a press becomes a drag (else it's a click)
const EDGE = 48; // px from the scroll edge that triggers auto-scroll
const SCROLL_SPEED = 14; // px/frame while auto-scrolling

type Rect = { left: number; top: number; width: number; height: number };
type Drag =
  // group != null → a multi-select drag: every selected block translates by (dx,dy)
  // live (no portal ghost); single drag floats the one block in the portal.
  | { id: string; kind: "move"; x: number; y: number; grabX: number; grabY: number; w: number; h: number; html: string; fp: Rect | null; group: string[] | null; dx: number; dy: number; mergeId: string | null; mergeLine: { left: number; right: number; top: number } | null }
  | { id: string; kind: "resize"; area: GridArea };

// "color:red;font-weight:700" -> a React style object. Naive split (good enough for
// simple page-number declarations); indexOf(":") keeps colons inside values (url()).
function cssTextToObject(css?: string): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of (css ?? "").split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const val = decl.slice(i + 1).trim();
    if (prop && val) out[prop] = val;
  }
  return out as React.CSSProperties;
}

// Live-canvas page number. Mirrors the model's pageNumberHtml/.pc-pageno CSS with
// inline styles (the grid CSS classes aren't loaded on the editing surface). The
// sheet is position:relative with PAGE_MARGIN_MM padding, so this sits in the band.
// ponytail: parallel to pageNumberHtml — keep the two in sync if format/position grows.
function PageNumber({ cfg, index, total }: { cfg?: PageNumberConfig | null; index: number; total: number }) {
  if (!cfg?.enabled) return null;
  const n = (cfg.startAt ?? 1) + index;
  const text = (cfg.format || "{n}").replace(/\{n\}/g, String(n)).replace(/\{total\}/g, String(total));
  const [vert, horiz] = cfg.position.split("-") as ["top" | "bottom", "left" | "center" | "right"];
  const style: React.CSSProperties = {
    position: "absolute", fontSize: `${cfg.fontSize ?? 10}pt`, lineHeight: 1, color: "#000", pointerEvents: "none",
    [vert]: `${PAGE_MARGIN_MM * 0.4}mm`,
    ...(horiz === "center" ? { left: 0, right: 0, textAlign: "center" }
      : horiz === "right" ? { right: `${PAGE_MARGIN_MM}mm`, textAlign: "right" }
      : { left: `${PAGE_MARGIN_MM}mm` }),
    ...cssTextToObject(cfg.css), // user CSS overrides the defaults above
  };
  return <div style={style}>{text}</div>;
}

export function GridCanvas({ section, sectionId, onChange, onMoveAcross, onMoveGroupAcross, selected, onSelect, editingId, onEdit, onReflow, onBreak, onMerge, page, pageNumbers, pageIndex, pageCount, showGrid }: {
  section: GridSection;
  sectionId: string;
  onChange: (s: GridSection) => void;
  onMoveAcross: (blockId: string, toSectionId: string, area: GridArea) => void;
  onMoveGroupAcross: (ids: string[], toSectionId: string, dCol: number, dRow: number) => void;
  page: PageDims;
  pageNumbers?: PageNumberConfig | null; // document-level page numbering
  pageIndex: number; // this page's 0-based index (for the number)
  pageCount: number; // total pages (for {total})
  selected: string[]; // ids selected in this section (multi-select)
  onSelect: (id: string | null, additive?: boolean) => void;
  editingId: string | null;
  onEdit: (id: string | null) => void;
  onReflow: (id: string) => void; // Split: spill overflow onto the next page
  onBreak: (id: string) => void;  // Break: decompose into paragraph blocks on this page
  onMerge: (sourceId: string, targetId: string, atIndex: number) => void; // drop a text block onto a text frame → concatenate at index
  showGrid: boolean;
}) {
  const dim = page;
  const gridRef = useRef<HTMLDivElement>(null);
  // Live preview kept LOCAL so a drag re-renders only this canvas, not every Tiptap
  // editor. The ghost + footprint render into a body-level portal (above all pages).
  const [drag, setDrag] = useState<Drag | null>(null);

  // Whole-block move. A press with no movement is a plain select; past the threshold
  // it becomes a drag: the block floats in the portal and drops onto whatever page
  // grid is under the cursor (same page → moveBlock, other page → moveBlockToPage).
  const startMove = (e: React.PointerEvent, b: GridBlock) => {
    if (editingId === b.id) return; // editing → let Tiptap handle the pointer
    const shift = e.shiftKey;
    const group = selected.includes(b.id) && selected.length > 1; // drag moves the whole selection
    const blockEl = e.currentTarget as HTMLElement;
    const rect = blockEl.getBoundingClientRect();
    const grabX = e.clientX - rect.left, grabY = e.clientY - rect.top; // where inside the block we grabbed
    const w = rect.width, h = rect.height;
    const html = (blockEl.firstElementChild as HTMLElement | null)?.outerHTML ?? ""; // snapshot the content box
    const scrollEl = blockEl.closest("[data-scroll]") as HTMLElement | null;
    const orig = b.area, min = BLOCKS[b.block].min;
    const canMerge = BLOCKS[b.block].text && !group; // a text block dropped onto a text frame concatenates
    const startX = e.clientX, startY = e.clientY;
    let moved = false, lastX = startX, lastY = startY, raf = 0, scrollDir = 0;

    // Merge target under the point: a DIFFERENT text-frame block, plus the insertion
    // index (which paragraph boundary the cursor is nearest) and a screen line to draw.
    const mergeAt = (x: number, y: number): { id: string; index: number; line: { left: number; right: number; top: number } } | null => {
      if (!canMerge) return null;
      const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-block-id]") as HTMLElement | null;
      const id = el?.getAttribute("data-block-id");
      if (!id || id === b.id || el!.getAttribute("data-block-type") !== "textFrame") return null;
      const root = (el!.querySelector(".ProseMirror") ?? el!) as HTMLElement;
      const kids = Array.from(root.children) as HTMLElement[];
      const rr = root.getBoundingClientRect();
      let index = kids.length, top = rr.bottom; // default: append at the end
      for (let i = 0; i < kids.length; i++) {
        const r = kids[i]!.getBoundingClientRect();
        if (y < r.top + r.height / 2) { index = i; top = r.top; break; }
      }
      return { id, index, line: { left: rr.left, right: rr.right, top } };
    };

    // The page grid under a point (ghost/footprint are pointer-events:none so
    // elementFromPoint sees through them to the page).
    const gridAt = (x: number, y: number) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-sec]") as HTMLElement | null;
    // Snap the block (kept under the grab point) to the target grid's cells.
    const resolve = (x: number, y: number) => {
      const grid = gridAt(x, y);
      if (!grid) return null;
      const r = grid.getBoundingClientRect();
      const cw = r.width / COLS, ch = r.height / ROWS;
      const bw = orig.colEnd - orig.colStart, bh = orig.rowEnd - orig.rowStart;
      const colStart = Math.round((x - grabX - r.left) / cw) + 1;
      const rowStart = Math.round((y - grabY - r.top) / ch) + 1;
      const area = clampArea({ colStart, rowStart, colEnd: colStart + bw, rowEnd: rowStart + bh }, min);
      const fp: Rect = { left: r.left + (area.colStart - 1) * cw, top: r.top + (area.rowStart - 1) * ch, width: (area.colEnd - area.colStart) * cw, height: (area.rowEnd - area.rowStart) * ch };
      return { sec: grid.getAttribute("data-sec")!, area, fp };
    };

    const tick = () => {
      if (scrollDir && scrollEl) { scrollEl.scrollTop += scrollDir * SCROLL_SPEED; apply(lastX, lastY); raf = requestAnimationFrame(tick); }
      else raf = 0;
    };
    const apply = (x: number, y: number) => {
      const res = resolve(x, y);
      const merge = mergeAt(x, y);
      // group drag: no portal/footprint; the selection translates in place by px delta.
      // over a merge target: suppress the landing footprint (show the merge highlight instead).
      setDrag({ id: b.id, kind: "move", x, y, grabX, grabY, w, h, html, fp: group || merge ? null : (res?.fp ?? null), group: group ? selected : null, dx: x - startX, dy: y - startY, mergeId: merge?.id ?? null, mergeLine: merge?.line ?? null });
      if (scrollEl) {
        const sr = scrollEl.getBoundingClientRect();
        scrollDir = y < sr.top + EDGE ? -1 : y > sr.bottom - EDGE ? 1 : 0;
        if (scrollDir && !raf) raf = requestAnimationFrame(tick);
      }
    };

    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < DRAG_THRESHOLD) return;
      moved = true;
      ev.preventDefault();
      lastX = ev.clientX; lastY = ev.clientY;
      apply(lastX, lastY);
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (raf) cancelAnimationFrame(raf);
      setDrag(null);
      if (!moved) { onSelect(b.id, shift); return; } // click: shift toggles, else single-select
      if (group) {
        // Whole-selection move by the grabbed block's snapped cell delta. Route to
        // the page under the cursor: same page → moveBlocks, other page → group cross-page.
        const res = resolve(ev.clientX, ev.clientY);
        if (!res) return; // dropped outside any page → cancel
        const dc = res.area.colStart - orig.colStart, dr = res.area.rowStart - orig.rowStart;
        if (res.sec === sectionId) onChange(moveBlocks(section, selected, dc, dr));
        else onMoveGroupAcross(selected, res.sec, dc, dr);
        return;
      }
      if (!selected.includes(b.id)) onSelect(b.id, false); // a fresh single drag selects it
      const merge = mergeAt(ev.clientX, ev.clientY);
      if (merge) { onMerge(b.id, merge.id, merge.index); return; } // dropped onto a text frame → concatenate at the line
      const res = resolve(ev.clientX, ev.clientY);
      if (!res) return; // dropped outside any page → cancel (block stays put)
      if (res.sec === sectionId) onChange(moveBlock(section, b.id, res.area));
      else onMoveAcross(b.id, res.sec, res.area);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Snap a block's row span to wrap its content exactly. naturalPx is the block
  // content's measured natural height; invert height = rows*rowUnit + (rows-1)*gap
  // to get the fewest whole cells that hold it.
  const fitBlock = (id: string, naturalPx: number) => {
    const grid = gridRef.current;
    if (!grid) return;
    const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
    const gridH = grid.getBoundingClientRect().height;
    const rowUnit = (gridH - (ROWS - 1) * gap) / ROWS;
    const rows = Math.max(1, Math.ceil((naturalPx + gap) / (rowUnit + gap)));
    // grow/shrink to fit, then push any blocks the new size overlaps downward
    onChange(pushDownOverlaps(fitBlockRows(section, id, rows), id));
  };

  // Resize from an edge/corner handle (snapped live preview, in-place).
  const startResize = (e: React.PointerEvent, b: GridBlock, side: "right" | "bottom" | "corner") => {
    e.preventDefault();
    e.stopPropagation();
    const grid = gridRef.current;
    if (!grid) return;
    const gr = grid.getBoundingClientRect();
    const cellW = gr.width / COLS, cellH = gr.height / ROWS;
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
      // resize in place only — neighbours stay put (blocks may overlap; z = doc order)
      onChange(resizeBlock(section, b.id, last));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Explicit stack positions, but only once the page actually uses layering —
  // otherwise every block gets null and BlockView keeps the size heuristic.
  const stackZ = useMemo(() => {
    const layered = section.blocks.some((b) => typeof b.zIndex === "number");
    return new Map(layered ? stackOrder(section.blocks).map((b, i) => [b.id, i] as const) : []);
  }, [section.blocks]);

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
          {showGrid && <div style={{ gridArea: `1 / 1 / ${ROWS + 1} / ${COLS + 1}`, pointerEvents: "none",
            background: "repeating-linear-gradient(to right, transparent 0, transparent calc(100%/12 - 1px), rgba(0,0,0,.05) calc(100%/12 - 1px), rgba(0,0,0,.05) calc(100%/12))" }} />}
          {section.blocks.map((b) => {
            const dm = drag?.kind === "move" ? drag : null;
            const d = drag?.id === b.id ? drag : null;
            const area = d?.kind === "resize" ? d.area : b.area;
            // group members translate live; single-drag grabbed block ghosts + floats in the portal.
            const offset = dm?.group?.includes(b.id) ? { x: dm.dx, y: dm.dy } : null;
            return (
              <BlockView key={b.id} b={{ ...b, area }} ghosting={d?.kind === "move" && !dm?.group} offset={offset}
                mergeTarget={dm?.mergeId === b.id} selected={selected.includes(b.id)} editing={editingId === b.id}
                onStartMove={(e) => startMove(e, b)}
                onStartResize={(e, side) => startResize(e, b, side)}
                onSelect={(additive) => onSelect(b.id, additive)}
                onEdit={() => onEdit(b.id)}
                onReflow={() => onReflow(b.id)}
                onBreak={() => onBreak(b.id)}
                onFit={(px) => fitBlock(b.id, px)}
                onConvert={() => onChange(setBlockType(section, b.id, "textFrame"))}
                stackZ={stackZ.get(b.id) ?? null}
                onLayer={(move) => onChange(reorderLayer(section, b.id, move))}
                onContent={(c) => onChange(updateBlockContent(section, b.id, c))}
                onDelete={() => { onChange(removeBlock(section, b.id)); onSelect(null); }} />
            );
          })}
        </div>
        <PageNumber cfg={pageNumbers} index={pageIndex} total={pageCount} />
      </div>
      {/* floating drag layer: the block travels above every page; footprint shows
          where it will land on the page under the cursor */}
      {drag?.kind === "move" && !drag.group && createPortal(
        <>
          {drag.fp && <div style={{ position: "fixed", left: drag.fp.left, top: drag.fp.top, width: drag.fp.width, height: drag.fp.height,
            pointerEvents: "none", background: `${ACCENT}22`, border: `2px dashed ${ACCENT}`, borderRadius: 2, zIndex: 9998 }} />}
          <div className="editor-surface" style={{ position: "fixed", left: drag.x - drag.grabX, top: drag.y - drag.grabY, width: drag.w, height: drag.h,
            pointerEvents: "none", opacity: 0.85, background: "#fff", overflow: "hidden", outline: `2px solid ${ACCENT}`,
            boxShadow: "0 8px 24px rgba(0,0,0,.3)", zIndex: 9999 }} dangerouslySetInnerHTML={{ __html: drag.html }} />
        </>,
        document.body,
      )}
      {/* merge insertion line: where the dropped paragraphs will land in the target frame */}
      {drag?.kind === "move" && drag.mergeLine && createPortal(
        <div style={{ position: "fixed", left: drag.mergeLine.left, top: drag.mergeLine.top - 1, width: drag.mergeLine.right - drag.mergeLine.left,
          height: 3, background: ACCENT, borderRadius: 2, pointerEvents: "none", zIndex: 9999, boxShadow: `0 0 0 2px ${ACCENT}55` }}>
          <div style={{ position: "absolute", left: -5, top: -3, width: 9, height: 9, borderRadius: "50%", background: ACCENT }} />
        </div>,
        document.body,
      )}
    </div>
  );
}

function BlockView({ b, ghosting, offset, mergeTarget, selected, editing, stackZ, onStartMove, onStartResize, onSelect, onEdit, onReflow, onBreak, onFit, onConvert, onLayer, onContent, onDelete }: {
  b: GridBlock;
  ghosting: boolean;
  offset: { x: number; y: number } | null; // live px translate during a group drag
  mergeTarget: boolean; // a text block is being dragged onto this frame (highlight it)
  selected: boolean;
  editing: boolean;
  onStartMove: (e: React.PointerEvent) => void;
  onStartResize: (e: React.PointerEvent, side: "right" | "bottom" | "corner") => void;
  onSelect: (additive: boolean) => void;
  onEdit: () => void;
  onReflow: () => void;
  onBreak: () => void;
  onFit: (naturalPx: number) => void;
  onConvert: () => void;
  stackZ: number | null; // explicit stack position, or null while the page is unlayered
  onLayer: (move: LayerMove) => void;
  onContent: (c: unknown) => void;
  onDelete: () => void;
}) {
  const { rowStart, colStart, rowEnd, colEnd } = b.area;
  const reg = BLOCKS[b.block];
  // Depth: once the page uses layering, the explicit stack position wins (stackZ,
  // computed from the model's shared stackOrder so canvas == PDF). Until then, the
  // legacy heuristic applies — smaller blocks stack ABOVE larger ones so a small
  // image dropped on a full-page text frame is the one you click/drag.
  // Editing floats highest (it expands over everything).
  const zBase = stackZ ?? 200 - (rowEnd - rowStart) * (colEnd - colStart);
  // where the double-click landed → place the caret there on entering edit
  const [caret, setCaret] = useState<{ x: number; y: number } | null>(null);
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
  // Snap the box to wrap content exactly: on demand (Fit button) and automatically
  // when a text block leaves edit mode (content just settled).
  const fit = () => { if (contentRef.current) onFit(contentRef.current.scrollHeight); };
  const wasEditing = useRef(editing);
  useEffect(() => {
    if (wasEditing.current && !editing) fit();
    wasEditing.current = editing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);
  return (
    <div
      data-block-id={b.id}
      data-block-type={b.block}
      // Always stop the press reaching the sheet (which would deselect/end edit).
      // While editing, do NOT start a block-drag — let ProseMirror handle the
      // pointer so click-drag selects text. Edit ends only on click elsewhere / Esc.
      onPointerDown={(e) => { e.stopPropagation(); if (editing) return; onStartMove(e); }}
      onClick={(e) => e.stopPropagation()} /* selection happens on pointer-up in startMove (handles shift) */
      onDoubleClick={(e) => { e.stopPropagation(); onSelect(false); if (reg.text) { setCaret({ x: e.clientX, y: e.clientY }); onEdit(); } }}
      onDragStart={(e) => e.preventDefault()} // kill native drag (images etc.) so our pointer drag wins
      style={{
        gridArea: `${rowStart} / ${colStart} / ${rowEnd} / ${colEnd}`, position: "relative",
        cursor: editing ? "text" : "grab",
        margin: blockMargin(b.style), // space between blocks/cols (per-side)
        outline: mergeTarget ? `3px solid ${ACCENT}` : selected ? `2px solid ${ACCENT}` : "none",
        outlineOffset: 1, boxShadow: mergeTarget ? `inset 0 0 0 100vmax ${ACCENT}18` : undefined,
        opacity: ghosting ? 0.3 : offset ? 0.7 : 1,
        transform: offset ? `translate(${offset.x}px, ${offset.y}px)` : undefined,
        // during a group drag the drag is driven by window listeners, so make the
        // floating copies pointer-transparent — else they'd block elementFromPoint
        // from seeing the target page grid under the cursor (cross-page detection).
        pointerEvents: offset ? "none" : undefined,
        zIndex: editing ? 1000 : offset ? 900 : zBase,
        userSelect: editing ? "auto" : "none", WebkitUserSelect: editing ? "auto" : "none",
      }}
    >
      {mergeTarget && (
        <div style={{ position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)", zIndex: 11, whiteSpace: "nowrap",
          background: ACCENT, color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 3, pointerEvents: "none" }}>
          Merge into this frame ⑃
        </div>
      )}
      {/* per-block custom CSS: same scoped stylesheet + class the PDF uses, so the
          editor and export render it identically (e.g. table cell styling) */}
      {b.style?.customCss && <style dangerouslySetInnerHTML={{ __html: scopeCustomCss(b.style.customCss, `pc-${b.id}`) }} />}
      {/* while editing, the block expands to show ALL its text (auto-height,
          overflow visible, elevated over neighbours); it snaps back on exit */}
      <div ref={contentRef} className={b.style?.customCss ? `pc-${b.id}` : undefined} style={{
        height: editing ? "auto" : "100%", minHeight: editing ? "100%" : undefined,
        overflow: editing ? "visible" : "hidden",
        background: editing ? "#fff" : undefined, boxShadow: editing ? "0 4px 16px rgba(0,0,0,.18)" : undefined,
        ...(blockStyleProps(b.style) as React.CSSProperties),
      }}>
        <BlockBody b={b} editing={editing} caret={caret} onContent={onContent} />
      </div>
      {overflow && !ghosting && (
        <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); fit(); }}
          title="content overflows — click to grow the box to fit"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 20, cursor: "pointer",
            background: `linear-gradient(transparent, ${ACCENT}40)`, borderBottom: `2px dashed ${ACCENT}` }} />
      )}
      {selected && !ghosting && (
        <>
          <ResizeHandle side="right" onStart={onStartResize} />
          <ResizeHandle side="bottom" onStart={onStartResize} />
          <ResizeHandle side="corner" onStart={onStartResize} />
          {/* Floating control bar hovering just above the block's top border — the
              per-block controls live here (not only in the side Inspector). */}
          <div onPointerDown={(e) => e.stopPropagation()}
            style={{ position: "absolute", top: -26, right: 0, display: "flex", gap: 2, alignItems: "center",
              padding: "2px 3px", background: ACCENT, borderRadius: 4, zIndex: 10, boxShadow: "0 1px 4px rgba(0,0,0,.35)" }}>
            <span onPointerDown={onStartMove} title="Drag to move"
              style={{ cursor: "grab", color: "#fff", fontSize: 12, lineHeight: 1, padding: "2px 3px" }}>✥</span>
            <span style={{ color: "#fff", fontSize: 10, opacity: 0.85, padding: "0 2px", textTransform: "capitalize" }}>{b.block}</span>
            <button onClick={(e) => { e.stopPropagation(); fit(); }} title="Fit box to content"
              style={{ width: 18, height: 18, borderRadius: 3, background: "rgba(255,255,255,.18)", color: "#fff", border: "none", fontSize: 11, lineHeight: 1, cursor: "pointer" }}>⤢</button>
            {/* Split: spill overflow onto the next page (only when it overflows a page) */}
            {overflow && b.block === "textFrame" && (
              <button onClick={(e) => { e.stopPropagation(); onReflow(); }} title="Split: keep what fits, flow the rest onto the next page"
                style={{ height: 18, borderRadius: 3, background: "rgba(255,255,255,.18)", color: "#fff", border: "none", fontSize: 10, lineHeight: 1, cursor: "pointer", padding: "0 5px" }}>Split ⤵</button>
            )}
            {/* Break: decompose into separate paragraph/sentence blocks on THIS page (no page-push) */}
            {b.block === "textFrame" && (((b.content as { content?: unknown[] })?.content?.length ?? 0) >= 1) && (
              <button onClick={(e) => { e.stopPropagation(); onBreak(); }} title="Break into separate paragraph blocks on this page"
                style={{ height: 18, borderRadius: 3, background: "rgba(255,255,255,.18)", color: "#fff", border: "none", fontSize: 10, lineHeight: 1, cursor: "pointer", padding: "0 5px" }}>Break ⑃</button>
            )}
            {/* Layering: raise/lower this block in the page's stacking order */}
            <button onClick={(e) => { e.stopPropagation(); onLayer("front"); }} title="Bring to front"
              style={{ width: 18, height: 18, borderRadius: 3, background: "rgba(255,255,255,.18)", color: "#fff", border: "none", fontSize: 11, lineHeight: 1, cursor: "pointer" }}>⤒</button>
            <button onClick={(e) => { e.stopPropagation(); onLayer("back"); }} title="Send to back"
              style={{ width: 18, height: 18, borderRadius: 3, background: "rgba(255,255,255,.18)", color: "#fff", border: "none", fontSize: 11, lineHeight: 1, cursor: "pointer" }}>⤓</button>
            {/* Convert a heading block into a text frame (so Split/Break/fit apply) */}
            {b.block === "heading" && (
              <button onClick={(e) => { e.stopPropagation(); onConvert(); }} title="Convert heading to a text frame"
                style={{ height: 18, borderRadius: 3, background: "rgba(255,255,255,.18)", color: "#fff", border: "none", fontSize: 10, lineHeight: 1, cursor: "pointer", padding: "0 5px" }}>→ Text</button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Remove block"
              style={{ width: 18, height: 18, borderRadius: 3, background: "rgba(255,255,255,.18)", color: "#fff", border: "none", fontSize: 12, lineHeight: 1, cursor: "pointer" }}>×</button>
          </div>
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

function BlockBody({ b, editing, caret, onContent }: { b: GridBlock; editing: boolean; caret: { x: number; y: number } | null; onContent: (c: unknown) => void }) {
  if (BLOCKS[b.block].text) return <BlockText content={b.content as JSONContent} editable={editing} caret={caret} onContent={onContent} />;
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
function BlockText({ content, editable, caret, onContent }: { content: JSONContent; editable: boolean; caret: { x: number; y: number } | null; onContent: (c: unknown) => void }) {
  const editor = useEditor({
    extensions,
    content,
    editable,
    onUpdate: ({ editor }) => onContent(editor.getJSON()),
  });
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
    if (!editable) return;
    editor.commands.focus();
    // place the caret where the user double-clicked (ProseMirror maps screen
    // coords → a doc position); fall back to the end.
    const pos = caret ? editor.view.posAtCoords({ left: caret.x, top: caret.y }) : null;
    if (pos) editor.commands.setTextSelection(pos.pos);
    else editor.commands.focus("end");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, editor]);
  // Re-sync the editor when the content changes EXTERNALLY (reflow/split/paste) —
  // but only while not editing, so we never clobber the caret mid-type. Without
  // this the editor keeps its initial content and a spill/split looks un-applied.
  useEffect(() => {
    if (!editor || editable) return;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content, false); // emitUpdate=false → no write-back loop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editable, editor]);
  return (
    <div style={{ height: "100%", pointerEvents: editable ? "auto" : "none" }}>
      {editor && (
        // Select text → floating format toolbar (only shows on a non-empty
        // selection in an editable block, so exactly one appears at a time).
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div style={{ display: "flex", gap: 2, padding: 3, background: "#2b2b2b", borderRadius: 6, boxShadow: "0 4px 14px rgba(0,0,0,.35)" }}>
            <MarkBtn active={editor.isActive("bold")} run={() => editor.chain().focus().toggleBold().run()} title="Bold (⌘B)" css={{ fontWeight: 700 }}>B</MarkBtn>
            <MarkBtn active={editor.isActive("italic")} run={() => editor.chain().focus().toggleItalic().run()} title="Italic (⌘I)" css={{ fontStyle: "italic" }}>I</MarkBtn>
            <MarkBtn active={editor.isActive("underline")} run={() => editor.chain().focus().toggleUnderline().run()} title="Underline (⌘U)" css={{ textDecoration: "underline" }}>U</MarkBtn>
            <MarkBtn active={editor.isActive("strike")} run={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough" css={{ textDecoration: "line-through" }}>S</MarkBtn>
            <MarkBtn active={editor.isActive("superscript")} run={() => editor.chain().focus().toggleSuperscript().run()} title="Superscript">x²</MarkBtn>
            <MarkBtn active={editor.isActive("subscript")} run={() => editor.chain().focus().toggleSubscript().run()} title="Subscript">x₂</MarkBtn>
            <MarkBtn active={editor.isActive("link")} run={() => setLink(editor)} title="Link">🔗</MarkBtn>
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

// Toolbar button: onMouseDown+preventDefault so clicking never blurs the editor
// or collapses the selection before the command runs.
function MarkBtn({ active, run, title, css, children }: { active: boolean; run: () => void; title: string; css?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <button onMouseDown={(e) => { e.preventDefault(); run(); }} title={title}
      style={{ minWidth: 26, height: 26, border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13, lineHeight: 1,
        background: active ? ACCENT : "transparent", color: active ? "#fff" : "#e8e8e8", ...css }}>
      {children}
    </button>
  );
}

function setLink(editor: Editor) {
  if (editor.isActive("link")) { editor.chain().focus().unsetLink().run(); return; }
  const url = window.prompt("Link URL");
  if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}
