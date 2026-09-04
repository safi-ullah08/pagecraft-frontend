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
      title="Document title — click to rename"
      style={{ fontFamily: "var(--ui-serif)", fontSize: 15, fontWeight: 700, color: "var(--ui-ink)",
        background: "transparent", border: "1px solid transparent", borderRadius: 6, padding: "4px 8px",
        width: 220, minWidth: 0, textOverflow: "ellipsis" }}
      onFocus={(e) => { e.target.style.borderColor = "var(--ui-border-strong)"; e.target.style.background = "var(--ui-paper)"; e.target.select(); }}
      onBlurCapture={(e) => { e.target.style.borderColor = "transparent"; e.target.style.background = "transparent"; }} />
  );
}

// Shell = sections layout (ChapterNav | editor area). The editor area shows the
// document (flow -> page sheet, grid -> canvas) with the block Inspector docked right.
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
  const breakBlock = useStore((s) => s.breakBlock);
  const mergeBlocks = useStore((s) => s.mergeBlocks);
  const showGrid = useStore((s) => s.showGrid);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const zoom = useStore((s) => s.zoom);
  const setZoom = useStore((s) => s.setZoom);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.canUndo);
  const canRedo = useStore((s) => s.canRedo);

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

  const dim = page;
  const sheetCss = `
.page-sheet { width: ${dim.w}mm; box-sizing: border-box; margin: 0 auto 24px; box-shadow: 0 2px 14px rgba(74,52,24,.25); overflow: hidden; background: #fff; }
.page-sheet > .editor-surface { min-height: ${dim.h}mm; box-sizing: border-box; padding: ${PAGE_MARGIN_MM}mm; }
`;

  const active = sections.find((s) => s.id === activeId) ?? null;
  const toggleLayout = () => {
    if (!active) return;
    const toGrid = !isGridSection(active.content);
    if (!confirm(`Convert this section to ${toGrid ? "grid" : "flow"}? Its current content will be replaced.`)) return;
    edit(active.id, toGrid ? emptyGridSection() : { type: "doc", content: [{ type: "paragraph" }] });
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {wizardOpen && <DesignWizard onClose={() => setWizardOpen(false)} />}
      {hubOpen && documentId && (
        <ImportHub
          onClose={() => setHubOpen(false)}
          appendTo={{ documentId, afterSectionId: sections[sections.length - 1]?.id ?? null }}
          onImported={() => window.location.reload()} /* store.load converts the appended flow chapters in place */
        />
      )}
      <ChapterNav />
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 8, padding: 8, borderBottom: "1px solid var(--ui-border)", alignItems: "center" }}>
          <TitleField />
          <Toolbar />
          <ImportBar />
          <button onClick={() => setHubOpen(true)} title="Add chapters from WordPress, Notion or Google Docs"
            style={{ padding: "6px 10px", fontSize: 12, borderRadius: 4, cursor: "pointer", border: "1px solid var(--ui-border)", background: "var(--ui-panel)" }}>⇩ Add chapters</button>
          <button onClick={() => setWizardOpen(true)} title="Open the design wizard"
            style={{ padding: "6px 10px", fontSize: 12, borderRadius: 4, cursor: "pointer", border: "1px solid var(--ui-border)", background: "var(--ui-panel)" }}>✦ Design</button>
          {documentId && <ExportButton documentId={documentId} theme={theme} />}
          {/* UserButton only mounts under ClerkProvider (i.e. when a key is set) */}
          {import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && (
            <div style={{ marginLeft: "auto" }}>
              <UserButton afterSignOutUrl="/" />
            </div>
          )}
        </div>

        {/* editor toolbar + active-section layout toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderBottom: "1px solid var(--ui-border)", background: "var(--ui-bg)" }}>
          <div style={{ flex: 1 }} />
          <>
              <button onClick={() => undo()} disabled={!canUndo} title="Undo (⌘/Ctrl+Z)"
                style={{ fontSize: 13, padding: "3px 8px", borderRadius: 4, border: "1px solid var(--ui-border-strong)", background: "var(--ui-panel)",
                  cursor: canUndo ? "pointer" : "default", color: canUndo ? "var(--ui-ink)" : "var(--ui-border-strong)" }}>↶</button>
              <button onClick={() => redo()} disabled={!canRedo} title="Redo (⌘/Ctrl+Shift+Z)"
                style={{ fontSize: 13, padding: "3px 8px", borderRadius: 4, border: "1px solid var(--ui-border-strong)", background: "var(--ui-panel)",
                  cursor: canRedo ? "pointer" : "default", color: canRedo ? "var(--ui-ink)" : "var(--ui-border-strong)", marginRight: 4 }}>↷</button>
              <button onClick={toggleGrid} title="toggle grid overlay"
                style={{ fontSize: 12, padding: "3px 8px", borderRadius: 4, cursor: "pointer",
                  border: `1px solid ${showGrid ? "var(--ui-accent)" : "var(--ui-border-strong)"}`, background: showGrid ? "var(--ui-accent-soft)" : "var(--ui-panel)", color: showGrid ? "var(--ui-accent)" : "var(--ui-muted)" }}>
                ▦ Grid
              </button>
              <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} title="zoom"
                style={{ fontSize: 12, padding: "3px 4px", borderRadius: 4, border: "1px solid var(--ui-border-strong)", background: "var(--ui-panel)" }}>
                {[0.5, 0.75, 1, 1.25, 1.5].map((z) => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
              </select>
            </>
          {active && (
            <button onClick={toggleLayout} title="convert the active section's layout"
              style={{ fontSize: 12, padding: "3px 8px", border: "1px solid var(--ui-border-strong)", borderRadius: 4, background: "var(--ui-panel)", cursor: "pointer" }}>
              {isGridSection(active.content) ? "▦ Grid → ¶ Flow" : "¶ Flow → ▦ Grid"}
            </button>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 16, color: "var(--ui-muted)" }}>Preparing editor…</div>
          ) : sections.length === 0 ? (
            <div style={{ padding: 16 }}>Loading…</div>
          ) : (
            // Editor: sections stacked (flow -> page sheet, grid -> canvas) with the
            // block Inspector docked right when the active section is a grid.
            <>
              <div data-scroll style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto", padding: 32, background: "var(--ui-bg-deep)" }}>
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
                        pageNumbers={isAnyCover(s.content) ? null : pageNumbers} /* a cover is never numbered — same rule as the worker */
                        pageIndex={i}
                        pageCount={sections.length}
                        selected={activeId === s.id ? selectedBlockIds : []}
                        onSelect={(id, additive) => { setActive(s.id); selectBlock(id, additive); }}
                        editingId={activeId === s.id ? editingBlockId : null}
                        onEdit={(id) => { setActive(s.id); setEditing(id); }}
                        onReflow={(id) => void reflowBlock(s.id, id)}
                        onBreak={(id) => breakBlock(s.id, id)}
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
