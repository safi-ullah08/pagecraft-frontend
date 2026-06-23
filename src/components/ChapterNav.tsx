// Chapter navigator + section types (cover / toc / content). Inert stub behind
// progressive disclosure — Phase 1 only exercises the single content section.
export function ChapterNav() {
  return (
    <nav style={{ width: 220, borderRight: "1px solid #ddd", padding: 12 }}>
      <strong>Sections</strong>
      {/* TODO: ordered list of sections; add cover/toc/content; reorder */}
      <ul style={{ paddingLeft: 16 }}>
        <li>Content 1</li>
      </ul>
    </nav>
  );
}
