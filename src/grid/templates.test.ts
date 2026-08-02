import { test } from "node:test";
import assert from "node:assert/strict";
import { STRUCTURES, interpret, assertAreasValid, listTemplates, templateSections, parseTemplateId } from "./templates.ts";
import { isCoverSection } from "./covers.ts";
import { isTocSection } from "./toc.ts";

// run: cd pagecraft-backend && node --import tsx --test ../pagecraft-frontend/src/grid/templates.test.ts

test("every structure interprets to the expected page count", () => {
  assert.equal(interpret(STRUCTURES.leadMagnet).length, 3);
  assert.equal(interpret(STRUCTURES.ebook).length, 4);
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
  assert.ok(isTocSection(eb[1]), "ebook page 2 is a toc");
});

test("catalog is the themes × structures cross-product with unique, resolvable ids", () => {
  const themes = ["editorial-classic", "botanical", "luxe-dark", "modern-minimal", "tech-manual"];
  const all = listTemplates(themes);
  assert.equal(all.length, themes.length * 3); // 15
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
  const json = JSON.stringify(interpret(STRUCTURES.report));
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(json), "no hex colours in a structure");
});
