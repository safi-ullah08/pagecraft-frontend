import type { JSONContent } from "@tiptap/react";
import { COLS, ROWS, isGridSection, type GridBlock, type GridSection } from "./types.ts";

// Cover pages. The MECHANISM is a normal grid section flagged `cover: true` at
// position 0 — editable like any other page, so nothing here is a special case in
// the canvas, the serializer or the export. The templates below are just starting
// points a user duplicates and edits.
// ponytail: static text. Title/author merge fields are the deferred half.

export type CoverSection = GridSection & { cover: true };

export function isCoverSection(content: unknown): boolean {
  return isGridSection(content) && (content as { cover?: boolean }).cover === true;
}

const rid = () => Math.random().toString(36).slice(2, 10);

const doc = (nodes: JSONContent[]): JSONContent => ({ type: "doc", content: nodes });
const heading = (text: string, level = 1): JSONContent =>
  ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
const para = (text: string): JSONContent =>
  ({ type: "paragraph", content: [{ type: "text", text }] });

type BlockSpec = {
  rowStart: number; colStart: number; rowEnd: number; colEnd: number;
  content: JSONContent;
  style?: GridBlock["style"];
};

function block(spec: BlockSpec, z: number): GridBlock {
  const { rowStart, colStart, rowEnd, colEnd, content, style } = spec;
  return {
    id: rid(),
    area: { rowStart, colStart, rowEnd, colEnd },
    block: "textFrame",
    content,
    zIndex: z, // explicit so text always sits above the page background art
    ...(style ? { style } : {}),
  };
}

export type CoverTemplate = {
  id: string;
  name: string;
  hint: string;
  build: (title: string, subtitle: string) => CoverSection;
};

const FULL = { rowStart: 1, colStart: 1, rowEnd: ROWS + 1, colEnd: COLS + 1 };

export const COVER_TEMPLATES: CoverTemplate[] = [
  {
    id: "centered",
    name: "Centered",
    hint: "Title centred on a clean page",
    build: (title, subtitle) => ({
      type: "grid", cover: true,
      background: { kind: "solid", color: "#faf7f2" },
      blocks: [
        block({ ...FULL, rowStart: 5, rowEnd: 8, colStart: 2, colEnd: 12, content: doc([heading(title), para(subtitle)]),
          style: { textAlign: "center", fontSize: 44, fontWeight: 700, textColor: "#1f2933" } }, 0),
      ],
    }),
  },
  {
    id: "band",
    name: "Colour band",
    hint: "Title on a bold band across the page",
    build: (title, subtitle) => ({
      type: "grid", cover: true,
      background: { kind: "solid", color: "#ffffff" },
      blocks: [
        block({ rowStart: 4, colStart: 1, rowEnd: 9, colEnd: COLS + 1, content: doc([para(" ")]),
          style: { backgroundColor: "#E07A5F" } }, 0),
        block({ rowStart: 5, colStart: 2, rowEnd: 8, colEnd: 12, content: doc([heading(title), para(subtitle)]),
          style: { textAlign: "center", fontSize: 42, fontWeight: 700, textColor: "#ffffff" } }, 1),
      ],
    }),
  },
  {
    id: "gradient",
    name: "Gradient",
    hint: "Soft gradient with the title low-left",
    build: (title, subtitle) => ({
      type: "grid", cover: true,
      background: { kind: "gradient", from: "#2b3a55", to: "#7c9885", angle: 160 },
      blocks: [
        block({ rowStart: 8, colStart: 2, rowEnd: 12, colEnd: 11, content: doc([heading(title), para(subtitle)]),
          style: { fontSize: 40, fontWeight: 700, textColor: "#ffffff" } }, 0),
      ],
    }),
  },
  {
    id: "rule",
    name: "Editorial",
    hint: "Small caps subtitle over a ruled title",
    build: (title, subtitle) => ({
      type: "grid", cover: true,
      background: { kind: "solid", color: "#ffffff" },
      blocks: [
        block({ rowStart: 4, colStart: 2, rowEnd: 5, colEnd: 11, content: doc([para(subtitle)]),
          style: { fontSize: 13, letterSpacing: 0.24, textColor: "#8a8177", customCss: "text-transform: uppercase" } }, 0),
        block({ rowStart: 5, colStart: 2, rowEnd: 9, colEnd: 12, content: doc([heading(title)]),
          style: { fontSize: 52, fontWeight: 700, textColor: "#1f2933", customCss: "border-top: 3px solid #1f2933; padding-top: 10px" } }, 1),
      ],
    }),
  },
  {
    id: "photo",
    name: "Photo",
    hint: "Full-bleed image — add yours in Design › Page background",
    build: (title, subtitle) => ({
      type: "grid", cover: true,
      // no src yet: the colour shows until the user uploads a background image
      background: { kind: "image", src: "", fit: "cover", color: "#3a3a3a" },
      blocks: [
        block({ rowStart: 8, colStart: 2, rowEnd: 12, colEnd: 12, content: doc([heading(title), para(subtitle)]),
          style: { fontSize: 40, fontWeight: 700, textColor: "#ffffff", customCss: "text-shadow: 0 2px 12px rgba(0,0,0,.55)" } }, 0),
      ],
    }),
  },
];

export function buildCover(templateId: string, title: string, subtitle: string): CoverSection {
  const t = COVER_TEMPLATES.find((x) => x.id === templateId) ?? COVER_TEMPLATES[0]!;
  return t.build(title || "Your title", subtitle || "Subtitle or author");
}
