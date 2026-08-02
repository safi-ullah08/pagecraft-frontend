import { test } from "node:test";
import assert from "node:assert/strict";
import { STRUCTURES, interpret, assertAreasValid, listTemplates, templateSections, parseTemplateId } from "./templates.ts";
import { isCoverSection } from "./covers.ts";
import { isTocSection } from "./toc.ts";

// run: cd pagecraft-backend && node --import tsx --test ../pagecraft-frontend/src/grid/templates.test.ts

test("every structure interprets to the expected page count", () => {
  assert.equal(interpret(STRUCTURES.leadMagnet).length, 3);
  assert.equal(interpret(STRUCTURES.ebook).length, 6);
  assert.equal(interpret(STRUCTURES.guidebook).length, 8);
  assert.equal(interpret(STRUCTURES.wellness).length, 8);
  assert.equal(interpret(STRUCTURES.report).length, 4);
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

test("catalog is the themes × structures cross-product with unique, resolvable ids", () => {
  const themes = ["editorial-classic", "botanical", "luxe-dark", "modern-minimal", "tech-manual"];
  const all = listTemplates(themes);
  assert.equal(all.length, themes.length * 5); // 5 structures per theme
  assert.equal(new Set(all.map((t) => t.id)).size, all.length, "ids are unique");
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

test("blocks reference theme tokens, never hardcoded colour (so they re-skin)", () => {
  for (const spec of Object.values(STRUCTURES)) {
    const json = JSON.stringify(interpret(spec));
    assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(json), `no hex colours in ${spec.key}`);
  }
});
