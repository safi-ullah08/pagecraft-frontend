import { useStore } from "../store.ts";
import { themeNames } from "../themes.ts";

// Constrained local overrides as node attrs (align/span/break/palette) — still
// TODO. The theme <select> is live: it drives the preview and the export render.
export function Toolbar() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <select value={theme} onChange={(e) => setTheme(e.target.value)} title="theme">
        {themeNames().map((t) => (
          <option key={t} value={t}>{t}</option>
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
