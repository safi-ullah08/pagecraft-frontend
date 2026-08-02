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
  | { kind: "blocks"; background?: PageBackground; blocks: BlockSpec[] }
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
  return {
    type: "grid",
    ...(p.background ? { background: p.background } : {}),
    blocks: p.blocks.map(toBlock),
  };
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

const ebook: StructureSpec = {
  key: "ebook", name: "Ebook",
  pages: [
    { kind: "cover", cover: "rule" },
    { kind: "toc" },
    { kind: "blocks", blocks: [
      { at: [4, 2, 5, 12], nodes: [para("Chapter one")], style: { ...KICKER, textAlign: "center", letterSpacing: 0.2 } },
      { at: [5, 2, 8, 12], nodes: [heading("The title of your first chapter")], style: { ...TITLE, textAlign: "center", fontSize: 46 } },
      rule([8, 5, 9, 9]),
      { at: [9, 3, 11, 11], nodes: [para("A one-line promise of what this chapter delivers.")], style: { textAlign: "center", fontSize: 16, textColor: MUTED, fontFamily: BODY, customCss: "font-style:italic" } },
    ] },
    { kind: "blocks", blocks: [
      { at: [2, 2, 3, 9], nodes: [heading("Section heading", 2)], style: H2 },
      { at: [3, 2, 12, 8], nodes: [
        para("Start writing here. This opening paragraph inherits the theme's body font, measure and colour, so it always matches the cover — the drop cap gives it an editorial feel."),
        para("Add as many paragraphs as you need; the frame grows and breaks across pages."),
        para("A second idea develops the argument and keeps the rhythm going."),
      ], style: DROPCAP },
      { at: [3, 8, 7, 12], nodes: [pq("A short line worth pulling out and remembering.")], style: {} },
      { at: [7, 8, 11, 12], nodes: [aside("A margin note — a definition, a source, or a quick aside that supports the main text.")], style: {} },
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
