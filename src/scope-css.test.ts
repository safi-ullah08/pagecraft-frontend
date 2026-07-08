import { test } from "node:test";
import assert from "node:assert/strict";
import { scopeThemeCss } from "./scope-css.ts";

// run: cd pagecraft-backend && node --import tsx --test ../pagecraft-frontend/src/scope-css.test.ts
test("scopeThemeCss prefixes selectors, maps body->root, drops @page", () => {
  const css = `
    @page { size: A4; margin: 0; }
    html, body { color: #111; font-family: serif; }
    h1 { font-size: 36px; }
    .callout { border-left: 4px solid red; }
    .divider:before, hr:after { content: "*"; }
  `;
  const out = scopeThemeCss(css, ".surf");
  assert.ok(!out.includes("@page"), "@page dropped");
  assert.ok(out.includes(".surf { color: #111; font-family: serif; }"), "body->root");
  assert.ok(out.includes(".surf h1 {"), "h1 nested");
  assert.ok(out.includes(".surf .callout {"), "class nested");
  assert.ok(out.includes(".surf .divider:before, .surf hr:after {"), "comma list each nested");
});
