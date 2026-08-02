import type { JSONContent } from "@tiptap/react";
import { ROWS, COLS, type BlockStyleTokens, type GridBlock, type GridSection, type PageBackground } from "./types.ts";
import { buildCover } from "./covers.ts";
import { buildTocSection } from "./toc.ts";

// Document STRUCTURES — "what shows up where". A structure is DATA: an ordered list
// of page specs. `interpret()` turns it into GridSections the store inserts, exactly
// like covers/TOC. Blocks reference the theme's --pc-* tokens (via the constants
// below), so ONE structure renders under any theme — that's how 3 structures × 5
// themes = 15 templates without per-template CSS (see TEMPLATES-PLAN.md, v2 Step 1).
//
// Kept as data (not builder functions) so the future template builder can edit a
// structure without running code. Copy of covers.ts's block idiom on purpose —
// keeps covers.ts untouched.
// ponytail: placeholder copy. Merge fields / real starter text are the deferred half.

const rid = () => Math.random().toString(36).slice(2, 10);
const doc = (nodes: JSONContent[]): JSONContent => ({ type: "doc", content: nodes });
const heading = (text: string, level = 1): JSONContent =>
  ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
const para = (text: string): JSONContent =>
  ({ type: "paragraph", content: [{ type: "text", text }] });

const BG = "var(--pc-bg)", INK = "var(--pc-ink)", ACCENT = "var(--pc-accent)";
const ON_ACCENT = "var(--pc-on-accent)", DISPLAY = "var(--pc-display)", BODY = "var(--pc-body)";
const UPPER = "text-transform: uppercase";

// A placed text block: [rowStart, colStart, rowEnd, colEnd] on the 12×12 grid.
type BlockSpec = { at: [number, number, number, number]; nodes: JSONContent[]; style?: BlockStyleTokens; z?: number };
type PageSpec =
  | { kind: "blocks"; background?: PageBackground; cover?: true; blocks: BlockSpec[] } // cover:true = hand-crafted cover, excluded from numbering/TOC
  | { kind: "cover"; cover: string }   // reuse a covers.ts front/back design
  | { kind: "toc" };                    // a "Contents" placeholder; user regenerates
export type DocType = "leadMagnet" | "ebook" | "report";
export type StructureSpec = { key: DocType; name: string; pages: PageSpec[] };

// ---- interpreter --------------------------------------------------------
export function interpret(spec: StructureSpec): GridSection[] {
  return spec.pages.map(toSection);
}
function toSection(p: PageSpec): GridSection {
  if (p.kind === "cover") return buildCover(p.cover);
  if (p.kind === "toc") return buildTocSection([]); // "Contents" + empty; regenerate for real page numbers
  const sec: GridSection & { cover?: true } = { type: "grid", blocks: p.blocks.map(toBlock) };
  if (p.cover) sec.cover = true;
  if (p.background) sec.background = p.background;
  return sec;
}
function toBlock(b: BlockSpec, i: number): GridBlock {
  const [rowStart, colStart, rowEnd, colEnd] = b.at;
  return {
    id: rid(),
    area: { rowStart, colStart, rowEnd, colEnd },
    block: "textFrame",
    content: doc(b.nodes),
    zIndex: b.z ?? i, // explicit so text sits above any page background
    ...(b.style ? { style: b.style } : {}),
  };
}

// Derived tones (temp/src had explicit surface/muted/border tokens; we only ship
// bg/ink/accent, so mix them at render — Chromium 111+ and every modern browser
// support color-mix, which covers the editor and Gotenberg's Chromium).
// ponytail: color-mix instead of adding 3 tokens to all 5 skins + the coverage test.
const MUTED = "color-mix(in srgb, var(--pc-ink) 42%, var(--pc-bg))";
const SURFACE = "color-mix(in srgb, var(--pc-accent) 8%, var(--pc-bg))";
const BORDER = "color-mix(in srgb, var(--pc-ink) 16%, var(--pc-bg))";
const emptyP: JSONContent = { type: "paragraph" };

// Skin-styled semantic nodes — the skin restyles .pull-quote/.callout/.sidebar-note
// per theme, on BOTH the canvas and the PDF, so these re-skin for free (unlike the
// .pc-* typed blocks, which the canvas doesn't load).
const pq = (text: string): JSONContent => ({ type: "pullQuote", content: [{ type: "text", text }] });
const callout = (...lines: string[]): JSONContent => ({ type: "callout", content: lines.map(para) });
const aside = (text: string): JSONContent => ({ type: "sidebarNote", content: [para(text)] });

// Shared style recipes (temp/src values: kicker 0.08–0.18em uppercase accent; drop
// cap ~3 line-heights; stat = oversized accent numeral + uppercase muted label).
const KICKER: BlockStyleTokens = { fontSize: 12, letterSpacing: 0.16, fontWeight: 600, textColor: ACCENT, fontFamily: BODY, customCss: UPPER };
const TITLE: BlockStyleTokens = { fontSize: 40, fontWeight: 700, textColor: INK, fontFamily: DISPLAY };
const H2: BlockStyleTokens = { fontSize: 24, fontWeight: 700, textColor: INK, fontFamily: DISPLAY };
const BODY_S: BlockStyleTokens = { fontSize: 15, textColor: INK, fontFamily: BODY, customCss: "line-height:1.7" };
const DROPCAP: BlockStyleTokens = { fontSize: 15, textColor: INK, fontFamily: BODY, customCss:
  "p{line-height:1.72;margin-top:.6em}p:first-child{margin-top:0}" +
  "p:first-child::first-letter{float:left;font-family:var(--pc-display);font-size:3.3em;line-height:.8;font-weight:700;color:var(--pc-accent);padding:.02em .12em 0 0}" };

const kicker = (text: string, at: [number, number, number, number]): BlockSpec => ({ at, nodes: [para(text)], style: KICKER });
// A short centred accent rule (temp's 32×1px bar under chapter titles).
const rule = (at: [number, number, number, number]): BlockSpec => ({ at, nodes: [emptyP], style: { customCss: "width:44px;height:2px;background:var(--pc-accent)" } });
// Oversized accent numeral + uppercase muted label, stacked and centred.
const stat = (value: string, label: string, at: [number, number, number, number]): BlockSpec => ({
  at, nodes: [para(value), para(label)],
  style: { textAlign: "center", customCss:
    "p:first-child{font-family:var(--pc-display);font-weight:800;font-size:44px;line-height:1;color:var(--pc-accent)}" +
    `p:last-child{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:${MUTED};margin-top:6px}` },
});

// ---- the 3 structures ---------------------------------------------------
const leadMagnet: StructureSpec = {
  key: "leadMagnet", name: "Lead magnet",
  pages: [
    { kind: "cover", cover: "band" },
    { kind: "blocks", blocks: [
      kicker("The guide", [2, 2, 3, 8]),
      { at: [3, 2, 5, 12], nodes: [heading("What you'll learn")], style: TITLE },
      { at: [5, 2, 9, 8], nodes: [
        para("This short guide walks you through a simple, repeatable process you can put to work today — no fluff, just the moves that matter."),
        para("By the end you'll have a one-page checklist you can reuse on every project."),
      ], style: DROPCAP },
      { at: [5, 8, 9, 12], nodes: [callout("Inside", "A step-by-step process, the three common pitfalls, and a one-page checklist.")], style: {} },
      stat("3", "Simple steps", [9, 2, 12, 5]),
      stat("10m", "To first result", [9, 5, 12, 9]),
      stat("1", "Handy checklist", [9, 9, 12, 12]),
    ] },
    { kind: "blocks", background: { kind: "solid", color: ACCENT }, blocks: [
      { at: [3, 2, 4, 11], nodes: [para("Ready when you are")], style: { ...KICKER, textAlign: "center", textColor: ON_ACCENT } },
      { at: [4, 2, 7, 12], nodes: [heading("Start today")], style: { ...TITLE, textAlign: "center", textColor: ON_ACCENT } },
      { at: [7, 3, 9, 11], nodes: [para("Grab the full toolkit and take the first step in the next ten minutes.")], style: { textAlign: "center", fontSize: 17, textColor: ON_ACCENT, fontFamily: BODY } },
      { at: [9, 5, 10, 9], nodes: [para("yourname.com/start")], style: { textAlign: "center", fontSize: 14, fontWeight: 700, textColor: ON_ACCENT, fontFamily: BODY, customCss: "border:2px solid var(--pc-on-accent);border-radius:999px;padding:9px 4px" } },
    ] },
  ],
};

// Running head for ebook body pages — small uppercase muted tag on a hairline rule.
const runHead = (text: string): BlockSpec => ({ at: [1, 2, 2, 12], nodes: [para(text)],
  style: { fontSize: 10, letterSpacing: 0.14, textColor: MUTED, fontFamily: BODY, customCss: `text-transform:uppercase;border-bottom:1px solid ${BORDER};padding-bottom:7px` } });

const ebook: StructureSpec = {
  key: "ebook", name: "Ebook",
  pages: [
    // 1 — hand-crafted editorial cover (unnumbered, not in contents)
    { kind: "blocks", cover: true, background: { kind: "solid", color: BG }, blocks: [
      { at: [2, 2, 3, 9], nodes: [para("The complete guide")], style: { ...KICKER, fontSize: 12, letterSpacing: 0.22 } },
      { at: [3, 2, 4, 3], nodes: [emptyP], style: { customCss: "width:56px;height:3px;background:var(--pc-accent)" } },
      { at: [5, 2, 9, 11], nodes: [heading("Designing Beautiful Ebooks")], style: { fontFamily: DISPLAY, fontWeight: 700, fontSize: 56, textColor: INK, customCss: "line-height:1.05" } },
      { at: [9, 2, 10, 10], nodes: [para("A practical guide to type, layout and rhythm on the page.")], style: { fontSize: 17, textColor: MUTED, fontFamily: BODY, customCss: "font-style:italic" } },
      { at: [11, 2, 12, 8], nodes: [para("By Author Name")], style: { ...KICKER, textColor: INK, letterSpacing: 0.12 } },
    ] },
    // 2 — epigraph: centred, airy
    { kind: "blocks", blocks: [
      { at: [5, 3, 8, 11], nodes: [para("“Good design is as little design as possible.”")], style: { textAlign: "center", fontSize: 26, textColor: INK, fontFamily: DISPLAY, customCss: "font-style:italic;line-height:1.4" } },
      { at: [8, 4, 9, 10], nodes: [para("— Dieter Rams")], style: { textAlign: "center", fontSize: 14, textColor: MUTED, fontFamily: BODY, customCss: "letter-spacing:.04em" } },
    ] },
    // 3 — contents
    { kind: "toc" },
    // 4 — chapter opener: oversized accent numeral
    { kind: "blocks", blocks: [
      { at: [2, 2, 6, 7], nodes: [para("1")], style: { fontFamily: DISPLAY, fontWeight: 700, fontSize: 150, textColor: ACCENT, customCss: "line-height:.8" } },
      { at: [6, 2, 7, 9], nodes: [para("Chapter one")], style: { ...KICKER, letterSpacing: 0.2 } },
      { at: [7, 2, 10, 11], nodes: [heading("Where good books begin")], style: { ...TITLE, fontSize: 46, customCss: "line-height:1.1" } },
      rule([10, 2, 11, 5]),
      { at: [11, 2, 12, 10], nodes: [para("A one-line promise of what this chapter delivers to the reader.")], style: { fontSize: 16, textColor: MUTED, fontFamily: BODY, customCss: "font-style:italic" } },
    ] },
    // 5 — body: drop-cap opener with a right-hand pull quote + margin note
    { kind: "blocks", blocks: [
      runHead("Chapter one · Where good books begin"),
      { at: [2, 2, 12, 8], nodes: [
        para("Every good book begins with restraint. Before a single ornament, the page needs a measure the eye can follow, a rhythm between blocks, and one colour doing the work of ten. This opening paragraph inherits the theme's body font and leading, so it always matches the cover — and the drop cap sets the tone."),
        para("Set your measure first. A column that is too wide tires the reader; too narrow and the rhythm stutters. Everything after is detail."),
        para("From there, hierarchy does the rest: a confident heading, generous space, and quiet secondary text that never competes with the argument."),
      ], style: DROPCAP },
      { at: [3, 8, 6, 12], nodes: [pq("One colour, doing the work of ten.")], style: {} },
      { at: [8, 8, 12, 12], nodes: [aside("Measure — the length of a line of text, ideally 55–75 characters. It is the single biggest lever on readability.")], style: {} },
    ] },
    // 6 — body: subhead, list, and a key-idea callout
    { kind: "blocks", blocks: [
      runHead("Chapter one · Where good books begin"),
      { at: [2, 2, 3, 10], nodes: [heading("The three principles", 2)], style: H2 },
      { at: [3, 2, 8, 8], nodes: [
        para("Good pages share a small set of habits. None of them are decorative; each one removes a decision the reader would otherwise have to make."),
        para("Hold to these and the rest of the design falls into place almost on its own."),
      ], style: BODY_S },
      { at: [3, 8, 8, 12], nodes: [{ type: "bulletList", content: [
        { type: "listItem", content: [para("Set the measure before anything else.")] },
        { type: "listItem", content: [para("Let one accent carry the whole book.")] },
        { type: "listItem", content: [para("Give headings room to breathe.")] },
      ] }], style: BODY_S },
      { at: [8, 2, 11, 12], nodes: [callout("Key idea", "Design is not decoration — it is the order that makes the meaning obvious at a glance.")], style: {} },
      { at: [11, 2, 13, 12], nodes: [para("Carry these principles into the next chapter, where we put them to work on a real spread.")], style: BODY_S },
    ] },
  ],
};

const report: StructureSpec = {
  key: "report", name: "Report",
  pages: [
    { kind: "blocks", blocks: [
      kicker("Quarterly report", [3, 2, 4, 10]),
      { at: [4, 2, 8, 12], nodes: [heading("Report title goes here")], style: { ...TITLE, fontSize: 48, customCss: "border-top:3px solid var(--pc-accent);padding-top:14px" } },
      { at: [9, 2, 10, 9], nodes: [para("Prepared by · Date")], style: { fontSize: 14, textColor: MUTED, fontFamily: BODY } },
    ] },
    { kind: "toc" },
    { kind: "blocks", blocks: [
      kicker("Section 1", [4, 2, 5, 8]),
      { at: [5, 2, 8, 12], nodes: [heading("Section title")], style: TITLE },
      rule([8, 2, 9, 6]),
    ] },
    { kind: "blocks", blocks: [
      { at: [2, 2, 3, 9], nodes: [heading("Findings", 2)], style: H2 },
      stat("72%", "Adoption", [3, 2, 6, 6]),
      stat("3.4×", "Faster", [3, 6, 6, 9]),
      stat("1,200", "Responses", [3, 9, 6, 12]),
      { at: [6, 2, 9, 12], nodes: [callout("Key takeaway", "Adoption climbed while turnaround time fell — the two goals reinforced each other this quarter.")], style: {} },
      { at: [9, 2, 11, 9], nodes: [emptyP], style: { backgroundColor: SURFACE, customCss: `border:1px solid ${BORDER};border-radius:6px` } },
      { at: [9, 9, 11, 12], nodes: [para("Figure 1 — replace with your chart or table.")], style: { fontSize: 12, textColor: MUTED, fontFamily: BODY, customCss: "font-style:italic" } },
      { at: [11, 2, 13, 12], nodes: [para("Summarise the finding here — what the data shows and why it matters to the reader.")], style: BODY_S },
    ] },
  ],
};

export const STRUCTURES: Record<DocType, StructureSpec> = { leadMagnet, ebook, report };

// ---- catalog (Step 2) ---------------------------------------------------
// A user-facing template = one structure bound to one theme. The 15 are the
// cross-product themes × STRUCTURES — no per-template file. `themes` is passed in
// (the browser's themeNames() uses import.meta.glob, which can't run under tests),
// so this stays pure and node-testable.
const DOC_ORDER: DocType[] = ["leadMagnet", "ebook", "report"];
export const DOC_LABELS: Record<DocType, string> = { leadMagnet: "Lead magnets", ebook: "Ebooks", report: "Reports" };

export type Template = { id: string; name: string; docType: DocType; theme: string; structKey: DocType };

export function listTemplates(themes: string[]): Template[] {
  const out: Template[] = [];
  for (const theme of themes) {
    for (const key of DOC_ORDER) {
      out.push({ id: `${theme}:${key}`, name: STRUCTURES[key].name, docType: key, theme, structKey: key });
    }
  }
  return out;
}

// Resolve a catalog id back to the GridSections to insert (used by Step 3 apply).
export function templateSections(t: Template): GridSection[] {
  return interpret(STRUCTURES[t.structKey]);
}

// Applying a template to an IMPORTED doc keeps the content and adds front matter:
// this is the cover to prepend (a covers.ts front-cover id per docType). report's
// structure opens with a title page, not a cover, so it borrows the editorial cover.
export const IMPORT_COVER: Record<DocType, string> = { leadMagnet: "band", ebook: "rule", report: "rule" };

// Parse a catalog id (`${theme}:${structKey}`) back to a Template — the editor reads
// it from the ?tpl param after an imported doc loads. Theme may contain "-", so split
// on the LAST ":". Returns null for anything malformed.
export function parseTemplateId(id: string): Template | null {
  const i = id.lastIndexOf(":");
  if (i < 0) return null;
  const theme = id.slice(0, i);
  const key = id.slice(i + 1) as DocType;
  if (!theme || !DOC_ORDER.includes(key)) return null;
  return { id, name: STRUCTURES[key].name, docType: key, theme, structKey: key };
}

// Guard used by templates.test.ts: every placed block must fit the 12×12 grid.
export function assertAreasValid(): void {
  for (const spec of Object.values(STRUCTURES)) {
    for (const s of interpret(spec)) {
      for (const b of s.blocks) {
        const { rowStart, colStart, rowEnd, colEnd } = b.area;
        const ok = rowStart >= 1 && colStart >= 1 && rowEnd <= ROWS + 1 && colEnd <= COLS + 1 && rowStart < rowEnd && colStart < colEnd;
        if (!ok) throw new Error(`${spec.key}: bad area ${JSON.stringify(b.area)}`);
      }
    }
  }
}
