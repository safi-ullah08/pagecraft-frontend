import { useStore } from "../store.ts";
import { themeNames } from "../themes.ts";
import { PAGE_SIZES, type PageSize } from "../pages.ts";

// Constrained local overrides as node attrs (align/span/break/palette) — still
// TODO. The theme <select> is live: it drives the preview and the export render.
// The page-size <select> drives the editor page sheets.
export function Toolbar() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const pageSize = useStore((s) => s.pageSize);
  const setPageSize = useStore((s) => s.setPageSize);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <select value={theme} onChange={(e) => setTheme(e.target.value)} title="theme">
        {themeNames().map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <select value={pageSize} onChange={(e) => setPageSize(e.target.value as PageSize)} title="page size">
        {Object.keys(PAGE_SIZES).map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      {/* TODO: align | span(1-12) | break-before | palette color */}
      <button disabled title="align (todo)">⯇ ⯈</button>
      <button disabled title="span (todo)">cols</button>
      <button disabled title="break before (todo)">⤓ page</button>
      <button disabled title="palette color (todo)">●</button>
    </div>
  );
}
