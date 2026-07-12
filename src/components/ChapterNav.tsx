import { useEffect, useRef } from "react";
import { BLOCKS } from "@pagecraft/model";
import { useStore } from "../store.ts";
import { isGridSection } from "../grid/types.ts";
import { PAGE_SIZES } from "../pages.ts";
import type { SectionContent } from "../api.ts";

// Page/section list for the loaded document. Each entry is a mini layout preview
// (blocks drawn as colored rects, like temp/src's PageNavigator). Click scrolls the
// page into view; "+ Add page" appends a grid page.
function titleOf(content: SectionContent, i: number): string {
  if (isGridSection(content)) {
    for (const b of content.blocks) {
      const doc = b.content as { content?: { type?: string; content?: { text?: string }[] }[] };
      const h = doc?.content?.find?.((n) => n.type === "heading");
      const t = h ? (h.content ?? []).map((c) => c.text ?? "").join("") : "";
      if (t) return t;
    }
    return `Page ${i + 1}`;
  }
  const h = (content.content ?? []).find((n) => n.type === "heading");
  const t = h ? (h.content ?? []).map((c) => c.text ?? "").join("") : "";
  return t || `Section ${i + 1}`;
}

function Thumb({ content, aspect }: { content: SectionContent; aspect: number }) {
  const W = 168;
  return (
    <div style={{ width: W, height: W * aspect, background: "#fff", borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,.25)", position: "relative", margin: "0 auto" }}>
      <div style={{ position: "absolute", inset: "7%", display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gridTemplateRows: "repeat(12, 1fr)", gap: 1 }}>
        {isGridSection(content)
          ? content.blocks.map((b) => (
              <div key={b.id} style={{ gridArea: `${b.area.rowStart} / ${b.area.colStart} / ${b.area.rowEnd} / ${b.area.colEnd}`,
                background: BLOCKS[b.block]?.color ?? "#888", opacity: 0.55, borderRadius: 1 }} />
            ))
          : <div style={{ gridArea: "1 / 1 / 13 / 13", background: "#ccc", opacity: 0.4, borderRadius: 1 }} />}
      </div>
    </div>
  );
}

export function ChapterNav() {
  const sections = useStore((s) => s.sections);
  const activeId = useStore((s) => s.activeId);
  const setActive = useStore((s) => s.setActive);
  const addPage = useStore((s) => s.addPage);
  const removePage = useStore((s) => s.removePage);
  const pageSize = useStore((s) => s.pageSize);
  const dim = PAGE_SIZES[pageSize];
  const aspect = dim.h / dim.w;

  // keep the active page's thumbnail in view when it changes (e.g. you clicked a
  // page in the editor) — scrolls only the nav, not the editor.
  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => { activeRef.current?.scrollIntoView({ block: "nearest" }); }, [activeId]);

  const go = (id: string) => {
    setActive(id);
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav style={{ width: 220, borderRight: "1px solid #ddd", display: "flex", flexDirection: "column", minHeight: 0, background: "#fafafa" }}>
      <div style={{ padding: "12px 14px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: "#666", fontWeight: 600 }}>
        Pages · {sections.length}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
        {sections.map((s, i) => (
          <div key={s.id} ref={s.id === activeId ? activeRef : undefined} onClick={() => go(s.id)} title={titleOf(s.content, i)}
            style={{ marginBottom: 10, padding: 8, borderRadius: 4, cursor: "pointer",
              background: s.id === activeId ? "#fff" : "transparent",
              border: `1px solid ${s.id === activeId ? "#bbb" : "transparent"}`, transition: "background .12s" }}>
            <Thumb content={s.content} aspect={aspect} />
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: "#222", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {i + 1}. {titleOf(s.content, i)}
              </span>
              {sections.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete this page?")) void removePage(s.id); }}
                  title="delete page"
                  style={{ border: "none", background: "transparent", color: "#999", cursor: "pointer", fontSize: 13, lineHeight: 1, flexShrink: 0 }}>×</button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => void addPage()}
        style={{ margin: 10, padding: "8px 10px", border: "1px dashed #bbb", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
        + Add page
      </button>
    </nav>
  );
}
