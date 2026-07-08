import type { SectionContent } from "./api.ts";

// asset://<key> is the canonical, durable image ref stored in the DB (the worker
// bundles it into the PDF). The browser can't load asset://, so for on-screen
// editing we swap it to the backend resolver and swap it back before saving —
// the DB never sees the display URL. Covers any node carrying attrs.src (the
// stock image node and the custom figure node alike). Grid sections have no such
// nodes at the top level, so they pass through unchanged (image blocks in MVP
// carry plain URLs, not asset:// — import-populate handles asset refs in P3).
const PREFIX = "asset://";
const RESOLVE = "/api/assets/resolve?key=";

// deno-lint-ignore no-explicit-any
function mapSrc(node: any, fn: (src: string) => string): any {
  if (!node || typeof node !== "object") return node;
  const out = { ...node };
  if (out.attrs && typeof out.attrs.src === "string") {
    out.attrs = { ...out.attrs, src: fn(out.attrs.src) };
  }
  if (Array.isArray(out.content)) out.content = out.content.map((c: unknown) => mapSrc(c, fn));
  return out;
}

// asset://<key> -> /api/assets/resolve?key=<key> (for the editor)
export function assetsToDisplay(doc: SectionContent): SectionContent {
  return mapSrc(doc, (s) =>
    s.startsWith(PREFIX) ? RESOLVE + encodeURIComponent(s.slice(PREFIX.length)) : s,
  );
}

// /api/assets/resolve?key=<key> -> asset://<key> (before persisting)
export function assetsToCanonical(doc: SectionContent): SectionContent {
  return mapSrc(doc, (s) =>
    s.startsWith(RESOLVE) ? PREFIX + decodeURIComponent(s.slice(RESOLVE.length)) : s,
  );
}
