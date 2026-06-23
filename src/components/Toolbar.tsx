// Constrained local overrides as node attrs: alignment, span, break-before,
// palette color. They reference TOKENS, never raw values, so theme-swap stays
// meaningful. Buttons wired to editor commands — TODO.
export function Toolbar() {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {/* TODO: align | span(1-12) | break-before | palette color */}
      <button disabled title="align (todo)">⯇ ⯈</button>
      <button disabled title="span (todo)">cols</button>
      <button disabled title="break before (todo)">⤓ page</button>
      <button disabled title="palette color (todo)">●</button>
    </div>
  );
}
