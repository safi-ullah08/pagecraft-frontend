import type { JSONContent } from "@tiptap/react";

// asset://<key> is the canonical, durable image ref stored in the DB (the worker
// bundles it into the PDF). The browser can't load asset://, so for on-screen
// editing we swap it to the backend resolver and swap it back before saving —
// the DB never sees the display URL. Covers any node carrying attrs.src (the
// stock image node and the custom figure node alike).
const PREFIX = "asset://";
const RESOLVE = "/api/assets/resolve?key=";

function mapSrc(node: JSONContent, fn: (src: string) => string): JSONContent {
  const out: JSONContent = { ...node };
  if (out.attrs && typeof out.attrs.src === "string") {
    out.attrs = { ...out.attrs, src: fn(out.attrs.src) };
  }
  if (out.content) out.content = out.content.map((c) => mapSrc(c, fn));
  return out;
}

// asset://<key> -> /api/assets/resolve?key=<key> (for the editor)
export function assetsToDisplay(doc: JSONContent): JSONContent {
  return mapSrc(doc, (s) =>
    s.startsWith(PREFIX) ? RESOLVE + encodeURIComponent(s.slice(PREFIX.length)) : s,
  );
}

// /api/assets/resolve?key=<key> -> asset://<key> (before persisting)
export function assetsToCanonical(doc: JSONContent): JSONContent {
  return mapSrc(doc, (s) =>
    s.startsWith(RESOLVE) ? PREFIX + decodeURIComponent(s.slice(RESOLVE.length)) : s,
  );
}
