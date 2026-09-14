// The Canva matched designs — page-for-page transcriptions of the five remaining
// template sets in Canva design DAHQxublRs4 ("PDF Editor - Ebook templates").
// Each is LOCKED to its own canva-* skin (StructureSpec.lockedTheme): one catalog
// card per set, isolated from the themes × structures cross-product. Blocks still
// speak --pc-* tokens only (enforced by templates.test.ts), so the document-level
// theme switcher keeps working if the user re-skins afterwards.
//
// Sources (page numbers in the Canva design):
//   mediaKit         pp. 25-33  — "Social media kit / UGC creator" (powder blue, stripes, orange chips)
//   emailAutomation  pp. 35-41  — "Beginner's Guide: Email Automation" (cream, black grotesk, amber discs)
//   remoteReport     pp. 42-50  — "The State of Remote Work" (deep forest, green accents, stat callouts)
//   mindful          pp. 51-64  — "Mindful Living" (sage, tracked-out caps, orange rule, worksheets)
//   freelancer       pp. 65-77  — "The Freelancer's Survival Guide" (ivory, tracked display, flame quote pages)
import {
  heading, para, emptyP, BG, INK, ACCENT, ON_ACCENT, DISPLAY, BODY, UPPER,
  MUTED, SURFACE, BORDER, pq, callout, aside, KICKER, TITLE, H2, BODY_S,
  kicker, img, panel, ol, ul, rule, stat, HAIR_ACCENT, HAIR_ON_ACCENT,
  type BlockSpec, type StructureSpec, type StructKey,
} from "./spec.ts";
import type { BlockStyleTokens } from "./types.ts";

type At = [number, number, number, number];

// ---- mediaKit — pp. 25-33 -------------------------------------------------
// Slate stripe band (the set's cover/footer motif) — token-mixed, no literals.
const STRIPES = "background:repeating-linear-gradient(90deg, color-mix(in srgb, var(--pc-ink) 72%, var(--pc-bg)) 0 16px, transparent 16px 34px)";
const stripes = (at: At): BlockSpec => ({ at, nodes: [emptyP], style: { customCss: STRIPES }, z: 0 });
// The set's oval sticker (the "2026" / handle badges).
const BADGE: BlockStyleTokens = { textAlign: "center", fontSize: 12, fontWeight: 700, fontFamily: DISPLAY, textColor: INK, customCss: `border:2px solid ${INK};border-radius:999px;padding:6px 4px;letter-spacing:.06em;background:${SURFACE}` };
const PAPER = { backgroundColor: ON_ACCENT, customCss: `border:1px solid ${BORDER}` };

const mediaKit: StructureSpec = {
  key: "mediaKit", docType: "leadMagnet", name: "Media kit", lockedTheme: "canva-media-kit",
  pages: [
    // p25 — cover: stripe bands top+bottom, huge tight grotesk stack, oval year
    // badge, centred pitch, handle/site/date footer row.
    { kind: "blocks", cover: true, background: { kind: "solid", color: BG }, blocks: [
      stripes([1, 1, 2, 13]), stripes([12, 1, 13, 13]),
      { at: [4, 2, 7, 11], slot: "title", fallback: "empty", nodes: [heading("15 Steps Guide")], style: { fontSize: 54, fontWeight: 800, textColor: INK, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:-.03em;line-height:.95;h1{font-size:54px;line-height:.95}" } },
      { at: [7, 2, 8, 10], slot: "subtitle", fallback: "empty", nodes: [para("Social media kit")], style: { fontSize: 30, fontWeight: 500, textColor: INK, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:-.01em" } },
      { at: [7, 10, 8, 12], furniture: true, nodes: [para("2026")], style: BADGE },
      { at: [9, 3, 11, 11], nodes: [para("Easy step by step guide"), para("Learn how to manage social media, trends and designs — and save your time efficiently.")], style: { textAlign: "center", fontSize: 13, textColor: INK, fontFamily: BODY, customCss: "p:first-child{font-weight:700}" } },
      { at: [11, 2, 12, 12], slot: "author", fallback: "empty", nodes: [para("@yourhandle · yoursite.com · September 2026")], style: { textAlign: "center", fontSize: 11, textColor: MUTED, fontFamily: BODY, customCss: "letter-spacing:.08em" } },
    ] },
    // p26 — about author: sticker, rounded photo, boxed follower stat, icon rail.
    { kind: "blocks", blocks: [
      { at: [1, 2, 2, 5], furniture: true, nodes: [para("@reallygreatsite")], style: { ...BADGE, fontSize: 10 } },
      { ...img([2, 2, 6, 7]), slot: "hero", fallback: "empty" },
      { at: [2, 7, 4, 12], furniture: true, nodes: [heading("About Author")], style: { fontSize: 40, fontWeight: 800, textColor: INK, fontFamily: DISPLAY, customCss: "letter-spacing:-.03em;line-height:1" } },
      { at: [4, 7, 6, 12], nodes: [para("Hi, I'm a creator and content strategist specialising in short-form video and lifestyle photography. I help brands stand out through authentic storytelling.")], style: { fontSize: 12, textColor: INK, fontFamily: BODY, customCss: "text-align:justify" } },
      { at: [6, 7, 8, 12], furniture: true, nodes: [para("1M followers")], style: { textAlign: "center", fontSize: 24, fontWeight: 800, textColor: INK, fontFamily: DISPLAY, customCss: UPPER + `;border:2px solid ${INK};padding-top:12px;letter-spacing:-.01em` } },
      { at: [6, 2, 12, 7], nodes: [
        para("I first discovered the power of content creation sharing my own product reviews online, and quickly realised how much influence authentic voices have in shaping customer trust."),
        heading("Why brands work with me?", 3),
        para("Brands partner with me because I understand the modern consumer: they don't want polished ads, they want relatable recommendations that build trust and convert."),
      ], style: { fontSize: 12, textColor: INK, fontFamily: BODY, customCss: "text-align:justify" } },
      { at: [8, 7, 12, 12], furniture: true, nodes: [aside("Engagement — 9%"), aside("Rates — 45K"), aside("Video views — 32M total"), aside("Niche — lifestyle & beauty")], style: {} },
    ] },
    // p27 — contents: stripe band, white inset panel, orange PAGE chips (skin).
    { kind: "blocks", blocks: [
      stripes([1, 1, 2, 13]),
      { at: [2, 2, 12, 12], nodes: [emptyP], style: PAPER, z: 0 },
      { at: [3, 3, 5, 10], furniture: true, nodes: [para("Table of Contents")], style: { fontSize: 34, fontWeight: 400, textColor: INK, fontFamily: DISPLAY, customCss: "letter-spacing:-.01em;line-height:1.15" } },
      { at: [5, 3, 11, 11], slot: "toc" },
    ] },
    // p28 — module opener (perChapter): orange chip, huge title, letterspaced
    // intro, landscape image bottom-right.
    { kind: "blocks", role: "perChapter", blocks: [
      { at: [2, 2, 3, 6], slot: "kicker", props: { prefix: "Module" }, nodes: [para("Module 1")], style: { fontSize: 13, fontWeight: 700, textColor: ON_ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.12em;background:var(--pc-accent);padding:7px 12px" } },
      { at: [3, 2, 6, 12], slot: "chapterTitle", nodes: [heading("What is Online Branding?")], style: { fontSize: 44, fontWeight: 800, textColor: INK, fontFamily: DISPLAY, customCss: "letter-spacing:-.03em;line-height:1.02" } },
      { at: [6, 2, 12, 8], slot: "intro", nodes: [
        para("Open the module with the promise: what the reader can do once they've worked through it. Keep sentences short and concrete."),
        para("Then set up the sections that follow — each one should answer a question the reader already has."),
      ], style: { fontSize: 12.5, textColor: INK, fontFamily: BODY, customCss: "letter-spacing:.02em;line-height:1.8" } },
      img([8, 8, 12, 12]),
    ] },
    // flow — module body: two columns + supporting image (the set's text rhythm).
    { kind: "blocks", role: "flow", blocks: [
      { at: [1, 2, 12, 7], slot: "body", nodes: [
        para("Body copy flows down the left column first, in the set's airy letterspaced style. Keep paragraphs short."),
        para("Develop one idea per column; readers of a kit skim before they read."),
      ], style: { fontSize: 12.5, textColor: INK, fontFamily: BODY, customCss: "letter-spacing:.02em;line-height:1.8" } },
      { at: [1, 7, 8, 12], slot: "body", nodes: [
        para("The right column carries the supporting material — an example, a number, a step list."),
      ], style: { fontSize: 12.5, textColor: INK, fontFamily: BODY, customCss: "letter-spacing:.02em;line-height:1.8" } },
      img([8, 7, 12, 12]),
    ] },
    // p29 — case study: stripes, centred display title, goal list, twin powder
    // panels, testimonial pull-quote.
    { kind: "blocks", blocks: [
      stripes([1, 1, 2, 13]), stripes([12, 1, 13, 13]),
      { at: [2, 3, 4, 11], furniture: true, nodes: [heading("Case Study Example")], style: { textAlign: "center", fontSize: 36, fontWeight: 800, textColor: INK, fontFamily: DISPLAY, customCss: "letter-spacing:-.03em;line-height:1" } },
      { at: [4, 3, 5, 11], nodes: [para("skincare brand launch campaign")], style: { textAlign: "center", fontSize: 13, textColor: INK, fontFamily: BODY } },
      img([5, 2, 8, 6]),
      { at: [5, 6, 6, 12], furniture: true, nodes: [heading("The goal", 3)], style: {} },
      { at: [6, 6, 8, 12], nodes: [ol(
        "Drive awareness for the new product launch",
        "Build trust with the target audience",
        "Increase clicks to the product page",
      )], style: { fontSize: 12, textColor: INK, fontFamily: BODY } },
      { furniture: true, at: [8, 2, 11, 7], nodes: [callout("The content", "Three short-form videos — tutorial, lifestyle and testimonial — plus bright minimal photography.")], style: {} },
      { furniture: true, at: [8, 7, 11, 12], nodes: [callout("The results", "120K+ views in the first week, 25% more product-page clicks, engagement above the industry average.")], style: {} },
      { at: [11, 2, 12, 12], nodes: [pq("“The content felt natural, on-trend, and aligned perfectly with our brand identity.” — Brand Partner")], style: {} },
    ] },
    // p31 — portfolio: display title, intro, phone mock, three video cards.
    { kind: "blocks", blocks: [
      { at: [1, 2, 3, 8], furniture: true, nodes: [heading("Portfolio Highlights")], style: { fontSize: 38, fontWeight: 800, textColor: INK, fontFamily: DISPLAY, customCss: "letter-spacing:-.03em;line-height:1" } },
      { at: [3, 2, 6, 8], nodes: [para("I've collaborated with brands across beauty, fashion, lifestyle and wellness, creating content that feels natural, relatable and on-trend — built to be repurposed across organic, paid and web.")], style: { fontSize: 12, textColor: INK, fontFamily: BODY, customCss: "text-align:justify" } },
      img([1, 8, 6, 12]),
      img([7, 2, 10, 5]), img([7, 5, 10, 9]), img([7, 9, 10, 12]),
      { at: [10, 2, 12, 5], furniture: true, nodes: [para("Product demo"), para("E-commerce")], style: { textAlign: "center", fontSize: 11, textColor: INK, fontFamily: BODY, customCss: "p:first-child{font-weight:700}" } },
      { at: [10, 5, 12, 9], furniture: true, nodes: [para("Unboxing & tutorial"), para("Fashion")], style: { textAlign: "center", fontSize: 11, textColor: INK, fontFamily: BODY, customCss: "p:first-child{font-weight:700}" } },
      { at: [10, 9, 12, 12], furniture: true, nodes: [para("Testimonial clip"), para("Lifestyle brand")], style: { textAlign: "center", fontSize: 11, textColor: INK, fontFamily: BODY, customCss: "p:first-child{font-weight:700}" } },
    ] },
    // p32 — conclusion: title + READ sticker, justified columns, feature rail.
    { kind: "blocks", blocks: [
      { at: [1, 2, 3, 7], furniture: true, nodes: [heading("Conclusion")], style: { fontSize: 38, fontWeight: 800, textColor: INK, fontFamily: DISPLAY, customCss: "letter-spacing:-.03em;line-height:1" } },
      { at: [1, 7, 2, 9], furniture: true, nodes: [para("read")], style: { ...BADGE, fontSize: 10 } },
      { at: [3, 2, 12, 7], nodes: [
        para("Working with me means choosing a creator who understands that content is the bridge between your brand and real people."),
        heading("The result?", 3),
        para("Brands I've partnered with have seen stronger engagement, deeper community trust and better conversions — lasting value beyond a single campaign."),
      ], style: { fontSize: 12, textColor: INK, fontFamily: BODY, customCss: "text-align:justify" } },
      img([1, 9, 4, 12]),
      { at: [4, 7, 12, 12], furniture: true, nodes: [aside("Authenticity first"), aside("High-quality visuals"), aside("Seamless collaboration"), aside("Driven strategy")], style: {} },
      stripes([12, 1, 13, 13]),
    ] },
    // p33 — back cover: the cover echoed, strapline centre, footer row.
    { kind: "blocks", cover: true, background: { kind: "solid", color: BG }, blocks: [
      stripes([12, 1, 13, 13]),
      { at: [2, 2, 4, 11], furniture: true, nodes: [heading("15 Steps Guide")], style: { textAlign: "center", fontSize: 40, fontWeight: 800, textColor: INK, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:-.03em;line-height:1" } },
      { at: [5, 3, 9, 11], nodes: [para("Learn how to manage social media, trends and designs — and save your time efficiently. Thanks for reading; now put the fifteen steps to work.")], style: { textAlign: "center", fontSize: 13, textColor: INK, fontFamily: BODY, customCss: "line-height:1.9" } },
      { at: [11, 2, 12, 12], furniture: true, nodes: [para("@yourhandle · yoursite.com · September 2026")], style: { textAlign: "center", fontSize: 11, textColor: MUTED, fontFamily: BODY, customCss: "letter-spacing:.08em" } },
    ] },
  ],
};

// ---- emailAutomation — pp. 35-41 -------------------------------------------
// The set's amber disc motifs (full, quarter and half circles off the page edge).
const disc = (at: At): BlockSpec => ({ at, nodes: [emptyP], style: { customCss: "border-radius:999px;background:var(--pc-accent)" }, z: 0 });
const TIGHT = (size: number): BlockStyleTokens => ({ fontSize: size, fontWeight: 800, textColor: INK, fontFamily: DISPLAY, customCss: "letter-spacing:-.04em;line-height:.98" });
const TRACKED: BlockStyleTokens = { fontSize: 10, fontWeight: 700, textColor: INK, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.2em" };
const JUST: BlockStyleTokens = { fontSize: 12, textColor: INK, fontFamily: BODY, customCss: "text-align:justify" };

const emailAutomation: StructureSpec = {
  key: "emailAutomation", docType: "ebook", name: "Email automation guide", lockedTheme: "canva-amber-mono",
  pages: [
    // p35 — cover: tracked header row, amber disc off the left edge, tight
    // grotesk title stack, thin strapline, arrowed footer taglines.
    { kind: "blocks", cover: true, background: { kind: "solid", color: BG }, blocks: [
      { at: [1, 2, 2, 12], slot: "author", fallback: "empty", nodes: [para("Author name · reallygreatsite.com · @reallygreatsite")], style: { ...TRACKED, textAlign: "center", fontSize: 9 } },
      disc([4, 1, 10, 4]),
      { at: [5, 4, 6, 11], furniture: true, nodes: [para("Beginner's Guide")], style: TIGHT(32) },
      { at: [6, 4, 9, 12], slot: "title", fallback: "empty", nodes: [heading("Email Automation")], style: TIGHT(48) },
      { at: [9, 4, 10, 12], slot: "subtitle", fallback: "empty", nodes: [para("A practical guide to turning your ideas into a digital business")], style: { fontSize: 12, textColor: INK, fontFamily: BODY } },
      { at: [12, 2, 13, 7], nodes: [para("↘ Find out where to begin and how to achieve success.")], style: { fontSize: 10, textColor: INK, fontFamily: BODY } },
      { at: [12, 7, 13, 12], nodes: [para("↘ A clear path from idea to action. No shortcuts. No hype.")], style: { fontSize: 10, textColor: INK, fontFamily: BODY } },
    ] },
    // p36 — "Why This Matters": giant amber-disc numeral, uppercase strapline,
    // justified copy, quarter disc in the corner.
    { kind: "blocks", blocks: [
      { at: [1, 2, 2, 6], furniture: true, nodes: [para("Introduction")], style: TRACKED },
      { at: [2, 2, 4, 9], furniture: true, nodes: [heading("Why This Matters")], style: TIGHT(40) },
      disc([3, 7, 6, 12]),
      { at: [3, 7, 6, 12], furniture: true, nodes: [para("320%")], style: { ...TIGHT(64), textAlign: "center", customCss: "letter-spacing:-.04em;line-height:.98;padding-top:26px" } },
      { at: [6, 2, 7, 12], nodes: [pq("Automated emails generate up to 320% more revenue than non-automated ones")], style: {} },
      { at: [7, 2, 12, 12], nodes: [
        para("Most small businesses still send emails one at a time — manually, inconsistently, and usually only when someone remembers to."),
        para("Automation fixes that by sending the right message the moment it's needed, whether that's a welcome note, a cart reminder, or a thank-you after purchase."),
      ], style: JUST },
      { at: [11, 10, 13, 13], nodes: [emptyP], style: { customCss: "border-radius:100% 0 0 0;background:var(--pc-accent)" }, z: 0 },
      { at: [12, 2, 13, 5], furniture: true, nodes: [para("Email Automation")], style: { ...TRACKED, fontSize: 8 } },
    ] },
    // p37 — chapter opener (perChapter): tracked kicker, huge uppercase title
    // with an amber dot, justified intro, half disc at the page foot.
    { kind: "blocks", role: "perChapter", blocks: [
      { at: [1, 2, 2, 6], slot: "kicker", nodes: [para("Chapter 1")], style: TRACKED },
      { at: [2, 2, 5, 11], slot: "chapterTitle", nodes: [heading("Step by Step Guide")], style: { ...TIGHT(44), customCss: "letter-spacing:-.04em;line-height:.98;text-transform:uppercase" } },
      disc([3, 11, 4, 12]),
      { at: [5, 2, 11, 12], slot: "intro", nodes: [
        para("A common mistake creatives make is building in isolation. Market demand doesn't require trends or virality — it requires listening."),
        para("Pay attention to the questions people repeatedly ask, the frustrations they share, and the gaps in existing products. If people are already searching for solutions, you don't need to convince them — you need to guide them."),
      ], style: JUST },
      { at: [11, 4, 13, 10], nodes: [emptyP], style: { customCss: "border-radius:999px 999px 0 0;background:var(--pc-accent)" }, z: 0 },
      { at: [12, 2, 13, 5], furniture: true, nodes: [para("Email Automation")], style: { ...TRACKED, fontSize: 8 } },
    ] },
    // flow — two justified columns; h3 subheads render as the amber chips.
    { kind: "blocks", role: "flow", blocks: [
      { at: [1, 2, 12, 7], slot: "body", nodes: [
        heading("Pick your trigger", 3),
        para("Body copy sets in justified columns, the set's monotone rhythm. Keep each section short enough to scan."),
      ], style: JUST },
      { at: [1, 7, 12, 12], slot: "body", nodes: [
        heading("Map the journey", 3),
        para("The second column continues the sequence — each amber chip marks the next step in the workflow."),
      ], style: JUST },
      { at: [12, 11, 13, 13], nodes: [emptyP], style: { customCss: "border-radius:100% 0 0 0;background:var(--pc-accent)" }, z: 0 },
      { at: [12, 2, 13, 5], furniture: true, nodes: [para("Email Automation")], style: { ...TRACKED, fontSize: 8 }, z: 1 },
    ] },
    // p39 — comparison: two amber discs of stacked lines, oversized labels.
    { kind: "blocks", blocks: [
      { at: [1, 2, 4, 12], furniture: true, nodes: [heading("Comparison (DIY vs. Automated)")], style: TIGHT(38) },
      { at: [4, 7, 6, 12], nodes: [para("A successful digital product is not defined by size or complexity. It's defined by usefulness.")], style: JUST },
      { at: [5, 2, 6, 7], furniture: true, nodes: [para("DIY (Manual)")], style: TIGHT(26) },
      { at: [6, 2, 10, 7], furniture: true, nodes: [para("You remember to send it — or forget"), para("Same message for everyone"), para("Takes time each week"), para("Easy to fall behind")], style: { textAlign: "center", fontSize: 11, textColor: INK, fontFamily: BODY, backgroundColor: ACCENT, customCss: "border-radius:999px;padding:34px 18px 0;p{margin-bottom:10px}" } },
      { at: [6, 7, 10, 12], furniture: true, nodes: [para("Sends itself, every time"), para("Message matches the reader"), para("Runs while you work"), para("Never falls behind")], style: { textAlign: "center", fontSize: 11, textColor: INK, fontFamily: BODY, backgroundColor: ACCENT, customCss: "border-radius:999px;padding:34px 18px 0;p{margin-bottom:10px}" } },
      { at: [10, 8, 11, 12], furniture: true, nodes: [para("Automated")], style: TIGHT(26) },
      { at: [10, 2, 12, 7], nodes: [para("Focus on clarity over quantity. A short, well-structured product often performs better than a long, unfocused one.")], style: JUST },
    ] },
    // p40 — CTA back page: half disc off the left edge, big ask, pill button.
    { kind: "blocks", cover: true, background: { kind: "solid", color: BG }, blocks: [
      { at: [1, 2, 2, 12], furniture: true, nodes: [para("Author name · reallygreatsite.com · @reallygreatsite")], style: { ...TRACKED, textAlign: "center", fontSize: 9 } },
      { at: [4, 1, 9, 3], nodes: [emptyP], style: { customCss: "border-radius:0 999px 999px 0;background:var(--pc-accent)" }, z: 0 },
      { at: [4, 4, 8, 12], furniture: true, nodes: [heading("Ready to Set Up Your First Automation?")], style: TIGHT(42) },
      { at: [8, 4, 9, 11], furniture: true, nodes: [para("Progress happens through action, not perfection.")], style: { fontSize: 11, textColor: INK, fontFamily: BODY } },
      { at: [9, 4, 10, 10], furniture: true, nodes: [para("Download the automation checklist")], style: { textAlign: "center", fontSize: 11, fontWeight: 700, textColor: ON_ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.06em;background:var(--pc-accent);border-radius:999px;padding:9px 4px" } },
      { at: [12, 2, 13, 12], furniture: true, nodes: [para("Start where you are.   ·   Build with intention.   ·   Grow as you go.")], style: { textAlign: "center", fontSize: 10, textColor: INK, fontFamily: BODY } },
    ] },
  ],
};

// ---- remoteReport — pp. 42-50 ----------------------------------------------
// Deep-forest panels carry light text: BG doubles as "on-ink" (the skin's page
// colour is near-white), so dark pages write in BG.
const ON_DARK: BlockStyleTokens = { textColor: BG, fontFamily: BODY, fontSize: 12 };
const limeArc = (at: At, corner: string): BlockSpec => ({ at, nodes: [emptyP], style: { customCss: `border-radius:${corner};background:var(--pc-accent)` }, z: 0 });

const remoteReport: StructureSpec = {
  key: "remoteReport", docType: "report", name: "Remote work report", lockedTheme: "canva-forest-report",
  pages: [
    // p42 — cover: forest field, lime logo disc + year pill, white display
    // title, lime strapline bar, photo, written-by foot.
    { kind: "blocks", cover: true, background: { kind: "solid", color: INK }, blocks: [
      { at: [1, 2, 2, 3], nodes: [emptyP], style: { customCss: "border-radius:999px;border:6px solid var(--pc-accent)" } },
      { at: [1, 10, 2, 12], furniture: true, nodes: [para("2026")], style: { textAlign: "center", fontSize: 12, fontWeight: 700, textColor: ON_ACCENT, fontFamily: DISPLAY, backgroundColor: ACCENT, customCss: "letter-spacing:.08em;padding-top:6px" } },
      { at: [3, 2, 7, 11], slot: "title", fallback: "empty", nodes: [heading("The State of Remote Work 2026")], style: { fontSize: 46, fontWeight: 600, textColor: BG, fontFamily: DISPLAY, customCss: "letter-spacing:-.02em;line-height:1.12;h1{color:var(--pc-bg);font-size:46px;font-weight:600}" } },
      { at: [7, 2, 9, 8], slot: "subtitle", fallback: "empty", nodes: [para("A Global Look at Where, How, and Why We Work")], style: { fontSize: 15, fontWeight: 700, textColor: ON_ACCENT, fontFamily: DISPLAY, backgroundColor: ACCENT, customCss: "padding:10px 12px" } },
      { ...img([9, 2, 12, 8]), slot: "hero", fallback: "empty" },
      { at: [9, 8, 10, 12], furniture: true, nodes: [para("A company's report")], style: { ...ON_DARK, fontSize: 11 } },
      { at: [11, 8, 13, 12], slot: "author", fallback: "empty", nodes: [para("Written by:"), para("Author Name")], style: { ...ON_DARK, customCss: "p:last-child{font-weight:700}" } },
    ] },
    // p43 — contents: dark field, white paper panel, dotted-leader rows (skin).
    { kind: "blocks", background: { kind: "solid", color: INK }, blocks: [
      { at: [1, 2, 13, 12], nodes: [emptyP], style: { backgroundColor: BG }, z: 0 },
      { at: [2, 3, 3, 11], furniture: true, nodes: [heading("Table of Contents")], style: { fontSize: 30, fontWeight: 600, textColor: INK, fontFamily: DISPLAY } },
      img([3, 3, 5, 11]),
      { at: [5, 3, 12, 11], slot: "toc" },
    ] },
    // p44 — chapter opener (perChapter): forest band, oversized white chapter
    // marker + intro right, lime quarter-arc at the page foot.
    { kind: "blocks", role: "perChapter", blocks: [
      panel([1, 1, 5, 13], INK),
      { at: [2, 2, 4, 7], slot: "kicker", nodes: [para("Chapter 01")], style: { fontSize: 30, fontWeight: 700, textColor: BG, fontFamily: DISPLAY, customCss: "letter-spacing:-.02em" } },
      { at: [2, 7, 5, 12], slot: "intro", nodes: [
        para("Open the chapter with the finding that matters most — one short paragraph the reader could quote in a meeting."),
      ], style: { ...ON_DARK, fontSize: 11.5 } },
      { at: [6, 2, 8, 12], slot: "chapterTitle", nodes: [heading("Where People Are Working Now", 3)], style: { fontSize: 24, fontWeight: 700, textColor: ACCENT, fontFamily: DISPLAY } },
      limeArc([11, 1, 13, 3], "0 100% 0 0"),
    ] },
    // flow — full-measure report body; green h3 section heads come from the skin.
    { kind: "blocks", role: "flow", blocks: [
      { at: [1, 2, 12, 12], slot: "body", nodes: [
        heading("Total Revenue", 3),
        para("Body copy runs the full measure, the report's working rhythm. Lead each section with the number, then explain it."),
        heading("Total Expenses", 3),
        para("Keep paragraphs short and factual; charts and tables carry the argument on these pages."),
      ], style: { fontSize: 12.5, textColor: INK, fontFamily: BODY } },
      limeArc([12, 1, 13, 2], "0 100% 0 0"),
    ] },
    // p47 — stats: chart placeholder over a forest band of survey callouts.
    { kind: "blocks", blocks: [
      limeArc([1, 11, 2, 13], "0 0 0 100%"),
      { at: [1, 2, 2, 9], furniture: true, nodes: [heading("Employee overview", 2)], style: { fontSize: 28, fontWeight: 700, textColor: INK, fontFamily: DISPLAY } },
      { at: [2, 2, 6, 12], nodes: [emptyP], style: { backgroundColor: SURFACE, customCss: `border:1px solid ${BORDER};border-radius:6px` } },
      { at: [6, 2, 7, 9], nodes: [para("Figure 1 — replace with your chart.")], style: { fontSize: 11, textColor: MUTED, fontFamily: BODY, customCss: "font-style:italic" } },
      panel([7, 1, 13, 13], INK),
      { furniture: true, at: [8, 2, 10, 5], nodes: [para("61%")], style: { fontSize: 40, fontWeight: 800, textColor: BG, fontFamily: DISPLAY } },
      { furniture: true, at: [8, 5, 10, 12], nodes: [para("Fully remote roles have plateaued, while fully in-office mandates have seen pushback in nearly every sector surveyed. Hybrid has emerged as the middle ground.")], style: { ...ON_DARK, fontSize: 11 } },
      { furniture: true, at: [10, 2, 11, 7], nodes: [para("▲ 77%")], style: { fontSize: 26, fontWeight: 800, textColor: ACCENT, fontFamily: DISPLAY } },
      { furniture: true, at: [11, 2, 13, 7], nodes: [para("Share who rank flexible location in their top three factors when choosing a job.")], style: { ...ON_DARK, fontSize: 10.5 } },
      { furniture: true, at: [10, 7, 11, 12], nodes: [para("▼ 34%")], style: { fontSize: 26, fontWeight: 800, textColor: ACCENT, fontFamily: DISPLAY } },
      { furniture: true, at: [11, 7, 13, 12], nodes: [para("Drop in listings that require five days on site, year over year.")], style: { ...ON_DARK, fontSize: 10.5 } },
    ] },
    // p48 — roadmap: six connected month nodes on a lime spine.
    { kind: "blocks", blocks: [
      limeArc([1, 11, 2, 13], "0 0 0 100%"),
      { at: [1, 2, 3, 10], furniture: true, nodes: [heading("Future Roadmap 2026", 2)], style: { fontSize: 30, fontWeight: 700, textColor: INK, fontFamily: DISPLAY } },
      { furniture: true, at: [3, 2, 6, 7], nodes: [para("January"), para("Set the working brief and confirm the survey population for the year's study.")], style: { fontSize: 11, textColor: INK, fontFamily: BODY, customCss: `border-top:2px solid var(--pc-accent);padding-top:10px;p:first-child{font-weight:700;font-size:13px}` } },
      { furniture: true, at: [3, 7, 6, 12], nodes: [para("February"), para("Field the first wave; publish the interim read for early stakeholders.")], style: { fontSize: 11, textColor: INK, fontFamily: BODY, customCss: `border-top:2px solid var(--pc-accent);padding-top:10px;p:first-child{font-weight:700;font-size:13px}` } },
      { furniture: true, at: [6, 2, 9, 7], nodes: [para("March"), para("Deep-dive interviews with the outlier teams the numbers surfaced.")], style: { fontSize: 11, textColor: INK, fontFamily: BODY, customCss: `border-top:2px solid var(--pc-accent);padding-top:10px;p:first-child{font-weight:700;font-size:13px}` } },
      { furniture: true, at: [6, 7, 9, 12], nodes: [para("April"), para("Second wave in field; refresh the benchmark tables.")], style: { fontSize: 11, textColor: INK, fontFamily: BODY, customCss: `border-top:2px solid var(--pc-accent);padding-top:10px;p:first-child{font-weight:700;font-size:13px}` } },
      { furniture: true, at: [9, 2, 12, 7], nodes: [para("May"), para("Synthesis sprint: findings, takeaways and the recommendation set.")], style: { fontSize: 11, textColor: INK, fontFamily: BODY, customCss: `border-top:2px solid var(--pc-accent);padding-top:10px;p:first-child{font-weight:700;font-size:13px}` } },
      { furniture: true, at: [9, 7, 12, 12], nodes: [para("June"), para("Publish the full report and brief the leadership audience.")], style: { fontSize: 11, textColor: INK, fontFamily: BODY, customCss: `border-top:2px solid var(--pc-accent);padding-top:10px;p:first-child{font-weight:700;font-size:13px}` } },
      limeArc([12, 1, 13, 2], "0 100% 100% 0"),
    ] },
    // p49 — checklist: dark field, white worksheet panel, glyph checkboxes.
    // ponytail: ☐ glyph rows, not the checkboxList typed block — the structure
    // interpreter only places textFrame/image/tocList; extend it if a real
    // interactive checklist is ever needed.
    { kind: "blocks", background: { kind: "solid", color: INK }, blocks: [
      { at: [1, 2, 13, 12], nodes: [emptyP], style: { backgroundColor: BG }, z: 0 },
      { at: [2, 3, 3, 11], furniture: true, nodes: [heading("Your Checklist", 2)], style: { fontSize: 26, fontWeight: 800, textColor: INK, fontFamily: DISPLAY, customCss: UPPER } },
      { at: [3, 3, 4, 11], furniture: true, nodes: [para("Date :                                  Month :")], style: { fontSize: 11, textColor: INK, fontFamily: BODY, backgroundColor: SURFACE, customCss: "padding:8px 10px" } },
      { at: [4, 3, 12, 11], furniture: true, nodes: [
        para("☐  Audit your current remote/hybrid policy against employee expectations"),
        para("☐  Identify which roles genuinely require in-office presence vs. habit-driven mandates"),
        para("☐  Ask teams which rituals actually build connection — and drop the rest"),
        para("☐  Set response-time norms so flexibility doesn't become always-on"),
        para("☐  Publish the policy in plain language, with the reasoning attached"),
        para("☐  Re-survey in six months and compare against this year's benchmarks"),
      ], style: { fontSize: 11, textColor: INK, fontFamily: BODY, customCss: `p{border:1px solid ${BORDER};padding:8px 10px;margin-bottom:10px}` } },
    ] },
    // p50 — back cover: dark field, title echo, about blurb, contact block.
    { kind: "blocks", cover: true, background: { kind: "solid", color: INK }, blocks: [
      { at: [1, 2, 2, 3], nodes: [emptyP], style: { customCss: "border-radius:999px;border:6px solid var(--pc-accent)" } },
      { at: [3, 2, 6, 11], slot: "title", fallback: "keep", nodes: [heading("The State of Remote Work 2026")], style: { fontSize: 36, fontWeight: 600, textColor: BG, fontFamily: DISPLAY, customCss: "letter-spacing:-.02em;line-height:1.15;h1{color:var(--pc-bg);font-size:36px;font-weight:600}" } },
      { at: [6, 2, 8, 11], nodes: [para("[Brand Name] helps companies understand how the world works — literally. We partner with research organisations to deliver data-backed insights for smarter decisions about people.")], style: { ...ON_DARK, fontSize: 12 } },
      { at: [9, 2, 11, 7], furniture: true, nodes: [para("Contact block:"), para("Website · Email · Social handles")], style: { ...ON_DARK, fontSize: 11, customCss: "p:first-child{font-weight:700}" } },
      { at: [11, 2, 13, 7], slot: "author", fallback: "empty", nodes: [para("Written by:"), para("Author Name")], style: { ...ON_DARK, customCss: "p:last-child{font-weight:700}" } },
    ] },
  ],
};

// ---- mindful — pp. 51-64 ----------------------------------------------------
const TRACKED_TITLE: BlockStyleTokens = { fontSize: 30, fontWeight: 700, textColor: INK, fontFamily: BODY, customCss: UPPER + ";letter-spacing:.16em;line-height:1.55;h1{font-family:var(--pc-body);font-size:30px;letter-spacing:.16em;line-height:1.55}" };
const CELL: BlockStyleTokens = { textAlign: "center", fontSize: 10.5, textColor: INK, fontFamily: BODY, customCss: `border:1px solid ${BORDER};padding-top:16px` };

const mindful: StructureSpec = {
  key: "mindful", docType: "ebook", name: "Mindful living", lockedTheme: "canva-sage-mindful",
  pages: [
    // p51 — cover: serif title stack left, tall photo right, forest foot band.
    { kind: "blocks", cover: true, background: { kind: "solid", color: BG }, blocks: [
      { at: [2, 2, 8, 7], slot: "title", fallback: "empty", nodes: [heading("Mindful Living: A Guide to Slowing Down")], style: { fontSize: 34, fontWeight: 700, textColor: INK, fontFamily: DISPLAY, customCss: "line-height:1.3" } },
      { at: [8, 2, 9, 4], nodes: [emptyP], style: { customCss: "border-top:3px solid var(--pc-ink);width:36px" } },
      { at: [9, 2, 10, 6], furniture: true, nodes: [para("Written by")], style: { fontSize: 11, textColor: INK, fontFamily: BODY, customCss: UPPER + ";letter-spacing:.22em" } },
      { at: [10, 2, 11, 7], slot: "author", fallback: "empty", nodes: [para("Kimberly Nguyen")], style: { fontSize: 16, fontWeight: 700, textColor: INK, fontFamily: DISPLAY } },
      { ...img([1, 7, 12, 13]), slot: "hero", fallback: "empty" },
      panel([12, 1, 13, 13], INK),
      { at: [12, 3, 13, 11], furniture: true, nodes: [para("www.reallygreatsite.com")], style: { textAlign: "center", fontSize: 11, textColor: BG, fontFamily: BODY, customCss: UPPER + ";letter-spacing:.2em;padding-top:12px" }, z: 1 },
    ] },
    // p52 — introduction: serif heading + short rule, bold opening statement.
    { kind: "blocks", blocks: [
      { at: [2, 2, 3, 9], furniture: true, nodes: [heading("Introduction")], style: { fontSize: 32, fontWeight: 700, textColor: INK, fontFamily: DISPLAY } },
      { at: [3, 2, 4, 4], nodes: [emptyP], style: { customCss: "border-top:3px solid var(--pc-ink);width:36px" } },
      { at: [4, 2, 6, 12], nodes: [pq("“We live in a world that rewards speed — faster replies, faster meals, faster everything. But somewhere in the rush, a lot of us lost the ability to simply be still.”")], style: {} },
      { at: [6, 2, 12, 12], nodes: [
        para("This guide isn't about overhauling your life overnight. It's a collection of small, doable shifts that help you slow down, notice more, and feel less scattered."),
        para("Read it in one sitting, or come back to a page whenever you need it."),
      ], style: { fontSize: 12.5, textColor: INK, fontFamily: BODY, customCss: "line-height:1.9" } },
    ] },
    // p53 — contents: tracked title, pastel chapter bars (skin styles the rows).
    { kind: "blocks", blocks: [
      { at: [1, 2, 3, 12], furniture: true, nodes: [para("Table of Contents")], style: { fontSize: 24, fontWeight: 700, textColor: INK, fontFamily: BODY, customCss: UPPER + ";letter-spacing:.12em" } },
      { at: [3, 2, 12, 12], slot: "toc" },
    ] },
    // p55/61 — chapter opener (perChapter): tracked kicker, orange rule, huge
    // tracked-out uppercase title, illustration slot bottom-right.
    { kind: "blocks", role: "perChapter", blocks: [
      { at: [1, 2, 2, 8], slot: "kicker", nodes: [para("Chapter 1")], style: { fontSize: 12, fontWeight: 500, textColor: INK, fontFamily: BODY, customCss: UPPER + ";letter-spacing:.3em" } },
      { at: [2, 2, 3, 8], nodes: [emptyP], style: { customCss: "width:3px;height:100%;background:var(--pc-accent)" } },
      { at: [2, 3, 9, 12], slot: "chapterTitle", nodes: [heading("Why We Struggle to Slow Down")], style: TRACKED_TITLE },
      { ...img([8, 6, 12, 12]), slot: "image", fallback: "empty" },
    ] },
    // p62 — flow A: sage highlight-bar heading + full-measure tracked body.
    { kind: "blocks", role: "flow", blocks: [
      { at: [1, 2, 12, 12], slot: "body", nodes: [
        heading("Environment care", 2),
        heading("Low light around house", 3),
        para("Slowing down isn't a discipline problem — it's an environment problem. Notifications, endless to-do lists, and the quiet pressure to always be productive train our brains to treat rest as a reward we have to earn."),
        heading("High light houseplants", 3),
        para("The good news: you don't need a silent retreat to feel calmer. You need a few consistent anchors in your day that remind your nervous system it's safe to slow down."),
      ], style: { fontSize: 12, textColor: INK, fontFamily: BODY, customCss: "line-height:1.85;letter-spacing:.02em" } },
    ] },
    // p57 — flow B: illustration rail left, annotated column right (alternates).
    { kind: "blocks", role: "flow", blocks: [
      { at: [1, 2, 3, 9], slot: "body", nodes: [
        heading("Environment care", 2),
      ], style: { fontSize: 12, textColor: INK, fontFamily: BODY } },
      { ...img([4, 2, 9, 6]) },
      { at: [9, 2, 12, 6], nodes: [para("Beyond this, a houseplant may need direct (bright) light or indirect light.")], style: { textAlign: "center", fontSize: 11.5, textColor: INK, fontFamily: BODY } },
      { at: [3, 6, 12, 12], slot: "body", nodes: [
        heading("Low light around house", 3),
        para("Annotated notes run down the right column, each under its tracked caps label — the set's diagram-page rhythm."),
      ], style: { fontSize: 11.5, textColor: INK, fontFamily: BODY, customCss: `line-height:1.8;h3{border-top:1px solid ${BORDER};padding-top:10px}` } },
    ] },
    // p59 — journaling prompts: bordered prompt rows over lined writing space.
    { kind: "blocks", blocks: [
      { at: [1, 2, 2, 10], furniture: true, nodes: [para("Journaling prompts")], style: { fontSize: 22, fontWeight: 700, textColor: INK, fontFamily: BODY, customCss: UPPER + ";letter-spacing:.12em" } },
      { at: [2, 2, 3, 7], furniture: true, nodes: [para("Date")], style: { fontSize: 11, textColor: INK, fontFamily: BODY, customCss: `border:1px solid ${BORDER};padding:8px 10px` } },
      { at: [2, 7, 3, 12], furniture: true, nodes: [para("Mood")], style: { fontSize: 11, fontWeight: 700, textColor: ACCENT, fontFamily: BODY, customCss: `border:1px solid ${BORDER};padding:8px 10px` } },
      { at: [3, 2, 6, 12], furniture: true, nodes: [para("What makes you feel powerful?")], style: { fontSize: 13, fontWeight: 700, textColor: INK, fontFamily: BODY, customCss: `border-bottom:1px solid ${INK};padding-bottom:64px` } },
      { at: [6, 2, 9, 12], furniture: true, nodes: [para("What makes you feel in control?")], style: { fontSize: 13, fontWeight: 700, textColor: INK, fontFamily: BODY, customCss: `border-bottom:1px solid ${INK};padding-bottom:64px` } },
      { at: [9, 2, 12, 12], furniture: true, nodes: [para("What small moment made today better?")], style: { fontSize: 13, fontWeight: 700, textColor: INK, fontFamily: BODY, customCss: `border-bottom:1px solid ${INK};padding-bottom:64px` } },
    ] },
    // p64 — the self-love habit grid: date/mood header, serif title, 3×3 cells.
    { kind: "blocks", blocks: [
      { at: [1, 2, 2, 7], furniture: true, nodes: [para("Date")], style: { fontSize: 10, textColor: INK, fontFamily: BODY, customCss: UPPER + `;letter-spacing:.16em;border:1px solid ${INK};padding:9px 10px` } },
      { at: [1, 7, 2, 12], furniture: true, nodes: [para("Mood")], style: { fontSize: 12, fontWeight: 700, textColor: INK, fontFamily: DISPLAY, customCss: `border:1px solid ${INK};padding:8px 10px` } },
      { at: [3, 2, 5, 12], furniture: true, nodes: [heading("Your Daily Check of Self-Love", 2)], style: { textAlign: "center", fontSize: 26, fontWeight: 700, textColor: INK, fontFamily: DISPLAY } },
      { at: [5, 2, 7, 6], furniture: true, nodes: [para("Say “I'm beautiful” in front of the mirror")], style: CELL },
      { at: [5, 6, 7, 9], furniture: true, nodes: [para("Take a bath")], style: CELL },
      { at: [5, 9, 7, 12], furniture: true, nodes: [para("Listen to your favourite music")], style: CELL },
      { at: [7, 2, 9, 6], furniture: true, nodes: [para("Use a face mask")], style: CELL },
      { at: [7, 6, 9, 9], furniture: true, nodes: [para("Take an afternoon nap")], style: CELL },
      { at: [7, 9, 9, 12], furniture: true, nodes: [para("Eat your favourite snack")], style: CELL },
      { at: [9, 2, 11, 6], furniture: true, nodes: [para("Try a different style of clothes")], style: CELL },
      { at: [9, 6, 11, 9], furniture: true, nodes: [para("Doodle anything on a paper")], style: CELL },
      { at: [9, 9, 11, 12], furniture: true, nodes: [para("Gaze at the afternoon sky")], style: CELL },
    ] },
    // back cover: centred affirmation, author, forest foot band.
    { kind: "blocks", cover: true, background: { kind: "solid", color: BG }, blocks: [
      { at: [4, 3, 8, 11], nodes: [para("Believe in the magic of each season, and bloom where you are planted.")], style: { textAlign: "center", fontSize: 26, textColor: INK, fontFamily: DISPLAY, customCss: "font-style:italic;line-height:1.5" } },
      { at: [8, 3, 9, 11], slot: "author", fallback: "empty", nodes: [para("Kimberly Nguyen")], style: { textAlign: "center", fontSize: 13, textColor: INK, fontFamily: BODY, customCss: UPPER + ";letter-spacing:.18em" } },
      panel([12, 1, 13, 13], INK),
      { at: [12, 3, 13, 11], furniture: true, nodes: [para("www.reallygreatsite.com")], style: { textAlign: "center", fontSize: 11, textColor: BG, fontFamily: BODY, customCss: UPPER + ";letter-spacing:.2em;padding-top:12px" }, z: 1 },
    ] },
  ],
};

// ---- freelancer — pp. 67-77 -------------------------------------------------
const FLAME_TRACKED: BlockStyleTokens = { fontSize: 12, fontWeight: 700, textColor: ON_ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.12em" };
const funnelBar = (text: string, tone: string, at: At): BlockSpec => ({
  at, furniture: true, nodes: [para(text)],
  style: { textAlign: "center", fontSize: 11, fontWeight: 700, textColor: INK, fontFamily: BODY, backgroundColor: tone, customCss: "padding-top:12px" },
});

const freelancer: StructureSpec = {
  key: "freelancer", docType: "ebook", name: "Freelancer guidebook", lockedTheme: "canva-ivory-flame",
  pages: [
    // p67 — cover: full flame field, tracked header row, light display title
    // stacked at the foot, script flourish.
    { kind: "blocks", cover: true, background: { kind: "solid", color: ACCENT }, blocks: [
      { at: [1, 2, 2, 6], slot: "author", fallback: "empty", nodes: [para("Company name")], style: { ...FLAME_TRACKED, fontSize: 10 } },
      { at: [1, 6, 2, 9], furniture: true, nodes: [para("2025-2030")], style: { ...FLAME_TRACKED, fontSize: 10, textAlign: "center" } },
      { at: [1, 9, 2, 12], furniture: true, nodes: [para("Guidebook")], style: { ...FLAME_TRACKED, fontSize: 10, textAlign: "right" } },
      { at: [7, 2, 12, 11], slot: "title", fallback: "empty", nodes: [heading("The Freelancer's Survival Guide")], style: { fontSize: 46, fontWeight: 300, textColor: ON_ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.02em;line-height:1.18;h1{color:var(--pc-on-accent);font-size:46px;font-weight:300;line-height:1.18}" } },
      { at: [12, 7, 13, 12], furniture: true, nodes: [para("creative")], style: { fontSize: 24, textColor: ON_ACCENT, fontFamily: DISPLAY, customCss: "font-style:italic;border-bottom:1px solid var(--pc-on-accent);padding-bottom:4px;text-align:right" } },
    ] },
    // p68 — foreword: hairlines, huge tracked display, justified prose.
    { kind: "blocks", blocks: [
      { at: [1, 2, 2, 5], furniture: true, nodes: [para("Freelance guide")], style: { fontSize: 9, fontWeight: 700, textColor: INK, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.2em" } },
      { at: [1, 5, 2, 12], nodes: [emptyP], style: { customCss: "border-top:1px solid var(--pc-ink);margin-top:8px" } },
      { at: [2, 2, 5, 12], furniture: true, nodes: [para("Foreword")], style: { textAlign: "center", fontSize: 58, fontWeight: 500, textColor: INK, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.06em;line-height:1" } },
      { at: [5, 3, 11, 11], nodes: [
        para("Open the book in your own voice: why this guide exists, who it's for, and the one promise it makes."),
        para("Keep the foreword short and generous — two or three paragraphs that make the reader feel they've already started."),
      ], style: { fontSize: 12, textColor: INK, fontFamily: BODY, customCss: "text-align:justify;line-height:1.9" } },
      { at: [11, 5, 12, 9], nodes: [emptyP], style: { customCss: "border-top:1px solid var(--pc-ink);width:120px;margin:0 auto" } },
    ] },
    // p69 — contents: flame display title, asterisk flourish, hairline rows (skin).
    { kind: "blocks", blocks: [
      { at: [1, 2, 3, 9], furniture: true, nodes: [heading("Table of Contents")], style: { fontSize: 36, fontWeight: 800, textColor: ACCENT, fontFamily: DISPLAY, customCss: "letter-spacing:-.02em;line-height:1.02" } },
      { at: [1, 10, 2, 12], furniture: true, nodes: [para("✳")], style: { textAlign: "right", fontSize: 30, textColor: ACCENT, fontFamily: DISPLAY } },
      { at: [3, 2, 12, 12], slot: "toc" },
    ] },
    // p70 — chapter divider (perChapter): full flame page, asterisk, oversized
    // ivory marker, hairline, tracked chapter title, shouting-caps opener.
    { kind: "blocks", role: "perChapter", background: { kind: "solid", color: ACCENT }, blocks: [
      { at: [1, 2, 2, 4], furniture: true, nodes: [para("✳")], style: { fontSize: 34, textColor: ON_ACCENT, fontFamily: DISPLAY } },
      { at: [2, 2, 6, 10], slot: "kicker", nodes: [para("Chapter 01")], style: { fontSize: 52, fontWeight: 700, textColor: ON_ACCENT, fontFamily: DISPLAY, customCss: "letter-spacing:-.02em;line-height:1" } },
      { at: [6, 2, 7, 10], nodes: [emptyP], style: HAIR_ON_ACCENT },
      { at: [7, 2, 8, 12], slot: "chapterTitle", nodes: [heading("Getting Your First Client", 3)], style: { fontSize: 14, fontWeight: 800, textColor: ON_ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.06em;h3{color:var(--pc-on-accent)}" } },
      { at: [10, 2, 12, 12], slot: "intro", nodes: [
        para("Nobody hires the freelancer with the best portfolio. They hire the one they trust the most."),
      ], style: { fontSize: 15, fontWeight: 800, textColor: ON_ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";line-height:1.4" } },
    ] },
    // p71 — flow: flame display marker, twin justified columns, foot paragraph.
    { kind: "blocks", role: "flow", blocks: [
      { at: [1, 2, 3, 7], furniture: true, nodes: [heading("First step", 2)], style: { fontSize: 40, fontWeight: 800, textColor: ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:-.02em;line-height:.95" } },
      { at: [3, 2, 11, 7], slot: "body", nodes: [
        para("Body copy sets small and justified, two columns to the page. Keep the argument moving; this set rewards short paragraphs."),
      ], style: { fontSize: 11, textColor: INK, fontFamily: BODY, customCss: "text-align:justify" } },
      { at: [1, 7, 11, 12], slot: "body", nodes: [
        para("The right column continues without a break — the display marker on the left is decoration, not structure."),
      ], style: { fontSize: 11, textColor: INK, fontFamily: BODY, customCss: "text-align:justify" } },
      { at: [11, 2, 13, 12], nodes: [para("A full-measure closing paragraph runs across the foot of the page, italic and quiet.")], style: { fontSize: 11, textColor: MUTED, fontFamily: BODY, customCss: "font-style:italic" } },
    ] },
    // p73 — infographic: flame caps headline over a funnel of token-mixed bars.
    { kind: "blocks", blocks: [
      { at: [1, 2, 3, 11], furniture: true, nodes: [heading("How Most First Clients Actually Happen", 2)], style: { fontSize: 30, fontWeight: 800, textColor: ACCENT, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:-.01em;line-height:1.1" } },
      funnelBar("Existing network — 100%", ACCENT, [3, 2, 5, 12]),
      funnelBar("Specific ask — 85%", "color-mix(in srgb, var(--pc-accent) 62%, var(--pc-bg))", [5, 3, 7, 11]),
      funnelBar("Referral — 47%", "color-mix(in srgb, var(--pc-accent) 38%, var(--pc-bg))", [7, 4, 9, 10]),
      funnelBar("First client — 25%", "color-mix(in srgb, var(--pc-ink) 22%, var(--pc-bg))", [9, 5, 11, 9]),
      { at: [11, 2, 13, 12], nodes: [para("Most freelancers overestimate cold outreach and underestimate the people already in their corner.")], style: { fontSize: 11, textColor: INK, fontFamily: BODY } },
    ] },
    // p72 — the flame quote page: asterisk + oversized statement.
    { kind: "blocks", background: { kind: "solid", color: ACCENT }, blocks: [
      { at: [1, 2, 2, 4], nodes: [para("✳")], style: { fontSize: 34, textColor: ON_ACCENT, fontFamily: DISPLAY } },
      { at: [3, 2, 11, 11], nodes: [para("You don't need more visibility. You need the right five people to know exactly what you do")], style: { fontSize: 36, fontWeight: 800, textColor: ON_ACCENT, fontFamily: DISPLAY, customCss: "letter-spacing:-.02em;line-height:1.25" } },
    ] },
    // p76 — conclusion: tracked display, justified farewell.
    { kind: "blocks", blocks: [
      { at: [1, 2, 2, 5], furniture: true, nodes: [para("Freelance guide")], style: { fontSize: 9, fontWeight: 700, textColor: INK, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.2em" } },
      { at: [1, 5, 2, 12], nodes: [emptyP], style: { customCss: "border-top:1px solid var(--pc-ink);margin-top:8px" } },
      { at: [2, 2, 5, 12], furniture: true, nodes: [para("Conclusion")], style: { textAlign: "center", fontSize: 52, fontWeight: 500, textColor: INK, fontFamily: DISPLAY, customCss: UPPER + ";letter-spacing:.06em;line-height:1" } },
      { at: [5, 3, 11, 11], nodes: [
        para("Close the loop: remind the reader where they started, what they can now do, and the single next action to take this week."),
        para("Gratitude lands better than a sales pitch — thank them, point once at where to find you, and stop."),
      ], style: { fontSize: 12, textColor: INK, fontFamily: BODY, customCss: "text-align:justify;line-height:1.9" } },
    ] },
    // p77 — back cover: flame field, author bio quote, sign-off.
    { kind: "blocks", cover: true, background: { kind: "solid", color: ACCENT }, blocks: [
      { at: [2, 2, 6, 11], slot: "author", fallback: "keep", nodes: [para("“[Author Name] is a freelance designer who has spent the last ten years navigating the highs and lows of independent work.”")], style: { fontSize: 15, textColor: ON_ACCENT, fontFamily: BODY, customCss: "line-height:1.8" } },
      { at: [11, 2, 12, 12], furniture: true, nodes: [para("Thanks for reading — now go build something that lasts.")], style: { fontSize: 13, textColor: ON_ACCENT, fontFamily: BODY } },
    ] },
  ],
};

export const CANVA_STRUCTURES = { mediaKit, emailAutomation, remoteReport, mindful, freelancer } satisfies Record<
  Extract<StructKey, "mediaKit" | "emailAutomation" | "remoteReport" | "mindful" | "freelancer">,
  StructureSpec
>;
