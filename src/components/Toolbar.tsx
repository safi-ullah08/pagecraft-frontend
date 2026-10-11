import { useEffect, useRef, useState } from "react";
import { useStore } from "../store.ts";
import { themeNames } from "../themes.ts";
import { PAGE_SIZES, presetOf, type PageSize } from "../pages.ts";
import { caretFontSizePx, setFontSize } from "../node-controls.ts";

// Constrained local overrides as node attrs (align/span/break/palette) — still
// TODO. The theme <select> is live: it drives the preview and the export render.
// The page-size <select> drives the editor page sheets.
export function Toolbar() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);
  const customPage = useStore((s) => s.customPage); // the doc's custom (docx) size, kept selectable
  const preset = presetOf(page); // matching preset, or null for a custom size
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <select value={theme} onChange={(e) => setTheme(e.target.value)} title="theme">
        {!themeNames().includes(theme) && <option value={theme}>{theme === "verbatim" ? "Imported (verbatim)" : theme}</option>}
        {themeNames().map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <select value={preset ?? "custom"} onChange={(e) => { const v = e.target.value; if (v === "custom") { if (customPage) setPage(customPage); } else setPage(PAGE_SIZES[v as PageSize]); }} title="page size">
        {Object.keys(PAGE_SIZES).map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
        {customPage && <option value="custom">Custom ({customPage.w}×{customPage.h}mm)</option>}
      </select>
      <FontSize />
      {/* TODO: align | span(1-12) | break-before | palette color */}
      <button disabled title="align (todo)">⯇ ⯈</button>
      <button disabled title="span (todo)">cols</button>
      <button disabled title="break before (todo)">⤓ page</button>
      <button disabled title="palette color (todo)">●</button>
    </div>
  );
}

// Common editor sizes for the dropdown; the field itself accepts any number.
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];

// Font size field (number input + preset datalist) for the active editor. Mirrors the caret's size unless
// the user is typing; Enter/blur applies it via setFontSize, empty clears to the theme size, Escape reverts.
// Disabled when no text editor is active.
function FontSize() {
  const editor = useStore((s) => s.activeEditor);
  const selTick = useStore((s) => s.selTick); // re-read the caret's size on every selection/edit
  const [draft, setDraft] = useState("");
  const focused = useRef(false); // don't overwrite the field while the user is typing in it

  // Mirror the caret's current size into the field (unless the user is editing it).
  const current = editor ? caretFontSizePx(editor) : null;
  useEffect(() => {
    if (!focused.current) setDraft(current != null ? String(current) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, selTick, editor]);

  const commit = () => {
    if (!editor) return;
    const t = draft.trim();
    if (t === "") { // empty → clear an explicit size, back to the theme size
      if (editor.getAttributes("textStyle").fontSize) setFontSize(editor, null);
      return;
    }
    const n = parseInt(t, 10);
    if (Number.isFinite(n) && n > 0 && n !== current) setFontSize(editor, `${n}px`); // skip no-op re-focus
  };

  return (
    <>
      <input
        type="number"
        list="pc-font-sizes"
        min={1}
        value={draft}
        disabled={!editor}
        title="Font size (selected text)"
        aria-label="Font size"
        placeholder="—"
        style={{ width: 52 }}
        onFocus={() => { focused.current = true; }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { focused.current = false; commit(); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { focused.current = false; setDraft(current != null ? String(current) : ""); (e.target as HTMLInputElement).blur(); }
        }}
      />
      <datalist id="pc-font-sizes">
        {FONT_SIZES.map((s) => <option key={s} value={s} />)}
      </datalist>
    </>
  );
}
