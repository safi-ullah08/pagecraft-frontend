import type { JSONContent } from "@tiptap/react";
import { useStore } from "../store.ts";
import { isGridSection, type BlockStyleTokens, type GridBlock, type GridSection } from "./types.ts";
import { BLOCKS } from "./blocks.ts";
import { moveBlock, updateBlockStyle, updateBlockContent, removeBlock } from "./ops.ts";
import { Section, Field, Slider, ColorPicker, Select, inputStyle, resetBtn, PALETTE } from "./controls.tsx";

// Right-panel inspector: edits the selected block of the active grid section —
// Position (grid area), Style (per-block token overrides), Content (per-type
// fields). Mirrors the old temp/src BlockEditor feel on our grid model.
export function Inspector() {
  const sections = useStore((s) => s.sections);
  const activeId = useStore((s) => s.activeId);
  const selectedBlockId = useStore((s) => s.selectedBlockId);
  const edit = useStore((s) => s.edit);
  const selectBlock = useStore((s) => s.selectBlock);

  const active = sections.find((s) => s.id === activeId);
  const section = active && isGridSection(active.content) ? active.content : null;
  const block = section?.blocks.find((b) => b.id === selectedBlockId) ?? null;

  const panel: React.CSSProperties = {
    width: 264, flexShrink: 0, borderLeft: `1px solid ${PALETTE.BORDER}`, background: "#fff",
    overflowY: "auto", fontSize: 12, color: PALETTE.TEXT,
  };

  if (!section || !block) {
    return <div style={{ ...panel, padding: 14, color: PALETTE.MUTED }}>Select a block to edit its position, style, and content.</div>;
  }

  const apply = (next: GridSection) => edit(active!.id, next);
  const reg = BLOCKS[block.block];

  return (
    <div style={panel}>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${PALETTE.BORDER}`, fontWeight: 600 }}>
        {reg.icon} {reg.label}
      </div>

      <PositionSection block={block} onArea={(a) => apply(moveBlock(section, block.id, { ...block.area, ...a }))} />
      <StyleSection block={block} onStyle={(t) => apply(updateBlockStyle(section, block.id, t))} />
      <ContentSection block={block} onContent={(c) => apply(updateBlockContent(section, block.id, c))} />

      <Section title="Actions">
        <button onClick={() => { apply(removeBlock(section, block.id)); selectBlock(null); }}
          style={{ background: "transparent", border: `1px solid ${PALETTE.BORDER_STRONG}`, color: PALETTE.ACCENT, padding: "8px 12px", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
          Remove block
        </button>
      </Section>
    </div>
  );
}

function PositionSection({ block, onArea }: { block: GridBlock; onArea: (a: Partial<GridBlock["area"]>) => void }) {
  const a = block.area;
  return (
    <Section title="Position">
      <Field label="Row start"><Slider value={a.rowStart} min={1} max={12} onChange={(v) => onArea({ rowStart: v })} /></Field>
      <Field label="Row end"><Slider value={a.rowEnd} min={2} max={13} onChange={(v) => onArea({ rowEnd: v })} /></Field>
      <Field label="Column start"><Slider value={a.colStart} min={1} max={12} onChange={(v) => onArea({ colStart: v })} /></Field>
      <Field label="Column end"><Slider value={a.colEnd} min={2} max={13} onChange={(v) => onArea({ colEnd: v })} /></Field>
    </Section>
  );
}

const ALIGN: Array<{ value: NonNullable<BlockStyleTokens["textAlign"]>; label: string }> = [
  { value: "left", label: "L" }, { value: "center", label: "C" }, { value: "right", label: "R" }, { value: "justify", label: "J" },
];

function StyleSection({ block, onStyle }: { block: GridBlock; onStyle: (t: Partial<BlockStyleTokens>) => void }) {
  const t = block.style ?? {};
  const hasAny = Object.keys(t).length > 0;
  const clear = (k: keyof BlockStyleTokens) => (
    t[k] !== undefined ? <button style={resetBtn} title="reset" onClick={() => onStyle({ [k]: undefined })}>×</button> : null
  );
  const row = (node: React.ReactNode) => <div style={{ display: "flex", alignItems: "center", gap: 4 }}>{node}</div>;

  return (
    <Section title="Style">
      <Field label="Text color">{row(<><ColorPicker value={t.textColor ?? "#111111"} onChange={(v) => onStyle({ textColor: v })} />{clear("textColor")}</>)}</Field>
      <Field label="Background">{row(<><ColorPicker value={t.backgroundColor ?? "#ffffff"} onChange={(v) => onStyle({ backgroundColor: v })} />{clear("backgroundColor")}</>)}</Field>
      <Field label="Font size">{row(<><Slider value={t.fontSize ?? 16} min={8} max={72} unit="px" onChange={(v) => onStyle({ fontSize: v })} />{clear("fontSize")}</>)}</Field>
      <Field label="Font weight">{row(<><Slider value={t.fontWeight ?? 400} min={100} max={900} step={100} onChange={(v) => onStyle({ fontWeight: v })} />{clear("fontWeight")}</>)}</Field>
      <Field label="Letter spacing">{row(<><Slider value={t.letterSpacing ?? 0} min={-0.05} max={0.3} step={0.01} unit="em" onChange={(v) => onStyle({ letterSpacing: v })} />{clear("letterSpacing")}</>)}</Field>
      <Field label="Opacity">{row(<><Slider value={t.opacity ?? 1} min={0.1} max={1} step={0.05} onChange={(v) => onStyle({ opacity: v })} />{clear("opacity")}</>)}</Field>
      <Field label="Text align">
        <div style={{ display: "flex", gap: 2 }}>
          {ALIGN.map((o) => (
            <button key={o.value} onClick={() => onStyle({ textAlign: o.value })}
              style={{ flex: 1, padding: "4px 0", fontSize: 11, fontWeight: 600, cursor: "pointer", borderRadius: 3,
                background: t.textAlign === o.value ? PALETTE.ACCENT : PALETTE.SURFACE,
                color: t.textAlign === o.value ? "#fff" : PALETTE.MUTED,
                border: `1px solid ${t.textAlign === o.value ? PALETTE.ACCENT : PALETTE.BORDER}` }}>
              {o.label}
            </button>
          ))}
          {clear("textAlign")}
        </div>
      </Field>
      <Field label="Font family">
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input value={t.fontFamily ?? ""} placeholder="Inherited" onChange={(e) => onStyle({ fontFamily: e.target.value || undefined })} style={{ ...inputStyle, flex: 1 }} />
          {clear("fontFamily")}
        </div>
      </Field>
      {hasAny && (
        <button onClick={() => onStyle({ textColor: undefined, backgroundColor: undefined, fontSize: undefined, fontWeight: undefined, letterSpacing: undefined, opacity: undefined, textAlign: undefined, fontFamily: undefined })}
          style={{ background: "transparent", border: `1px solid ${PALETTE.BORDER_STRONG}`, color: PALETTE.MUTED, padding: "6px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>
          Reset all overrides
        </button>
      )}
    </Section>
  );
}

// Content editing: image src/alt and heading level are structured props best set
// here; rich text blocks are edited inline on the page.
function ContentSection({ block, onContent }: { block: GridBlock; onContent: (c: unknown) => void }) {
  if (block.block === "image") {
    const c = block.content as { src?: string; alt?: string };
    return (
      <Section title="Content">
        <Field label="Image URL"><input value={c.src ?? ""} onChange={(e) => onContent({ ...c, src: e.target.value })} style={inputStyle} /></Field>
        <Field label="Alt text"><input value={c.alt ?? ""} onChange={(e) => onContent({ ...c, alt: e.target.value })} style={inputStyle} /></Field>
      </Section>
    );
  }
  if (block.block === "heading") {
    const doc = block.content as JSONContent;
    const node = doc.content?.[0];
    const level = (node?.attrs?.level as number) ?? 1;
    const setLevel = (l: number) => {
      const next: JSONContent = { ...doc, content: [{ ...node, attrs: { ...node?.attrs, level: l } }, ...(doc.content?.slice(1) ?? [])] };
      onContent(next);
    };
    return (
      <Section title="Content">
        <Field label="Level">
          <Select value={String(level)} options={[{ value: "1", label: "H1" }, { value: "2", label: "H2" }, { value: "3", label: "H3" }]} onChange={(v) => setLevel(Number(v))} />
        </Field>
        <div style={{ fontSize: 11, color: PALETTE.MUTED }}>Edit the heading text directly on the page.</div>
      </Section>
    );
  }
  if (BLOCKS[block.block].text) {
    return <Section title="Content"><div style={{ fontSize: 11, color: PALETTE.MUTED }}>Edit this text directly on the page.</div></Section>;
  }
  return <Section title="Content"><div style={{ fontSize: 11, color: PALETTE.MUTED }}>This block has no editable content.</div></Section>;
}
