import { create } from "zustand";
import { DEFAULT_THEME } from "./themes.ts";
import { type PageSize } from "./pages.ts";
import { assetsToDisplay, assetsToCanonical } from "./assets.ts";
import type { JSONContent } from "@tiptap/react";
import { addSection, convertDocument, createDocument, deleteSection, getDocument, getSection, saveSection, type SectionContent } from "./api.ts";
import { BLOCKS } from "@pagecraft/model";
import { isGridSection, ROWS, type BlockType, type GridArea } from "./grid/types.ts";
import { addBlock as opsAddBlock, resizeBlock } from "./grid/ops.ts";
import { parseBlocks } from "./grid/parseBlocks.ts";
import { blockHtml, blockWidthPx, heightToRows, measureHtmlHeight, sidesX, sidesY } from "./grid/measure.ts";

export type Section = { id: string; content: SectionContent; version: number };

type Store = {
  theme: string;
  pageSize: PageSize; // editor page-sheet size (configurable)
  documentId: string | null;
  loading: boolean; // true until load (incl. any auto flow→grid conversion) settles
  sections: Section[]; // ordered; ALL rendered at once (continuous scroll)
  activeId: string | null; // section in focus/view — ChapterNav highlight, toolbar target
  selectedBlockId: string | null; // grid block the inspector targets (in the active section)
  editingBlockId: string | null; // block currently in inline-text edit mode (double-click)
  showGrid: boolean; // canvas grid-guide overlay
  zoom: number; // editor zoom (1 = 100%)
  setTheme: (t: string) => void;
  setPageSize: (p: PageSize) => void;
  setActive: (id: string) => void;
  selectBlock: (id: string | null) => void;
  setEditing: (id: string | null) => void;
  toggleGrid: () => void;
  setZoom: (z: number) => void;
  addBlock: (type: BlockType) => void;
  addBlockAt: (type: BlockType, toId: string, area: GridArea) => void;
  fitBlock: (sectionId: string, blockId: string) => void;
  moveBlockToPage: (fromId: string, blockId: string, toId: string, area?: GridArea) => void;
  load: () => Promise<void>;
  edit: (id: string, content: SectionContent) => void;
  addPage: () => Promise<void>;
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

  return {
    theme: DEFAULT_THEME,
    pageSize: "A4",
    documentId: null,
    loading: true,
    sections: [],
    activeId: null,
    selectedBlockId: null,
    editingBlockId: null,
    showGrid: true,
    zoom: 1,
    // ponytail: theme is session view-state — seeded from doc.theme on load, but
    // switching is NOT persisted back yet (export/preview honour it live). DB
    // theme persistence lands with the theme/template builder phase.
    setTheme: (theme) => set({ theme }),
    setPageSize: (pageSize) => set({ pageSize }),
    setActive: (activeId) => set({ activeId }),
    // selecting a block exits any inline edit (like temp's selectBlock)
    selectBlock: (selectedBlockId) => set({ selectedBlockId, editingBlockId: null }),
    setEditing: (editingBlockId) => {
      // Leaving a text FRAME → auto-grow it to fit what you just typed (same page;
      // fitBlock clamps to the page bottom — breaking to a new page is Phase B).
      const { editingBlockId: prev, activeId, sections } = get();
      if (prev && prev !== editingBlockId && activeId) {
        const sec = sections.find((s) => s.id === activeId);
        const blk = sec && isGridSection(sec.content) ? sec.content.blocks.find((b) => b.id === prev) : null;
        if (blk?.block === "textFrame") get().fitBlock(activeId, prev);
      }
      set({ editingBlockId, selectedBlockId: editingBlockId ?? get().selectedBlockId });
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
      set({ selectedBlockId: id });
    },
    // Fit a block's height to its content: measure the rendered content at the
    // block's column width and set rowEnd to the whole rows it needs (clamped to the
    // page from its rowStart). Text/typed blocks only; images/dividers have no flow.
    fitBlock: (sectionId, blockId) => {
      const { sections, theme, pageSize, edit } = get();
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
      const h = measureHtmlHeight(html, blockWidthPx(cols, pageSize) - marX - padX, theme) + padY + marY;
      const rows = heightToRows(h, pageSize);
      const min = BLOCKS[block.block].min.rows;
      const rowStart = block.area.rowStart;
      const rowEnd = rowStart + Math.max(min, Math.min(rows, ROWS - rowStart + 1));
      edit(sectionId, resizeBlock(sec.content, blockId, { ...block.area, rowEnd }));
    },
    // add a palette block to a specific page at a specific area (drag-from-palette)
    addBlockAt: (type, toId, area) => {
      const { sections, edit } = get();
      const sec = sections.find((s) => s.id === toId);
      if (!sec || !isGridSection(sec.content)) return;
      const { section, id } = opsAddBlock(sec.content, type, area);
      edit(toId, section);
      set({ activeId: toId, selectedBlockId: id, editingBlockId: null });
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
      set({ activeId: toId, selectedBlockId: blockId });
    },
    load: async () => {
      if (loadStarted) return;
      loadStarted = true;
      const id = new URLSearchParams(location.search).get("doc");
      if (id) {
        const doc = await getDocument(id);
        // asset:// -> resolver URL so the editor can display imported images
        const sections = doc.sections.map((s) => ({ ...s, content: assetsToDisplay(s.content) }));
        set({ documentId: id, sections, activeId: sections[0]?.id ?? null, theme: doc.theme || DEFAULT_THEME });
        // import path: flow is only a landing format — auto-paginate into grid on
        // first open, then it's grid forever (convert persists, so idempotent).
        if (sections.some((s) => !isGridSection(s.content))) {
          try {
            await get().convertToGrid();
          } catch (e) {
            console.error("auto flow→grid failed (staying flow):", e);
          }
        }
      } else {
        const { document, section } = await createDocument();
        history.replaceState(null, "", `?doc=${document.id}`);
        set({ documentId: document.id, sections: [section], activeId: section.id });
      }
      set({ loading: false });
    },
    // Edit ONE section (each mounted editor owns its own id). Per-section 800ms
    // debounce so editing section B never drops a pending save for section A.
    edit: (id, content) => {
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
      const { documentId, sections, theme, pageSize } = get();
      if (!documentId) return;
      // Keep display URLs here so parseBlocks can LOAD each image to read its natural
      // size; canonicalize (→ asset://) only the resulting pages before persisting.
      const chapters = sections.map((s) => s.content).filter((c) => !isGridSection(c)) as JSONContent[];
      if (chapters.length === 0) return; // already all grid
      const pages = (await parseBlocks(chapters, theme, pageSize)).map((p) => assetsToCanonical(p));
      const { sections: fresh } = await convertDocument(documentId, pages);
      set({
        sections: fresh.map((s) => ({ ...s, content: assetsToDisplay(s.content) })),
        activeId: fresh[0]?.id ?? null,
      });
    },
  };
});
