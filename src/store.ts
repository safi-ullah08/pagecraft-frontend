import { create } from "zustand";
import type { JSONContent } from "@tiptap/react";
import { DEFAULT_THEME } from "./themes.ts";
import { type PageSize } from "./pages.ts";
import { assetsToDisplay, assetsToCanonical } from "./assets.ts";
import { createDocument, getDocument, getSection, saveSection } from "./api.ts";

export type Section = { id: string; content: JSONContent; version: number };

type Store = {
  theme: string;
  pageSize: PageSize; // editor page-sheet size (configurable)
  documentId: string | null;
  sections: Section[]; // ordered; ALL rendered at once (continuous scroll)
  activeId: string | null; // section in focus/view — ChapterNav highlight, toolbar target
  setTheme: (t: string) => void;
  setPageSize: (p: PageSize) => void;
  setActive: (id: string) => void;
  load: () => Promise<void>;
  edit: (id: string, content: JSONContent) => void;
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
    sections: [],
    activeId: null,
    // ponytail: theme is session view-state — seeded from doc.theme on load, but
    // switching is NOT persisted back yet (export/preview honour it live). DB
    // theme persistence lands with the theme/template builder phase.
    setTheme: (theme) => set({ theme }),
    setPageSize: (pageSize) => set({ pageSize }),
    setActive: (activeId) => set({ activeId }),
    load: async () => {
      if (loadStarted) return;
      loadStarted = true;
      const id = new URLSearchParams(location.search).get("doc");
      if (id) {
        const doc = await getDocument(id);
        // asset:// -> resolver URL so the editor can display imported images
        const sections = doc.sections.map((s) => ({ ...s, content: assetsToDisplay(s.content) }));
        set({ documentId: id, sections, activeId: sections[0]?.id ?? null, theme: doc.theme || DEFAULT_THEME });
      } else {
        const { document, section } = await createDocument();
        history.replaceState(null, "", `?doc=${document.id}`);
        set({ documentId: document.id, sections: [section], activeId: section.id });
      }
    },
    // Edit ONE section (each mounted editor owns its own id). Per-section 800ms
    // debounce so editing section B never drops a pending save for section A.
    edit: (id, content) => {
      set((st) => ({ sections: st.sections.map((x) => (x.id === id ? { ...x, content } : x)) }));
      const t = timers.get(id);
      if (t) clearTimeout(t);
      timers.set(id, setTimeout(() => { timers.delete(id); void flush(id); }, 800));
    },
  };
});
