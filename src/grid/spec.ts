// Shared authoring kit for document STRUCTURES: the spec types plus the block and
// style helpers structures are written with. Extracted verbatim from templates.ts
// so canvaStructures.ts can import it without a runtime module cycle
// (templates.ts imports the structures; the structures import only this).
import type { JSONContent } from "@tiptap/react";
import type { PageNumberConfig, SlotKind, PageRole } from "@pagecraft/model";
import type { BlockStyleTokens, PageBackground } from "./types.ts";

// A placed block: [rowStart, colStart, rowEnd, colEnd] on the 12×12 grid.
// `image: true` = an empty image slot (the editor shows a click-to-fill placeholder).
// `slot` = the layout engine's binding: `nodes` stays the PLACEHOLDER (what
// createFromTemplate and the gallery thumbnails render); the slot is what the
// engine fills with a real document's content/metadata when a template is
// applied to an import. `props` merges into a slot block's typed content.
// `furniture` = designed micro-copy that SHIPS on apply (a contents title, a
// worksheet label) — everything else literal-with-text is preview-only.
export type BlockSpec = { at: [number, number, number, number]; nodes?: JSONContent[]; style?: BlockStyleTokens; z?: number; image?: true; slot?: SlotKind; fallback?: "hide" | "keep" | "empty"; furniture?: true; props?: Record<string, unknown> };
// `role` groups pages for the engine: front matter (default), the per-chapter
// opener, cycling flow pages, back matter. interpret() ignores roles — the
// placeholder template renders every page once, exactly as authored.
export type PageSpec =
  | { kind: "blocks"; role?: PageRole; background?: PageBackground; cover?: true; blocks: BlockSpec[] } // cover:true = hand-crafted cover, excluded from numbering/TOC
  | { kind: "cover"; cover: string }   // reuse a covers.ts front/back design
  | { kind: "toc" };                    // a "Contents" placeholder; user regenerates
export type DocType = "leadMagnet" | "ebook" | "report";
// Structures beyond the original three (one per docType) get their own key but
// still belong to a docType for gallery grouping + import covers.
export type StructKey = DocType | "guidebook" | "wellness"
  | "mediaKit" | "emailAutomation" | "remoteReport" | "mindful" | "freelancer";
export type StructureSpec = {
  key: StructKey; docType: DocType; name: string; pages: PageSpec[];
  pageNumbers?: PageNumberConfig; // set on the new doc when the structure wants a specific look (e.g. wellness's corner tab)
  // A matched design: this structure ships as ONE catalog card bound to this
  // theme, outside the themes × structures cross-product (the Canva templates).
  // Theme/template switching on a DOCUMENT is unaffected — this only shapes the
  // catalog.
  lockedTheme?: string;
};

// ---- authoring helpers ---------------------------------------------------
export const doc = (nodes: JSONContent[]): JSONContent => ({ type: "doc", content: nodes });
export const heading = (text: string, level = 1): JSONContent =>
  ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
export const para = (text: string): JSONContent =>
  ({ type: "paragraph", content: [{ type: "text", text }] });

export const BG = "var(--pc-bg)", INK = "var(--pc-ink)", ACCENT = "var(--pc-accent)";
export const ON_ACCENT = "var(--pc-on-accent)", DISPLAY = "var(--pc-display)", BODY = "var(--pc-body)";
export const UPPER = "text-transform: uppercase";

// Derived tones (temp/src had explicit surface/muted/border tokens; we only ship
// bg/ink/accent, so mix them at render — Chromium 111+ and every modern browser
// support color-mix, which covers the editor and Gotenberg's Chromium).
// ponytail: color-mix instead of adding 3 tokens to all skins + the coverage test.
export const MUTED = "color-mix(in srgb, var(--pc-ink) 42%, var(--pc-bg))";
export const SURFACE = "color-mix(in srgb, var(--pc-accent) 8%, var(--pc-bg))";
export const BORDER = "color-mix(in srgb, var(--pc-ink) 16%, var(--pc-bg))";
export const emptyP: JSONContent = { type: "paragraph" };

// Skin-styled semantic nodes — the skin restyles .pull-quote/.callout/.sidebar-note
// per theme, on BOTH the canvas and the PDF, so these re-skin for free (unlike the
// .pc-* typed blocks, which the canvas doesn't load).
export const pq = (text: string): JSONContent => ({ type: "pullQuote", content: [{ type: "text", text }] });
export const callout = (...lines: string[]): JSONContent => ({ type: "callout", content: lines.map(para) });
export const aside = (text: string): JSONContent => ({ type: "sidebarNote", content: [para(text)] });

// Shared style recipes (temp/src values: kicker 0.08–0.18em uppercase accent; drop
// cap ~3 line-heights; stat = oversized accent numeral + uppercase muted label).
export const KICKER: BlockStyleTokens = { fontSize: 12, letterSpacing: 0.16, fontWeight: 600, textColor: ACCENT, fontFamily: BODY, customCss: UPPER };
export const TITLE: BlockStyleTokens = { fontSize: 40, fontWeight: 700, textColor: INK, fontFamily: DISPLAY };
export const H2: BlockStyleTokens = { fontSize: 24, fontWeight: 700, textColor: INK, fontFamily: DISPLAY };
export const BODY_S: BlockStyleTokens = { fontSize: 15, textColor: INK, fontFamily: BODY, customCss: "line-height:1.7" };
export const DROPCAP: BlockStyleTokens = { fontSize: 15, textColor: INK, fontFamily: BODY, customCss:
  "p{line-height:1.72;margin-top:.6em}p:first-child{margin-top:0}" +
  "p:first-child::first-letter{float:left;font-family:var(--pc-display);font-size:3.3em;line-height:.8;font-weight:700;color:var(--pc-accent);padding:.02em .12em 0 0}" };

export const kicker = (text: string, at: [number, number, number, number]): BlockSpec => ({ at, nodes: [para(text)], style: KICKER });
// An empty image slot the user fills with their own photo.
export const img = (at: [number, number, number, number], z?: number): BlockSpec => ({ at, image: true, ...(z !== undefined ? { z } : {}) });
// A coloured background panel (z:0 so content stacks above it).
export const panel = (at: [number, number, number, number], color: string): BlockSpec => ({ at, nodes: [emptyP], style: { backgroundColor: color }, z: 0 });
// A numbered list (the guidebook's 1/2/3 page).
export const ol = (...items: string[]): JSONContent => ({ type: "orderedList", content: items.map((t) => ({ type: "listItem", content: [para(t)] })) });
// A bulleted list.
export const ul = (...items: string[]): JSONContent => ({ type: "bulletList", content: items.map((t) => ({ type: "listItem", content: [para(t)] })) });
// A short centred accent rule (temp's 32×1px bar under chapter titles).
export const rule = (at: [number, number, number, number]): BlockSpec => ({ at, nodes: [emptyP], style: { customCss: "width:44px;height:2px;background:var(--pc-accent)" } });
// Oversized accent numeral + uppercase muted label, stacked and centred.
export const stat = (value: string, label: string, at: [number, number, number, number]): BlockSpec => ({
  at, nodes: [para(value), para(label)],
  style: { textAlign: "center", customCss:
    "p:first-child{font-family:var(--pc-display);font-weight:800;font-size:44px;line-height:1;color:var(--pc-accent)}" +
    `p:last-child{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:${MUTED};margin-top:6px}` },
});

export const HAIR_ON_ACCENT: BlockStyleTokens = { customCss: "border-top:1px solid var(--pc-on-accent)" };
export const HAIR_ACCENT: BlockStyleTokens = { customCss: "border-top:1px solid var(--pc-accent)" };
