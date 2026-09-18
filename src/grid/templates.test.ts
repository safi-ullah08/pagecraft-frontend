import { test } from "node:test";
import assert from "node:assert/strict";
import { layout, type LayoutPlan } from "@pagecraft/model";
import type { JSONContent } from "@tiptap/react";
import { STRUCTURES, interpret, assertAreasValid, listTemplates, templateSections, parseTemplateId, structureToLayoutSpec, foldChapters, docPlanToLayout } from "./templates.ts";
import { isCoverSection } from "./covers.ts";
import { isTocSection, collectToc } from "./toc.ts";

// run: cd pagecraft-backend && node --import tsx --test ../pagecraft-frontend/src/grid/templates.test.ts

test("every structure interprets to the expected page count", () => {
  assert.equal(interpret(STRUCTURES.leadMagnet).length, 3);
  assert.equal(interpret(STRUCTURES.ebook).length, 6);
  assert.equal(interpret(STRUCTURES.guidebook).length, 8);
  assert.equal(interpret(STRUCTURES.wellness).length, 8);
  assert.equal(interpret(STRUCTURES.report).length, 4);
  assert.equal(interpret(STRUCTURES.mediaKit).length, 9);
  assert.equal(interpret(STRUCTURES.emailAutomation).length, 6);
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
  assert.ok(isCoverSection(gb[0]) && isCoverSection(gb[7]), "guidebook front + back are covers");
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
  assert.ok(!all.some((t) => t.theme.startsWith("canva-") && !STRUCTURES[t.structKey].lockedTheme), "no open structure wears a canva skin");
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
  assert.deepEqual(report, []); // every slot bound — nothing hidden
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

// ---- freelancer: chapter dividers stand alone -----------------------------------

test("freelancer: the chapter divider holds only its marker and title; content starts on the next page", () => {
  let n = 0;
  const { sections, report } = layout(fakePlan, structureToLayoutSpec(STRUCTURES.freelancer), geom, stub, () => `b${n++}`);
  const text = (i: number) => JSON.stringify(sections[i]);
  const opener = sections.findIndex((s) => JSON.stringify(s).includes("Chapter 1"));
  assert.ok(opener >= 0, "chapter 1 divider exists");
  assert.match(text(opener), /Getting Started/, "divider carries the chapter title");
  // the title keeps the template's h3 design (small ivory caps), not the skin's large dark h1
  const title = sections[opener]!.blocks.map((b) => (b.content as { content?: { type: string; attrs?: { level?: number }; content?: { text?: string }[] }[] }).content?.[0])
    .find((node) => node?.type === "heading" && node.content?.[0]?.text === "Getting Started");
  assert.equal(title?.attrs?.level, 3, "chapter title renders as the designed h3");
  assert.doesNotMatch(text(opener), /para \d/, "no chapter prose on the divider");
  assert.match(text(opener + 1), /para 0/, "the chapter's first paragraph opens the next page");
  // the Canva preview copy never ships: the caps opener line and the flow-page label
  const js = JSON.stringify(sections);
  assert.doesNotMatch(js, /Nobody hires the freelancer/);
  assert.doesNotMatch(js, /First step/);
  assert.ok(!report.some((r) => r.includes("intro")), `no intro slot left to bind: ${report}`);
});

test("docPlanToLayout drops the source's EMPTY contents chapter and nothing else", () => {
  const ch = (title: string, content: JSONContent[]) => ({ title, level: 1, body: { type: "doc", content } });
  const plan = docPlanToLayout({ chapters: [
    ch("Introduction", [p("IRON HERO RUN")]),
    ch("Table of Contents", [h("Table of Contents"), { type: "paragraph" }]), // Word field that didn't convert
    ch("1. Concept Overview", [h("1. Concept Overview"), p("Iron Hero Run is…")]),
    ch("Part II", [h("Part II")]),                                            // an empty divider that ISN'T contents
  ] }, {});
  assert.deepEqual(plan.chapters.map((c) => c.title), ["Introduction", "1. Concept Overview", "Part II"]);

  const typed = docPlanToLayout({ chapters: [ch("Contents", [h("Contents"), p("Concept Overview ........ 3")])] }, {});
  assert.equal(typed.chapters.length, 1, "a contents chapter with real entries is kept");
});

// ---- the lead-in (content before the first heading) is not a chapter ------------

const ironHero = (): Parameters<typeof docPlanToLayout>[0] => {
  const ch = (title: string, content: JSONContent[], level = 1) => ({ title, level, body: { type: "doc", content } });
  const sections = ["1. Concept Overview", "2. Playable Characters", "3. Enemies & Obstacles", "4. Collectibles & Currency",
    "5. World & Level Structure", "6. Progression & Unlocks", "7. Summary Snapshot"];
  return { chapters: [
    // import names the pre-heading title block "Introduction"
    ch("Introduction", [p("IRON HERO RUN"), p("A Retro-Futuristic Robot Hero Endless Runner"), p("Game Design Document — v1.0")]),
    ch("Table of Contents", [h("Table of Contents")]),
    ...sections.flatMap((t, i) => [
      ch(t, [h(t), p(`body of section ${i + 1}`)]),
      ch(`${i + 1}.1 Detail`, [h(`${i + 1}.1 Detail`, 2), p(`detail ${i + 1}`)], 2),
    ]),
  ] };
};

test("docPlanToLayout: the pre-heading lead-in is marked front; headed chapters are not", () => {
  const plan = docPlanToLayout(ironHero(), {});
  assert.equal(plan.chapters[0]!.role, "front");
  assert.deepEqual(plan.chapters.slice(1).map((c) => c.role), Array(7).fill(undefined));
  assert.equal(plan.chapters.length, 8, "lead-in + 7 sections (contents dropped, x.1 folded in)");

  // a document that opens with a heading has no lead-in
  const headed = docPlanToLayout({ chapters: [{ title: "One", level: 1, body: { type: "doc", content: [h("One"), p("x")] } }] }, {});
  assert.equal(headed.chapters[0]!.role, undefined);
});

test("foldChapters: a subsection right after the lead-in opens its own chapter, never folds into it", () => {
  const folded = foldChapters([
    { title: "Introduction", level: 1, role: "front", nodes: [p("title block")] },
    { title: "Overview", level: 2, nodes: [h("Overview", 2), p("o")] },
  ]);
  assert.deepEqual(folded.map((c) => c.title), ["Introduction", "Overview"]);
});

test("freelancer: Chapter 1 is the first numbered section, and 7 sections make 7 chapters", () => {
  let n = 0;
  const { sections } = layout(docPlanToLayout(ironHero(), {}), structureToLayoutSpec(STRUCTURES.freelancer), geom, stub, () => `b${n++}`);
  const at = (re: RegExp) => sections.findIndex((s) => re.test(JSON.stringify(s)));
  const js = JSON.stringify(sections);

  for (let i = 1; i <= 7; i++) {
    const opener = at(new RegExp(`"Chapter ${i}"`));
    assert.ok(opener >= 0, `Chapter ${i} exists`);
    assert.match(JSON.stringify(sections[opener]), new RegExp(`"${i}\\. `), `Chapter ${i} carries section ${i}'s title`);
    assert.match(JSON.stringify(sections[opener + 1]), new RegExp(`body of section ${i}`), `section ${i}'s body follows its own divider`);
  }
  assert.doesNotMatch(js, /"Chapter 8"/, "no phantom eighth chapter");
  assert.doesNotMatch(js, /"Introduction"/, "the synthesized title never becomes a divider");
  assert.ok(at(/IRON HERO RUN/) >= 0 && at(/IRON HERO RUN/) < at(/"Chapter 1"/), "the title block still ships, before Chapter 1");
});
