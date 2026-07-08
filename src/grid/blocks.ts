import type { BlockType, GridArea } from "./types.ts";

// Block palette registry. Text blocks default to a Tiptap doc whose root node
// gives the block its semantics (paragraph/heading/callout/pullQuote) — serialize()
// renders it with the right tag/class, so grid + flow style identically. Non-text
// blocks carry typed props. ponytail: minimal MVP set; extend the palette here.
export type BlockReg = {
  label: string;
  icon: string;
  text: boolean;
  defaultArea: GridArea;
  defaultContent: unknown;
  min: { cols: number; rows: number };
};

const doc = (node: object) => ({ type: "doc", content: [node] });

export const BLOCKS: Record<BlockType, BlockReg> = {
  heading: {
    label: "Heading", icon: "H", text: true,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 3, colEnd: 9 },
    defaultContent: doc({ type: "heading", attrs: { level: 1 } }), min: { cols: 2, rows: 1 },
  },
  paragraph: {
    label: "Text", icon: "¶", text: true,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 5, colEnd: 7 },
    defaultContent: doc({ type: "paragraph" }), min: { cols: 2, rows: 1 },
  },
  pullQuote: {
    label: "Pull quote", icon: "❝", text: true,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 3, colEnd: 9 },
    defaultContent: doc({ type: "pullQuote" }), min: { cols: 2, rows: 1 },
  },
  callout: {
    label: "Callout", icon: "▤", text: true,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 4, colEnd: 7 },
    defaultContent: doc({ type: "callout", content: [{ type: "paragraph" }] }), min: { cols: 2, rows: 1 },
  },
  image: {
    label: "Image", icon: "▣", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 6, colEnd: 7 },
    defaultContent: { src: "", alt: "" }, min: { cols: 1, rows: 1 },
  },
  divider: {
    label: "Divider", icon: "—", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 2, colEnd: 13 },
    defaultContent: {}, min: { cols: 1, rows: 1 },
  },
  spacer: {
    label: "Spacer", icon: "␣", text: false,
    defaultArea: { rowStart: 1, colStart: 1, rowEnd: 2, colEnd: 5 },
    defaultContent: {}, min: { cols: 1, rows: 1 },
  },
};

export const BLOCK_ORDER: BlockType[] = ["heading", "paragraph", "pullQuote", "callout", "image", "divider", "spacer"];
