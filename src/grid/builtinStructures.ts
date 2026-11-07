// The BUILT-IN structures — the authoring source for the system rows in the
// backend's `templates` table. All seven are matched designs transcribed from
// Canva design DAHQxublRs4 and LOCKED to their own skin, so each ships as one
// catalog card; the gallery groups them under one heading. The three generic
// structures that used to multiply across every theme (leadMagnet / ebook /
// report) were removed on 2026-11-07 — see listTemplates, whose cross-product
// loop now has nothing unlocked to pair with a theme. Nothing at runtime imports this file: the app
// loads its catalog from GET /api/templates (see catalog.ts). To change a
// built-in template, edit it here (or in canvaStructures.ts), then re-export the
// seed and re-seed the backend:
//   cd pageCraft-backend && npm run catalog:export && npm run db:seed
import type { BlockStyleTokens } from "./types.ts";
import {
  heading, para, emptyP, BG, INK, ACCENT, ON_ACCENT, DISPLAY, BODY, UPPER, SURFACE, BORDER, KICKER, BODY_S, kicker, img, panel, ol, rule, HAIR_ON_ACCENT, HAIR_ACCENT, type StructureSpec, hInherit,
} from "./spec.ts";
import { CANVA_STRUCTURES } from "./canvaStructures.ts";
import { PAGE_SIZES } from "../pages.ts";

// ---- Guidebook — page-for-page from the "Entrepreneur" ebook design (Canva
// DAHQxublRs4 pp. 2–13): accent cover with inset light panel, welcome/colophon,
// contents, banner chapter opener, two-column body, numbered-list panel,
// thank-you and back cover. Locked to its source skin (indigo-press) as one of
// the isolated Canva templates. Placeholder copy — the user types over it.
// The source uses two blues — a greyer navy for the full-page cover fields and a
// brighter one for bands, titles and rules — plus a gold corner square. The skin
// owns the values; the fallbacks keep the page sane if a guidebook document is
// switched to a theme that only declares the D7 accent.
const FIELD = "var(--pc-field, var(--pc-accent))";
const GOLD = "var(--pc-gold, var(--pc-accent))";

const guidebook: StructureSpec = {
  key: "guidebook", docType: "ebook", name: "Entrepreneur guidebook", lockedTheme: "indigo-press",
  // The source pages are 1545x1999 px — US Letter, not A4.
  page: PAGE_SIZES.Letter,
  pages: [
    // 1 — cover: full-bleed accent, inset panel, serif title, author strip.
    // Meta slots (fallback keep): an applied template binds the imported doc's
    // title/subtitle/author here; the placeholder text survives otherwise.
    { kind: "blocks", cover: true, background: { kind: "solid", color: FIELD }, blocks: [
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
      panel([1, 11, 2, 12], GOLD),
      panel([2, 1, 10, 9], SURFACE),
      { at: [4, 2, 6, 8], furniture: true, nodes: [para("Hello and welcome!")], style: { fontSize: 32, fontWeight: 700, textColor: ACCENT, fontFamily: DISPLAY } },
      { at: [6, 2, 9, 8], nodes: [para("Title of the book"), para("Author name"), para("Edition / Year"), para("All rights reserved")], style: { fontSize: 13, textColor: INK, fontFamily: BODY, customCss: "p:first-child{font-weight:700}p+p{margin-top:5px}" } },
      { ...img([7, 8, 11, 12]), slot: "hero", fallback: "empty" }, // the imported doc's cover image

      { at: [12, 2, 13, 12], nodes: [emptyP], style: HAIR_ACCENT },
    ] },
    // 3 — contents: navy band, white sans title, then the skin's two-level
    // contents design (numbered chapters over dotted-leader sub-entries).
    // A slot:"toc" page — the store fills entries; the design survives refreshes.
    // The region starts directly under the band because the source fits five
    // chapter groups on the page and a row of kicker would cost one of them.
    // ponytail: the source's own title reads "Table of content"; shipping the
    // typo into every document it makes is a worse bargain than the fidelity.
    { kind: "blocks", blocks: [
      panel([1, 1, 4, 13], ACCENT),
      { at: [2, 2, 3, 12], furniture: true, nodes: [para("Table of contents")], style: { fontSize: 28, fontWeight: 700, textColor: ON_ACCENT, fontFamily: BODY } },
      { at: [4, 2, 12, 12], slot: "toc" },
      { at: [12, 2, 13, 12], nodes: [emptyP], style: HAIR_ACCENT },
    ] },
    // 4 — chapter opener (perChapter): accent banner, photo column + intro.
    // The engine binds kicker/title per chapter, pulls the chapter's first image
    // into the photo slot, and pours its opening paragraphs into the intro.
    { kind: "blocks", role: "perChapter", blocks: [
      panel([1, 1, 5, 13], ACCENT),
      { at: [2, 2, 3, 8], slot: "kicker", nodes: [para("Chapter 01")], style: { ...KICKER, textColor: ON_ACCENT, letterSpacing: 0.2 } },
      // h1 override: the skin colours every heading, which beats the container's
      // textColor — without it the title is navy ON the navy band (see the
      // freelancer opener, which already carries the same line).
      { at: [3, 2, 5, 12], slot: "chapterTitle", nodes: [heading("Introduction")], style: { fontSize: 32, fontWeight: 700, textColor: ON_ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.08em;" + hInherit("color") } },
      { ...img([5, 2, 12, 5]), slot: "image", fallback: "empty" },
      { at: [5, 5, 13, 12], slot: "intro", nodes: [
        heading("Open with a subheading", 3), // the skin's h3 IS the source's burnt-orange subhead
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
    // 5b — body with an illustration (flow, alternates with 5): the same left
    // column, the right one shortened to give its lower half to a portrait
    // image. The source alternates a plain spread with an illustrated one, so
    // the two flow pages cycle. No fallback: a document with no pictures leaves
    // the corner empty rather than printing a box nothing will ever fill.
    { kind: "blocks", role: "flow", blocks: [
      { at: [1, 2, 12, 7], slot: "body", nodes: [
        heading("The illustrated spread", 3),
        para("The left column reads exactly as it does on the plain spread — the alternation is in the right-hand column, not here."),
        para("Keeping one column full-height means a long passage still has somewhere to go when the picture takes the other."),
      ], style: BODY_S },
      { at: [1, 7, 7, 12], slot: "body", nodes: [
        para("The right column runs half the page and then hands over to the illustration below it."),
      ], style: BODY_S },
      { ...img([7, 7, 12, 12]), slot: "image" },
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
      { at: [1, 2, 3, 8], furniture: true, nodes: [heading("Thank you!", 3)], style: { fontSize: 36, fontWeight: 700, fontFamily: DISPLAY, customCss: "font-style:italic" } }, // no textColor: inherits h3, the skin's burnt-orange subhead role
      { at: [3, 2, 11, 7], nodes: [
        para("Sign off in your own voice. Thank the reader for their time, and tell them the one thing to do next — visit a site, try the first step, reply with a question."),
        para("A short closing note beats a long one; this page is a handshake, not another chapter."),
      ], style: BODY_S },
      img([3, 7, 9, 12]),
      { at: [12, 2, 13, 12], nodes: [emptyP], style: HAIR_ACCENT },
    ] },
    // 8 — back cover: accent page, centred blurb, colophon strip
    { kind: "blocks", cover: true, background: { kind: "solid", color: FIELD }, blocks: [
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

export const BUILTIN_STRUCTURES = { guidebook, wellness, ...CANVA_STRUCTURES } satisfies Record<string, StructureSpec>;
// Gallery order (becomes templates.sort_order when seeded).
export const BUILTIN_ORDER: Array<keyof typeof BUILTIN_STRUCTURES> = [
  "guidebook", "wellness", "mediaKit", "emailAutomation", "remoteReport", "mindful", "freelancer"];
