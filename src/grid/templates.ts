import type { JSONContent } from "@tiptap/react";
import type { PageNumberConfig } from "@pagecraft/model";
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

// A placed block: [rowStart, colStart, rowEnd, colEnd] on the 12×12 grid.
// `image: true` = an empty image slot (the editor shows a click-to-fill placeholder).
// `slot: "toc"` = a tocList the store fills with generated entries — the page keeps
// its authored design across refreshes (first slot kind; the engine adds more).
// `props` merges into a slot block's typed content (e.g. { leader: "rule" }).
type BlockSpec = { at: [number, number, number, number]; nodes?: JSONContent[]; style?: BlockStyleTokens; z?: number; image?: true; slot?: "toc"; props?: Record<string, unknown> };
type PageSpec =
  | { kind: "blocks"; background?: PageBackground; cover?: true; blocks: BlockSpec[] } // cover:true = hand-crafted cover, excluded from numbering/TOC
  | { kind: "cover"; cover: string }   // reuse a covers.ts front/back design
  | { kind: "toc" };                    // a "Contents" placeholder; user regenerates
export type DocType = "leadMagnet" | "ebook" | "report";
// Structures beyond the original three (one per docType) get their own key but
// still belong to a docType for gallery grouping + import covers.
export type StructKey = DocType | "guidebook" | "wellness";
export type StructureSpec = {
  key: StructKey; docType: DocType; name: string; pages: PageSpec[];
  pageNumbers?: PageNumberConfig; // set on the new doc when the structure wants a specific look (e.g. wellness's corner tab)
};

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
// An empty image slot the user fills with their own photo.
const img = (at: [number, number, number, number], z?: number): BlockSpec => ({ at, image: true, ...(z !== undefined ? { z } : {}) });
// A coloured background panel (z:0 so content stacks above it).
const panel = (at: [number, number, number, number], color: string): BlockSpec => ({ at, nodes: [emptyP], style: { backgroundColor: color }, z: 0 });
// A numbered list (the guidebook's 1/2/3 page).
const ol = (...items: string[]): JSONContent => ({ type: "orderedList", content: items.map((t) => ({ type: "listItem", content: [para(t)] })) });
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
  key: "leadMagnet", docType: "leadMagnet", name: "Lead magnet",
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
  key: "ebook", docType: "ebook", name: "Ebook",
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
  key: "report", docType: "report", name: "Report",
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

// ---- Guidebook — page-for-page from the "Entrepreneur" ebook design (Canva
// DAHQxublRs4 pp. 2–13): accent cover with inset light panel, welcome/colophon,
// contents, banner chapter opener, two-column body, numbered-list panel,
// thank-you and back cover. Pairs 1:1 with the indigo-press skin; renders under
// any theme via the --pc-* tokens. Placeholder copy — the user types over it.
const HAIR_ON_ACCENT: BlockStyleTokens = { customCss: "border-top:1px solid var(--pc-on-accent)" };
const HAIR_ACCENT: BlockStyleTokens = { customCss: "border-top:1px solid var(--pc-accent)" };

const guidebook: StructureSpec = {
  key: "guidebook", docType: "ebook", name: "Guidebook",
  pages: [
    // 1 — cover: full-bleed accent, inset panel, serif title, author strip
    { kind: "blocks", cover: true, background: { kind: "solid", color: ACCENT }, blocks: [
      panel([2, 2, 9, 12], BG),
      { at: [3, 3, 7, 11], nodes: [heading("How to Become an Entrepreneur")], style: { textAlign: "center", fontSize: 40, fontWeight: 700, textColor: ACCENT, fontFamily: DISPLAY, customCss: "line-height:1.15" } },
      { at: [7, 3, 8, 11], nodes: [para("A step-by-step guide to level up your skills")], style: { textAlign: "center", fontSize: 15, textColor: ACCENT, fontFamily: BODY } },
      { at: [10, 3, 11, 11], nodes: [emptyP], style: HAIR_ON_ACCENT },
      { at: [11, 3, 13, 11], nodes: [para("By An Author"), para("CEO · Entrepreneur")], style: { textAlign: "center", textColor: ON_ACCENT, fontFamily: BODY, fontSize: 13, customCss:
        "p:first-child{font-family:var(--pc-display);font-weight:700;letter-spacing:.12em;text-transform:uppercase}" +
        "p:last-child{letter-spacing:.1em;text-transform:uppercase;font-size:12px;margin-top:5px}" } },
    ] },
    // 2 — welcome / colophon: lavender panel, accent corner square, photo slot
    { kind: "blocks", blocks: [
      panel([1, 11, 2, 12], ACCENT),
      panel([2, 1, 10, 9], SURFACE),
      { at: [4, 2, 6, 8], nodes: [para("Hello and welcome!")], style: { fontSize: 32, fontWeight: 700, textColor: ACCENT, fontFamily: DISPLAY } },
      { at: [6, 2, 9, 8], nodes: [para("Title of the book"), para("Author name"), para("Edition / Year"), para("All rights reserved")], style: { fontSize: 13, textColor: INK, fontFamily: BODY, customCss: "p:first-child{font-weight:700}p+p{margin-top:5px}" } },
      img([7, 8, 11, 12]),
      { at: [12, 2, 13, 12], nodes: [emptyP], style: HAIR_ACCENT },
    ] },
    // 3 — contents: lavender band, serif title, dotted leaders (source design).
    // A slot:"toc" page — the store fills entries; the design survives refreshes.
    { kind: "blocks", blocks: [
      panel([1, 1, 4, 13], SURFACE),
      { at: [2, 2, 3, 8], nodes: [para("What's inside")], style: KICKER },
      { at: [3, 2, 5, 10], nodes: [heading("Contents")], style: { fontSize: 32, fontWeight: 700, textColor: ACCENT, fontFamily: DISPLAY } },
      { at: [5, 2, 12, 12], slot: "toc" },
      { at: [12, 2, 13, 12], nodes: [emptyP], style: HAIR_ACCENT },
    ] },
    // 4 — chapter opener: accent banner, subhead, photo column + body
    { kind: "blocks", blocks: [
      panel([1, 1, 5, 13], ACCENT),
      { at: [2, 2, 3, 8], nodes: [para("Chapter 01")], style: { ...KICKER, textColor: ON_ACCENT, letterSpacing: 0.2 } },
      { at: [3, 2, 5, 12], nodes: [heading("Introduction")], style: { fontSize: 32, fontWeight: 700, textColor: ON_ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.08em" } },
      { at: [5, 2, 6, 12], nodes: [heading("Introduce the next section with a subheading", 3)] },
      img([6, 2, 12, 5]),
      { at: [6, 5, 13, 12], nodes: [
        para("Open the chapter with the idea the reader came for. Keep the first paragraph short — it sets the pace for everything that follows."),
        para("Then widen out: give the background, the stakes, and the one thing the reader should hold onto as they move through the pages ahead."),
        para("Close the opener by pointing at what comes next, so turning the page feels like the obvious move."),
      ], style: BODY_S },
    ] },
    // 5 — body: two columns under an orange subhead, hairline foot rule
    { kind: "blocks", blocks: [
      { at: [1, 2, 3, 7], nodes: [heading("Introduce the next section with a subheading", 3)] },
      { at: [3, 2, 12, 7], nodes: [
        para("Body copy flows down the left column first. Keep paragraphs short — three to five lines reads best at this measure."),
        para("Use the second paragraph to develop the point, and save examples for the facing column so the spread stays balanced."),
      ], style: BODY_S },
      { at: [1, 7, 12, 12], nodes: [
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
      { at: [1, 2, 3, 8], nodes: [para("Thank you!")], style: { fontSize: 36, fontWeight: 700, textColor: ACCENT, fontFamily: DISPLAY, customCss: "font-style:italic" } },
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
// Pairs 1:1 with the fresh-lime skin; renders under any theme via tokens.
const HIGHLIGHT = "color-mix(in srgb, var(--pc-accent) 30%, var(--pc-bg))";
const QUAD_LABEL: BlockStyleTokens = { fontSize: 11, fontWeight: 700, textAlign: "center", textColor: INK, fontFamily: BODY, customCss: `${UPPER};letter-spacing:.14em;border:1px solid ${BORDER};padding-top:10px` };

const wellness: StructureSpec = {
  key: "wellness", docType: "ebook", name: "Wellness",
  // The source pages carry their number in an accent corner tab, top-right.
  pageNumbers: { enabled: true, position: "top-right", format: "0{n}", startAt: 1, fontSize: 11,
    css: "background:var(--pc-accent);color:var(--pc-on-accent);padding:5px 10px;font-weight:800;letter-spacing:.08em" },
  pages: [
    // 1 — cover: display title over a photo, letterspaced strapline + author
    { kind: "blocks", cover: true, background: { kind: "solid", color: BG }, blocks: [
      { at: [1, 3, 2, 11], nodes: [para("Let's talk about")], style: { textAlign: "center", fontSize: 21, fontWeight: 800, textColor: ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.04em" } },
      { at: [2, 2, 4, 12], nodes: [para("Health")], style: { textAlign: "center", fontSize: 72, fontWeight: 800, textColor: ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";line-height:1" } },
      { at: [4, 2, 5, 12], nodes: [para("Benefits of exercise and a good lifestyle")], style: { textAlign: "center", fontSize: 13, fontWeight: 700, textColor: INK, fontFamily: BODY, customCss: UPPER + ";letter-spacing:.2em;border-top:1px solid var(--pc-accent);padding-top:12px" } },
      img([5, 2, 11, 12]),
      { at: [11, 3, 12, 11], nodes: [para("Author Name")], style: { textAlign: "center", fontSize: 13, fontWeight: 700, textColor: INK, fontFamily: BODY, customCss: UPPER + ";letter-spacing:.18em" } },
    ] },
    // 2 — contents: highlight block behind a big display title, letterspaced
    // list (the fresh-lime skin kills the leaders — source design).
    { kind: "blocks", blocks: [
      panel([1, 1, 2, 3], HIGHLIGHT),
      { at: [1, 2, 3, 11], nodes: [para("Contents")], style: { fontSize: 40, fontWeight: 800, textColor: ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";line-height:1" } },
      { at: [4, 3, 12, 11], slot: "toc" },
    ] },
    // 3 — chapter opener: highlight block behind a big display title
    { kind: "blocks", blocks: [
      panel([1, 1, 2, 4], HIGHLIGHT),
      { at: [1, 2, 3, 12], nodes: [heading("Introduction")] },
      { at: [3, 2, 13, 12], nodes: [
        para("Open with the promise: what changes for the reader by the end of this book. One paragraph, plain words."),
        para("Then set the terms. Define the two or three ideas the chapters keep coming back to, so nothing later needs a detour."),
        para("Keep sentences short and the tone direct — this design pairs bold headings with calm, generous body text."),
        para("End the introduction with a bridge into chapter one: the first question the reader wants answered."),
      ], style: BODY_S },
    ] },
    // 4 — body: subhead, two columns, photo slot bottom-right
    { kind: "blocks", blocks: [
      { at: [1, 2, 2, 12], nodes: [heading("A short subheading focuses the reader's attention", 3)] },
      { at: [2, 2, 13, 7], nodes: [
        para("Body copy flows down the left column. Keep paragraphs to a few lines each; the airy leading is part of the look."),
        para("Use the left column for the argument and the right for support — examples, numbers, a photo."),
        para("When a point deserves emphasis, give it its own short paragraph rather than bold text."),
      ], style: BODY_S },
      { at: [2, 7, 7, 12], nodes: [
        para("The right column carries the supporting material. A reader skimming only this column should still catch the gist."),
      ], style: BODY_S },
      img([7, 7, 13, 12]),
    ] },
    // 5 — chapter opener variant: title, subhead, body, two photo slots
    { kind: "blocks", blocks: [
      { at: [1, 2, 3, 12], nodes: [heading("Chapter 2")] },
      { at: [3, 2, 4, 12], nodes: [heading("A short subheading introduces the chapter", 3)] },
      { at: [4, 2, 9, 12], nodes: [
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
      { at: [4, 2, 8, 7], nodes: [para("Values")], style: QUAD_LABEL },
      { at: [4, 7, 8, 12], nodes: [para("Vision")], style: QUAD_LABEL },
      { at: [8, 2, 12, 7], nodes: [para("Unique qualities")], style: QUAD_LABEL },
      { at: [8, 7, 12, 12], nodes: [para("Consistent messages")], style: QUAD_LABEL },
    ] },
    // 7 — glossary: highlight block behind the title, two columns of terms
    { kind: "blocks", blocks: [
      panel([1, 1, 2, 3], HIGHLIGHT),
      { at: [1, 2, 3, 10], nodes: [para("Glossary")], style: { fontSize: 40, fontWeight: 800, textColor: ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";line-height:1" } },
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

export const STRUCTURES: Record<StructKey, StructureSpec> = { leadMagnet, ebook, guidebook, wellness, report };

// ---- catalog (Step 2) ---------------------------------------------------
// A user-facing template = one structure bound to one theme. The 15 are the
// cross-product themes × STRUCTURES — no per-template file. `themes` is passed in
// (the browser's themeNames() uses import.meta.glob, which can't run under tests),
// so this stays pure and node-testable.
const STRUCT_ORDER: StructKey[] = ["leadMagnet", "ebook", "guidebook", "wellness", "report"];
export const DOC_LABELS: Record<DocType, string> = { leadMagnet: "Lead magnets", ebook: "Ebooks", report: "Reports" };

export type Template = { id: string; name: string; docType: DocType; theme: string; structKey: StructKey };

export function listTemplates(themes: string[]): Template[] {
  const out: Template[] = [];
  for (const theme of themes) {
    for (const key of STRUCT_ORDER) {
      out.push({ id: `${theme}:${key}`, name: STRUCTURES[key].name, docType: STRUCTURES[key].docType, theme, structKey: key });
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
  const key = id.slice(i + 1) as StructKey;
  if (!theme || !STRUCT_ORDER.includes(key)) return null;
  return { id, name: STRUCTURES[key].name, docType: STRUCTURES[key].docType, theme, structKey: key };
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
