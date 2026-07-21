import { useStore } from "../store.ts";
import { themeNames } from "../themes.ts";
import { PAGE_SIZES, presetOf, type PageSize } from "../pages.ts";

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
      {/* TODO: align | span(1-12) | break-before | palette color */}
      <button disabled title="align (todo)">⯇ ⯈</button>
      <button disabled title="span (todo)">cols</button>
      <button disabled title="break before (todo)">⤓ page</button>
      <button disabled title="palette color (todo)">●</button>
    </div>
  );
}
