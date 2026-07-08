import { useEffect, useMemo } from "react";
import { ChapterNav } from "./components/ChapterNav.tsx";
import { Editor } from "./components/Editor.tsx";
import { Toolbar } from "./components/Toolbar.tsx";
import { ExportButton } from "./components/ExportButton.tsx";
import { ImportBar } from "./components/ImportBar.tsx";
import { useStore } from "./store.ts";
import { themeSkinCss } from "./themes.ts";
import { scopeThemeCss } from "./scope-css.ts";
import { PAGE_SIZES, PAGE_MARGIN_MM } from "./pages.ts";

// Flow editor on real data: ALL sections rendered at once in one continuously
// scrollable column (one Tiptap instance per section, per-section autosave),
// with a live paged preview of the whole document. ChapterNav scrolls to a
// section. min-height:0 down the flex chain is what actually lets the columns
// scroll (flex defaults min-height:auto, which blocks overflow:auto).
export function App() {
  const load = useStore((s) => s.load);
  const documentId = useStore((s) => s.documentId);
  const theme = useStore((s) => s.theme);
  const edit = useStore((s) => s.edit);
  const setActive = useStore((s) => s.setActive);
  const sections = useStore((s) => s.sections);
  const pageSize = useStore((s) => s.pageSize);
  const dim = PAGE_SIZES[pageSize];

  // Each section is a distinct page sheet (configurable size) on a grey canvas.
  // The themed .editor-surface FILLS the sheet — page-height minimum, with the
  // page margin as its OWN padding — so the theme background covers the whole
  // page, not just the content box. ponytail ceiling: a section longer than one
  // page grows the sheet; auto-splitting a section into N page sheets is the
  // deferred pagination problem, and the margin is a fixed value not the theme's
  // @page (P4).
  const sheetCss = `
.page-sheet { width: ${dim.w}mm; box-sizing: border-box; margin: 0 auto 24px; box-shadow: 0 1px 10px rgba(0,0,0,.28); overflow: hidden; background: #fff; }
.page-sheet > .editor-surface { min-height: ${dim.h}mm; box-sizing: border-box; padding: ${PAGE_MARGIN_MM}mm; }
`;

  useEffect(() => {
    void load();
  }, [load]);

  // One scoped skin for every section editor (all share the active theme), so we
  // inject it once here instead of per-editor. Unknown theme -> unstyled surface
  // beats a thrown render.
  const surfaceCss = useMemo(() => {
    try {
      return scopeThemeCss(themeSkinCss(theme), ".editor-surface");
    } catch {
      return "";
    }
  }, [theme]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <ChapterNav />
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 8, padding: 8, borderBottom: "1px solid #ddd", alignItems: "center" }}>
          <Toolbar />
          <ImportBar />
          {documentId && <ExportButton documentId={documentId} theme={theme} />}
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
          {sections.length > 0 ? (
            // editor column: distinct page sheets stacked on a grey canvas, scrollable
            <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto", padding: 32, background: "#e6e6e6" }}>
              <style>{surfaceCss + sheetCss}</style>
              {sections.map((s) => (
                <section key={s.id} id={`sec-${s.id}`} className="page-sheet">
                  <Editor
                    content={s.content}
                    onChange={(c) => edit(s.id, c)}
                    onFocus={() => setActive(s.id)}
                  />
                </section>
              ))}
            </div>
          ) : (
            <div style={{ padding: 16 }}>Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}
