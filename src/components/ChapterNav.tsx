import { useStore } from "../store.ts";
import { isGridSection } from "../grid/types.ts";
import type { SectionContent } from "../api.ts";

// Page/section list for the loaded document. Click scrolls that page into view;
// "+ Add page" appends a grid page. Titles derive from a heading (flow: the doc's
// first heading; grid: a heading block's text) or fall back to "Page N".
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

export function ChapterNav() {
  const sections = useStore((s) => s.sections);
  const activeId = useStore((s) => s.activeId);
  const setActive = useStore((s) => s.setActive);
  const addPage = useStore((s) => s.addPage);
  const removePage = useStore((s) => s.removePage);

  const go = (id: string) => {
    setActive(id);
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav style={{ width: 220, borderRight: "1px solid #ddd", padding: 12, overflow: "auto", display: "flex", flexDirection: "column" }}>
      <strong>Pages · {sections.length}</strong>
      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0", flex: 1 }}>
        {sections.map((s, i) => (
          <li
            key={s.id}
            onClick={() => go(s.id)}
            title={titleOf(s.content, i)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "6px 8px", borderRadius: 4, cursor: "pointer", fontSize: 13,
              background: s.id === activeId ? "#eef" : "transparent",
            }}
          >
            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {i + 1}. {titleOf(s.content, i)}
            </span>
            {sections.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm("Delete this page?")) void removePage(s.id); }}
                title="delete page"
                style={{ border: "none", background: "transparent", color: "#999", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
              >×</button>
            )}
          </li>
        ))}
      </ul>
      <button
        onClick={() => void addPage()}
        style={{ padding: "8px 10px", border: "1px dashed #bbb", borderRadius: 4, background: "#fafafa", cursor: "pointer", fontSize: 13 }}
      >
        + Add page
      </button>
    </nav>
  );
}
