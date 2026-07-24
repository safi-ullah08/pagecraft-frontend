import { useEffect, useMemo, useState } from "react";
import { UserButton } from "@clerk/clerk-react";
import { ChapterNav } from "./components/ChapterNav.tsx";
import { Editor } from "./components/Editor.tsx";
import { Preview } from "./components/Preview.tsx";
import { Toolbar } from "./components/Toolbar.tsx";
import { ExportButton } from "./components/ExportButton.tsx";
import { ImportBar } from "./components/ImportBar.tsx";
import { useStore } from "./store.ts";
import { themeSkinCss } from "./themes.ts";
import { scopeThemeCss } from "./scope-css.ts";
import { PAGE_MARGIN_MM } from "./pages.ts";
import { isGridSection, emptyGridSection } from "./grid/types.ts";
import { GridCanvas } from "./grid/GridCanvas.tsx";
import { isCoverSection } from "./grid/covers.ts";
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
  const page = useStore((s) => s.page);
  const pageNumbers = useStore((s) => s.pageNumbers);
  const edit = useStore((s) => s.edit);
  const setActive = useStore((s) => s.setActive);
  const sections = useStore((s) => s.sections);
  const activeId = useStore((s) => s.activeId);
  const loading = useStore((s) => s.loading);
  const selectedBlockIds = useStore((s) => s.selectedBlockIds);
  const selectBlock = useStore((s) => s.selectBlock);
  const selectAll = useStore((s) => s.selectAll);
  const deleteSelected = useStore((s) => s.deleteSelected);
  const copySelected = useStore((s) => s.copySelected);
  const cutSelected = useStore((s) => s.cutSelected);
  const paste = useStore((s) => s.paste);
  const duplicateSelected = useStore((s) => s.duplicateSelected);
  const editingBlockId = useStore((s) => s.editingBlockId);
  const setEditing = useStore((s) => s.setEditing);
  const moveBlockToPage = useStore((s) => s.moveBlockToPage);
  const moveBlocksToPage = useStore((s) => s.moveBlocksToPage);
  const reflowBlock = useStore((s) => s.reflowBlock);
  const breakTextFrame = useStore((s) => s.breakTextFrame);
  const mergeBlocks = useStore((s) => s.mergeBlocks);
  const showGrid = useStore((s) => s.showGrid);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const zoom = useStore((s) => s.zoom);
  const setZoom = useStore((s) => s.setZoom);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.canUndo);
  const canRedo = useStore((s) => s.canRedo);

  const [tab, setTab] = useState<Tab>("editor");

  useEffect(() => {
    void load();
  }, [load]);

  // Block shortcuts on the canvas: Esc exits edit; ⌘/Ctrl C/X/V/D, select-all,
  // Delete. All guarded so they never fire while typing (editor/inputs keep their
  // native copy/paste/etc).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingBlockId) { setEditing(null); return; }
      const t = e.target as HTMLElement | null;
      const typing = editingBlockId || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable));
      if (typing) return; // let the editor / inputs handle everything
      const meta = e.metaKey || e.ctrlKey;
      // Undo/redo (in-block text typing is handled above by the `typing` guard →
      // Tiptap's own history). Ctrl/⌘+Z undo, +Shift+Z or Ctrl+Y redo.
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedBlockIds.length) { e.preventDefault(); deleteSelected(); return; }
      if (meta && e.key.toLowerCase() === "a") { e.preventDefault(); selectAll(); return; }
      if (meta && e.key.toLowerCase() === "c") { e.preventDefault(); copySelected(); return; }
      if (meta && e.key.toLowerCase() === "x") { e.preventDefault(); cutSelected(); return; }
      if (meta && e.key.toLowerCase() === "v") { e.preventDefault(); paste(); return; }
      if (meta && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingBlockId, selectedBlockIds, setEditing, selectAll, deleteSelected, copySelected, cutSelected, paste, duplicateSelected, undo, redo]);

  const surfaceCss = useMemo(() => {
    try {
      return scopeThemeCss(themeSkinCss(theme), ".editor-surface");
    } catch {
      return "";
    }
  }, [theme]);

  const dim = page;
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
          {/* UserButton only mounts under ClerkProvider (i.e. when a key is set) */}
          {import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && (
            <div style={{ marginLeft: "auto" }}>
              <UserButton afterSignOutUrl="/" />
            </div>
          )}
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
          {tab === "editor" && (
            <>
              <button onClick={() => undo()} disabled={!canUndo} title="Undo (⌘/Ctrl+Z)"
                style={{ fontSize: 13, padding: "3px 8px", borderRadius: 4, border: "1px solid #ccc", background: "#fff",
                  cursor: canUndo ? "pointer" : "default", color: canUndo ? "#333" : "#bbb" }}>↶</button>
              <button onClick={() => redo()} disabled={!canRedo} title="Redo (⌘/Ctrl+Shift+Z)"
                style={{ fontSize: 13, padding: "3px 8px", borderRadius: 4, border: "1px solid #ccc", background: "#fff",
                  cursor: canRedo ? "pointer" : "default", color: canRedo ? "#333" : "#bbb", marginRight: 4 }}>↷</button>
              <button onClick={toggleGrid} title="toggle grid overlay"
                style={{ fontSize: 12, padding: "3px 8px", borderRadius: 4, cursor: "pointer",
                  border: `1px solid ${showGrid ? "#E07A5F" : "#ccc"}`, background: showGrid ? "#fdeee9" : "#fff", color: showGrid ? "#E07A5F" : "#666" }}>
                ▦ Grid
              </button>
              <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} title="zoom"
                style={{ fontSize: 12, padding: "3px 4px", borderRadius: 4, border: "1px solid #ccc", background: "#fff" }}>
                {[0.5, 0.75, 1, 1.25, 1.5].map((z) => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
              </select>
            </>
          )}
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
            <Preview sections={contents} theme={theme} pageNumbers={pageNumbers} />
          ) : tab === "placeholder" ? (
            <PlaceholderView sections={contents} page={page} />
          ) : (
            // Editor: sections stacked (flow -> page sheet, grid -> canvas) with the
            // block Inspector docked right when the active section is a grid.
            <>
              <div data-scroll style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto", padding: 32, background: "#e6e6e6" }}>
                <style>{surfaceCss + sheetCss}</style>
                <div style={{ zoom }}>
                {sections.map((s, i) =>
                  isGridSection(s.content) ? (
                    <div key={s.id} id={`sec-${s.id}`} onPointerDown={() => setActive(s.id)}>
                      <GridCanvas
                        section={s.content}
                        sectionId={s.id}
                        onChange={(next) => edit(s.id, next)}
                        onMoveAcross={(blockId, toId, area) => moveBlockToPage(s.id, blockId, toId, area)}
                        onMoveGroupAcross={(ids, toId, dCol, dRow) => moveBlocksToPage(s.id, ids, toId, dCol, dRow)}
                        page={page}
                        pageNumbers={isCoverSection(s.content) ? null : pageNumbers} /* a cover is never numbered — same rule as the worker */
                        pageIndex={i}
                        pageCount={sections.length}
                        selected={activeId === s.id ? selectedBlockIds : []}
                        onSelect={(id, additive) => { setActive(s.id); selectBlock(id, additive); }}
                        editingId={activeId === s.id ? editingBlockId : null}
                        onEdit={(id) => { setActive(s.id); setEditing(id); }}
                        onReflow={(id) => void reflowBlock(s.id, id)}
                        onBreak={(id) => breakTextFrame(s.id, id)}
                        onMerge={(sourceId, targetId, atIndex) => mergeBlocks(s.id, sourceId, targetId, atIndex)}
                        showGrid={showGrid}
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
              </div>
              {active && isGridSection(active.content) && <ControlsPanel />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
