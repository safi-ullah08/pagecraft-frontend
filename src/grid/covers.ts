import type { JSONContent } from "@tiptap/react";
import { COLS, ROWS, isGridSection, type GridBlock, type GridSection } from "./types.ts";

// Cover pages, front and back. The MECHANISM is a normal grid section flagged
// `cover`/`backCover` — editable like any other page, so nothing here is a special
// case in the canvas, the serializer or the export.
//
// Designs bind to the THEME'S DESIGN TOKENS (--pc-bg/--pc-ink/--pc-accent/
// --pc-on-accent/--pc-display/--pc-body), declared on html,body in every theme
// skin. So a cover re-skins with the document instead of freezing one palette, and
// switching themes restyles it live.
// ponytail: static text. Title/author merge fields are the deferred half.

export type CoverSection = GridSection & { cover?: true; backCover?: true };

export function isCoverSection(content: unknown): boolean {
  return isGridSection(content) && (content as { cover?: boolean }).cover === true;
}
export function isBackCoverSection(content: unknown): boolean {
  return isGridSection(content) && (content as { backCover?: boolean }).backCover === true;
}
// Neither front nor back covers are numbered or indexed in the contents.
export function isAnyCover(content: unknown): boolean {
  return isCoverSection(content) || isBackCoverSection(content);
}

const rid = () => Math.random().toString(36).slice(2, 10);
const doc = (nodes: JSONContent[]): JSONContent => ({ type: "doc", content: nodes });
const heading = (text: string, level = 1): JSONContent =>
  ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
const para = (text: string): JSONContent =>
  ({ type: "paragraph", content: [{ type: "text", text }] });

const BG = "var(--pc-bg)", INK = "var(--pc-ink)", ACCENT = "var(--pc-accent)";
const ON_ACCENT = "var(--pc-on-accent)", DISPLAY = "var(--pc-display)", BODY = "var(--pc-body)";

type Spec = {
  rowStart: number; colStart: number; rowEnd: number; colEnd: number;
  content: JSONContent; style?: GridBlock["style"];
};
function block(spec: Spec, z: number): GridBlock {
  const { rowStart, colStart, rowEnd, colEnd, content, style } = spec;
  return {
    id: rid(),
    area: { rowStart, colStart, rowEnd, colEnd },
    block: "textFrame",
    content,
    zIndex: z, // explicit so text always sits above the page's background art
    ...(style ? { style } : {}),
  };
}

export type CoverSide = "front" | "back";
export type CoverTemplate = {
  id: string;
  side: CoverSide;
  name: string;
  hint: string;
  build: () => CoverSection;
};

// ---- Front covers -------------------------------------------------------
const FRONT: CoverTemplate[] = [
  {
    id: "centered", side: "front", name: "Centered", hint: "Title centred on a clean page",
    build: () => ({
      type: "grid", cover: true,
      background: { kind: "solid", color: BG },
      blocks: [
        block({ rowStart: 5, colStart: 2, rowEnd: 8, colEnd: 12, content: doc([heading("Your title"), para("Subtitle or author")]),
          style: { textAlign: "center", fontSize: 44, fontWeight: 700, textColor: INK, fontFamily: DISPLAY } }, 0),
      ],
    }),
  },
  {
    id: "band", side: "front", name: "Colour band", hint: "Title on an accent band",
    build: () => ({
      type: "grid", cover: true,
      background: { kind: "solid", color: BG },
      blocks: [
        block({ rowStart: 4, colStart: 1, rowEnd: 9, colEnd: COLS + 1, content: doc([para(" ")]),
          style: { backgroundColor: ACCENT } }, 0),
        block({ rowStart: 5, colStart: 2, rowEnd: 8, colEnd: 12, content: doc([heading("Your title"), para("Subtitle or author")]),
          style: { textAlign: "center", fontSize: 42, fontWeight: 700, textColor: ON_ACCENT, fontFamily: DISPLAY } }, 1),
      ],
    }),
  },
  {
    id: "gradient", side: "front", name: "Gradient", hint: "Accent gradient, title low-left",
    build: () => ({
      type: "grid", cover: true,
      background: { kind: "gradient", from: ACCENT, to: BG, angle: 160 },
      blocks: [
        block({ rowStart: 8, colStart: 2, rowEnd: 12, colEnd: 11, content: doc([heading("Your title"), para("Subtitle or author")]),
          style: { fontSize: 40, fontWeight: 700, textColor: INK, fontFamily: DISPLAY } }, 0),
      ],
    }),
  },
  {
    id: "rule", side: "front", name: "Editorial", hint: "Small-caps kicker over a ruled title",
    build: () => ({
      type: "grid", cover: true,
      background: { kind: "solid", color: BG },
      blocks: [
        block({ rowStart: 4, colStart: 2, rowEnd: 5, colEnd: 11, content: doc([para("Subtitle or author")]),
          style: { fontSize: 13, letterSpacing: 0.24, textColor: ACCENT, fontFamily: BODY, customCss: "text-transform: uppercase" } }, 0),
        block({ rowStart: 5, colStart: 2, rowEnd: 9, colEnd: 12, content: doc([heading("Your title")]),
          style: { fontSize: 52, fontWeight: 700, textColor: INK, fontFamily: DISPLAY, customCss: "border-top: 3px solid var(--pc-accent); padding-top: 10px" } }, 1),
      ],
    }),
  },
  {
    id: "photo", side: "front", name: "Photo", hint: "Full-bleed image — add yours in Design › Page background",
    build: () => ({
      type: "grid", cover: true,
      background: { kind: "image", src: "", fit: "cover", color: ACCENT }, // colour shows until an image is picked
      blocks: [
        block({ rowStart: 8, colStart: 2, rowEnd: 12, colEnd: 12, content: doc([heading("Your title"), para("Subtitle or author")]),
          style: { fontSize: 40, fontWeight: 700, textColor: ON_ACCENT, fontFamily: DISPLAY, customCss: "text-shadow: 0 2px 12px rgba(0,0,0,.55)" } }, 0),
      ],
    }),
  },
];

// ---- Back covers --------------------------------------------------------
const BACK: CoverTemplate[] = [
  {
    id: "blurb", side: "back", name: "Blurb", hint: "Description block, quiet page",
    build: () => ({
      type: "grid", backCover: true,
      background: { kind: "solid", color: BG },
      blocks: [
        block({ rowStart: 3, colStart: 2, rowEnd: 9, colEnd: 12,
          content: doc([para("A short description of the book — what it covers and who it's for."), para("A line of praise or a closing note.")]),
          style: { fontSize: 16, textColor: INK, fontFamily: BODY } }, 0),
      ],
    }),
  },
  {
    id: "about", side: "back", name: "About the author", hint: "Author note with an accent rule",
    build: () => ({
      type: "grid", backCover: true,
      background: { kind: "solid", color: BG },
      blocks: [
        block({ rowStart: 3, colStart: 2, rowEnd: 4, colEnd: 11, content: doc([para("About the author")]),
          style: { fontSize: 13, letterSpacing: 0.2, textColor: ACCENT, fontFamily: BODY, customCss: "text-transform: uppercase" } }, 0),
        block({ rowStart: 4, colStart: 2, rowEnd: 9, colEnd: 12,
          content: doc([para("A short author biography goes here — background, other work, and where to find them.")]),
          style: { fontSize: 15, textColor: INK, fontFamily: BODY, customCss: "border-top: 2px solid var(--pc-accent); padding-top: 10px" } }, 1),
      ],
    }),
  },
  {
    id: "quote", side: "back", name: "Quote", hint: "A single pull quote on an accent page",
    build: () => ({
      type: "grid", backCover: true,
      background: { kind: "solid", color: ACCENT },
      blocks: [
        block({ rowStart: 4, colStart: 2, rowEnd: 9, colEnd: 12,
          content: doc([heading("“A line worth remembering.”", 2), para("— Attribution")]),
          style: { textAlign: "center", fontSize: 30, textColor: ON_ACCENT, fontFamily: DISPLAY } }, 0),
      ],
    }),
  },
  {
    id: "closing", side: "back", name: "Closing", hint: "Thanks + contact, centred low",
    build: () => ({
      type: "grid", backCover: true,
      background: { kind: "solid", color: BG },
      blocks: [
        block({ rowStart: 6, colStart: 2, rowEnd: 9, colEnd: 12,
          content: doc([heading("Thank you for reading", 2), para("yourname.com · @yourhandle")]),
          style: { textAlign: "center", fontSize: 24, textColor: INK, fontFamily: DISPLAY } }, 0),
      ],
    }),
  },
];

export const COVER_TEMPLATES: CoverTemplate[] = [...FRONT, ...BACK];
export const frontCovers = () => FRONT;
export const backCovers = () => BACK;

export function buildCover(templateId: string): CoverSection {
  const t = COVER_TEMPLATES.find((x) => x.id === templateId) ?? FRONT[0]!;
  return t.build();
}
