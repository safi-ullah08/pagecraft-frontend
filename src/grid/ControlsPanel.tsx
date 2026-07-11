import { useState } from "react";
import { BLOCKS, BLOCK_ORDER, type BlockCategory, type BlockType } from "@pagecraft/model";
import { useStore } from "../store.ts";
import { themeNames } from "../themes.ts";
import { PAGE_SIZES, type PageSize } from "../pages.ts";
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
  const selectedBlockId = useStore((s) => s.selectedBlockId);
  if (selectedBlockId) return <Inspector />;
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

function BlockTile({ type }: { type: BlockType }) {
  const addBlock = useStore((s) => s.addBlock);
  const b = BLOCKS[type];
  return (
    <button onClick={(e) => { e.stopPropagation(); addBlock(type); }} title={`Add ${b.label}`}
      style={{ background: PALETTE.SURFACE, border: `1px solid ${PALETTE.BORDER}`, borderRadius: 4, padding: 8, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, cursor: "pointer" }}>
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
  const pageSize = useStore((s) => s.pageSize);
  const setPageSize = useStore((s) => s.setPageSize);
  return (
    <div>
      <Section title="Theme">
        <Field label="Theme"><Select value={theme} options={themeNames().map((t) => ({ value: t, label: t }))} onChange={(v) => setTheme(v)} /></Field>
      </Section>
      <Section title="Page">
        <Field label="Size"><Select value={pageSize} options={Object.keys(PAGE_SIZES).map((p) => ({ value: p, label: p }))} onChange={(v) => setPageSize(v as PageSize)} /></Field>
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
