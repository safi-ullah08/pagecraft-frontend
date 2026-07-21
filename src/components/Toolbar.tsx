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
  const preset = presetOf(page); // matching preset, or null for a custom (docx) size
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <select value={theme} onChange={(e) => setTheme(e.target.value)} title="theme">
        {themeNames().map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <select value={preset ?? "custom"} onChange={(e) => { if (e.target.value !== "custom") setPage(PAGE_SIZES[e.target.value as PageSize]); }} title="page size">
        {Object.keys(PAGE_SIZES).map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
        {!preset && <option value="custom">Custom ({page.w}×{page.h}mm)</option>}
      </select>
      {/* TODO: align | span(1-12) | break-before | palette color */}
      <button disabled title="align (todo)">⯇ ⯈</button>
      <button disabled title="span (todo)">cols</button>
      <button disabled title="break before (todo)">⤓ page</button>
      <button disabled title="palette color (todo)">●</button>
    </div>
  );
}
