import type { BlockType, GridArea } from "./types.ts";

// Block palette registry. `text: true` blocks default to a Tiptap doc whose node(s)
// give the block its semantics — serialize() renders them so grid + flow style
// identically, inline-editable via per-block Tiptap. `text: false` blocks carry
// typed props: image/divider/spacer are primitives; the rest render via the shared
// renderTypedBlock (canvas + PDF). ponytail: one entry per block; extend here.
export type BlockReg = {
  label: string;
  icon: string;
  text: boolean;
  defaultArea: GridArea;
  defaultContent: unknown;
  min: { cols: number; rows: number };
};

// Tiptap-JSON helpers for schema-backed defaults.
const doc = (node: object) => ({ type: "doc", content: [node] });
const p = (text?: string) => ({ type: "paragraph", content: text ? [{ type: "text", text }] : [] });
const li = (text: string) => ({ type: "listItem", content: [p(text)] });
const task = (text: string) => ({ type: "taskItem", attrs: { checked: false }, content: [p(text)] });
const th = (text: string) => ({ type: "tableHeader", content: [p(text)] });
const td = (text: string) => ({ type: "tableCell", content: [p(text)] });
const tr = (cells: object[]) => ({ type: "tableRow", content: cells });

export const BLOCKS: Record<BlockType, BlockReg> = {
  // ---- schema-backed text blocks ----
  textFrame: {
    label: "Text frame", icon: "▦", text: true,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 13, colEnd: 13 },
    defaultContent: doc(p()), min: { cols: 2, rows: 2 },
  },
  heading: {
    label: "Heading", icon: "H", text: true,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 3, colEnd: 9 },
    defaultContent: doc({ type: "heading", attrs: { level: 1 } }), min: { cols: 2, rows: 1 },
  },
  paragraph: {
    label: "Text", icon: "¶", text: true,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 5, colEnd: 7 },
    defaultContent: doc(p()), min: { cols: 2, rows: 1 },
  },
  pullQuote: {
    label: "Pull quote", icon: "❝", text: true,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 3, colEnd: 9 },
    defaultContent: doc({ type: "pullQuote" }), min: { cols: 2, rows: 1 },
  },
  callout: {
    label: "Callout", icon: "▤", text: true,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 4, colEnd: 7 },
    defaultContent: doc({ type: "callout", content: [p("A useful aside.")] }), min: { cols: 2, rows: 1 },
  },
  sidebarNote: {
    label: "Sidebar note", icon: "▏", text: true,
    defaultArea: { rowStart: 1, colStart: 9, rowEnd: 6, colEnd: 13 },
    defaultContent: doc({ type: "sidebarNote", content: [p("A short aside alongside the main text.")] }), min: { cols: 2, rows: 2 },
  },
  list: {
    label: "List", icon: "☰", text: true,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 4, colEnd: 13 },
    defaultContent: doc({ type: "bulletList", content: [li("First item"), li("Second item"), li("Third item")] }), min: { cols: 3, rows: 2 },
  },
  checkboxList: {
    label: "Checklist", icon: "☑", text: true,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 5, colEnd: 13 },
    defaultContent: doc({ type: "taskList", content: [task("Drink water"), task("Move your body"), task("Read for ten minutes")] }), min: { cols: 3, rows: 2 },
  },
  codeBlock: {
    label: "Code", icon: "</>", text: true,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 5, colEnd: 13 },
    defaultContent: doc({ type: "codeBlock", attrs: { language: "typescript" }, content: [{ type: "text", text: "function greet(name) {\n  return `Hello, ${name}!`;\n}" }] }), min: { cols: 4, rows: 2 },
  },
  table: {
    label: "Table", icon: "⊞", text: true,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 6, colEnd: 13 },
    defaultContent: doc({ type: "table", content: [
      tr([th("Column A"), th("Column B"), th("Column C")]),
      tr([td("Row 1A"), td("Row 1B"), td("Row 1C")]),
      tr([td("Row 2A"), td("Row 2B"), td("Row 2C")]),
    ] }), min: { cols: 4, rows: 3 },
  },

  // ---- primitives ----
  image: {
    label: "Image", icon: "▣", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 6, colEnd: 7 },
    defaultContent: { src: "", alt: "" }, min: { cols: 1, rows: 1 },
  },
  divider: {
    label: "Divider", icon: "—", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 2, colEnd: 13 },
    defaultContent: {}, min: { cols: 1, rows: 1 },
  },
  spacer: {
    label: "Spacer", icon: "␣", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 2, colEnd: 5 },
    defaultContent: {}, min: { cols: 1, rows: 1 },
  },

  // ---- custom typed-prop blocks ----
  authorBio: {
    label: "Author bio", icon: "A", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 4, colEnd: 13 },
    defaultContent: { name: "Jane Author", bio: "A short author biography that establishes credibility.", imageUrl: "" }, min: { cols: 4, rows: 2 },
  },
  chapterOpener: {
    label: "Chapter opener", icon: "C", text: false,
    defaultArea: { rowStart: 5, colStart: 2, rowEnd: 9, colEnd: 12 },
    defaultContent: { chapterNumber: 1, title: "Beginnings", subtitle: "How a single page becomes a book." }, min: { cols: 4, rows: 2 },
  },
  ctaBlock: {
    label: "CTA", icon: "→", text: false,
    defaultArea: { rowStart: 1, colStart: 2, rowEnd: 5, colEnd: 12 },
    defaultContent: { heading: "Ready to begin?", text: "Take the next step.", buttonText: "Get started", buttonUrl: "https://example.com" }, min: { cols: 4, rows: 2 },
  },
  statHighlight: {
    label: "Stat", icon: "#", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 4, colEnd: 5 },
    defaultContent: { value: "99%", label: "Of readers agree" }, min: { cols: 2, rows: 2 },
  },
  verse: {
    label: "Verse", icon: "✒", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 4, colEnd: 13 },
    defaultContent: { text: "Two roads diverged in a wood, and I—\nI took the one less traveled by,\nAnd that has made all the difference.", attribution: "Robert Frost" }, min: { cols: 3, rows: 2 },
  },
  footnote: {
    label: "Footnote", icon: "†", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 2, colEnd: 13 },
    defaultContent: { number: 1, text: "Referenced source or additional context." }, min: { cols: 3, rows: 1 },
  },
  embed: {
    label: "Embed", icon: "⧉", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 4, colEnd: 13 },
    defaultContent: { url: "https://example.com/embed", caption: "", provider: "YouTube" }, min: { cols: 3, rows: 2 },
  },
  linedWritingArea: {
    label: "Lined area", icon: "≡", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 8, colEnd: 13 },
    defaultContent: { lineCount: 8, lineStyle: "solid", label: "" }, min: { cols: 4, rows: 3 },
  },
  promptBlock: {
    label: "Prompt", icon: "?", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 6, colEnd: 13 },
    defaultContent: { prompt: "What are you grateful for today?", lineCount: 6, lineStyle: "solid" }, min: { cols: 4, rows: 3 },
  },
  gallery: {
    label: "Gallery", icon: "◫", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 6, colEnd: 13 },
    defaultContent: { images: [{ url: "", caption: "Image 1" }, { url: "", caption: "Image 2" }, { url: "", caption: "Image 3" }, { url: "", caption: "Image 4" }], columns: 2 }, min: { cols: 4, rows: 3 },
  },
  trackerGrid: {
    label: "Tracker", icon: "☷", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 7, colEnd: 13 },
    defaultContent: { rowLabels: ["Sleep", "Water", "Exercise", "Reading"], columnCount: 7, title: "Weekly Tracker" }, min: { cols: 4, rows: 3 },
  },
};

export const BLOCK_ORDER: BlockType[] = [
  "textFrame", "heading", "paragraph", "list", "checkboxList", "table", "codeBlock",
  "pullQuote", "callout", "sidebarNote", "verse", "footnote",
  "image", "gallery", "embed", "divider", "spacer",
  "chapterOpener", "ctaBlock", "statHighlight", "authorBio", "linedWritingArea", "promptBlock", "trackerGrid",
];
