import { create } from "zustand";
import type { JSONContent } from "@tiptap/react";
import { DEFAULT_THEME } from "./themes.ts";
import { createDocument, getDocument, getSection, saveSection } from "./api.ts";

export type Section = { id: string; content: JSONContent; version: number };

type Store = {
  theme: string;
  documentId: string | null;
  sections: Section[]; // ordered; imports produce many (one per chapter/subsection)
  activeId: string | null;
  setTheme: (t: string) => void;
  load: () => Promise<void>;
  selectSection: (id: string) => void;
  edit: (content: JSONContent) => void;
};

// Load the doc named by ?doc=<id> (with ALL its sections), or create a fresh
// single-section doc and pin it in the URL. ponytail: dev bootstrap, not a
// document picker (P1+).
export const useStore = create<Store>((set, get) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pendingId: string | null = null; // the section the debounced save belongs to
  let loadStarted = false; // StrictMode mounts twice; only bootstrap once

  // Autosave one section: PUT content+version. On 409 the row moved under us —
  // re-read for the live version, then retry once keeping OUR content.
  async function flush(id: string) {
    const s = get().sections.find((x) => x.id === id);
    if (!s) return;
    const setVersion = (version: number) =>
      set((st) => ({ sections: st.sections.map((x) => (x.id === id ? { ...x, version } : x)) }));
    try {
      try {
        setVersion((await saveSection(s.id, s.content, s.version)).version);
      } catch (e) {
        if (!String(e).includes("version_conflict")) throw e;
        const fresh = await getSection(s.id);
        setVersion((await saveSection(s.id, s.content, fresh.version)).version);
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
    documentId: null,
    sections: [],
    activeId: null,
    // ponytail: theme is session view-state — seeded from doc.theme on load, but
    // switching is NOT persisted back yet (export/preview honour it live). DB
    // theme persistence lands with the theme/template builder phase.
    setTheme: (theme) => set({ theme }),
    load: async () => {
      if (loadStarted) return;
      loadStarted = true;
      const id = new URLSearchParams(location.search).get("doc");
      if (id) {
        const doc = await getDocument(id);
        set({ documentId: id, sections: doc.sections, activeId: doc.sections[0]?.id ?? null, theme: doc.theme || DEFAULT_THEME });
      } else {
        const { document, section } = await createDocument();
        history.replaceState(null, "", `?doc=${document.id}`);
        set({ documentId: document.id, sections: [section], activeId: section.id });
      }
    },
    selectSection: (id) => {
      if (id === get().activeId) return;
      clearTimeout(timer);
      if (pendingId) { const p = pendingId; pendingId = null; void flush(p); } // save outgoing edit first
      set({ activeId: id });
    },
    edit: (content) => {
      const id = get().activeId;
      if (!id) return;
      set((st) => ({ sections: st.sections.map((x) => (x.id === id ? { ...x, content } : x)) }));
      // ponytail: 800ms debounce; in-flight saves aren't coalesced — a fast
      // typist just triggers a follow-up save. Add a dirty flag if it matters.
      clearTimeout(timer);
      pendingId = id;
      timer = setTimeout(() => { pendingId = null; void flush(id); }, 800); // clear so a later switch won't re-save
    },
  };
});
