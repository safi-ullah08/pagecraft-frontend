import type { JSONContent } from "@tiptap/react";
import type { LayoutSpec, LayoutPage, LayoutBlock, LayoutPlan } from "@pagecraft/model";
import { ROWS, COLS, type GridBlock, type GridSection } from "./types.ts";
import { buildCover } from "./covers.ts";
import { buildTocSection } from "./toc.ts";
import { assetsToDisplay, assetUrl } from "../assets.ts";
import type { SourceMeta, StoredDocPlan } from "../api.ts";
import { doc, emptyP, type BlockSpec, type PageSpec, type DocType, type StructKey, type StructureSpec } from "./spec.ts";

export type { BlockSpec, PageSpec, DocType, StructKey, StructureSpec } from "./spec.ts";

// Document STRUCTURES — "what shows up where". A structure is DATA: an ordered list
// of page specs. `interpret()` turns it into GridSections the store inserts, exactly
// like covers/TOC. Blocks reference the theme's --pc-* tokens (via the constants
// in spec.ts), so ONE structure renders under any theme — that's how structures ×
// themes = the catalog without per-template CSS (see TEMPLATES-PLAN.md, v2 Step 1).
// The types + authoring helpers live in spec.ts; the structures themselves are
// stored in the backend (system rows seeded from builtinStructures.ts +
// canvaStructures.ts, plus each workspace's custom templates).
//
// Kept as data (not builder functions) so the future template builder can edit a
// structure without running code. Copy of covers.ts's block idiom on purpose —
// keeps covers.ts untouched.
// ponytail: placeholder copy. Merge fields / real starter text are the deferred half.

const rid = () => Math.random().toString(36).slice(2, 10);

// ---- interpreter --------------------------------------------------------
export function interpret(spec: StructureSpec): GridSection[] {
  return spec.pages.map(toSection);
}
function toSection(p: PageSpec): GridSection {
  if (p.kind === "cover") return buildCover(p.cover);
  if (p.kind === "toc") return buildTocSection([]); // default contents page; regenerate for real page numbers
  const sec: GridSection & { cover?: true; toc?: true } = { type: "grid", blocks: p.blocks.map(toBlock) };
  if (p.cover) sec.cover = true;
  if (p.blocks.some((b) => b.slot === "toc")) sec.toc = true; // a bespoke contents page IS the toc section
  if (p.background) sec.background = p.background;
  return sec;
}
function toBlock(b: BlockSpec, i: number): GridBlock {
  const [rowStart, colStart, rowEnd, colEnd] = b.at;
  const base = { id: rid(), area: { rowStart, colStart, rowEnd, colEnd }, zIndex: b.z ?? i, ...(b.style ? { style: b.style } : {}) };
  if (b.slot === "toc") {
    return { ...base, block: "tocList", content: { entries: [], leader: "dots", showNumbers: true, maxLevel: 3, ...(b.props ?? {}) } };
  }
  // a typed block saved from a designed document keeps its own type + content
  if (b.block) return { ...base, block: b.block, content: (b.content ?? {}) as GridBlock["content"] };
  return {
    ...base,
    block: b.image ? "image" : "textFrame",
    content: b.image ? { src: "", alt: "" } : doc(b.nodes ?? [emptyP]),
  };
}

// ---- the registry -------------------------------------------------------
// Structures are DATA served by the backend (GET /api/templates): the system
// catalog (seeded from builtinStructures.ts) plus the workspace's own custom
// templates. catalog.ts loads them once at boot into this registry; everything
// below reads it synchronously. Mutated in place so importers keep one object.
export const STRUCTURES: Record<StructKey, StructureSpec> = {};
let STRUCT_ORDER: StructKey[] = [];
const OWNED = new Set<StructKey>();

export function setStructures(list: Array<StructureSpec & { owned?: boolean }>): void {
  for (const k of Object.keys(STRUCTURES)) delete STRUCTURES[k];
  OWNED.clear();
  for (const s of list) {
    STRUCTURES[s.key] = s;
    if (s.owned) OWNED.add(s.key);
  }
  STRUCT_ORDER = list.map((s) => s.key);
}


// ---- catalog (Step 2) ---------------------------------------------------
// A user-facing template = one structure bound to one theme. Two catalog kinds:
//  - OPEN structures cross-product with every non-Canva theme (no per-template file);
//  - LOCKED structures (the Canva matched designs) ship as exactly ONE card each,
//    bound to their lockedTheme, and their canva-* skins never enter the
//    cross-product. `themes` is passed in (the browser's themeNames() uses
//    import.meta.glob, which can't run under tests), so this stays pure.
export const DOC_LABELS: Record<DocType, string> = { leadMagnet: "Lead magnets", ebook: "Ebooks", report: "Reports" };
export const CANVA_LABEL = "Canva templates";
export const OWNED_LABEL = "My templates";
export const isLockedTemplate = (t: Template): boolean => !!STRUCTURES[t.structKey]?.lockedTheme;
// A workspace's custom template (vs. the shared system catalog).
export const isOwnedTemplate = (t: Template): boolean => OWNED.has(t.structKey);

export type Template = { id: string; name: string; docType: DocType; theme: string; structKey: StructKey };

export function listTemplates(themes: string[]): Template[] {
  const out: Template[] = [];
  const specs = STRUCT_ORDER.map((k) => STRUCTURES[k]).filter((s): s is StructureSpec => !!s);
  const card = (s: StructureSpec, theme: string): Template => ({ id: `${theme}:${s.key}`, name: s.name, docType: s.docType, theme, structKey: s.key });
  for (const theme of themes.filter((t) => !t.startsWith("canva-"))) {
    for (const s of specs) if (!s.lockedTheme) out.push(card(s, theme));
  }
  for (const s of specs) if (s.lockedTheme) out.push(card(s, s.lockedTheme));
  return out;
}

// Resolve a catalog id back to the GridSections to insert (used by Step 3 apply).
export function templateSections(t: Template): GridSection[] {
  const spec = STRUCTURES[t.structKey];
  if (!spec) throw new Error(`unknown template "${t.structKey}"`);
  return interpret(spec);
}

// Applying a template to an IMPORTED doc keeps the content and adds front matter:
// this is the cover to prepend (a covers.ts front-cover id per docType). report's
// structure opens with a title page, not a cover, so it borrows the editorial cover.
export const IMPORT_COVER: Record<DocType, string> = { leadMagnet: "band", ebook: "rule", report: "rule" };

// Parse a catalog id (`${theme}:${structKey}`) back to a Template — the editor reads
// it from the ?tpl param after an imported doc loads. Theme may contain "-", so split
// on the LAST ":". Returns null for anything malformed.
export function parseTemplateId(id: string): Template | null {
  const i = id.lastIndexOf(":");
  if (i < 0) return null;
  const theme = id.slice(0, i);
  const key = id.slice(i + 1) as StructKey;
  const spec = STRUCTURES[key];
  if (!theme || !spec) return null;
  return { id, name: spec.name, docType: spec.docType, theme, structKey: key };
}

// ---- engine adapter (Step: apply a template to an IMPORTED doc) -----------------
// StructureSpec → the model engine's LayoutSpec. THE PLACEHOLDER RULE: a
// template's own copy exists for preview only. On apply, slot blocks bind the
// document's data or go EMPTY, and literal text blocks are DROPPED unless
// tagged `furniture` (design lockups like a contents title or quadrant labels).
// Panels, rules, hairlines and empty image slots carry no text and survive.
const hasText = (nodes?: JSONContent[]): boolean => JSON.stringify(nodes ?? []).includes('"text"');

// Chapters for the engine: only h1 sections open chapters — an h2 section is a
// SUBSECTION and folds into its parent (its heading stays in the body flow, so
// the contents page still lists it). "Notes" stays its own endnotes chapter.
export type EngineChapter = { title: string; level: number; nodes: JSONContent[]; role?: "notes" };
export function foldChapters(sections: EngineChapter[]): EngineChapter[] {
  const out: EngineChapter[] = [];
  for (const c of sections) {
    if (c.role !== "notes" && c.level >= 2 && out.length && out[out.length - 1]!.role !== "notes") {
      out[out.length - 1]!.nodes.push(...c.nodes);
    } else {
      out.push({ ...c, nodes: [...c.nodes] });
    }
  }
  return out;
}

function specBlock(b: BlockSpec, i: number): LayoutBlock {
  const [rowStart, colStart, rowEnd, colEnd] = b.at;
  return {
    area: { rowStart, colStart, rowEnd, colEnd },
    ...(b.slot ? { slot: b.slot } : {}),
    ...(b.fallback ? { fallback: b.fallback } : {}),
    ...(b.props ? { props: b.props } : {}),
    ...(b.style ? { style: b.style } : {}),
    z: b.z ?? i,
    ...(b.block ? { block: b.block, content: b.content ?? {} }
      : b.image ? { block: "image", content: { src: "", alt: "" } }
      : { content: doc(b.nodes ?? [emptyP]) }),
  };
}

// A prebuilt GridSection (covers.ts / buildTocSection) as a literal LayoutPage.
// A tocList block converts back to a toc SLOT so the engine re-flags the section.
function sectionPage(sec: GridSection & { cover?: boolean; backCover?: boolean; toc?: boolean }): LayoutPage {
  return {
    ...(sec.cover ? { cover: true } : {}),
    ...(sec.backCover ? { backCover: true } : {}),
    ...(sec.background ? { background: sec.background } : {}),
    blocks: sec.blocks.map((b, i) =>
      b.block === "tocList"
        ? { area: b.area, slot: "toc" as const, z: b.zIndex ?? i }
        : { area: b.area, block: b.block, content: b.content, ...(b.style ? { style: b.style } : {}), z: b.zIndex ?? i },
    ),
  };
}

export function structureToLayoutSpec(spec: StructureSpec): LayoutSpec {
  const pages: LayoutPage[] = [];
  for (const p of spec.pages) {
    if (p.kind === "cover") { pages.push(sectionPage(buildCover(p.cover))); continue; }
    if (p.kind === "toc") { pages.push(sectionPage(buildTocSection([]))); continue; }
    // placeholder rule: literal prose is preview-only — dropped unless furniture
    const kept = p.blocks.filter((b) => b.slot || b.image || b.block || b.furniture || !hasText(b.nodes));
    if (!kept.length) continue; // a page of nothing but placeholder copy vanishes
    pages.push({
      ...(p.role ? { role: p.role } : {}),
      ...(p.background ? { background: p.background } : {}),
      ...(p.cover ? { cover: true } : {}),
      blocks: kept.map(specBlock),
    });
  }
  return { pages };
}

// A stored plan (+ its meta) → the engine's LayoutPlan: srcs in display form
// (browsers can't load asset://), chapters folded to h1 boundaries. Used by the
// apply path, the switch panel, and the gallery's real-content previews.
export function docPlanToLayout(stored: StoredDocPlan, meta: SourceMeta): LayoutPlan {
  return {
    meta: { ...meta, ...(meta.hero ? { hero: assetUrl(meta.hero) } : {}) },
    chapters: foldChapters(stored.chapters.map((c) => ({
      title: c.title,
      level: c.level,
      nodes: (assetsToDisplay(c.body) as JSONContent).content ?? [],
      ...(c.role ? { role: c.role } : {}),
    }))),
  };
}

// Guard used by templates.test.ts: every placed block must fit the 12×12 grid.
export function assertAreasValid(): void {
  for (const spec of Object.values(STRUCTURES)) {
    for (const s of interpret(spec!)) {
      for (const b of s.blocks) {
        const { rowStart, colStart, rowEnd, colEnd } = b.area;
        const ok = rowStart >= 1 && colStart >= 1 && rowEnd <= ROWS + 1 && colEnd <= COLS + 1 && rowStart < rowEnd && colStart < colEnd;
        if (!ok) throw new Error(`${spec.key}: bad area ${JSON.stringify(b.area)}`);
      }
    }
  }
}
