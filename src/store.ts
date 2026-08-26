import { create } from "zustand";
import { DEFAULT_THEME } from "./themes.ts";
import { A4, presetOf, type PageDims } from "./pages.ts";
import { assetsToDisplay, assetsToCanonical } from "./assets.ts";
import type { JSONContent } from "@tiptap/react";
import { addSection, convertDocument, deleteSection, getDocument, getSection, saveSection, type SectionContent } from "./api.ts";
import { BLOCKS, serialize, DEFAULT_PAGE_NUMBERS, EMPTY_DESIGN, type PageNumberConfig, type DesignTokens } from "@pagecraft/model";
import { isGridSection, ROWS, type BlockType, type GridArea, type GridBlock, type GridSection } from "./grid/types.ts";
import { addBlock as opsAddBlock, resizeBlock, updateBlockContent, removeBlocks, cloneBlocks, clampArea, mergeInto } from "./grid/ops.ts";
import { parseBlocks } from "./grid/parseBlocks.ts";
import { collectToc, buildTocSection, isTocSection, tocPlaceholder, hasTocList, fillTocEntries } from "./grid/toc.ts";
import { buildCover, isCoverSection, isBackCoverSection } from "./grid/covers.ts";
import { insertSectionsAfter, updatePageNumbers, updateDesign, updateTheme, renameDocument } from "./api.ts";
import { parseTemplateId, structureToLayoutSpec, foldChapters, docPlanToLayout, STRUCTURES, IMPORT_COVER, type Template } from "./grid/templates.ts";
import { runLayout } from "./grid/layoutDoc.ts";
import type { SourceMeta, StoredDocPlan } from "./api.ts";
import { blockHtml, blockHeightPx, blockWidthPx, heightToRows, measureHtmlHeight, sidesX, sidesY, splitTextFrameAt } from "./grid/measure.ts";
import { splitParagraphSentences } from "./grid/split-inline.ts";

export type Section = { id: string; content: SectionContent; version: number };

type Store = {
  title: string; // document title — editable from the editor's top bar
  theme: string;
  page: PageDims; // editor page size (mm); loaded from the doc, matches the PDF
  customPage: PageDims | null; // the doc's non-preset size (e.g. from a docx), kept so it stays selectable
  pageNumbers: PageNumberConfig; // document-level page numbering (position/format/…)
  design: DesignTokens; // design-wizard overlay, applied AFTER the theme
  documentId: string | null;
  loading: boolean; // true until load (incl. any auto flow→grid conversion) settles
  sourceMeta: SourceMeta; // import-harvested cover metadata (empty for in-app docs)
  docPlan: StoredDocPlan | null; // frozen imported chapters — template switching re-lays these
  sections: Section[]; // ordered; ALL rendered at once (continuous scroll)
  activeId: string | null; // section in focus/view — ChapterNav highlight, toolbar target
  selectedBlockIds: string[]; // grid blocks selected in the active section (multi-select)
  editingBlockId: string | null; // block currently in inline-text edit mode (double-click)
  clipboard: GridBlock[]; // copied/cut blocks (in-app clipboard)
  showGrid: boolean; // canvas grid-guide overlay
  zoom: number; // editor zoom (1 = 100%)
  setTheme: (t: string) => void;
  rename: (title: string) => void;
  setPage: (p: PageDims) => void;
  setPageNumbers: (patch: Partial<PageNumberConfig>) => void;
  setDesign: (patch: Partial<DesignTokens> | null) => void; // null = reset to the pure theme
  applyImportedTemplate: (t: Template) => Promise<void>; // legacy: look + cover + TOC on an already-grid doc
  applyTemplateLayout: (t: Template, meta: SourceMeta) => Promise<void>; // engine: lay flow chapters into the template's designed pages
  setActive: (id: string) => void;
  selectBlock: (id: string | null, additive?: boolean) => void;
  selectAll: () => void;
  setEditing: (id: string | null) => void;
  deleteSelected: () => void;
  copySelected: () => void;
  cutSelected: () => void;
  duplicateSelected: () => void;
  paste: () => void;
  toggleGrid: () => void;
  setZoom: (z: number) => void;
  addBlock: (type: BlockType) => void;
  addBlockAt: (type: BlockType, toId: string, area: GridArea) => void;
  fitBlock: (sectionId: string, blockId: string) => void;
  reflowBlock: (sectionId: string, blockId: string) => Promise<void>;
  breakTextFrame: (sectionId: string, blockId: string) => void;
  mergeBlocks: (sectionId: string, sourceId: string, targetId: string, atIndex?: number) => void;
  moveBlockToPage: (fromId: string, blockId: string, toId: string, area?: GridArea) => void;
  moveBlocksToPage: (fromId: string, ids: string[], toId: string, dCol: number, dRow: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  load: () => Promise<void>;
  edit: (id: string, content: SectionContent) => void;
  addPage: () => Promise<void>;
  generateToc: () => Promise<void>;
  addCover: (templateId: string) => Promise<void>;
  removePage: (id: string) => Promise<void>;
  convertToGrid: () => Promise<void>;
};

// Load the doc named by ?doc=<id> (with ALL its sections), or create a fresh
// single-section doc and pin it in the URL. ponytail: dev bootstrap, not a
// document picker (later phase).
export const useStore = create<Store>((set, get) => {
  const timers = new Map<string, ReturnType<typeof setTimeout>>(); // one debounce per section
  let loadStarted = false; // StrictMode mounts twice; only bootstrap once

  // Autosave one section: PUT content+version. On 409 the row moved under us —
  // re-read for the live version, then retry once keeping OUR content.
  async function flush(id: string) {
    const s = get().sections.find((x) => x.id === id);
    if (!s) return;
    const setVersion = (version: number) =>
      set((st) => ({ sections: st.sections.map((x) => (x.id === id ? { ...x, version } : x)) }));
    const content = assetsToCanonical(s.content); // display URLs -> asset:// before persisting
    try {
      try {
        setVersion((await saveSection(s.id, content, s.version)).version);
      } catch (e) {
        if (!String(e).includes("version_conflict")) throw e;
        const fresh = await getSection(s.id);
        setVersion((await saveSection(s.id, content, fresh.version)).version);
      }
    } catch (e) {
      // ponytail: autosave is best-effort — a second conflict or a network/500
      // is logged, and the next keystroke reschedules a fresh save. Durable
      // retry/backoff + a conflict UI is a later phase.
      console.error("autosave failed (will retry on next edit):", e);
    }
  }

  // --- Undo/redo history. Snapshots section CONTENT (keyed by id) before an edit,
  // coalescing a burst (typing / a multi-edit op) into ONE step. In-block text
  // typing also has Tiptap's own history; the Ctrl+Z handler routes to Tiptap while
  // a block is being edited and to this store otherwise. Load/convert churn is
  // ignored (guarded by `loading`). ponytail: content-by-id snapshots — undoes
  // block ops within/among existing sections, not page add/remove (server rows).
  type Snap = Record<string, SectionContent>;
  let past: Snap[] = [];
  let future: Snap[] = [];
  let lastRecord = 0;
  const snap = (): Snap => Object.fromEntries(get().sections.map((s) => [s.id, structuredClone(s.content)]));
  function record() {
    if (get().loading) return;
    const now = Date.now();
    if (now - lastRecord < 500) { lastRecord = now; return; } // coalesce a burst
    lastRecord = now;
    past.push(snap());
    if (past.length > 60) past.shift();
    future = [];
    set({ canUndo: true, canRedo: false });
  }
  function restore(dir: "past" | "future") {
    const src = dir === "past" ? past : future;
    if (!src.length) return;
    const other = dir === "past" ? future : past;
    const target = src.pop()!;
    other.push(snap()); // current state → the opposite stack
    lastRecord = 0; // the next real edit starts a fresh checkpoint
    const changed: string[] = [];
    set((st) => ({
      sections: st.sections.map((s) => {
        if (target[s.id] !== undefined && JSON.stringify(s.content) !== JSON.stringify(target[s.id])) {
          changed.push(s.id);
          return { ...s, content: target[s.id]! };
        }
        return s;
      }),
      selectedBlockIds: [],
      editingBlockId: null,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
    }));
    for (const id of changed) {
      const t = timers.get(id);
      if (t) clearTimeout(t);
      timers.set(id, setTimeout(() => { timers.delete(id); void flush(id); }, 300));
    }
  }

  return {
    theme: DEFAULT_THEME,
    page: A4,
    customPage: null,
    pageNumbers: DEFAULT_PAGE_NUMBERS,
    design: EMPTY_DESIGN,
    title: "Untitled",
    documentId: null,
    sourceMeta: {},
    docPlan: null,
    loading: true,
    sections: [],
    activeId: null,
    selectedBlockIds: [],
    editingBlockId: null,
    clipboard: [],
    showGrid: true,
    zoom: 1,
    // ponytail: theme is session view-state — seeded from doc.theme on load, but
    // switching is NOT persisted back yet (export/preview honour it live). DB
    // theme persistence lands with the theme/template builder phase.
    setTheme: (theme) => set({ theme }),
    // Optimistic rename; persisted fire-and-forget (server re-sanitizes).
    rename: (title) => {
      set({ title });
      const id = get().documentId;
      if (id) void renameDocument(id, title).catch(() => {});
    },
    setPage: (page) => set({ page }),
    // Page numbers: update view-state immediately, persist to the doc (fire-and-forget;
    // the config is re-sanitized server-side). Reaches the PDF via the export read.
    setPageNumbers: (patch) => {
      const pageNumbers = { ...get().pageNumbers, ...patch };
      set({ pageNumbers });
      const id = get().documentId;
      // Always persist the FULL config, including `enabled: false` — numbers are on
      // by default, so storing null for "off" would read back as "on" next load.
      if (id) void updatePageNumbers(id, pageNumbers).catch(() => {});
    },
    // Merge a wizard patch (or null to clear). Persisted per change — the overlay
    // is small, and losing it on a refresh would be worse than a few PATCHes.
    setDesign: (patch) => {
      const design = patch === null ? {} : { ...get().design, ...patch };
      set({ design });
      const id = get().documentId;
      if (id) void updateDesign(id, design).catch(() => {});
    },
    setActive: (activeId) => set({ activeId }),
    // Select a block. additive (shift) toggles it in the multi-selection; otherwise
    // it becomes the sole selection. null clears. Selecting exits inline edit.
    selectBlock: (id, additive) =>
      set((st) => {
        if (id == null) return { selectedBlockIds: [], editingBlockId: null };
        if (additive) {
          const has = st.selectedBlockIds.includes(id);
          return { selectedBlockIds: has ? st.selectedBlockIds.filter((x) => x !== id) : [...st.selectedBlockIds, id], editingBlockId: null };
        }
        return { selectedBlockIds: [id], editingBlockId: null };
      }),
    selectAll: () => {
      const { sections, activeId } = get();
      const sec = sections.find((s) => s.id === activeId);
      if (sec && isGridSection(sec.content)) set({ selectedBlockIds: sec.content.blocks.map((b) => b.id), editingBlockId: null });
    },
    // Remove all selected blocks from the active section.
    deleteSelected: () => {
      const { sections, activeId, selectedBlockIds, edit } = get();
      const sec = sections.find((s) => s.id === activeId);
      if (!sec || !isGridSection(sec.content) || !selectedBlockIds.length) return;
      edit(activeId!, removeBlocks(sec.content, selectedBlockIds));
      set({ selectedBlockIds: [], editingBlockId: null });
    },
    // Copy the selected blocks to the in-app clipboard.
    copySelected: () => {
      const { sections, activeId, selectedBlockIds } = get();
      const sec = sections.find((s) => s.id === activeId);
      if (!sec || !isGridSection(sec.content)) return;
      const ids = new Set(selectedBlockIds);
      const blocks = sec.content.blocks.filter((b) => ids.has(b.id));
      if (blocks.length) set({ clipboard: structuredClone(blocks) });
    },
    cutSelected: () => { get().copySelected(); get().deleteSelected(); },
    // Paste clipboard blocks (fresh ids, nudged) into the active section + select them.
    paste: () => {
      const { sections, activeId, clipboard, edit } = get();
      const sec = sections.find((s) => s.id === activeId);
      if (!sec || !isGridSection(sec.content) || !clipboard.length) return;
      const clones = cloneBlocks(clipboard);
      edit(activeId!, { ...sec.content, blocks: [...sec.content.blocks, ...clones] });
      set({ selectedBlockIds: clones.map((c) => c.id), editingBlockId: null });
    },
    // Duplicate the current selection in place (independent of the clipboard).
    duplicateSelected: () => {
      const { sections, activeId, selectedBlockIds, edit } = get();
      const sec = sections.find((s) => s.id === activeId);
      if (!sec || !isGridSection(sec.content) || !selectedBlockIds.length) return;
      const ids = new Set(selectedBlockIds);
      const clones = cloneBlocks(sec.content.blocks.filter((b) => ids.has(b.id)));
      edit(activeId!, { ...sec.content, blocks: [...sec.content.blocks, ...clones] });
      set({ selectedBlockIds: clones.map((c) => c.id), editingBlockId: null });
    },
    setEditing: (editingBlockId) => {
      // Leaving a text frame no longer auto-spills onto new pages (that shoved
      // every following page down). The canvas still fits the box to content on
      // exit; splitting into pages is now an explicit "Break" action.
      set({ editingBlockId, selectedBlockIds: editingBlockId ? [editingBlockId] : get().selectedBlockIds });
    },
    toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
    setZoom: (zoom) => set({ zoom }),
    // add a palette block to the active grid section and select it (palette lives
    // in the right bar now — see ControlsPanel/BlocksPanel).
    addBlock: (type) => {
      const { activeId, sections } = get();
      const sec = sections.find((s) => s.id === activeId);
      if (!sec || !isGridSection(sec.content)) return;
      const { section, id } = opsAddBlock(sec.content, type);
      get().edit(activeId!, section);
      set({ selectedBlockIds: [id] });
    },
    // Fit a block's height to its content: measure the rendered content at the
    // block's column width and set rowEnd to the whole rows it needs (clamped to the
    // page from its rowStart). Text/typed blocks only; images/dividers have no flow.
    fitBlock: (sectionId, blockId) => {
      const { sections, theme, page, edit } = get();
      const sec = sections.find((s) => s.id === sectionId);
      if (!sec || !isGridSection(sec.content)) return;
      const block = sec.content.blocks.find((b) => b.id === blockId);
      if (!block) return;
      const html = blockHtml(block);
      if (html == null) return; // nothing measurable (image/divider/spacer)
      const cols = block.area.colEnd - block.area.colStart;
      // content width shrinks by horizontal padding + margin; occupied height grows
      // by vertical padding + margin.
      const padX = sidesX(block.style?.padding), padY = sidesY(block.style?.padding);
      const marX = sidesX(block.style?.margin), marY = sidesY(block.style?.margin);
      const h = measureHtmlHeight(html, blockWidthPx(cols, page) - marX - padX, theme) + padY + marY;
      const rows = heightToRows(h, page);
      const min = BLOCKS[block.block].min.rows;
      const rowStart = block.area.rowStart;
      const rowEnd = rowStart + Math.max(min, Math.min(rows, ROWS - rowStart + 1));
      edit(sectionId, resizeBlock(sec.content, blockId, { ...block.area, rowEnd }));
    },
    // Split (spill): keep what fits between the block's top and the PAGE's bottom
    // edge, flow the rest onto NEW page(s) after this one. Splits at the page edge
    // (relative to where the block sits), not the block's own box — so content that
    // reaches/nears the edge breaks over even when it isn't a full page tall.
    // Manual only now — no longer auto-runs on edit-exit.
    reflowBlock: async (sectionId, blockId) => {
      const { sections, theme, page, documentId } = get();
      if (!documentId) return;
      const sec = sections.find((s) => s.id === sectionId);
      if (!sec || !isGridSection(sec.content)) return;
      const block = sec.content.blocks.find((b) => b.id === blockId);
      if (!block || block.block !== "textFrame") return;
      const doc = block.content as JSONContent;
      const nodes = doc.content ?? [];
      if (nodes.length < 1) return;
      const cols = block.area.colEnd - block.area.colStart;
      const widthPx = blockWidthPx(cols, page) - sidesX(block.style?.padding) - sidesX(block.style?.margin);
      // Room from the block's TOP to the page's bottom edge (not the box height).
      const rowsToEdge = ROWS - block.area.rowStart + 1;
      // ponytail: ~⅓-row cushion so content hugging the edge breaks over too; raise if edge-hug persists.
      const cushion = blockHeightPx(1, page) / 3;
      const maxHpx = blockHeightPx(rowsToEdge, page) - sidesY(block.style?.padding) - sidesY(block.style?.margin) - cushion;
      // splits between paragraphs, or WITHIN a paragraph (word boundary) when a
      // single long paragraph overflows — so any overflowing text frame can spill.
      const [docA, docB] = splitTextFrameAt(doc, widthPx, maxHpx, theme);
      if (!docB.content?.length) return; // fits above the edge with room to spare
      // keep the fitting part in this block and shrink it to that content
      get().edit(sectionId, updateBlockContent(sec.content, blockId, docA as SectionContent));
      get().fitBlock(sectionId, blockId);
      // paginate the overflow into new pages and insert them right after this one
      const pages = (await parseBlocks([docB], theme, page)).map((p) => assetsToCanonical(p));
      const { sections: inserted } = await insertSectionsAfter(documentId, sectionId, pages);
      set((st) => {
        const arr = [...st.sections];
        const idx = arr.findIndex((s) => s.id === sectionId);
        arr.splice(idx + 1, 0, ...inserted.map((s) => ({ ...s, content: assetsToDisplay(s.content) })));
        return { sections: arr };
      });
    },
    // Merge a dropped text block's content into a target text frame, then remove
    // the source (drop-to-concatenate). Selects the target after.
    mergeBlocks: (sectionId, sourceId, targetId, atIndex) => {
      const { sections, edit } = get();
      const sec = sections.find((s) => s.id === sectionId);
      if (!sec || !isGridSection(sec.content)) return;
      const next = mergeInto(sec.content, sourceId, targetId, atIndex);
      if (next === sec.content) return; // nothing merged (non-text source, etc.)
      edit(sectionId, next);
      set({ selectedBlockIds: [targetId], editingBlockId: null });
    },
    // Break a text frame into smaller blocks on the SAME page (no new pages, no
    // page-pushing — existing blocks are only ever READ for collision checks,
    // never moved, and the row grid stays fixed). One block per paragraph; a
    // lone overflowing paragraph is chunked by page-fit so it still breaks into
    // pieces. For each piece, in reading order: measure it, size it to the
    // minimum whole rows its OWN text needs (no extra padding), build a
    // candidate rectangle, and check it against every existing block. A clear
    // candidate is placed as-is; a colliding one
    // is walked past whatever it hit and re-checked until it lands in a free
    // slot (or runs off the page, at which point the rest folds into the last
    // placed piece rather than displacing something or growing the page). Every
    // placed piece becomes its own independent, selectable block, and the whole
    // result is committed in one edit() — nothing is applied incrementally.
    breakTextFrame: (sectionId, blockId) => {
      const { sections, theme, page, edit } = get();
      const sec = sections.find((s) => s.id === sectionId);
      if (!sec || !isGridSection(sec.content)) return;
      const block = sec.content.blocks.find((b) => b.id === blockId);
      if (!block || block.block !== "textFrame") return;
      const doc = block.content as JSONContent;
      const nodes = doc.content ?? [];
      const cols = block.area.colEnd - block.area.colStart;
      const rows = block.area.rowEnd - block.area.rowStart;
      const widthPx = blockWidthPx(cols, page) - sidesX(block.style?.padding) - sidesX(block.style?.margin);
      const padY = sidesY(block.style?.padding) + sidesY(block.style?.margin);
      const maxHpx = blockHeightPx(rows, page) - padY;

      // A blank line is a paragraph node with no real text — it renders as vertical
      // space inside the flowing block, not a visible paragraph. One-block-per-node
      // would turn each of those into its own empty, bordered, selectable box, so
      // they're dropped before splitting (the block's own margin/the grid gap
      // still gives adjacent pieces breathing room).
      const hasContent = (n: JSONContent) => (n.content ?? []).some((c) => (c.type === "text" ? (c.text ?? "").trim().length > 0 : true));
      let pieces: JSONContent[];
      if (nodes.length >= 2) {
        pieces = nodes.filter(hasContent).map((n) => ({ ...doc, content: [n] })); // one block per paragraph
      } else {
        // single node: split a paragraph into sentences; else chunk by page-fit
        const only = nodes[0];
        const sentences = only?.type === "paragraph" ? splitParagraphSentences(only) : only ? [only] : [];
        if (sentences.length > 1) {
          pieces = sentences.map((s) => ({ ...doc, content: [s] }));
        } else {
          pieces = [];
          let rest: JSONContent = doc, guard = 0;
          while ((rest.content?.length ?? 0) > 0 && guard++ < 100) {
            const [a, b] = splitTextFrameAt(rest, widthPx, maxHpx, theme);
            if (!a.content?.length) break;
            pieces.push(a);
            rest = b;
          }
        }
      }
      if (pieces.length < 2) return; // nothing to break

      // No clampArea here: it pulls a box's rowStart BACKWARD when it doesn't fit
      // the page — right for dragging a single block, but wrong for a chain of
      // pieces walking down the page, where it snaps whatever runs out of room
      // onto the page's bottom edge instead of leaving it where it naturally sits.
      const others = sec.content.blocks.filter((b) => b.id !== blockId);
      const colsOverlap = (a: GridArea, b: GridArea) => a.colStart < b.colEnd && b.colStart < a.colEnd;
      const rowsOverlap = (a: GridArea, b: GridArea) => a.rowStart < b.rowEnd && b.rowStart < a.rowEnd;
      const collision = (a: GridArea) => others.find((o) => colsOverlap(a, o.area) && rowsOverlap(a, o.area));

      let cursor = block.area.rowStart;
      const newBlocks: GridBlock[] = [];
      for (const piece of pieces) {
        const h = measureHtmlHeight(serialize(piece), widthPx, theme) + padY;
        const rowsNeeded = heightToRows(h, page); // minimum rows THIS piece's own text needs — no extra floor
        let area: GridArea = { rowStart: cursor, colStart: block.area.colStart, rowEnd: cursor + rowsNeeded, colEnd: block.area.colEnd };
        // Collision detection → find next free position: walk the candidate past
        // whatever it hit and re-check, rather than moving the block it hit.
        let hit, guard = 0;
        while ((hit = collision(area)) && guard++ < 50) {
          area = { ...area, rowStart: hit.area.rowEnd, rowEnd: hit.area.rowEnd + rowsNeeded };
        }
        if (area.rowEnd > ROWS + 1) {
          // Ran off the page with nowhere free left — fold the rest into the last
          // placed piece (still fully there, just not split further) instead of
          // displacing a block or growing the page past its fixed size.
          const last = newBlocks[newBlocks.length - 1];
          if (!last) return; // no room even for the first piece — leave the block as-is
          const lastDoc = last.content as JSONContent;
          last.content = { ...lastDoc, content: [...(lastDoc.content ?? []), ...(piece.content ?? [])] };
          continue;
        }
        cursor = area.rowEnd;
        newBlocks.push({ id: Math.random().toString(36).slice(2, 10), area, block: "textFrame", content: piece, style: block.style });
      }
      // Single state commit — the whole result lands in one edit(), not one per piece.
      edit(sectionId, { ...sec.content, blocks: [...others, ...newBlocks] });
      set({ selectedBlockIds: newBlocks.map((b) => b.id), editingBlockId: null });
    },
    // add a palette block to a specific page at a specific area (drag-from-palette)
    addBlockAt: (type, toId, area) => {
      const { sections, edit } = get();
      const sec = sections.find((s) => s.id === toId);
      if (!sec || !isGridSection(sec.content)) return;
      const { section, id } = opsAddBlock(sec.content, type, area);
      edit(toId, section);
      set({ activeId: toId, selectedBlockIds: [id], editingBlockId: null });
    },
    // Move a block from one page (section) to another: drop it from the source and
    // append to the target (optionally at a new area). Two edit()s so both pages
    // persist. Selection follows the block to its new page.
    moveBlockToPage: (fromId, blockId, toId, area) => {
      if (fromId === toId) return;
      const { sections, edit } = get();
      const from = sections.find((s) => s.id === fromId);
      const to = sections.find((s) => s.id === toId);
      if (!from || !to || !isGridSection(from.content) || !isGridSection(to.content)) return;
      const block = from.content.blocks.find((b) => b.id === blockId);
      if (!block) return;
      const moved = area ? { ...block, area } : block;
      edit(fromId, { ...from.content, blocks: from.content.blocks.filter((b) => b.id !== blockId) });
      edit(toId, { ...to.content, blocks: [...to.content.blocks, moved] });
      set({ activeId: toId, selectedBlockIds: [blockId] });
    },
    // Group cross-page move: relocate every selected block to another page, each
    // shifted by the same cell delta (preserves the selection's relative layout).
    moveBlocksToPage: (fromId, ids, toId, dCol, dRow) => {
      if (fromId === toId || !ids.length) return;
      const { sections, edit } = get();
      const from = sections.find((s) => s.id === fromId);
      const to = sections.find((s) => s.id === toId);
      if (!from || !to || !isGridSection(from.content) || !isGridSection(to.content)) return;
      const moving = new Set(ids);
      const shifted = from.content.blocks
        .filter((b) => moving.has(b.id))
        .map((b) => ({ ...b, area: clampArea({ rowStart: b.area.rowStart + dRow, colStart: b.area.colStart + dCol, rowEnd: b.area.rowEnd + dRow, colEnd: b.area.colEnd + dCol }, BLOCKS[b.block].min) }));
      if (!shifted.length) return;
      edit(fromId, { ...from.content, blocks: from.content.blocks.filter((b) => !moving.has(b.id)) });
      edit(toId, { ...to.content, blocks: [...to.content.blocks, ...shifted] });
      set({ activeId: toId, selectedBlockIds: shifted.map((b) => b.id) });
    },
    load: async () => {
      if (loadStarted) return;
      loadStarted = true;
      try {
      const id = new URLSearchParams(location.search).get("doc");
      if (id) {
        const doc = await getDocument(id);
        // asset:// -> resolver URL so the editor can display imported images
        const sections = doc.sections.map((s) => ({ ...s, content: assetsToDisplay(s.content) }));
        // page size comes from the document (e.g. a docx's page size); else A4.
        // If it's not a preset, remember it as customPage so it stays selectable.
        const page = doc.pageWidthMm && doc.pageHeightMm ? { w: doc.pageWidthMm, h: doc.pageHeightMm } : A4;
        set({ documentId: id, title: doc.title || "Untitled", sections, activeId: sections[0]?.id ?? null, theme: doc.theme || DEFAULT_THEME, page, customPage: presetOf(page) ? null : page, pageNumbers: doc.pageNumbers ?? DEFAULT_PAGE_NUMBERS, design: doc.designTokens ?? EMPTY_DESIGN, sourceMeta: doc.sourceMeta ?? {}, docPlan: doc.docPlan ?? null });
        // ?tpl=<catalog id>: a template chosen for this freshly-imported doc.
        const tpl = new URLSearchParams(location.search).get("tpl");
        const t = tpl ? parseTemplateId(tpl) : null;
        // import path: flow is only a landing format. WITH a template, the layout
        // ENGINE lays the flow chapters into the template's designed pages; without
        // one, auto-paginate into plain grid. Either way it's grid forever after.
        if (sections.some((s) => !isGridSection(s.content))) {
          try {
            if (t && sections.every((s) => !isGridSection(s.content))) {
              await get().applyTemplateLayout(t, doc.sourceMeta ?? {});
            } else {
              await get().convertToGrid();
              if (t) await get().applyImportedTemplate(t); // mixed doc — legacy look+cover+toc
            }
          } catch (e) {
            console.error("auto flow→grid failed (staying flow):", e);
          }
        } else if (t) {
          // already grid: with a stored plan this is a template SWITCH — re-lay
          // the frozen chapters under the new design; without one, legacy look+cover+toc.
          try {
            if (get().docPlan) await get().applyTemplateLayout(t, doc.sourceMeta ?? {});
            else await get().applyImportedTemplate(t);
          } catch (e) { console.error("apply template failed:", e); }
        }
        if (tpl) {
          const u = new URL(location.href);
          u.searchParams.delete("tpl");
          history.replaceState(null, "", u.toString());
        }
      } else {
        // No ?doc: the editor shouldn't be here — creation lives on the dashboard.
        location.assign(location.pathname);
        return;
      }
      set({ loading: false });
      } catch (e) {
        console.error("document load failed:", e);
        loadStarted = false; // allow a retry (e.g. after auth settles)
        set({ loading: false });
      }
    },
    // Edit ONE section (each mounted editor owns its own id). Per-section 800ms
    // debounce so editing section B never drops a pending save for section A.
    canUndo: false,
    canRedo: false,
    undo: () => restore("past"),
    redo: () => restore("future"),
    edit: (id, content) => {
      record(); // history checkpoint (coalesced; a no-op during load)
      set((st) => ({ sections: st.sections.map((x) => (x.id === id ? { ...x, content } : x)) }));
      const t = timers.get(id);
      if (t) clearTimeout(t);
      timers.set(id, setTimeout(() => { timers.delete(id); void flush(id); }, 800));
    },
    addPage: async () => {
      const docId = get().documentId;
      if (!docId) return;
      const section = await addSection(docId);
      set((st) => ({ sections: [...st.sections, section], activeId: section.id }));
    },
    // Build (or refresh) the table of contents — ALWAYS page 1. Grid pages ARE pages,
    // so a heading's page number is its section index; no paged.js capture needed.
    // Refreshing happens in place (page count unchanged); a new TOC is prepended and
    // the numbering is projected WITH it, so the pages it pushes down are correct.
    generateToc: async () => {
      const { sections, documentId, pageNumbers, edit } = get();
      if (!documentId || !sections.length) return;
      const startAt = pageNumbers.enabled ? (pageNumbers.startAt ?? 1) : 1;
      const contents = sections.map((s) => s.content);

      const existing = sections.findIndex((s) => isTocSection(s.content));
      if (existing >= 0) {
        // Fill the tocList slot IN PLACE so a template's designed contents page
        // (panels/title/areas) survives the refresh; a legacy all-text TOC page
        // is upgraded wholesale to the current default design.
        const cur = sections[existing]!.content as GridSection;
        const entries = collectToc(contents, startAt);
        edit(sections[existing]!.id, (hasTocList(cur) ? fillTocEntries(cur, entries) : buildTocSection(entries)) as SectionContent);
        set({ activeId: sections[existing]!.id });
        return;
      }
      // First page, EXCEPT after a cover — a cover always stays page 1.
      const coverIdx = sections.findIndex((s) => isCoverSection(s.content));
      const at = coverIdx >= 0 ? coverIdx + 1 : 0;
      const projected = [...contents];
      projected.splice(at, 0, tocPlaceholder());
      const toc = buildTocSection(collectToc(projected, startAt));
      const afterId = at === 0 ? null : sections[at - 1]!.id;
      const { sections: inserted } = await insertSectionsAfter(documentId, afterId, [assetsToCanonical(toc as SectionContent)]);
      set((st) => {
        const arr = [...st.sections];
        arr.splice(at, 0, ...inserted.map((s) => ({ ...s, content: assetsToDisplay(s.content) })));
        return { sections: arr, activeId: inserted[0]?.id ?? st.activeId };
      });
    },
    // Add a cover. A FRONT cover goes to the very front (page 1); a BACK cover is
    // appended last. One of each, max. Numbering follows automatically since neither
    // is numbered and both still occupy a page.
    addCover: async (templateId) => {
      const { documentId, sections } = get();
      if (!documentId) return;
      const cover = buildCover(templateId);
      const back = isBackCoverSection(cover);
      const taken = sections.some((s) => (back ? isBackCoverSection(s.content) : isCoverSection(s.content)));
      if (taken) return;
      const afterId = back ? (sections[sections.length - 1]?.id ?? null) : null;
      const { sections: inserted } = await insertSectionsAfter(documentId, afterId, [assetsToCanonical(cover as SectionContent)]);
      const added = inserted.map((s) => ({ ...s, content: assetsToDisplay(s.content) }));
      set((st) => ({
        sections: back ? [...st.sections, ...added] : [...added, ...st.sections],
        activeId: added[0]?.id ?? st.activeId,
      }));
    },
    // Apply a template to a FRESHLY-imported doc (all sections still flow): the
    // layout ENGINE lays the chapters into the template's designed pages — meta
    // slots bound from sourceMeta, chapter openers, cycling flow spreads, back
    // matter — replacing plain auto-pagination entirely.
    applyTemplateLayout: async (t, meta) => {
      const { documentId, sections, page } = get();
      if (!documentId) return;
      set({ theme: t.theme }); // before measuring — the probe must wear the template's fonts
      try { await updateTheme(documentId, t.theme); } catch (e) { console.error("theme persist failed:", e); }

      // Chapters: the STORED plan when we have one (frozen at import — survives
      // any number of template switches), else derived from the live flow
      // sections (docs imported before the plan column). foldChapters keeps only
      // h1 sections as chapters — h2 subsections fold into their parent WITH
      // their heading, so openers are real chapters and the contents page still
      // lists every subsection.
      const textOf = (n: JSONContent): string => n.text ?? (n.content ?? []).map(textOf).join("");
      const stored = get().docPlan;
      const plan = stored
        ? docPlanToLayout(stored, meta)
        : {
            meta,
            chapters: foldChapters(sections.map((s) => {
              const nodes = (s.content as JSONContent).content ?? [];
              const h = nodes[0]?.type === "heading" ? nodes[0] : undefined;
              const title = h ? textOf(h).trim() : "Introduction";
              const level = h ? Number(h.attrs?.level) || 1 : 1;
              return { title, level, nodes, ...(title === "Notes" ? { role: "notes" as const } : {}) };
            })),
          };

      const spec = structureToLayoutSpec(STRUCTURES[t.structKey]);
      const { sections: laid, report } = await runLayout(plan, spec, t.theme, page);
      if (report.length) console.info("layout report:", report);

      const { sections: fresh } = await convertDocument(documentId, laid.map((s) => assetsToCanonical(s as SectionContent)));
      set({ sections: fresh.map((s) => ({ ...s, content: assetsToDisplay(s.content) })), activeId: fresh[0]?.id ?? null });

      const pn = STRUCTURES[t.structKey].pageNumbers;
      if (pn) {
        set({ pageNumbers: pn });
        try { await updatePageNumbers(documentId, pn); } catch (e) { console.error("page numbers persist failed:", e); }
      }
      await get().generateToc(); // fills the template's toc slot in place
    },

    // Apply a template to an ALREADY-loaded (imported) doc: keep the content, add the
    // look + front matter. Order matters — theme first so the cover/TOC render themed,
    // cover before TOC so generateToc places the TOC AFTER the cover (page 2).
    applyImportedTemplate: async (t) => {
      const docId = get().documentId;
      if (!docId) return;
      set({ theme: t.theme });
      try { await updateTheme(docId, t.theme); } catch (e) { console.error("theme persist failed:", e); }
      await get().addCover(IMPORT_COVER[t.docType]);
      await get().generateToc();
    },
    removePage: async (id) => {
      if (get().sections.length <= 1) return; // always keep at least one page
      await deleteSection(id);
      set((st) => {
        const sections = st.sections.filter((s) => s.id !== id);
        return { sections, activeId: st.activeId === id ? (sections[0]?.id ?? null) : st.activeId };
      });
    },
    // flow → grid (model A): measure/paginate the flow chapters in the browser,
    // then atomically replace the doc's sections with the resulting grid pages.
    convertToGrid: async () => {
      const { documentId, sections, theme, page } = get();
      if (!documentId) return;
      if (!sections.some((s) => !isGridSection(s.content))) return; // already all grid
      // Order-preserving and mixed-aware: existing grid pages pass through
      // UNTOUCHED in place; each contiguous run of flow chapters paginates where
      // it sat. convertDocument replaces the whole document with what we send,
      // so dropping the grid pages here (the old behavior: filter to flow only)
      // destroyed them — e.g. appending imported flow chapters to a grid book,
      // then reloading, wiped the book.
      // Keep display URLs while paginating so parseBlocks can LOAD each image to
      // read its natural size; canonicalize (→ asset://) everything persisted.
      const out: SectionContent[] = [];
      let run: JSONContent[] = [];
      const flushRun = async () => {
        if (run.length === 0) return;
        const pages = await parseBlocks(run, theme, page);
        out.push(...pages.map((p) => assetsToCanonical(p)));
        run = [];
      };
      for (const s of sections) {
        if (isGridSection(s.content)) {
          await flushRun();
          out.push(assetsToCanonical(s.content));
        } else {
          run.push(s.content as JSONContent);
        }
      }
      await flushRun();
      const { sections: fresh } = await convertDocument(documentId, out);
      set({
        sections: fresh.map((s) => ({ ...s, content: assetsToDisplay(s.content) })),
        activeId: fresh[0]?.id ?? null,
      });
    },
  };
});
