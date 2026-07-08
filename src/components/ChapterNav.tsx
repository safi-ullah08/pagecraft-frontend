import type { JSONContent } from "@tiptap/react";
import { useStore } from "../store.ts";

// Section list for the loaded document (chapters/subsections from import). Click
// scrolls that section into view in the continuous editor column. Titles derive
// from each section's first heading.
function titleOf(content: JSONContent, i: number): string {
  const h = (content.content ?? []).find((n) => n.type === "heading");
  const text = h ? (h.content ?? []).map((c) => c.text ?? "").join("") : "";
  return text || `Section ${i + 1}`;
}

export function ChapterNav() {
  const sections = useStore((s) => s.sections);
  const activeId = useStore((s) => s.activeId);
  const setActive = useStore((s) => s.setActive);

  const go = (id: string) => {
    setActive(id);
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav style={{ width: 220, borderRight: "1px solid #ddd", padding: 12, overflow: "auto" }}>
      <strong>Sections</strong>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
        {sections.map((s, i) => (
          <li
            key={s.id}
            onClick={() => go(s.id)}
            title={titleOf(s.content, i)}
            style={{
              padding: "6px 8px", borderRadius: 4, cursor: "pointer", fontSize: 13,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              background: s.id === activeId ? "#eef" : "transparent",
            }}
          >
            {titleOf(s.content, i)}
          </li>
        ))}
      </ul>
    </nav>
  );
}
