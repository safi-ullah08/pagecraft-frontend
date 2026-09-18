import type { JSONContent } from "@tiptap/react";
import type { LayoutSpec, LayoutPage, LayoutBlock, LayoutPlan } from "@pagecraft/model";
import { ROWS, COLS, type BlockStyleTokens, type GridBlock, type GridSection } from "./types.ts";
import { buildCover } from "./covers.ts";
import { buildTocSection } from "./toc.ts";
import { assetsToDisplay, assetUrl } from "../assets.ts";
import type { SourceMeta, StoredDocPlan } from "../api.ts";
import {
  doc, heading, para, emptyP, BG, INK, ACCENT, ON_ACCENT, DISPLAY, BODY, UPPER,
  MUTED, SURFACE, BORDER, pq, callout, aside, KICKER, TITLE, H2, BODY_S, DROPCAP,
  kicker, img, panel, ol, rule, stat, HAIR_ON_ACCENT, HAIR_ACCENT,
  type BlockSpec, type PageSpec, type DocType, type StructKey, type StructureSpec,
} from "./spec.ts";
import { CANVA_STRUCTURES } from "./canvaStructures.ts";

export type { BlockSpec, PageSpec, DocType, StructKey, StructureSpec } from "./spec.ts";

// Document STRUCTURES — "what shows up where". A structure is DATA: an ordered list
// of page specs. `interpret()` turns it into GridSections the store inserts, exactly
// like covers/TOC. Blocks reference the theme's --pc-* tokens (via the constants
// in spec.ts), so ONE structure renders under any theme — that's how structures ×
// themes = the catalog without per-template CSS (see TEMPLATES-PLAN.md, v2 Step 1).
// The types + authoring helpers live in spec.ts; the Canva matched designs live in
// canvaStructures.ts (each locked to its own skin, outside the cross-product).
//
// Kept as data (not builder functions) so the future template builder can edit a
// structure without running code. Copy of covers.ts's block idiom on purpose —
// keeps covers.ts untouched.
// ponytail: placeholder copy. Merge fields / real starter text are the deferred half.

const rid = () => Math.random().toString(36).slice(2, 10);

// ---- interpreter --------------------------------------------------------
export function interpret(spec: StructureSpec): GridSection[] {
  return spec.pages.map(toSection);
}
function toSection(p: PageSpec): GridSection {
  if (p.kind === "cover") return buildCover(p.cover);
  if (p.kind === "toc") return buildTocSection([]); // default contents page; regenerate for real page numbers
  const sec: GridSection & { cover?: true; toc?: true } = { type: "grid", blocks: p.blocks.map(toBlock) };
  if (p.cover) sec.cover = true;
  if (p.blocks.some((b) => b.slot === "toc")) sec.toc = true; // a bespoke contents page IS the toc section
  if (p.background) sec.background = p.background;
  return sec;
}
function toBlock(b: BlockSpec, i: number): GridBlock {
  const [rowStart, colStart, rowEnd, colEnd] = b.at;
  const base = { id: rid(), area: { rowStart, colStart, rowEnd, colEnd }, zIndex: b.z ?? i, ...(b.style ? { style: b.style } : {}) };
  if (b.slot === "toc") {
    return { ...base, block: "tocList", content: { entries: [], leader: "dots", showNumbers: true, maxLevel: 3, ...(b.props ?? {}) } };
  }
  return {
    ...base,
    block: b.image ? "image" : "textFrame",
    content: b.image ? { src: "", alt: "" } : doc(b.nodes ?? [emptyP]),
  };
}

// ---- the 3 structures ---------------------------------------------------
const leadMagnet: StructureSpec = {
  key: "leadMagnet", docType: "leadMagnet", name: "Lead magnet",
  pages: [
    { kind: "cover", cover: "band" },
    { kind: "blocks", role: "flow", blocks: [
      { ...kicker("The guide", [2, 2, 3, 8]), furniture: true },
      { at: [3, 2, 5, 12], nodes: [heading("What you'll learn")], style: TITLE },
      { at: [5, 2, 9, 8], slot: "body", nodes: [
        para("This short guide walks you through a simple, repeatable process you can put to work today — no fluff, just the moves that matter."),
        para("By the end you'll have a one-page checklist you can reuse on every project."),
      ], style: DROPCAP },
      { at: [5, 8, 9, 12], nodes: [callout("Inside", "A step-by-step process, the three common pitfalls, and a one-page checklist.")], style: {} },
      stat("3", "Simple steps", [9, 2, 12, 5]),
      stat("10m", "To first result", [9, 5, 12, 9]),
      stat("1", "Handy checklist", [9, 9, 12, 12]),
    ] },
    { kind: "blocks", background: { kind: "solid", color: ACCENT }, blocks: [
      { at: [3, 2, 4, 11], furniture: true, nodes: [para("Ready when you are")], style: { ...KICKER, textAlign: "center", textColor: ON_ACCENT } },
      { at: [4, 2, 7, 12], furniture: true, nodes: [heading("Start today")], style: { ...TITLE, textAlign: "center", textColor: ON_ACCENT } },
      { at: [7, 3, 9, 11], furniture: true, nodes: [para("Grab the full toolkit and take the first step in the next ten minutes.")], style: { textAlign: "center", fontSize: 17, textColor: ON_ACCENT, fontFamily: BODY } },
      { at: [9, 5, 10, 9], furniture: true, nodes: [para("yourname.com/start")], style: { textAlign: "center", fontSize: 14, fontWeight: 700, textColor: ON_ACCENT, fontFamily: BODY, customCss: "border:2px solid var(--pc-on-accent);border-radius:999px;padding:9px 4px" } },
    ] },
  ],
};

// Running head for ebook body pages — small uppercase muted tag on a hairline rule.
const runHead = (text: string): BlockSpec => ({ at: [1, 2, 2, 12], nodes: [para(text)],
  style: { fontSize: 10, letterSpacing: 0.14, textColor: MUTED, fontFamily: BODY, customCss: `text-transform:uppercase;border-bottom:1px solid ${BORDER};padding-bottom:7px` } });

const ebook: StructureSpec = {
  key: "ebook", docType: "ebook", name: "Ebook",
  pages: [
    // 1 — hand-crafted editorial cover (unnumbered, not in contents)
    { kind: "blocks", cover: true, background: { kind: "solid", color: BG }, blocks: [
      { at: [2, 2, 3, 9], nodes: [para("The complete guide")], style: { ...KICKER, fontSize: 12, letterSpacing: 0.22 } },
      { at: [3, 2, 4, 3], nodes: [emptyP], style: { customCss: "width:56px;height:3px;background:var(--pc-accent)" } },
      { at: [5, 2, 9, 11], slot: "title", fallback: "empty", nodes: [heading("Designing Beautiful Ebooks")], style: { fontFamily: DISPLAY, fontWeight: 700, fontSize: 56, textColor: INK, customCss: "line-height:1.05" } },
      { at: [9, 2, 10, 10], slot: "subtitle", fallback: "empty", nodes: [para("A practical guide to type, layout and rhythm on the page.")], style: { fontSize: 17, textColor: MUTED, fontFamily: BODY, customCss: "font-style:italic" } },
      { at: [11, 2, 12, 8], slot: "author", fallback: "empty", nodes: [para("By Author Name")], style: { ...KICKER, textColor: INK, letterSpacing: 0.12 } },
    ] },
    // 2 — epigraph: centred, airy
    { kind: "blocks", blocks: [
      { at: [5, 3, 8, 11], nodes: [para("“Good design is as little design as possible.”")], style: { textAlign: "center", fontSize: 26, textColor: INK, fontFamily: DISPLAY, customCss: "font-style:italic;line-height:1.4" } },
      { at: [8, 4, 9, 10], nodes: [para("— Dieter Rams")], style: { textAlign: "center", fontSize: 14, textColor: MUTED, fontFamily: BODY, customCss: "letter-spacing:.04em" } },
    ] },
    // 3 — contents
    { kind: "toc" },
    // 4 — chapter opener (perChapter): oversized accent numeral
    { kind: "blocks", role: "perChapter", blocks: [
      { at: [2, 2, 6, 7], slot: "chapterNumber", nodes: [para("1")], style: { fontFamily: DISPLAY, fontWeight: 700, fontSize: 150, textColor: ACCENT, customCss: "line-height:.8" } },
      { at: [6, 2, 7, 9], slot: "kicker", nodes: [para("Chapter one")], style: { ...KICKER, letterSpacing: 0.2 } },
      { at: [7, 2, 10, 11], slot: "chapterTitle", nodes: [heading("Where good books begin")], style: { ...TITLE, fontSize: 46, customCss: "line-height:1.1" } },
      rule([10, 2, 11, 5]),
      { at: [11, 2, 12, 10], nodes: [para("A one-line promise of what this chapter delivers to the reader.")], style: { fontSize: 16, textColor: MUTED, fontFamily: BODY, customCss: "font-style:italic" } },
    ] },
    // 5 — body (flow): drop-cap column; right rail placeholders are preview-only
    // (quote/aside hints land with the engine's opportunistic slots — revisit).
    { kind: "blocks", role: "flow", blocks: [
      { ...runHead("Chapter one · Where good books begin"), slot: "kicker" },
      { at: [2, 2, 12, 8], slot: "body", nodes: [
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
  key: "report", docType: "report", name: "Report",
  pages: [
    { kind: "blocks", blocks: [
      { ...kicker("Quarterly report", [3, 2, 4, 10]), furniture: true },
      { at: [4, 2, 8, 12], slot: "title", fallback: "empty", nodes: [heading("Report title goes here")], style: { ...TITLE, fontSize: 48, customCss: "border-top:3px solid var(--pc-accent);padding-top:14px" } },
      { at: [9, 2, 10, 9], slot: "author", fallback: "empty", nodes: [para("Prepared by · Date")], style: { fontSize: 14, textColor: MUTED, fontFamily: BODY } },
    ] },
    { kind: "toc" },
    { kind: "blocks", role: "perChapter", blocks: [
      { ...kicker("Section 1", [4, 2, 5, 8]), slot: "kicker", props: { prefix: "Section" } },
      { at: [5, 2, 8, 12], slot: "chapterTitle", nodes: [heading("Section title")], style: TITLE },
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

// ---- Guidebook — page-for-page from the "Entrepreneur" ebook design (Canva
// DAHQxublRs4 pp. 2–13): accent cover with inset light panel, welcome/colophon,
// contents, banner chapter opener, two-column body, numbered-list panel,
// thank-you and back cover. Locked to its source skin (indigo-press) as one of
// the isolated Canva templates. Placeholder copy — the user types over it.
const guidebook: StructureSpec = {
  key: "guidebook", docType: "ebook", name: "Entrepreneur guidebook", lockedTheme: "indigo-press",
  pages: [
    // 1 — cover: full-bleed accent, inset panel, serif title, author strip.
    // Meta slots (fallback keep): an applied template binds the imported doc's
    // title/subtitle/author here; the placeholder text survives otherwise.
    { kind: "blocks", cover: true, background: { kind: "solid", color: ACCENT }, blocks: [
      panel([2, 2, 9, 12], BG),
      { at: [3, 3, 7, 11], slot: "title", fallback: "empty", nodes: [heading("How to Become an Entrepreneur")], style: { textAlign: "center", fontSize: 40, fontWeight: 700, textColor: ACCENT, fontFamily: DISPLAY, customCss: "line-height:1.15" } },
      { at: [7, 3, 8, 11], slot: "subtitle", fallback: "empty", nodes: [para("A step-by-step guide to level up your skills")], style: { textAlign: "center", fontSize: 15, textColor: ACCENT, fontFamily: BODY } },
      { at: [10, 3, 11, 11], nodes: [emptyP], style: HAIR_ON_ACCENT },
      { at: [11, 3, 13, 11], slot: "author", fallback: "empty", nodes: [para("By An Author"), para("CEO · Entrepreneur")], style: { textAlign: "center", textColor: ON_ACCENT, fontFamily: BODY, fontSize: 13, customCss:
        "p:first-child{font-family:var(--pc-display);font-weight:700;letter-spacing:.12em;text-transform:uppercase}" +
        "p:last-child{letter-spacing:.1em;text-transform:uppercase;font-size:12px;margin-top:5px}" } },
    ] },
    // 2 — welcome / colophon: lavender panel, accent corner square, photo slot
    { kind: "blocks", blocks: [
      panel([1, 11, 2, 12], ACCENT),
      panel([2, 1, 10, 9], SURFACE),
      { at: [4, 2, 6, 8], furniture: true, nodes: [para("Hello and welcome!")], style: { fontSize: 32, fontWeight: 700, textColor: ACCENT, fontFamily: DISPLAY } },
      { at: [6, 2, 9, 8], nodes: [para("Title of the book"), para("Author name"), para("Edition / Year"), para("All rights reserved")], style: { fontSize: 13, textColor: INK, fontFamily: BODY, customCss: "p:first-child{font-weight:700}p+p{margin-top:5px}" } },
      { ...img([7, 8, 11, 12]), slot: "hero", fallback: "empty" }, // the imported doc's cover image

      { at: [12, 2, 13, 12], nodes: [emptyP], style: HAIR_ACCENT },
    ] },
    // 3 — contents: lavender band, serif title, dotted leaders (source design).
    // A slot:"toc" page — the store fills entries; the design survives refreshes.
    { kind: "blocks", blocks: [
      panel([1, 1, 4, 13], SURFACE),
      { at: [2, 2, 3, 8], furniture: true, nodes: [para("What's inside")], style: KICKER },
      { at: [3, 2, 5, 10], furniture: true, nodes: [heading("Contents")], style: { fontSize: 32, fontWeight: 700, textColor: ACCENT, fontFamily: DISPLAY } },
      { at: [5, 2, 12, 12], slot: "toc" },
      { at: [12, 2, 13, 12], nodes: [emptyP], style: HAIR_ACCENT },
    ] },
    // 4 — chapter opener (perChapter): accent banner, photo column + intro.
    // The engine binds kicker/title per chapter, pulls the chapter's first image
    // into the photo slot, and pours its opening paragraphs into the intro.
    { kind: "blocks", role: "perChapter", blocks: [
      panel([1, 1, 5, 13], ACCENT),
      { at: [2, 2, 3, 8], slot: "kicker", nodes: [para("Chapter 01")], style: { ...KICKER, textColor: ON_ACCENT, letterSpacing: 0.2 } },
      { at: [3, 2, 5, 12], slot: "chapterTitle", nodes: [heading("Introduction")], style: { fontSize: 32, fontWeight: 700, textColor: ON_ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.08em" } },
      { ...img([5, 2, 12, 5]), slot: "image", fallback: "empty" },
      { at: [5, 5, 13, 12], slot: "intro", nodes: [
        para("Open the chapter with the idea the reader came for. Keep the first paragraph short — it sets the pace for everything that follows."),
        para("Then widen out: give the background, the stakes, and the one thing the reader should hold onto as they move through the pages ahead."),
        para("Close the opener by pointing at what comes next, so turning the page feels like the obvious move."),
      ], style: BODY_S },
    ] },
    // 5 — body (flow, repeats while the chapter has content): two columns,
    // hairline foot rule on every spread.
    { kind: "blocks", role: "flow", blocks: [
      { at: [1, 2, 12, 7], slot: "body", nodes: [
        heading("Introduce the next section with a subheading", 3),
        para("Body copy flows down the left column first. Keep paragraphs short — three to five lines reads best at this measure."),
        para("Use the second paragraph to develop the point, and save examples for the facing column so the spread stays balanced."),
      ], style: BODY_S },
      { at: [1, 7, 12, 12], slot: "body", nodes: [
        para("The right column continues the thought. A reader should be able to skim the subheads alone and still follow the argument."),
        para("When a section ends mid-page, let the white space stand — the rule at the foot of the page closes the spread."),
      ], style: BODY_S },
      { at: [12, 2, 13, 12], nodes: [emptyP], style: HAIR_ACCENT, z: 20 },
    ] },
    // 6 — numbered list on a lavender panel, landscape photo below
    { kind: "blocks", blocks: [
      panel([1, 1, 9, 13], SURFACE),
      { at: [2, 2, 3, 11], nodes: [heading("Subheadings break the monotony of long articles", 3)] },
      { at: [3, 2, 9, 12], nodes: [ol(
        "Lead with the step itself — one sentence of instruction the reader can act on immediately.",
        "Follow with the why: a line or two on what this step unlocks and the mistake it prevents.",
        "End each item with the checkpoint — how the reader knows it worked before moving on.",
      )], style: { ...BODY_S, customCss: "line-height:1.7;ol{margin:0;padding-left:1.6em}li{margin-bottom:14px;padding-left:.4em}li::marker{font-family:var(--pc-display);font-size:1.35em;color:var(--pc-accent)}" } },
      img([10, 2, 12, 12]),
    ] },
    // 7 — thank you: italic serif accent title, body left, photo right
    { kind: "blocks", blocks: [
      { at: [1, 2, 3, 8], furniture: true, nodes: [para("Thank you!")], style: { fontSize: 36, fontWeight: 700, textColor: ACCENT, fontFamily: DISPLAY, customCss: "font-style:italic" } },
      { at: [3, 2, 11, 7], nodes: [
        para("Sign off in your own voice. Thank the reader for their time, and tell them the one thing to do next — visit a site, try the first step, reply with a question."),
        para("A short closing note beats a long one; this page is a handshake, not another chapter."),
      ], style: BODY_S },
      img([3, 7, 9, 12]),
      { at: [12, 2, 13, 12], nodes: [emptyP], style: HAIR_ACCENT },
    ] },
    // 8 — back cover: accent page, centred blurb, colophon strip
    { kind: "blocks", cover: true, background: { kind: "solid", color: ACCENT }, blocks: [
      { at: [4, 3, 8, 11], nodes: [para("“This book is for anyone who's ever thought ‘I should start something' and didn't know where to begin.”")], style: { textAlign: "center", fontSize: 17, textColor: ON_ACCENT, fontFamily: BODY, customCss: "line-height:1.75" } },
      { at: [8, 4, 9, 10], nodes: [para("Author name")], style: { textAlign: "center", fontSize: 14, textColor: ON_ACCENT, fontFamily: BODY } },
      { at: [10, 3, 11, 11], nodes: [emptyP], style: HAIR_ON_ACCENT },
      { at: [11, 3, 12, 11], nodes: [para("Issue date"), para("All rights reserved")], style: { textAlign: "center", textColor: ON_ACCENT, fontFamily: BODY, fontSize: 11, customCss: "text-transform:uppercase;letter-spacing:.16em;p+p{margin-top:5px}" } },
    ] },
  ],
};

// ---- Wellness — page-for-page from the "Health" ebook design (Canva
// DAHQxublRs4 pp. 14–23): photo cover under a huge display title, contents,
// highlight-block chapter openers with a corner-tab page number, two-column
// body with photo slots, quadrant framework, glossary, photo back cover.
// Locked to its source skin (fresh-lime) as one of the isolated Canva templates.
const HIGHLIGHT = "color-mix(in srgb, var(--pc-accent) 30%, var(--pc-bg))";
const QUAD_LABEL: BlockStyleTokens = { fontSize: 11, fontWeight: 700, textAlign: "center", textColor: INK, fontFamily: BODY, customCss: `${UPPER};letter-spacing:.14em;border:1px solid ${BORDER};padding-top:10px` };

const wellness: StructureSpec = {
  key: "wellness", docType: "ebook", name: "Wellness ebook", lockedTheme: "fresh-lime",
  // The source pages carry their number in an accent corner tab, top-right.
  pageNumbers: { enabled: true, position: "top-right", format: "0{n}", startAt: 1, fontSize: 11,
    css: "background:var(--pc-accent);color:var(--pc-on-accent);padding:5px 10px;font-weight:800;letter-spacing:.08em" },
  pages: [
    // 1 — cover: display title over a photo, letterspaced strapline + author.
    // Meta slots (fallback keep) bind the imported doc's title/subtitle/author/hero.
    { kind: "blocks", cover: true, background: { kind: "solid", color: BG }, blocks: [
      { at: [1, 3, 2, 11], furniture: true, nodes: [para("Let's talk about")], style: { textAlign: "center", fontSize: 21, fontWeight: 800, textColor: ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.04em" } },
      { at: [2, 2, 4, 12], slot: "title", fallback: "empty", nodes: [para("Health")], style: { textAlign: "center", fontSize: 72, fontWeight: 800, textColor: ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";line-height:1" } },
      { at: [4, 2, 5, 12], slot: "subtitle", fallback: "empty", nodes: [para("Benefits of exercise and a good lifestyle")], style: { textAlign: "center", fontSize: 13, fontWeight: 700, textColor: INK, fontFamily: BODY, customCss: UPPER + ";letter-spacing:.2em;border-top:1px solid var(--pc-accent);padding-top:12px" } },
      { ...img([5, 2, 11, 12]), slot: "hero", fallback: "empty" },
      { at: [11, 3, 12, 11], slot: "author", fallback: "empty", nodes: [para("Author Name")], style: { textAlign: "center", fontSize: 13, fontWeight: 700, textColor: INK, fontFamily: BODY, customCss: UPPER + ";letter-spacing:.18em" } },
    ] },
    // 2 — contents: highlight block behind a big display title, letterspaced
    // list (the fresh-lime skin kills the leaders — source design).
    { kind: "blocks", blocks: [
      panel([1, 1, 2, 3], HIGHLIGHT),
      { at: [1, 2, 3, 11], furniture: true, nodes: [para("Contents")], style: { fontSize: 40, fontWeight: 800, textColor: ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";line-height:1" } },
      { at: [4, 3, 12, 11], slot: "toc" },
    ] },
    // 3 — chapter opener (perChapter): highlight block behind a big display
    // title; the chapter's opening paragraphs pour into the intro.
    { kind: "blocks", role: "perChapter", blocks: [
      panel([1, 1, 2, 4], HIGHLIGHT),
      { at: [1, 2, 3, 12], slot: "chapterTitle", nodes: [heading("Introduction")] },
      { at: [3, 2, 13, 12], slot: "intro", nodes: [
        para("Open with the promise: what changes for the reader by the end of this book. One paragraph, plain words."),
        para("Then set the terms. Define the two or three ideas the chapters keep coming back to, so nothing later needs a detour."),
        para("Keep sentences short and the tone direct — this design pairs bold headings with calm, generous body text."),
        para("End the introduction with a bridge into chapter one: the first question the reader wants answered."),
      ], style: BODY_S },
    ] },
    // 4 — body (flow): two columns, photo slot bottom-right. Cycles with page 5.
    { kind: "blocks", role: "flow", blocks: [
      { at: [1, 2, 13, 7], slot: "body", nodes: [
        heading("A short subheading focuses the reader's attention", 3),
        para("Body copy flows down the left column. Keep paragraphs to a few lines each; the airy leading is part of the look."),
        para("Use the left column for the argument and the right for support — examples, numbers, a photo."),
      ], style: BODY_S },
      { at: [1, 7, 7, 12], slot: "body", nodes: [
        para("The right column carries the supporting material. A reader skimming only this column should still catch the gist."),
      ], style: BODY_S },
      img([7, 7, 13, 12]),
    ] },
    // 5 — body variant (flow): full-width text over two photo slots. The engine
    // alternates pages 4 and 5 while a chapter has content — the source
    // booklet's rhythm.
    { kind: "blocks", role: "flow", blocks: [
      { at: [1, 2, 9, 12], slot: "body", nodes: [
        heading("A short subheading introduces the chapter", 3),
        para("Chapters in this design open full-width, then break into imagery. State the chapter's single idea in the first paragraph."),
        para("Develop it in two or three more, and let the photographs below carry the mood — captions are optional."),
      ], style: BODY_S },
      img([9, 2, 12, 7]),
      img([9, 7, 12, 12]),
    ] },
    // 6 — framework: intro + labelled quadrant grid (the source's values/vision page)
    { kind: "blocks", blocks: [
      { at: [1, 2, 4, 12], nodes: [
        para("Use this page for a simple framework. Introduce it in a short paragraph, then let the reader fill the four quadrants — in print, with a pen."),
      ], style: BODY_S },
      { at: [4, 2, 8, 7], furniture: true, nodes: [para("Values")], style: QUAD_LABEL },
      { at: [4, 7, 8, 12], furniture: true, nodes: [para("Vision")], style: QUAD_LABEL },
      { at: [8, 2, 12, 7], furniture: true, nodes: [para("Unique qualities")], style: QUAD_LABEL },
      { at: [8, 7, 12, 12], furniture: true, nodes: [para("Consistent messages")], style: QUAD_LABEL },
    ] },
    // 7 — glossary: highlight block behind the title, two columns of terms
    { kind: "blocks", blocks: [
      panel([1, 1, 2, 3], HIGHLIGHT),
      { at: [1, 2, 3, 10], furniture: true, nodes: [para("Glossary")], style: { fontSize: 40, fontWeight: 800, textColor: ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";line-height:1" } },
      { at: [3, 2, 13, 7], nodes: [
        para("Term — a one-line definition in plain language, no circular references."),
        para("Term — keep entries alphabetical so the page works as a reference."),
      ], style: BODY_S },
      { at: [3, 7, 13, 12], nodes: [
        para("Term — the second column continues the list; aim for balance between the two."),
        para("Term — cut any entry the chapters already define in passing."),
      ], style: BODY_S },
    ] },
    // 8 — back cover: full-page photo, letterspaced strapline beneath
    { kind: "blocks", cover: true, background: { kind: "solid", color: BG }, blocks: [
      img([1, 2, 12, 12]),
      { at: [12, 2, 13, 12], nodes: [para("Simple habits. Lasting health")], style: { textAlign: "center", fontSize: 12, fontWeight: 700, textColor: ACCENT, fontFamily: BODY, customCss: UPPER + ";letter-spacing:.22em" } },
    ] },
  ],
};

export const STRUCTURES: Record<StructKey, StructureSpec> = { leadMagnet, ebook, report, guidebook, wellness, ...CANVA_STRUCTURES };

// ---- catalog (Step 2) ---------------------------------------------------
// A user-facing template = one structure bound to one theme. Two catalog kinds:
//  - OPEN structures cross-product with every non-Canva theme (no per-template file);
//  - LOCKED structures (the Canva matched designs) ship as exactly ONE card each,
//    bound to their lockedTheme, and their canva-* skins never enter the
//    cross-product. `themes` is passed in (the browser's themeNames() uses
//    import.meta.glob, which can't run under tests), so this stays pure.
const STRUCT_ORDER: StructKey[] = ["leadMagnet", "ebook", "report",
  "guidebook", "wellness", "mediaKit", "emailAutomation", "remoteReport", "mindful", "freelancer"];
export const DOC_LABELS: Record<DocType, string> = { leadMagnet: "Lead magnets", ebook: "Ebooks", report: "Reports" };
export const CANVA_LABEL = "Canva templates";
export const isLockedTemplate = (t: Template): boolean => !!STRUCTURES[t.structKey].lockedTheme;

export type Template = { id: string; name: string; docType: DocType; theme: string; structKey: StructKey };

export function listTemplates(themes: string[]): Template[] {
  const out: Template[] = [];
  for (const theme of themes.filter((t) => !t.startsWith("canva-"))) {
    for (const key of STRUCT_ORDER) {
      if (STRUCTURES[key].lockedTheme) continue;
      out.push({ id: `${theme}:${key}`, name: STRUCTURES[key].name, docType: STRUCTURES[key].docType, theme, structKey: key });
    }
  }
  for (const key of STRUCT_ORDER) {
    const theme = STRUCTURES[key].lockedTheme;
    if (theme) out.push({ id: `${theme}:${key}`, name: STRUCTURES[key].name, docType: STRUCTURES[key].docType, theme, structKey: key });
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
  const key = id.slice(i + 1) as StructKey;
  if (!theme || !STRUCT_ORDER.includes(key)) return null;
  return { id, name: STRUCTURES[key].name, docType: STRUCTURES[key].docType, theme, structKey: key };
}

// ---- engine adapter (Step: apply a template to an IMPORTED doc) -----------------
// StructureSpec → the model engine's LayoutSpec. THE PLACEHOLDER RULE: a
// template's own copy exists for preview only. On apply, slot blocks bind the
// document's data or go EMPTY, and literal text blocks are DROPPED unless
// tagged `furniture` (design lockups like a contents title or quadrant labels).
// Panels, rules, hairlines and empty image slots carry no text and survive.
const hasText = (nodes?: JSONContent[]): boolean => JSON.stringify(nodes ?? []).includes('"text"');

// Chapters for the engine: only h1 sections open chapters — an h2 section is a
// SUBSECTION and folds into its parent (its heading stays in the body flow, so
// the contents page still lists it). "Notes" and the lead-in ("front") stay apart:
// neither absorbs a subsection nor folds into anything.
export type EngineChapter = { title: string; level: number; nodes: JSONContent[]; role?: "notes" | "front" };
export function foldChapters(sections: EngineChapter[]): EngineChapter[] {
  const out: EngineChapter[] = [];
  for (const c of sections) {
    if (!c.role && c.level >= 2 && out.length && !out[out.length - 1]!.role) {
      out[out.length - 1]!.nodes.push(...c.nodes);
    } else {
      out.push({ ...c, nodes: [...c.nodes] });
    }
  }
  return out;
}

function specBlock(b: BlockSpec, i: number): LayoutBlock {
  const [rowStart, colStart, rowEnd, colEnd] = b.at;
  return {
    area: { rowStart, colStart, rowEnd, colEnd },
    ...(b.slot ? { slot: b.slot } : {}),
    ...(b.fallback ? { fallback: b.fallback } : {}),
    ...(b.props ? { props: b.props } : {}),
    ...(b.style ? { style: b.style } : {}),
    z: b.z ?? i,
    ...(b.image ? { block: "image", content: { src: "", alt: "" } } : { content: doc(b.nodes ?? [emptyP]) }),
  };
}

// A prebuilt GridSection (covers.ts / buildTocSection) as a literal LayoutPage.
// A tocList block converts back to a toc SLOT so the engine re-flags the section.
function sectionPage(sec: GridSection & { cover?: boolean; backCover?: boolean; toc?: boolean }): LayoutPage {
  return {
    ...(sec.cover ? { cover: true } : {}),
    ...(sec.backCover ? { backCover: true } : {}),
    ...(sec.background ? { background: sec.background } : {}),
    blocks: sec.blocks.map((b, i) =>
      b.block === "tocList"
        ? { area: b.area, slot: "toc" as const, z: b.zIndex ?? i }
        : { area: b.area, block: b.block, content: b.content, ...(b.style ? { style: b.style } : {}), z: b.zIndex ?? i },
    ),
  };
}

export function structureToLayoutSpec(spec: StructureSpec): LayoutSpec {
  const pages: LayoutPage[] = [];
  for (const p of spec.pages) {
    if (p.kind === "cover") { pages.push(sectionPage(buildCover(p.cover))); continue; }
    if (p.kind === "toc") { pages.push(sectionPage(buildTocSection([]))); continue; }
    // placeholder rule: literal prose is preview-only — dropped unless furniture
    const kept = p.blocks.filter((b) => b.slot || b.image || b.furniture || !hasText(b.nodes));
    if (!kept.length) continue; // a page of nothing but placeholder copy vanishes
    pages.push({
      ...(p.role ? { role: p.role } : {}),
      ...(p.background ? { background: p.background } : {}),
      ...(p.cover ? { cover: true } : {}),
      blocks: kept.map(specBlock),
    });
  }
  return { pages };
}

// A source document's own "Table of Contents" heading arrives as a chapter with no
// entries (a Word contents field doesn't convert). Laid out, it becomes a chapter
// divider with nothing after it, sitting straight against the next chapter's divider
// — and the template generates a real contents page anyway. Only an EMPTY contents
// chapter goes: one that carries text beyond its heading is left alone.
const CONTENTS_TITLE = /^\s*(table\s+of\s+)?contents\s*$/i;
function isEmptyContentsChapter(c: EngineChapter): boolean {
  if (c.role || !CONTENTS_TITLE.test(c.title)) return false;
  const body = c.nodes[0]?.type === "heading" ? c.nodes.slice(1) : c.nodes;
  return !hasText(body);
}

// Import puts everything before the document's first heading (a title block like
// "IRON HERO RUN / Game Design Document — v1.0") into a section it names "Introduction".
// That is not a chapter: laid out as one it took "Chapter 1" and pushed every real
// chapter down a number. Only the FIRST chapter can lack a leading heading, so that is
// the test — it also fixes documents imported before this rule existed.
function markLeadIn(chapters: EngineChapter[]): EngineChapter[] {
  const [first, ...rest] = chapters;
  if (!first || first.role || first.nodes[0]?.type === "heading") return chapters;
  return [{ ...first, role: "front" }, ...rest];
}

// Every chapter list bound for the engine goes through here: lead-in marked (before
// folding, so a subsection can't fold into it), h2s folded into their chapter, and the
// source's empty contents chapter dropped.
export function prepareChapters(chapters: EngineChapter[]): EngineChapter[] {
  return foldChapters(markLeadIn(chapters)).filter((c) => !isEmptyContentsChapter(c));
}

// A stored plan (+ its meta) → the engine's LayoutPlan: srcs in display form
// (browsers can't load asset://) and chapters prepared. Used by the apply path, the
// switch panel, and the gallery's real-content previews.
export function docPlanToLayout(stored: StoredDocPlan, meta: SourceMeta): LayoutPlan {
  return {
    meta: { ...meta, ...(meta.hero ? { hero: assetUrl(meta.hero) } : {}) },
    chapters: prepareChapters(stored.chapters.map((c) => ({
      title: c.title,
      level: c.level,
      nodes: (assetsToDisplay(c.body) as JSONContent).content ?? [],
      ...(c.role ? { role: c.role } : {}),
    }))),
  };
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
