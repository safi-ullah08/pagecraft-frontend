import type { JSONContent } from "@tiptap/react";
import type { SideValues } from "@pagecraft/model";
import { useStore } from "../store.ts";
import { isGridSection, type BlockStyleTokens, type GridBlock, type GridSection } from "./types.ts";
import { BLOCKS } from "./blocks.ts";
import { moveBlock, updateBlockStyle, updateBlockContent, removeBlock } from "./ops.ts";
import { Section, Field, Slider, ColorPicker, Select, inputStyle, resetBtn, PALETTE } from "./controls.tsx";

const textareaStyle: React.CSSProperties = { ...inputStyle, resize: "vertical", fontFamily: "inherit" };
const LINE_STYLES = [{ value: "solid", label: "Solid" }, { value: "dotted", label: "Dotted" }, { value: "none", label: "None" }];

// Right-panel inspector: edits the selected block of the active grid section —
// Position (grid area), Style (per-block token overrides), Content (per-type
// fields). Mirrors the old temp/src BlockEditor feel on our grid model.
export function Inspector() {
  const sections = useStore((s) => s.sections);
  const activeId = useStore((s) => s.activeId);
  const selectedBlockIds = useStore((s) => s.selectedBlockIds);
  const edit = useStore((s) => s.edit);
  const selectBlock = useStore((s) => s.selectBlock);
  const deleteSelected = useStore((s) => s.deleteSelected);

  const moveBlockToPage = useStore((s) => s.moveBlockToPage);
  const fitBlock = useStore((s) => s.fitBlock);
  const reflowBlock = useStore((s) => s.reflowBlock);
  const active = sections.find((s) => s.id === activeId);
  const section = active && isGridSection(active.content) ? active.content : null;
  // per-block editing only when exactly one is selected; else show a group panel
  const block = section && selectedBlockIds.length === 1 ? section.blocks.find((b) => b.id === selectedBlockIds[0]) ?? null : null;
  // pages this block could move to (all grid sections except the current one)
  const pageOptions = sections
    .map((s, i) => ({ id: s.id, i }))
    .filter((o) => isGridSection(sections[o.i]!.content) && o.id !== activeId);

  // Rendered inside the right bar's Blocks tab (ControlsPanel). No panel chrome of
  // its own. Multiple selected → a small group panel; one → the full editor.
  if (section && selectedBlockIds.length > 1) {
    return (
      <div style={{ padding: 14, fontSize: 12, color: PALETTE.TEXT, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontWeight: 600 }}>{selectedBlockIds.length} blocks selected</div>
        <div style={{ color: PALETTE.MUTED, fontSize: 11 }}>Drag any one to move them together, or ⌘/Ctrl-C / -X / -D, Delete.</div>
        <button onClick={() => deleteSelected()} style={{ background: "transparent", border: `1px solid ${PALETTE.BORDER_STRONG}`, color: PALETTE.ACCENT, padding: "8px 12px", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>Delete selected</button>
        <button onClick={() => selectBlock(null)} style={{ background: "transparent", border: `1px solid ${PALETTE.BORDER}`, color: PALETTE.MUTED, padding: "6px 12px", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>Clear selection</button>
      </div>
    );
  }
  if (!section || !block) {
    return <div style={{ padding: 14, fontSize: 12, color: PALETTE.MUTED }}>Select a block to edit it.</div>;
  }

  const apply = (next: GridSection) => edit(active!.id, next);
  const reg = BLOCKS[block.block];

  return (
    <div style={{ fontSize: 12, color: PALETTE.TEXT }}>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${PALETTE.BORDER}`, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>{reg.icon} {reg.label}</span>
        <button onClick={() => selectBlock(null)} title="back to palette"
          style={{ background: "transparent", border: "none", color: PALETTE.MUTED, cursor: "pointer", fontSize: 12 }}>← Palette</button>
      </div>

      {pageOptions.length > 0 && (
        <Section title="Page">
          <Field label="Move to page">
            <Select
              value=""
              options={[{ value: "", label: "This page" }, ...pageOptions.map((o) => ({ value: o.id, label: `Page ${o.i + 1}` }))]}
              onChange={(toId) => { if (toId) moveBlockToPage(activeId!, block.id, toId); }}
            />
          </Field>
        </Section>
      )}
      <PositionSection block={block} onArea={(a) => apply(moveBlock(section, block.id, { ...block.area, ...a }))} />
      <Section title="Fit">
        <button onClick={() => fitBlock(active!.id, block.id)} title="size the block's height to its content"
          style={{ background: PALETTE.SURFACE, border: `1px solid ${PALETTE.BORDER}`, color: PALETTE.TEXT, padding: "8px 12px", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
          ↕ Fit height to content
        </button>
        {block.block === "textFrame" && (
          <button onClick={() => void reflowBlock(active!.id, block.id)} title="grow to fit, and spill any overflow onto the next page(s)"
            style={{ background: PALETTE.SURFACE, border: `1px solid ${PALETTE.BORDER}`, color: PALETTE.TEXT, padding: "8px 12px", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
            ↧ Spill overflow → next page
          </button>
        )}
        <Field label="Padding (inset content)">
          <BoxControl value={block.style?.padding} onChange={(v) => apply(updateBlockStyle(section, block.id, { padding: v }))} />
        </Field>
        <Field label="Margin (space around block)">
          <BoxControl value={block.style?.margin} min={-32} onChange={(v) => apply(updateBlockStyle(section, block.id, { margin: v }))} />
        </Field>
      </Section>
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

// Per-side box editor (top/right/bottom/left) for padding & margin, as sliders
// with a live value readout. A side set to 0 is dropped, and all-zero clears the
// token. `min` is 0 for padding; margin passes a negative min to allow pull-in.
const BOX_MAX = 64;
function BoxControl({ value, onChange, min = 0 }: { value?: number | SideValues; onChange: (v: SideValues | undefined) => void; min?: number }) {
  const cur: SideValues = typeof value === "number" ? { top: value, right: value, bottom: value, left: value } : (value ?? {});
  const set = (side: keyof SideValues, n: number) => {
    const next: SideValues = { ...cur, [side]: n || undefined };
    const has = (["top", "right", "bottom", "left"] as const).some((k) => next[k]);
    onChange(has ? next : undefined);
  };
  const cell = (side: keyof SideValues, label: string) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 10, color: PALETTE.MUTED }}>
      <span style={{ display: "flex", justifyContent: "space-between" }}><span>{label}</span><span style={{ color: PALETTE.TEXT }}>{cur[side] ?? 0}</span></span>
      <input type="range" min={min} max={BOX_MAX} step={1} value={cur[side] ?? 0} onChange={(e) => set(side, Number(e.target.value))}
        style={{ width: "100%", accentColor: PALETTE.ACCENT }} />
    </label>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {cell("top", "Top")}{cell("right", "Right")}{cell("bottom", "Bottom")}{cell("left", "Left")}
    </div>
  );
}

// Content editing: schema-backed text blocks are edited inline on the page; typed
// blocks (and image/heading structured props) are edited here, port of temp's
// per-type field sets.
function ContentSection({ block, onContent }: { block: GridBlock; onContent: (c: unknown) => void }) {
  const c = (block.content ?? {}) as Record<string, unknown>;
  const s = (k: string) => (c[k] as string) ?? "";
  const u = (patch: Record<string, unknown>) => onContent({ ...c, ...patch });
  const wrap = (children: React.ReactNode) => <Section title="Content">{children}</Section>;
  const text = (k: string, label: string, rows = 4) => (
    <Field label={label}><textarea value={s(k)} rows={rows} onChange={(e) => u({ [k]: e.target.value })} style={textareaStyle} /></Field>
  );
  const line = (k: string, label: string) => (
    <Field label={label}><input value={s(k)} onChange={(e) => u({ [k]: e.target.value })} style={inputStyle} /></Field>
  );

  switch (block.block) {
    case "image":
      return wrap(<>{line("src", "Image URL")}{line("alt", "Alt text")}</>);
    case "heading": {
      const doc = block.content as JSONContent;
      const node = doc.content?.[0];
      const level = (node?.attrs?.level as number) ?? 1;
      const setLevel = (l: number) => onContent({ ...doc, content: [{ ...node, attrs: { ...node?.attrs, level: l } }, ...(doc.content?.slice(1) ?? [])] });
      return wrap(<>
        <Field label="Level"><Select value={String(level)} options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `H${n}` }))} onChange={(v) => setLevel(Number(v))} /></Field>
        <div style={{ fontSize: 11, color: PALETTE.MUTED }}>Edit the heading text on the page.</div>
      </>);
    }
    case "authorBio":
      return wrap(<>{line("name", "Name")}{text("bio", "Bio")}{line("imageUrl", "Image URL")}</>);
    case "chapterOpener":
      return wrap(<>
        <Field label="Chapter number"><input type="number" min={1} value={(c.chapterNumber as number) ?? 1} onChange={(e) => u({ chapterNumber: Number(e.target.value) })} style={inputStyle} /></Field>
        {line("title", "Title")}{line("subtitle", "Subtitle")}
      </>);
    case "ctaBlock":
      return wrap(<>{line("heading", "Heading")}{text("text", "Text", 3)}{line("buttonText", "Button text")}{line("buttonUrl", "Button URL")}</>);
    case "statHighlight":
      return wrap(<>{line("value", "Value")}{line("label", "Label")}</>);
    case "verse":
      return wrap(<>{text("text", "Text", 6)}{line("attribution", "Attribution")}</>);
    case "footnote":
      return wrap(<>
        <Field label="Number"><input type="number" min={1} value={(c.number as number) ?? 1} onChange={(e) => u({ number: Number(e.target.value) })} style={inputStyle} /></Field>
        {text("text", "Text")}
      </>);
    case "embed":
      return wrap(<>{line("url", "URL")}{line("provider", "Provider")}{line("caption", "Caption")}</>);
    case "linedWritingArea":
      return wrap(<>
        <Field label="Lines"><Slider value={(c.lineCount as number) ?? 8} min={2} max={20} onChange={(v) => u({ lineCount: v })} /></Field>
        <Field label="Line style"><Select value={s("lineStyle") || "solid"} options={LINE_STYLES} onChange={(v) => u({ lineStyle: v })} /></Field>
        {line("label", "Label")}
      </>);
    case "promptBlock":
      return wrap(<>
        {text("prompt", "Prompt", 3)}
        <Field label="Lines"><Slider value={(c.lineCount as number) ?? 6} min={2} max={20} onChange={(v) => u({ lineCount: v })} /></Field>
        <Field label="Line style"><Select value={s("lineStyle") || "solid"} options={LINE_STYLES} onChange={(v) => u({ lineStyle: v })} /></Field>
      </>);
    case "gallery":
      return wrap(<GalleryFields c={c} u={u} />);
    case "trackerGrid":
      return wrap(<TrackerFields c={c} u={u} />);
    default:
      if (BLOCKS[block.block].text) return wrap(<div style={{ fontSize: 11, color: PALETTE.MUTED }}>Edit this content directly on the page.</div>);
      return wrap(<div style={{ fontSize: 11, color: PALETTE.MUTED }}>This block has no editable content.</div>);
  }
}

const addBtn: React.CSSProperties = { background: PALETTE.SURFACE, border: `1px dashed ${PALETTE.BORDER_STRONG}`, color: PALETTE.MUTED, padding: "6px 10px", borderRadius: 4, fontSize: 12, cursor: "pointer" };
const rmBtn: React.CSSProperties = { background: "transparent", border: "none", color: PALETTE.MUTED, fontSize: 12, cursor: "pointer" };

function GalleryFields({ c, u }: { c: Record<string, unknown>; u: (p: Record<string, unknown>) => void }) {
  const images = (c.images as Array<{ url: string; caption: string }>) ?? [];
  const set = (i: number, patch: Partial<{ url: string; caption: string }>) => u({ images: images.map((im, j) => (j === i ? { ...im, ...patch } : im)) });
  return (
    <>
      <Field label="Columns"><Slider value={(c.columns as number) ?? 2} min={2} max={4} onChange={(v) => u({ columns: v })} /></Field>
      {images.map((im, i) => (
        <div key={i} style={{ padding: 6, background: PALETTE.SURFACE, borderRadius: 4, display: "flex", flexDirection: "column", gap: 4 }}>
          <input value={im.url} placeholder={`Image ${i + 1} URL`} onChange={(e) => set(i, { url: e.target.value })} style={inputStyle} />
          <input value={im.caption} placeholder="Caption" onChange={(e) => set(i, { caption: e.target.value })} style={inputStyle} />
          <button style={rmBtn} onClick={() => u({ images: images.filter((_, j) => j !== i) })}>Remove</button>
        </div>
      ))}
      <button style={addBtn} onClick={() => u({ images: [...images, { url: "", caption: "" }] })}>+ Add image</button>
    </>
  );
}

function TrackerFields({ c, u }: { c: Record<string, unknown>; u: (p: Record<string, unknown>) => void }) {
  const rows = (c.rowLabels as string[]) ?? [];
  return (
    <>
      <Field label="Title"><input value={(c.title as string) ?? ""} onChange={(e) => u({ title: e.target.value })} style={inputStyle} /></Field>
      <Field label="Columns"><Slider value={(c.columnCount as number) ?? 7} min={3} max={31} onChange={(v) => u({ columnCount: v })} /></Field>
      {rows.map((label, i) => (
        <div key={i} style={{ display: "flex", gap: 6 }}>
          <input value={label} onChange={(e) => u({ rowLabels: rows.map((r, j) => (j === i ? e.target.value : r)) })} style={{ ...inputStyle, flex: 1 }} />
          <button style={rmBtn} onClick={() => u({ rowLabels: rows.filter((_, j) => j !== i) })}>✕</button>
        </div>
      ))}
      <button style={addBtn} onClick={() => u({ rowLabels: [...rows, "New row"] })}>+ Add row</button>
    </>
  );
}
