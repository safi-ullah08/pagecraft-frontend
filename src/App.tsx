import { useEffect, useMemo, useState } from "react";
import { UserButton } from "@clerk/clerk-react";
import { ChapterNav } from "./components/ChapterNav.tsx";
import { Editor } from "./components/Editor.tsx";
import { Toolbar } from "./components/Toolbar.tsx";
import { ExportButton } from "./components/ExportButton.tsx";
import { ImportBar } from "./components/ImportBar.tsx";
import { ImportHub } from "./components/ImportHub.tsx";
import { useStore } from "./store.ts";
import { themeSkinCss, typedBlockCss } from "./themes.ts";
import { designCss } from "@pagecraft/model";
import { scopeThemeCss } from "./scope-css.ts";
import { PAGE_MARGIN_MM } from "./pages.ts";
import { isGridSection, emptyGridSection } from "./grid/types.ts";
import { GridCanvas } from "./grid/GridCanvas.tsx";
import { isAnyCover } from "./grid/covers.ts";
import { isTocSection } from "./grid/toc.ts";
import { DesignWizard } from "./grid/DesignWizard.tsx";
import { ControlsPanel } from "./grid/ControlsPanel.tsx";
import type { JSONContent } from "@tiptap/react";

// Document title in the top bar: click to edit, Enter/blur to save, Esc to cancel.
// Commits once (the store PATCHes fire-and-forget) instead of per keystroke.
function TitleField() {
  const title = useStore((s) => s.title);
  const rename = useStore((s) => s.rename);
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => { document.title = `${title} — Kitaabio`; }, [title]);
  const commit = () => {
    if (draft !== null && draft.trim() && draft.trim() !== title) rename(draft.trim());
    setDraft(null);
  };
  return (
    <input value={draft ?? title} onChange={(e) => setDraft(e.target.value)} size={1}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") { setDraft(null); (e.target as HTMLInputElement).blur(); }
      }}
      title="Document title — click to rename" className="app-title"
      onFocus={(e) => e.target.select()} />
  );
}

// Side-panel visibility is a per-viewer convenience, so it lives in localStorage
// (guarded: storage can be blocked, and the editor must still open).
function usePanelOpen(key: string): [boolean, () => void] {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(key) !== "0"; } catch { return true; }
  });
  const toggle = () => setOpen((o) => {
    try { localStorage.setItem(key, o ? "0" : "1"); } catch { /* not persisted — fine */ }
    return !o;
  });
  return [open, toggle];
}

// Shell = full-width header (home + title | document actions), a view bar, then the
// panels row: pages (ChapterNav) | editor canvas | block controls. Both side panels
// start under the bars at the same height, and each can be collapsed.
export function App() {
  const load = useStore((s) => s.load);
  const documentId = useStore((s) => s.documentId);
  const theme = useStore((s) => s.theme);
  const page = useStore((s) => s.page);
  const pageNumbers = useStore((s) => s.pageNumbers);
  const design = useStore((s) => s.design);
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
  const generateToc = useStore((s) => s.generateToc);
  const hasToc = sections.some((s) => isTocSection(s.content));
  const [pagesOpen, togglePages] = usePanelOpen("pc-panel-pages");
  const [controlsOpen, toggleControls] = usePanelOpen("pc-panel-controls");

  // The wizard auto-opens once per document — the answer to "imported, now I'm
  // staring at a blank grid". Dismissing it sticks (per document, per browser).
  const [wizardOpen, setWizardOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  useEffect(() => {
    if (loading || !documentId || !sections.length) return;
    const key = `pc-wizard-seen:${documentId}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    setWizardOpen(true);
  }, [loading, documentId, sections.length]);

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
      // The scoped skin + design overlay, PLUS the typed-block (.pc-*) rules the
      // canvas otherwise lacks and the legacy-token bridge (--accent/--ink → --pc-*),
      // both scoped to .editor-surface — so stat/cta/chapter/author blocks look the
      // same in the editor as the PDF and re-skin with the theme.
      const skin = scopeThemeCss(themeSkinCss(theme) + "\n" + designCss(design), ".editor-surface");
      const typed = ".editor-surface{--accent:var(--pc-accent);--ink:var(--pc-ink)}\n" + scopeThemeCss(typedBlockCss, ".editor-surface");
      return skin + "\n" + typed;
    } catch {
      return "";
    }
  }, [theme, design]);

  // The page size is document data, not styling: hand it to App.css's .page-sheet
  // rules as custom properties instead of generating CSS text.
  const sheetVars = { "--sheet-w": `${page.w}mm`, "--sheet-h": `${page.h}mm`, "--sheet-margin": `${PAGE_MARGIN_MM}mm` } as React.CSSProperties;

  const active = sections.find((s) => s.id === activeId) ?? null;
  const toggleLayout = () => {
    if (!active) return;
    const toGrid = !isGridSection(active.content);
    if (!confirm(`Convert this section to ${toGrid ? "grid" : "flow"}? Its current content will be replaced.`)) return;
    edit(active.id, toGrid ? emptyGridSection() : { type: "doc", content: [{ type: "paragraph" }] });
  };

  return (
    <div className="app-shell">
      {wizardOpen && <DesignWizard onClose={() => setWizardOpen(false)} />}
      {hubOpen && documentId && (
        <ImportHub
          onClose={() => setHubOpen(false)}
          appendTo={{ documentId, afterSectionId: sections[sections.length - 1]?.id ?? null }}
          onImported={() => window.location.reload()} /* store.load converts the appended flow chapters in place */
        />
      )}
      {/* Header spans the full width: home + title on the left, document actions right. */}
      <header className="app-header">
        <div className="app-header-left">
          {/* router-free app: the dashboard is this path without ?doc (full reload, like the rest) */}
          <a href={location.pathname} title="Home — all documents" className="app-btn app-home">⌂ Home</a>
          <TitleField />
        </div>
        <div className="app-header-right">
          <Toolbar />
          <ImportBar />
          <button onClick={() => setHubOpen(true)} title="Add chapters from WordPress, Notion or Google Docs" className="app-btn">⇩ Add chapters</button>
          <button onClick={() => setWizardOpen(true)} title="Open the design wizard" className="app-btn">✦ Design</button>
          <button onClick={() => void generateToc()} className="app-btn"
            title={hasToc ? "Rebuild the contents page from every heading — page numbers stay correct"
              : "Scan every page's headings and add a contents page as page 1"}>
            {hasToc ? "⟳ Refresh contents" : "+ Contents"}
          </button>
          {documentId && <ExportButton documentId={documentId} theme={theme} />}
          {/* UserButton only mounts under ClerkProvider (i.e. when a key is set) */}
          {import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && <UserButton afterSignOutUrl="/" />}
        </div>
      </header>

      {/* View bar, also full width, so both side panels start right beneath it. */}
      <div className="app-viewbar">
        <button onClick={togglePages} aria-pressed={pagesOpen} title={pagesOpen ? "Hide the pages panel" : "Show the pages panel"}
          className="app-tool">{pagesOpen ? "⇤" : "⇥"} Pages</button>
        <div className="app-spacer" />
        <>
            <button onClick={() => undo()} disabled={!canUndo} title="Undo (⌘/Ctrl+Z)" className="app-tool app-history">↶</button>
            <button onClick={() => redo()} disabled={!canRedo} title="Redo (⌘/Ctrl+Shift+Z)" className="app-tool app-history app-redo">↷</button>
            <button onClick={toggleGrid} aria-pressed={showGrid} title="toggle grid overlay" className="app-tool">▦ Grid</button>
            <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} title="zoom" className="app-zoom">
              {[0.5, 0.75, 1, 1.25, 1.5].map((z) => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
            </select>
          </>
        {active && (
          <button onClick={toggleLayout} title="convert the active section's layout" className="app-tool">
            {isGridSection(active.content) ? "▦ Grid → ¶ Flow" : "¶ Flow → ▦ Grid"}
          </button>
        )}
        <button onClick={toggleControls} aria-pressed={controlsOpen} title={controlsOpen ? "Hide the controls panel" : "Show the controls panel"}
          className="app-tool app-controls-toggle">Panel {controlsOpen ? "⇥" : "⇤"}</button>
      </div>

      {/* Panels row: pages | canvas | controls — both side panels share this top edge. */}
      <div className="app-panels">
        {pagesOpen && <ChapterNav />}
        {loading ? (
          <div className="app-status is-muted">Preparing editor…</div>
        ) : sections.length === 0 ? (
          <div className="app-status">Loading…</div>
        ) : (
          // Editor: sections stacked (flow -> page sheet, grid -> canvas) with the
          // block Inspector docked right when the active section is a grid.
          <>
            <div data-scroll className="app-canvas" style={sheetVars}>
              <style>{surfaceCss}</style>
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
                      pageNumbers={isAnyCover(s.content) ? null : pageNumbers} /* a cover is never numbered — same rule as the worker */
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
            {controlsOpen && active && isGridSection(active.content) && <ControlsPanel />}
          </>
        )}
      </div>
    </div>
  );
}
