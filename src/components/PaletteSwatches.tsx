import type { Editor } from "@tiptap/react";
import { setBlockAttr, topName } from "../node-controls.ts";

// A CLOSED set of theme-relative colour tokens (never a raw hex) — see
// model/src/schema/overrides.ts (paletteColor attr) and styles/shared.ts
// (.color-accent / .color-text). Swatches preview the DOCUMENT theme's own
// --pc-accent/--pc-ink, so they read correctly whichever theme is active.
const TOKENS = [
  { value: "accent", label: "Accent colour", css: "var(--pc-accent, #8A5A2B)" },
  { value: "text", label: "Text colour", css: "var(--pc-ink, #111111)" },
] as const;

// Colour-palette picker for the selection's top-level block, meant to live in a
// text BubbleMenu (Editor.tsx / GridCanvas.tsx) where an editor instance and a
// live selection both exist — a global toolbar button has neither. `dark`
// switches the active-ring colour so it reads on both the light (flow) and
// dark (grid) bubble-menu chrome.
export function PaletteSwatches({ editor, dark }: { editor: Editor; dark?: boolean }) {
  const type = topName(editor);
  const active = type ? (editor.getAttributes(type).paletteColor as string | undefined) : undefined;
  const ring = dark ? "#fff" : "#111111";
  const rest = dark ? "1px solid rgba(255,255,255,.35)" : "1px solid rgba(0,0,0,.25)";
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {TOKENS.map((t) => (
        <button key={t.value} title={t.label}
          onMouseDown={(e) => { e.preventDefault(); setBlockAttr(editor, { paletteColor: t.value }); }}
          style={{ width: 18, height: 18, padding: 0, borderRadius: "50%", cursor: "pointer", background: t.css,
            border: active === t.value ? `2px solid ${ring}` : rest }} />
      ))}
      {active && (
        <button title="Clear colour"
          onMouseDown={(e) => { e.preventDefault(); setBlockAttr(editor, { paletteColor: null }); }}
          style={{ width: 18, height: 18, padding: 0, borderRadius: "50%", cursor: "pointer", background: "transparent",
            border: rest, color: "inherit", fontSize: 10, lineHeight: "16px" }}>✕</button>
      )}
    </div>
  );
}
