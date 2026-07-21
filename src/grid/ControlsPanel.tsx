import { useState } from "react";
import { BLOCKS, BLOCK_ORDER, type BlockCategory, type BlockType } from "@pagecraft/model";
import { useStore } from "../store.ts";
import { themeNames } from "../themes.ts";
import { PAGE_SIZES, presetOf, type PageSize } from "../pages.ts";
import { COLS, ROWS } from "./types.ts";
import { Inspector } from "./Inspector.tsx";
import { Section, Field, Select, PALETTE } from "./controls.tsx";

// The right bar — a port of temp/src ControlsPanel: three tabs (Design / Blocks /
// Templates). Blocks holds the palette (category-grouped tiles) and swaps to the
// block editor when a block is selected.
type Panel = "design" | "blocks" | "templates";

export function ControlsPanel() {
  const [panel, setPanel] = useState<Panel>("blocks");
  return (
    <div style={{ width: 264, flexShrink: 0, background: "#fff", borderLeft: `1px solid ${PALETTE.BORDER}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderBottom: `1px solid ${PALETTE.BORDER}` }}>
        {(["design", "blocks", "templates"] as const).map((key) => (
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
    </div>
  );
}

// Templates = the page actions we have today; presets/templates land later.
function TemplatesPanel() {
  const addPage = useStore((s) => s.addPage);
  return (
    <div>
      <Section title="Pages">
        <button onClick={() => void addPage()}
          style={{ background: PALETTE.SURFACE, border: `1px dashed ${PALETTE.BORDER_STRONG}`, color: PALETTE.MUTED, padding: "8px 10px", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
          + Add blank page
        </button>
      </Section>
      <Section title="Templates">
        <div style={{ fontSize: 11, color: PALETTE.MUTED }}>Page templates & grid presets coming soon.</div>
      </Section>
    </div>
  );
}
