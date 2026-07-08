import { COLS, ROWS, isGridSection, type GridSection } from "./types.ts";
import { BLOCKS } from "./blocks.ts";
import { PAGE_SIZES, PAGE_MARGIN_MM, type PageSize } from "../pages.ts";
import type { SectionContent } from "../api.ts";

// Read-only wireframe of the document layout (the "Placeholder preview" tab): grid
// sections show each block as a labeled box in its grid cell; flow sections show a
// single "Flowing text" sheet. This is the template/layout view — the future home
// of P3 {{placeholder}} blocks. ponytail: generic labeled boxes, not per-block
// ghosts.
export function PlaceholderView({ sections, pageSize }: { sections: SectionContent[]; pageSize: PageSize }) {
  const dim = PAGE_SIZES[pageSize];
  const sheet: React.CSSProperties = {
    width: `${dim.w}mm`, height: `${dim.h}mm`, boxSizing: "border-box",
    padding: `${PAGE_MARGIN_MM}mm`, position: "relative", margin: "0 auto 24px",
    background: "#fff", boxShadow: "0 1px 8px rgba(0,0,0,.22)",
  };
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#e6e6e6", padding: 32 }}>
      {sections.map((content, i) =>
        isGridSection(content) ? <GridWire key={i} section={content} sheet={sheet} /> : <FlowWire key={i} sheet={sheet} />,
      )}
    </div>
  );
}

function GridWire({ section, sheet }: { section: GridSection; sheet: React.CSSProperties }) {
  return (
    <div style={sheet}>
      <div style={{ height: "100%", display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)`, gap: "4mm" }}>
        {section.blocks.map((b) => {
          const { rowStart, colStart, rowEnd, colEnd } = b.area;
          return (
            <div key={b.id} style={{
              gridArea: `${rowStart} / ${colStart} / ${rowEnd} / ${colEnd}`,
              border: "1.5px dashed #b08", borderRadius: 3, background: "rgba(187,0,136,.05)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#b08", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              {BLOCKS[b.block].label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowWire({ sheet }: { sheet: React.CSSProperties }) {
  return (
    <div style={sheet}>
      <div style={{ height: "100%", border: "1.5px dashed #999", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 12 }}>
        Flowing text section
      </div>
    </div>
  );
}
