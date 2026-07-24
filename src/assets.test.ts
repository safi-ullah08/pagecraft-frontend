import { test } from "node:test";
import assert from "node:assert/strict";
import { assetsToDisplay, assetsToCanonical } from "./assets.ts";
import type { SectionContent } from "./api.ts";

// run: cd pagecraft-backend && node --import tsx --test ../pagecraft-frontend/src/assets.test.ts

const grid = (background: unknown): SectionContent =>
  ({ type: "grid", blocks: [], background }) as unknown as SectionContent;
const bgOf = (s: SectionContent) => (s as unknown as { background: { src: string } }).background.src;

test("a page background image round-trips asset:// <-> the resolver URL", () => {
  const canonical = grid({ kind: "image", src: "asset://assets/ws1/bg.png", fit: "cover" });
  const display = assetsToDisplay(canonical);
  assert.equal(bgOf(display), "/api/assets/resolve?key=assets%2Fws1%2Fbg.png");
  // and back — the DB must never store the display URL, or the worker can't bundle it
  assert.equal(bgOf(assetsToCanonical(display)), "asset://assets/ws1/bg.png");
});

test("non-image backgrounds and blocks are untouched", () => {
  const solid = grid({ kind: "solid", color: "#fff" });
  assert.deepEqual(assetsToCanonical(assetsToDisplay(solid)), solid);
});

test("block images still round-trip alongside the section background", () => {
  const s = {
    type: "grid",
    background: { kind: "image", src: "asset://assets/ws1/bg.png" },
    blocks: [{ id: "a", area: {}, block: "image", content: { src: "asset://assets/ws1/pic.png" } }],
  } as unknown as SectionContent;
  const back = assetsToCanonical(assetsToDisplay(s));
  assert.deepEqual(back, s);
});
