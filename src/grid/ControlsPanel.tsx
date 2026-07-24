import { useState } from "react";
import { BLOCKS, BLOCK_ORDER, PAGE_NUMBER_POSITIONS, PAGE_BACKGROUND_FITS, type BlockCategory, type BlockType, type PageBackground, type PageBackgroundFit } from "@pagecraft/model";
import { useStore } from "../store.ts";
import { uploadAsset } from "../api.ts";
import { themeNames } from "../themes.ts";
import { PAGE_SIZES, presetOf, type PageSize } from "../pages.ts";
import { COLS, ROWS, isGridSection } from "./types.ts";
import { stackOrder, reorderLayer, type LayerMove } from "./ops.ts";
import { isTocSection } from "./toc.ts";
import { Inspector } from "./Inspector.tsx";
import { Section, Field, Select, Slider, ColorPicker, inputStyle, PALETTE } from "./controls.tsx";

// The right bar — a port of temp/src ControlsPanel: three tabs (Design / Blocks /
// Templates). Blocks holds the palette (category-grouped tiles) and swaps to the
// block editor when a block is selected.
type Panel = "design" | "blocks" | "layers" | "templates";

export function ControlsPanel() {
  const [panel, setPanel] = useState<Panel>("blocks");
  return (
    <div style={{ width: 264, flexShrink: 0, background: "#fff", borderLeft: `1px solid ${PALETTE.BORDER}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: `1px solid ${PALETTE.BORDER}` }}>
        {(["design", "blocks", "layers", "templates"] as const).map((key) => (
          <button key={key} onClick={() => setPanel(key)}
            style={{ padding: "12px 8px", fontSize: 12, fontWeight: 500, textTransform: "capitalize", cursor: "pointer", border: "none",
              color: panel === key ? PALETTE.TEXT : PALETTE.MUTED,
              background: panel === key ? PALETTE.SURFACE : "transparent",
              borderBottom: panel === key ? "2px solid #E07A5F" : "2px solid transparent" }}>
            {key}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {panel === "design" && <DesignPanel />}
        {panel === "blocks" && <BlocksPanel />}
        {panel === "layers" && <LayersPanel />}
        {panel === "templates" && <TemplatesPanel />}
      </div>
    </div>
  );
}

const CATEGORIES: BlockCategory[] = ["content", "emphasis", "structure", "interactive"];

// Palette (tiles grouped by category) — or the block editor when one is selected.
function BlocksPanel() {
  const selectedCount = useStore((s) => s.selectedBlockIds.length);
  if (selectedCount) return <Inspector />;
  return (
    <div>
      {CATEGORIES.map((cat) => (
        <Section key={cat} title={cat}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {BLOCK_ORDER.filter((t) => BLOCKS[t].category === cat).map((t) => <BlockTile key={t} type={t} />)}
          </div>
        </Section>
      ))}
    </div>
  );
}

// Click adds the block to the active page; drag drops it onto the page grid under
// the cursor (a floating ghost follows; the target page highlights). Reuses the
// [data-sec] hit-test the canvas exposes.
function BlockTile({ type }: { type: BlockType }) {
  const addBlock = useStore((s) => s.addBlock);
  const addBlockAt = useStore((s) => s.addBlockAt);
  const b = BLOCKS[type];
  const w = b.defaultArea.colEnd - b.defaultArea.colStart;
  const h = b.defaultArea.rowEnd - b.defaultArea.rowStart;

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    let moved = false;
    let hot: HTMLElement | null = null;
    let ghost: HTMLElement | null = null;
    const clearHot = () => { if (hot) { hot.style.outline = ""; hot.style.outlineOffset = ""; hot = null; } };
    const gridAt = (x: number, y: number) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-sec]") as HTMLElement | null;
    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 4) return;
      moved = true;
      if (!ghost) {
        ghost = document.createElement("div");
        ghost.textContent = b.label;
        ghost.style.cssText = `position:fixed;z-index:9999;pointer-events:none;background:${b.color};color:#fff;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.3)`;
        document.body.appendChild(ghost);
      }
      ghost.style.left = `${ev.clientX + 10}px`;
      ghost.style.top = `${ev.clientY + 10}px`;
      const g = gridAt(ev.clientX, ev.clientY);
      if (g) { if (hot !== g) { clearHot(); g.style.outline = `2px solid ${b.color}`; g.style.outlineOffset = "-2px"; hot = g; } }
      else clearHot();
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      ghost?.remove();
      clearHot();
      if (!moved) { addBlock(type); return; } // click → active page
      const g = gridAt(ev.clientX, ev.clientY);
      const sec = g?.getAttribute("data-sec");
      if (g && sec) {
        const r = g.getBoundingClientRect();
        const colStart = Math.floor((ev.clientX - r.left) / (r.width / COLS)) + 1;
        const rowStart = Math.floor((ev.clientY - r.top) / (r.height / ROWS)) + 1;
        addBlockAt(type, sec, { colStart, rowStart, colEnd: colStart + w, rowEnd: rowStart + h });
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <button onPointerDown={onPointerDown} title={`Add ${b.label} (drag onto a page)`}
      style={{ background: PALETTE.SURFACE, border: `1px solid ${PALETTE.BORDER}`, borderRadius: 4, padding: 8, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, cursor: "grab" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 3, background: `${b.color}33`, color: b.color, fontSize: 12, fontWeight: 600 }}>{b.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: PALETTE.TEXT }}>{b.label}</span>
      </div>
    </button>
  );
}

// Design = our theme + page controls (we theme via CSS skins, not a design spec).
function DesignPanel() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);
  const customPage = useStore((s) => s.customPage);
  const preset = presetOf(page);
  return (
    <div>
      <Section title="Theme">
        <Field label="Theme"><Select value={theme} options={[...(themeNames().includes(theme) ? [] : [{ value: theme, label: theme === "verbatim" ? "Imported (verbatim)" : theme }]), ...themeNames().map((t) => ({ value: t, label: t }))]} onChange={(v) => setTheme(v)} /></Field>
      </Section>
      <Section title="Page">
        <Field label="Size"><Select value={preset ?? "custom"} options={[...Object.keys(PAGE_SIZES).map((p) => ({ value: p, label: p })), ...(customPage ? [{ value: "custom", label: `Custom ${customPage.w}×${customPage.h}mm` }] : [])]} onChange={(v) => { if (v === "custom") { if (customPage) setPage(customPage); } else setPage(PAGE_SIZES[v as PageSize]); }} /></Field>
      </Section>
      <PageBackgroundControls />
      <PageNumberControls />
    </div>
  );
}

const BG_KINDS = [
  { value: "none", label: "None" },
  { value: "solid", label: "Solid colour" },
  { value: "gradient", label: "Gradient" },
  { value: "image", label: "Image" },
];

// Background for the ACTIVE page, plus an explicit "apply to all pages" action.
// Editing stays per-page (a cover shouldn't inherit body pages); propagation is an
// action the user takes, not an implicit binding — so pages remain independently
// editable afterwards. General cross-page CSS propagation is still post-MVP.
function PageBackgroundControls() {
  const sections = useStore((s) => s.sections);
  const activeId = useStore((s) => s.activeId);
  const edit = useStore((s) => s.edit);
  const section = sections.find((s) => s.id === activeId);
  const content = section?.content;
  if (!section || !isGridSection(content)) return null;

  const bg = content.background;
  const kind = bg?.kind ?? "none";
  const pageNo = sections.findIndex((s) => s.id === section.id) + 1;
  const gridPages = sections.filter((s) => isGridSection(s.content));
  const set = (next: PageBackground | undefined) => edit(section.id, { ...content, background: next });

  // Copy THIS page's background onto every grid page (including clearing, when the
  // type is None). One image ref is shared by all pages — the worker dedupes and
  // bundles the asset once. Edits burst in a single tick, so undo takes it back in one.
  const applyToAll = () => {
    for (const s of gridPages) {
      if (s.id === section.id) continue;
      edit(s.id, { ...(s.content as typeof content), background: bg });
    }
  };

  const onKind = (k: string) => {
    if (k === "none") return set(undefined);
    if (k === "solid") return set({ kind: "solid", color: (bg as { color?: string })?.color || "#ffffff" });
    if (k === "gradient") return set({ kind: "gradient", from: "#ffffff", to: "#dddddd", angle: 180 });
    return set({ kind: "image", src: "", fit: "cover" });
  };

  return (
    <Section title={`Page background${pageNo ? ` — page ${pageNo}` : ""}`}>
      <Field label="Type"><Select value={kind} options={BG_KINDS} onChange={onKind} /></Field>

      {bg?.kind === "solid" && (
        <Field label="Colour"><ColorPicker value={bg.color} onChange={(color) => set({ kind: "solid", color })} /></Field>
      )}

      {bg?.kind === "gradient" && (<>
        <Field label="From"><ColorPicker value={bg.from} onChange={(from) => set({ ...bg, from })} /></Field>
        <Field label="To"><ColorPicker value={bg.to} onChange={(to) => set({ ...bg, to })} /></Field>
        <Field label="Angle"><Slider value={bg.angle ?? 180} min={0} max={360} onChange={(angle) => set({ ...bg, angle })} /></Field>
      </>)}

      {bg?.kind === "image" && (<>
        <Field label="Image">
          <input type="file" accept="image/*" style={{ fontSize: 11, color: PALETTE.MUTED }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAsset(f).then((src) => set({ ...bg, src })).catch((err) => alert(err.message));
              e.target.value = ""; // allow re-picking the same file
            }} />
        </Field>
        <Field label="Fit"><Select value={bg.fit ?? "cover"} options={PAGE_BACKGROUND_FITS.map((f) => ({ value: f, label: f }))} onChange={(fit) => set({ ...bg, fit: fit as PageBackgroundFit })} /></Field>
        <Field label="Behind"><ColorPicker value={bg.color ?? "#ffffff"} onChange={(color) => set({ ...bg, color })} /></Field>
        {bg.src
          ? <img src={bg.src} alt="" style={{ maxWidth: "100%", borderRadius: 4, marginTop: 4 }} />
          : <div style={{ fontSize: 10, color: PALETTE.MUTED }}>No image yet — the colour above shows until you pick one.</div>}
      </>)}

      {gridPages.length > 1 && (
        <button onClick={applyToAll} title={bg ? "Copy this background onto every page" : "Clear the background on every page"}
          style={{ marginTop: 8, width: "100%", padding: "7px 10px", borderRadius: 4, cursor: "pointer",
            background: PALETTE.SURFACE, border: `1px solid ${PALETTE.BORDER_STRONG}`, color: PALETTE.TEXT, fontSize: 11 }}>
          {bg ? `Apply to all ${gridPages.length} pages` : `Clear on all ${gridPages.length} pages`}
        </button>
      )}
    </Section>
  );
}

const PAGENO_FORMATS = [
  { value: "{n}", label: "1" },
  { value: "Page {n}", label: "Page 1" },
  { value: "{n} / {total}", label: "1 / N" },
  { value: "Page {n} of {total}", label: "Page 1 of N" },
  { value: "- {n} -", label: "- 1 -" },
];

// Document-level page numbers: on/off + where (position) + how (format/size). Each
// change persists to the doc (store.setPageNumbers) and shows in the PDF preview.
function PageNumberControls() {
  const cfg = useStore((s) => s.pageNumbers);
  const set = useStore((s) => s.setPageNumbers);
  const known = PAGENO_FORMATS.some((f) => f.value === cfg.format);
  return (
    <Section title="Page numbers">
      <Field label="Show">
        <input type="checkbox" checked={cfg.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
      </Field>
      {cfg.enabled && <>
        <Field label="Position"><Select value={cfg.position} options={PAGE_NUMBER_POSITIONS.map((p) => ({ value: p, label: p.replace("-", " ") }))} onChange={(v) => set({ position: v as typeof cfg.position })} /></Field>
        <Field label="Format"><Select value={known ? cfg.format : "custom"} options={[...PAGENO_FORMATS, { value: "custom", label: "Custom…" }]} onChange={(v) => set({ format: v === "custom" ? cfg.format : v })} /></Field>
        {!known && <Field label="Custom"><input value={cfg.format} onChange={(e) => set({ format: e.target.value })} placeholder="{n} of {total}" style={inputStyle} /></Field>}
        <Field label="Start at"><input type="number" min={0} value={cfg.startAt ?? 1} onChange={(e) => set({ startAt: Number(e.target.value) })} style={inputStyle} /></Field>
        <Field label="Size (pt)"><input type="number" min={6} max={72} value={cfg.fontSize ?? 10} onChange={(e) => set({ fontSize: Number(e.target.value) })} style={inputStyle} /></Field>
        <Field label="Custom CSS"><textarea value={cfg.css ?? ""} onChange={(e) => set({ css: e.target.value })} rows={3} placeholder="color: #888; font-style: italic; letter-spacing: 1px" style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 11 }} /></Field>
        <div style={{ fontSize: 10, color: PALETTE.MUTED }}>{"{n}"} = page number · {"{total}"} = total pages</div>
      </>}
    </Section>
  );
}

// First bit of text inside a block, for a recognisable layer label.
function previewText(content: unknown): string {
  const walk = (n: unknown): string => {
    if (!n || typeof n !== "object") return "";
    const o = n as { type?: string; text?: string; content?: unknown[]; src?: string; title?: string };
    if (typeof o.text === "string" && o.text.trim()) return o.text.trim();
    for (const c of o.content ?? []) { const t = walk(c); if (t) return t; }
    return "";
  };
  const t = walk(content) || (content as { title?: string })?.title || "";
  return t.length > 22 ? t.slice(0, 22) + "…" : t;
}

// Layers = the active page's blocks in stacking order, TOP FIRST (how design tools
// list them). Selection is the same store field the canvas uses, so clicking a row
// selects on the page and vice-versa — and it's the only way to reach a block that
// sits entirely behind a bigger one.
function LayersPanel() {
  const sections = useStore((s) => s.sections);
  const activeId = useStore((s) => s.activeId);
  const selected = useStore((s) => s.selectedBlockIds);
  const selectBlock = useStore((s) => s.selectBlock);
  const edit = useStore((s) => s.edit);

  const section = sections.find((s) => s.id === activeId);
  const content = section?.content;
  if (!section || !isGridSection(content)) {
    return <Section title="Layers"><div style={{ fontSize: 11, color: PALETTE.MUTED }}>Open a page to see its layers.</div></Section>;
  }
  const topFirst = [...stackOrder(content.blocks)].reverse();
  const move = (id: string, m: LayerMove) => edit(section.id, reorderLayer(content, id, m));
  const btn: React.CSSProperties = { width: 20, height: 20, borderRadius: 3, border: `1px solid ${PALETTE.BORDER}`, background: "#fff", color: PALETTE.MUTED, fontSize: 10, lineHeight: 1, cursor: "pointer", flexShrink: 0 };

  return (
    <Section title={`Layers (${topFirst.length})`}>
      {topFirst.length === 0 && <div style={{ fontSize: 11, color: PALETTE.MUTED }}>This page has no blocks yet.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {topFirst.map((b, i) => {
          const isSel = selected.includes(b.id);
          const label = BLOCKS[b.block]?.label ?? b.block;
          const preview = previewText(b.content);
          return (
            <div key={b.id} onClick={(e) => selectBlock(b.id, e.shiftKey)}
              title={`${label}${preview ? ` — ${preview}` : ""}`}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 6px", borderRadius: 4, cursor: "pointer",
                background: isSel ? "#E07A5F18" : PALETTE.SURFACE,
                border: `1px solid ${isSel ? "#E07A5F" : "transparent"}` }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: BLOCKS[b.block]?.color ?? "#888", opacity: 0.7 }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: PALETTE.TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {preview || label}
              </span>
              <button style={btn} title="Bring forward" disabled={i === 0}
                onClick={(e) => { e.stopPropagation(); move(b.id, "forward"); }}>↑</button>
              <button style={btn} title="Send backward" disabled={i === topFirst.length - 1}
                onClick={(e) => { e.stopPropagation(); move(b.id, "backward"); }}>↓</button>
            </div>
          );
        })}
      </div>
      {topFirst.length > 1 && (
        <div style={{ fontSize: 10, color: PALETTE.MUTED, marginTop: 6 }}>Top of the list = front of the page. ⤒/⤓ on the block itself jump to front/back.</div>
      )}
    </Section>
  );
}

// Templates = the page actions we have today; presets/templates land later.
function TemplatesPanel() {
  const addPage = useStore((s) => s.addPage);
  const generateToc = useStore((s) => s.generateToc);
  const sections = useStore((s) => s.sections);
  const hasToc = sections.some((s) => isTocSection(s.content));
  return (
    <div>
      <Section title="Pages">
        <button onClick={() => void addPage()}
          style={{ background: PALETTE.SURFACE, border: `1px dashed ${PALETTE.BORDER_STRONG}`, color: PALETTE.MUTED, padding: "8px 10px", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
          + Add blank page
        </button>
      </Section>
      <Section title="Contents">
        <button onClick={() => void generateToc()}
          title={hasToc ? "Rebuild the contents page from the current headings" : "Scan every page's headings and add a contents page as page 1"}
          style={{ background: PALETTE.SURFACE, border: `1px solid ${PALETTE.BORDER_STRONG}`, color: PALETTE.TEXT, padding: "8px 10px", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
          {hasToc ? "⟳ Refresh table of contents" : "+ Generate table of contents"}
        </button>
        <div style={{ fontSize: 10, color: PALETTE.MUTED }}>
          {hasToc
            ? "Rebuilt in place from every heading — page numbers stay correct."
            : "Added as page 1, shifting the rest down. Re-run it after editing to refresh."}
        </div>
      </Section>
      <Section title="Templates">
        <div style={{ fontSize: 11, color: PALETTE.MUTED }}>Page templates & grid presets coming soon.</div>
      </Section>
    </div>
  );
}
