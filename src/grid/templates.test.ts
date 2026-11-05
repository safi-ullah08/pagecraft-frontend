import { test } from "node:test";
import assert from "node:assert/strict";
import { layout, type LayoutPlan } from "@pagecraft/model";
import { interpret, assertAreasValid, listTemplates, templateSections, parseTemplateId, structureToLayoutSpec, foldChapters, docPlanToLayout, setStructures } from "./templates.ts";
import { BUILTIN_STRUCTURES as STRUCTURES, BUILTIN_ORDER } from "./builtinStructures.ts";
import { isCoverSection } from "./covers.ts";
import { art, type StructureSpec } from "./spec.ts";
import { isTocSection, collectToc } from "./toc.ts";

// run: cd pagecraft-backend && node --import tsx --test ../pagecraft-frontend/src/grid/templates.test.ts

// The app fills the registry from GET /api/templates; the tests fill it with the
// built-ins those system rows are seeded from.
setStructures(BUILTIN_ORDER.map((k) => STRUCTURES[k]));

test("every structure interprets to the expected page count", () => {
  assert.equal(interpret(STRUCTURES.leadMagnet).length, 3);
  assert.equal(interpret(STRUCTURES.ebook).length, 6);
  assert.equal(interpret(STRUCTURES.guidebook).length, 9); // two flow pages: plain + illustrated
  assert.equal(interpret(STRUCTURES.wellness).length, 8);
  assert.equal(interpret(STRUCTURES.report).length, 4);
  assert.equal(interpret(STRUCTURES.mediaKit).length, 9);
  assert.equal(interpret(STRUCTURES.emailAutomation).length, 7); // + the chapter 2 chart page
  assert.equal(interpret(STRUCTURES.remoteReport).length, 8);
  assert.equal(interpret(STRUCTURES.mindful).length, 9);
  assert.equal(interpret(STRUCTURES.freelancer).length, 9);
});

test("all placed blocks fit the 12×12 grid", () => {
  assert.doesNotThrow(assertAreasValid);
});

test("cover / toc pages keep their flags so they're excluded from numbering + contents", () => {
  const em = interpret(STRUCTURES.leadMagnet);
  assert.ok(isCoverSection(em[0]), "lead magnet page 1 is a cover");
  const eb = interpret(STRUCTURES.ebook);
  assert.ok(isCoverSection(eb[0]), "ebook page 1 is a cover");
  assert.ok(isTocSection(eb[2]), "ebook page 3 is a toc");
  const gb = interpret(STRUCTURES.guidebook);
  assert.ok(isCoverSection(gb[0]) && isCoverSection(gb[8]), "guidebook front + back are covers"); // 8: the illustrated flow page pushed it along
  assert.ok(isTocSection(gb[2]), "guidebook page 3 is a toc");
  const wl = interpret(STRUCTURES.wellness);
  assert.ok(isCoverSection(wl[0]) && isCoverSection(wl[7]), "wellness front + back are covers");
  assert.ok(isTocSection(wl[1]), "wellness page 2 is a toc");
});

test("catalog: open structures cross-product; locked Canva designs ship one card each", () => {
  const themes = ["editorial-classic", "botanical", "luxe-dark", "modern-minimal", "tech-manual", "canva-media-kit"];
  const all = listTemplates(themes);
  const open = 3;   // leadMagnet, ebook, report
  const locked = 7; // guidebook, wellness + the 5 canva sets
  // canva-* themes never enter the cross-product; locked structures appear once
  assert.equal(all.length, (themes.length - 1) * open + locked);
  assert.equal(new Set(all.map((t) => t.id)).size, all.length, "ids are unique");
  assert.ok(!all.some((t) => t.theme.startsWith("canva-") && !STRUCTURES[t.structKey as keyof typeof STRUCTURES].lockedTheme), "no open structure wears a canva skin");
  for (const key of ["guidebook", "wellness", "mediaKit", "emailAutomation", "remoteReport", "mindful", "freelancer"] as const) {
    const cards = all.filter((t) => t.structKey === key);
    assert.equal(cards.length, 1, `${key} ships exactly one card`);
    assert.equal(cards[0]!.theme, STRUCTURES[key].lockedTheme, `${key} is bound to its own skin`);
  }
  // every catalog entry resolves back to real sections
  for (const t of all) assert.ok(templateSections(t).length >= 3, `${t.id} resolves`);
});

test("parseTemplateId round-trips every catalog id and rejects junk", () => {
  const themes = ["editorial-classic", "luxe-dark"]; // note the '-' in theme names
  for (const t of listTemplates(themes)) {
    assert.deepEqual(parseTemplateId(t.id), t, `round-trips ${t.id}`);
  }
  assert.equal(parseTemplateId("editorial-classic:notAStruct"), null);
  assert.equal(parseTemplateId("noColon"), null);
  assert.equal(parseTemplateId(":ebook"), null);
});

test("slot:'toc' pages carry a fillable tocList and the toc flag", () => {
  const gb = interpret(STRUCTURES.guidebook)[2]!;
  assert.ok(isTocSection(gb), "guidebook contents keeps the toc flag");
  const toc = gb.blocks.find((b) => b.block === "tocList");
  assert.ok(toc, "guidebook contents page carries a tocList");
  assert.deepEqual((toc!.content as { entries: unknown[] }).entries, []); // filled by the store
  // the design around the slot survives: panel + kicker + title + rule
  assert.ok(gb.blocks.length >= 4, "bespoke design blocks placed around the slot");
  const wl = interpret(STRUCTURES.wellness)[1]!;
  assert.ok(isTocSection(wl) && wl.blocks.some((b) => b.block === "tocList"));
});

// ---- the engine path: structureToLayoutSpec + model layout() -----------------

const p = (t: string) => ({ type: "paragraph", content: [{ type: "text", text: t }] });
const h = (t: string, level = 1) => ({ type: "heading", attrs: { level }, content: [{ type: "text", text: t }] });
const geom = { rowPx: 100, colPx: 100 };
const stub = (d: { content?: unknown[] }, cols: number) => ({ w: cols * 100, h: 100 * (d.content?.length ?? 1) * (12 / cols) });
const fakePlan: LayoutPlan = {
  meta: { title: "Real Title", subtitle: "Real strapline", author: "Real Author", hero: "asset://hero.png" },
  chapters: [
    { title: "Getting Started", level: 1, nodes: [h("Getting Started"), ...Array.from({ length: 18 }, (_, i) => p(`para ${i}`))] },
    { title: "Going Deeper", level: 1, nodes: [h("Going Deeper"), p("short chapter body")] },
  ],
};

test("guidebook spec: imported content lands in the designed layout, placeholder-free", () => {
  let n = 0;
  const { sections, report } = layout(fakePlan, structureToLayoutSpec(STRUCTURES.guidebook), geom, stub, () => `b${n++}`);
  const js = JSON.stringify(sections);
  // cover bound from meta, placeholder gone
  assert.match(js, /Real Title/);
  assert.match(js, /Real Author/);
  assert.doesNotMatch(js, /How to Become an Entrepreneur/);
  // hero image slot on the welcome page
  assert.match(js, /asset:\/\/hero\.png/);
  // per-chapter openers bound; both chapters present
  assert.match(js, /Chapter 1/);
  assert.match(js, /Chapter 2/);
  assert.match(js, /Getting Started/);
  assert.match(js, /Going Deeper/);
  // real body flowed in
  assert.match(js, /para 9/);
  // THE PLACEHOLDER RULE: the template's own copy never ships —
  assert.doesNotMatch(js, /Body copy flows down the left column/); // flow-page copy
  assert.doesNotMatch(js, /Title of the book/);                    // welcome colophon
  assert.doesNotMatch(js, /Lead with the step itself/);            // numbered-list panel
  assert.doesNotMatch(js, /Sign off in your own voice/);           // thank-you body
  assert.doesNotMatch(js, /I should start something/);             // back-cover blurb
  // — but designed furniture does
  assert.match(js, /Hello and welcome!/);
  assert.match(js, /Thank you!/);
  // contents page kept its design (toc slot) and the toc flag
  assert.ok(sections.some((s) => isTocSection(s) && s.blocks.some((b) => b.block === "tocList")));
  // front + back covers survive the adapter
  assert.ok(isCoverSection(sections[0]));
  // no empty pages, every area on-grid
  for (const s of sections) {
    assert.ok(s.blocks.length > 0, "no empty pages");
    for (const b of s.blocks) {
      const a = b.area;
      assert.ok(a.rowStart >= 1 && a.colStart >= 1 && a.rowEnd <= 13 && a.colEnd <= 13 && a.rowStart < a.rowEnd && a.colStart < a.colEnd, `bad area ${JSON.stringify(a)}`);
    }
  }
  // The illustrated flow page's image slot carries no fallback, so a fixture with
  // no pictures leaves that corner empty and says so. Nothing ELSE may be hidden.
  assert.deepEqual(report.filter((r) => !r.startsWith("hidden image slot")), []);
  assert.ok(report.every((r) => r === "hidden image slot (chapter has no image)"));
});

test("foldChapters: h1 opens a chapter, h2 folds in (heading kept); Notes stays apart", () => {
  const folded = foldChapters([
    { title: "Lecture 1", level: 1, nodes: [h("Lecture 1"), p("intro")] },
    { title: "Exercises", level: 2, nodes: [h("Exercises", 2), p("try this")] },
    { title: "Lecture 2", level: 1, nodes: [h("Lecture 2"), p("more")] },
    { title: "Notes", level: 2, nodes: [h("Notes", 2)], role: "notes" },
  ]);
  assert.deepEqual(folded.map((c) => c.title), ["Lecture 1", "Lecture 2", "Notes"]);
  // the h2 heading STAYS in the parent's body — it must reach the contents page
  assert.match(JSON.stringify(folded[0]!.nodes), /Exercises/);
});

test("the contents page lists chapters AND folded subsections after layout", () => {
  let n = 0;
  const plan: LayoutPlan = {
    meta: {},
    chapters: foldChapters([
      { title: "Lecture 1", level: 1, nodes: [h("Lecture 1"), ...Array.from({ length: 6 }, (_, i) => p(`a${i}`))] },
      { title: "Exercises", level: 2, nodes: [h("Exercises", 2), p("try")] },
      { title: "Lecture 2", level: 1, nodes: [h("Lecture 2"), p("body")] },
    ]),
  };
  const { sections } = layout(plan, structureToLayoutSpec(STRUCTURES.guidebook), geom, stub, () => `b${n++}`);
  const entries = collectToc(sections);
  const texts = entries.map((e) => e.text);
  assert.ok(texts.includes("Lecture 1"), `chapter 1 in toc: ${texts}`);
  assert.ok(texts.includes("Exercises"), `folded h2 in toc: ${texts}`);
  assert.ok(texts.includes("Lecture 2"), `chapter 2 in toc: ${texts}`);
});

test("wellness spec: flow pages alternate and back matter lands after the chapters", () => {
  let n = 0;
  const { sections } = layout(fakePlan, structureToLayoutSpec(STRUCTURES.wellness), geom, stub, () => `b${n++}`);
  const js = JSON.stringify(sections);
  assert.match(js, /Real Title/);
  assert.match(js, /Getting Started/);
  // back matter (quadrant framework + glossary + back cover) after the content
  assert.match(js, /Glossary/);
  const glossaryIdx = sections.findIndex((s) => JSON.stringify(s).includes("Glossary"));
  const lastBody = sections.reduce((acc, s, i) => (JSON.stringify(s).includes("para ") ? i : acc), 0);
  assert.ok(glossaryIdx > lastBody, "glossary sits after the flowed content");
});

test("every structure applies cleanly through the engine", () => {
  for (const spec of Object.values(STRUCTURES)) {
    let n = 0;
    const { sections } = layout(fakePlan, structureToLayoutSpec(spec), geom, stub, () => `b${n++}`);
    const js = JSON.stringify(sections);
    assert.match(js, /para 9/, `${spec.key}: imported body flowed in`);
    assert.match(js, /Getting Started/, `${spec.key}: chapter title present`);
    for (const s of sections) {
      assert.ok(s.blocks.length > 0, `${spec.key}: no empty pages`);
      for (const b of s.blocks) {
        const a = b.area;
        assert.ok(a.rowStart >= 1 && a.colStart >= 1 && a.rowEnd <= 13 && a.colEnd <= 13, `${spec.key}: bad area`);
      }
    }
  }
});

test("report speaks in Sections; ebook binds its numeral opener and running head", () => {
  let n = 0;
  const report = JSON.stringify(layout(fakePlan, structureToLayoutSpec(STRUCTURES.report), geom, stub, () => `b${n++}`).sections);
  assert.match(report, /Section 1/);
  assert.match(report, /Section 2/);
  assert.doesNotMatch(report, /Chapter 1/);
  assert.doesNotMatch(report, /Report title goes here/); // title slot went empty, not placeholder
  n = 0;
  const ebook = JSON.stringify(layout(fakePlan, structureToLayoutSpec(STRUCTURES.ebook), geom, stub, () => `b${n++}`).sections);
  assert.match(ebook, /Chapter 1/); // running head + opener kicker
  assert.doesNotMatch(ebook, /Where good books begin/);      // opener placeholder gone
  assert.doesNotMatch(ebook, /Designing Beautiful Ebooks/);  // cover title bound from meta
  assert.doesNotMatch(ebook, /Good design is as little design/); // epigraph page vanished
  assert.match(ebook, /Real Title/);
});

test("docPlanToLayout: display srcs, folded chapters, hero resolved", () => {
  const plan = docPlanToLayout(
    { chapters: [
      { title: "One", level: 1, body: { type: "doc", content: [h("One"), { type: "image", attrs: { src: "asset://k1" } }] } },
      { title: "Sub", level: 2, body: { type: "doc", content: [h("Sub", 2), p("x")] } },
    ] },
    { subtitle: "S", hero: "asset://cover" },
  );
  assert.equal(plan.chapters.length, 1); // Sub folded into One
  assert.match(JSON.stringify(plan.chapters[0]!.nodes), /\/api\/assets\/resolve\?key=k1/); // display form
  assert.equal(plan.meta.hero, "/api/assets/resolve?key=cover");
  assert.equal(plan.meta.subtitle, "S");
});

test("blocks reference theme tokens, never hardcoded colour (so they re-skin)", () => {
  for (const spec of Object.values(STRUCTURES)) {
    const json = JSON.stringify(interpret(spec));
    assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(json), `no hex colours in ${spec.key}`);
  }
});

test("template-owned art survives interpret() and the apply path, in display form", () => {
  const spec: StructureSpec = {
    key: "art-fixture", docType: "ebook", name: "Art fixture",
    pages: [{ kind: "blocks", blocks: [art([1, 1, 4, 5], "lotus.svg", "Lotus")] }],
  };
  const display = "/api/assets/resolve?key=" + encodeURIComponent("assets/_system/lotus.svg");

  const [page] = interpret(spec);
  assert.deepEqual(page!.blocks[0]!.content, { src: display, alt: "Lotus" });
  assert.equal(page!.blocks[0]!.block, "image");

  // the apply path keeps it too — art is not a slot, so nothing can empty it
  const lp = structureToLayoutSpec(spec).pages[0]!;
  assert.equal(lp.blocks[0]!.slot, undefined);
  assert.deepEqual(lp.blocks[0]!.content, { src: display, alt: "Lotus" });
});

test("email automation: a chapter's sections fill all four cells of the 2x2 opener", () => {
  // The source design puts the steps ON the opener, so that page carries four
  // `intro` slots rather than one column. Each takes the chapter's next
  // heading-and-paragraphs, in READING order — which is not array order on a
  // grid, so the engine sorts by row then column.
  //
  // This test needs its own measure: the shared `stub` charges 100px a row per
  // node and a cell is 3 rows, so under it a single heading already fills a
  // cell and nothing would group. 30px a node lets a chip and its paragraph sit
  // together, which is what the browser actually renders.
  const roomy = (d: { content?: unknown[] }, cols: number) => ({ w: cols * 100, h: 30 * (d.content?.length ?? 1) });
  const section = (title: string, body: string) => [h(title, 3), p(body)];
  const sectioned: LayoutPlan = {
    meta: { title: "Doc" },
    chapters: [{
      title: "Step by Step", level: 1,
      nodes: [h("Step by Step"),
        ...section("First step", "first body"),
        ...section("Second step", "second body"),
        ...section("Third step", "third body"),
        ...section("Fourth step", "fourth body"),
        ...section("Fifth step", "runs past the grid")],
    }],
  };
  let n = 0;
  const { sections } = layout(sectioned, structureToLayoutSpec(STRUCTURES.emailAutomation), geom, roomy, () => `b${n++}`);
  const opener = sections.find((s) => JSON.stringify(s).includes("Step by Step"))!;
  assert.ok(opener, "opener present");
  const cells = [
    { rowStart: 5, colStart: 2, rowEnd: 8, colEnd: 7 },
    { rowStart: 5, colStart: 7, rowEnd: 8, colEnd: 12 },
    { rowStart: 8, colStart: 2, rowEnd: 11, colEnd: 7 },
    { rowStart: 8, colStart: 7, rowEnd: 11, colEnd: 12 },
  ];
  const texts = cells.map((c) => {
    const b = opener.blocks.find((x) => JSON.stringify(x.area) === JSON.stringify(c));
    assert.ok(b, `a block fills cell ${JSON.stringify(c)}`);
    return JSON.stringify(b!.content);
  });
  // Reading order, each cell holding its chip AND its copy.
  assert.match(texts[0]!, /First step/);
  assert.match(texts[0]!, /first body/);
  assert.match(texts[1]!, /Second step/);
  assert.match(texts[2]!, /Third step/);
  assert.match(texts[3]!, /Fourth step/);
  // No cell steals the next cell's chip.
  assert.doesNotMatch(texts[0]!, /Second step/);
  // What the grid has no room for still flows onto the body pages.
  const past = sections.filter((s) => s !== opener);
  assert.match(JSON.stringify(past), /Fifth step/);
  // And the template's own placeholder copy never ships.
  const js = JSON.stringify(sections);
  assert.doesNotMatch(js, /Decide what starts the sequence/);
  assert.doesNotMatch(js, /Watch the step where people stop/);
});

test("a block's h-rule says `inherit`, never a second copy of its own type tokens", () => {
  // A skin styles h1..h6 directly and beats a block's inline style, so a block
  // that IS a heading has to opt back in. Writing `font-size:46px` into that
  // rule, beside the block's own `fontSize: 46`, is one number written twice and
  // free to drift — hInherit() names the property and says inherit. Decoration
  // on a heading (a rule, a border, a background) is a different thing and fine.
  const COPY = /^\s*(?:color|font-size|font-weight|font-family|letter-spacing|line-height)\s*:\s*(?!inherit)/;
  const bad: string[] = [];
  for (const key of BUILTIN_ORDER) {
    STRUCTURES[key]!.pages.forEach((page, pi) => {
      if (page.kind !== "blocks") return;
      for (const b of page.blocks) {
        for (const m of (b.style?.customCss ?? "").matchAll(/h[1-6][^{]*\{([^}]*)\}/g)) {
          for (const decl of m[1]!.split(";")) {
            if (COPY.test(decl)) bad.push(`${key} page ${pi + 1}: ${decl.trim()}`);
          }
        }
      }
    });
  }
  assert.deepEqual(bad, []);
});
