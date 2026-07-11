import { useEffect, useMemo, useState } from "react";
import { ChapterNav } from "./components/ChapterNav.tsx";
import { Editor } from "./components/Editor.tsx";
import { Preview } from "./components/Preview.tsx";
import { Toolbar } from "./components/Toolbar.tsx";
import { ExportButton } from "./components/ExportButton.tsx";
import { ImportBar } from "./components/ImportBar.tsx";
import { useStore } from "./store.ts";
import { themeSkinCss } from "./themes.ts";
import { scopeThemeCss } from "./scope-css.ts";
import { PAGE_SIZES, PAGE_MARGIN_MM } from "./pages.ts";
import { isGridSection, emptyGridSection } from "./grid/types.ts";
import { GridCanvas } from "./grid/GridCanvas.tsx";
import { ControlsPanel } from "./grid/ControlsPanel.tsx";
import { PlaceholderView } from "./grid/PlaceholderView.tsx";
import type { JSONContent } from "@tiptap/react";

type Tab = "editor" | "placeholder" | "pdf";
const TABS: { id: Tab; label: string }[] = [
  { id: "editor", label: "Editor" },
  { id: "placeholder", label: "Placeholder preview" },
  { id: "pdf", label: "PDF preview" },
];

// Shell = sections layout (ChapterNav | editor area). A 3-tab bar above the editor
// area switches the VIEW of the same document: Editor (flow sheets / grid canvas),
// Placeholder preview (wireframe), PDF preview (paged.js 1:1). All read one store.
export function App() {
  const load = useStore((s) => s.load);
  const documentId = useStore((s) => s.documentId);
  const theme = useStore((s) => s.theme);
  const pageSize = useStore((s) => s.pageSize);
  const edit = useStore((s) => s.edit);
  const setActive = useStore((s) => s.setActive);
  const sections = useStore((s) => s.sections);
  const activeId = useStore((s) => s.activeId);
  const loading = useStore((s) => s.loading);
  const selectedBlockId = useStore((s) => s.selectedBlockId);
  const selectBlock = useStore((s) => s.selectBlock);

  const [tab, setTab] = useState<Tab>("editor");

  useEffect(() => {
    void load();
  }, [load]);

  const surfaceCss = useMemo(() => {
    try {
      return scopeThemeCss(themeSkinCss(theme), ".editor-surface");
    } catch {
      return "";
    }
  }, [theme]);

  const dim = PAGE_SIZES[pageSize];
  const sheetCss = `
.page-sheet { width: ${dim.w}mm; box-sizing: border-box; margin: 0 auto 24px; box-shadow: 0 1px 10px rgba(0,0,0,.28); overflow: hidden; background: #fff; }
.page-sheet > .editor-surface { min-height: ${dim.h}mm; box-sizing: border-box; padding: ${PAGE_MARGIN_MM}mm; }
`;

  const contents = useMemo(() => sections.map((s) => s.content), [sections]);

  const active = sections.find((s) => s.id === activeId) ?? null;
  const toggleLayout = () => {
    if (!active) return;
    const toGrid = !isGridSection(active.content);
    if (!confirm(`Convert this section to ${toGrid ? "grid" : "flow"}? Its current content will be replaced.`)) return;
    edit(active.id, toGrid ? emptyGridSection() : { type: "doc", content: [{ type: "paragraph" }] });
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <ChapterNav />
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 8, padding: 8, borderBottom: "1px solid #ddd", alignItems: "center" }}>
          <Toolbar />
          <ImportBar />
          {documentId && <ExportButton documentId={documentId} theme={theme} />}
        </div>

        {/* view tabs + active-section layout toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 8px", borderBottom: "1px solid #ddd", background: "#fafafa" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "8px 12px", fontSize: 13, border: "none", background: "transparent", cursor: "pointer",
                borderBottom: tab === t.id ? "2px solid #E07A5F" : "2px solid transparent",
                fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? "#111" : "#666" }}>
              {t.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {active && (
            <button onClick={toggleLayout} title="convert the active section's layout"
              style={{ fontSize: 12, padding: "3px 8px", border: "1px solid #ccc", borderRadius: 4, background: "#fff", cursor: "pointer" }}>
              {isGridSection(active.content) ? "▦ Grid → ¶ Flow" : "¶ Flow → ▦ Grid"}
            </button>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 16, color: "#666" }}>Preparing editor…</div>
          ) : sections.length === 0 ? (
            <div style={{ padding: 16 }}>Loading…</div>
          ) : tab === "pdf" ? (
            <Preview sections={contents} theme={theme} />
          ) : tab === "placeholder" ? (
            <PlaceholderView sections={contents} pageSize={pageSize} />
          ) : (
            // Editor: sections stacked (flow -> page sheet, grid -> canvas) with the
            // block Inspector docked right when the active section is a grid.
            <>
              <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto", padding: 32, background: "#e6e6e6" }}>
                <style>{surfaceCss + sheetCss}</style>
                {sections.map((s) =>
                  isGridSection(s.content) ? (
                    <div key={s.id} id={`sec-${s.id}`} onPointerDown={() => setActive(s.id)}>
                      <GridCanvas
                        section={s.content}
                        onChange={(next) => edit(s.id, next)}
                        pageSize={pageSize}
                        selected={activeId === s.id ? selectedBlockId : null}
                        onSelect={(id) => { setActive(s.id); selectBlock(id); }}
                      />
                    </div>
                  ) : (
                    <section key={s.id} id={`sec-${s.id}`} className="page-sheet">
                      <Editor
                        content={s.content as JSONContent}
                        onChange={(c) => edit(s.id, c)}
                        onFocus={() => setActive(s.id)}
                      />
                    </section>
                  ),
                )}
              </div>
              {active && isGridSection(active.content) && <ControlsPanel />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
