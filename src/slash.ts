import { Extension, type Editor } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";

// Slash menu: type "/" to insert one of the schema's blocks. A thin, dependency-
// light command palette over @tiptap/suggestion — the popup is plain DOM (no
// portal/tippy). Each item runs an ordinary editor command, so insertion goes
// through the shared schema and re-renders the paged preview like any edit.
type Item = { title: string; hint: string; run: (e: Editor) => void };

const ITEMS: Item[] = [
  { title: "Heading 1", hint: "chapter", run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { title: "Heading 2", hint: "subsection", run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { title: "Callout", hint: "boxed aside", run: (e) => e.chain().focus().insertContent({ type: "callout", content: [{ type: "paragraph" }] }).run() },
  { title: "Pull quote", hint: "styled quote", run: (e) => e.chain().focus().insertContent({ type: "pullQuote", content: [{ type: "text", text: "Quote" }] }).run() },
  { title: "Sidebar note", hint: "margin note", run: (e) => e.chain().focus().insertContent({ type: "sidebarNote", content: [{ type: "paragraph" }] }).run() },
  { title: "Two columns", hint: "6 + 6 grid", run: (e) => e.chain().focus().insertContent({ type: "columns", content: [
    { type: "column", attrs: { span: 6 }, content: [{ type: "paragraph" }] },
    { type: "column", attrs: { span: 6 }, content: [{ type: "paragraph" }] },
  ] }).run() },
  { title: "Divider", hint: "horizontal rule", run: (e) => e.chain().focus().setHorizontalRule().run() },
  { title: "Page break", hint: "start new page", run: (e) => e.chain().focus().insertContent({ type: "paragraph", attrs: { breakBefore: true } }).run() },
  { title: "Figure", hint: "image + caption", run: (e) => {
    const src = window.prompt("Image URL");
    if (src) e.chain().focus().insertContent({ type: "figure", attrs: { src, alt: "" }, content: [{ type: "text", text: "Caption" }] }).run();
  } },
];

// Minimal keyboard-navigable popup rendered into <body>.
function makePopup() {
  const el = document.createElement("div");
  el.className = "slash-menu";
  Object.assign(el.style, {
    position: "absolute", zIndex: "50", background: "#fff", border: "1px solid #ddd",
    borderRadius: "6px", boxShadow: "0 4px 16px rgba(0,0,0,.12)", padding: "4px", minWidth: "200px",
  });
  document.body.appendChild(el);
  let items: Item[] = [];
  let selected = 0;
  let onPick: (i: Item) => void = () => {};

  function draw() {
    el.innerHTML = "";
    items.forEach((it, i) => {
      const row = document.createElement("div");
      row.textContent = it.title;
      const hint = document.createElement("span");
      hint.textContent = it.hint;
      Object.assign(hint.style, { float: "right", color: "#999", fontSize: "11px", marginLeft: "12px" });
      row.appendChild(hint);
      Object.assign(row.style, {
        padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "14px",
        background: i === selected ? "#eef" : "transparent",
      });
      row.onmousedown = (ev) => { ev.preventDefault(); onPick(it); };
      el.appendChild(row);
    });
  }
  function place(rect: DOMRect | null) {
    if (!rect) return;
    el.style.left = `${rect.left + window.scrollX}px`;
    el.style.top = `${rect.bottom + window.scrollY + 4}px`;
  }
  return {
    el,
    update(next: Item[], rect: DOMRect | null, pick: (i: Item) => void) {
      items = next; onPick = pick;
      if (!(selected < items.length)) selected = 0; // also resets NaN
      draw(); place(rect);
    },
    onKey(key: string): boolean {
      if (!items.length) return key === "ArrowDown" || key === "ArrowUp" || key === "Enter"; // consume, no-op
      if (key === "ArrowDown") { selected = (selected + 1) % items.length; draw(); return true; }
      if (key === "ArrowUp") { selected = (selected - 1 + items.length) % items.length; draw(); return true; }
      if (key === "Enter") { const it = items[selected]; if (it) onPick(it); return true; }
      return false;
    },
    reset() { selected = 0; },
    destroy() { el.remove(); },
  };
}

export const SlashCommands = Extension.create({
  name: "slashCommands",
  addProseMirrorPlugins() {
    return [
      Suggestion<Item>({
        editor: this.editor,
        char: "/",
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.run(editor);
        },
        items: ({ query }) =>
          ITEMS.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())).slice(0, 9),
        render: () => {
          let popup: ReturnType<typeof makePopup> | null = null;
          return {
            onStart: (props) => {
              popup = makePopup();
              popup.reset();
              popup.update(props.items, props.clientRect?.() ?? null, (it) => props.command(it));
            },
            onUpdate: (props) => {
              popup?.update(props.items, props.clientRect?.() ?? null, (it) => props.command(it));
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") { popup?.destroy(); popup = null; return true; }
              return popup?.onKey(props.event.key) ?? false;
            },
            onExit: () => { popup?.destroy(); popup = null; },
          };
        },
      }),
    ];
  },
});
