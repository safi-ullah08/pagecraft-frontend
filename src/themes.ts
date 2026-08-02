// Browser-side twin of the model's documentCss/themeNames. The model loads theme
// skins with node:fs, which Vite can't bundle — so the browser assembles the SAME
// sheet from the SAME baseCss + the SAME .css skin files (globbed as raw text).
// baseCss and the skin files are the single source; the worker's documentCss and
// this produce byte-identical CSS, preserving the 1-to-1 WYSIWYG guarantee.
// ponytail: exists ONLY because fs can't run in the browser; delete if the model
// ever ships a bundler-safe skin loader.
import { baseCss, gridBaseCss, VERBATIM_SKIN, type LayoutMode, type ThemeName } from "@pagecraft/model";

export { DEFAULT_THEME } from "@pagecraft/model";

const skins: Record<string, string> = {};
for (const [file, css] of Object.entries(
  import.meta.glob("../model/src/styles/themes/*.css", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>,
)) {
  skins[file.split("/").pop()!.replace(/\.css$/, "")] = css;
}

export function themeNames(): ThemeName[] {
  return Object.keys(skins).sort();
}

export function documentCss(theme: ThemeName, layoutMode: LayoutMode = "flow"): string {
  // Match the model's ordering: grid = skin first then gridBaseCss (grid @page +
  // layout win); flow = base first then skin (skin typography wins).
  // TOKEN_BRIDGE: the typed .pc-* blocks (stat/cta/chapter/author/verse…) still read
  // the legacy --accent/--ink names; the skins only declare --pc-*. Alias them on
  // .page so those blocks re-skin instead of falling back to hardcoded coral.
  return layoutMode === "grid"
    ? `${themeSkinCss(theme)}\n${gridBaseCss}\n${TOKEN_BRIDGE}`
    : `${baseCss}\n${themeSkinCss(theme)}`;
}

// Legacy→current token alias (see documentCss). Reused by the editor canvas too.
export const TOKEN_BRIDGE = ".page{--accent:var(--pc-accent);--ink:var(--pc-ink)}";

// The typed-block (.pc-*) rules live in gridBaseCss, which the editor CANVAS never
// loads (it only scopes the skin) — so typed blocks render unstyled there while the
// PDF styles them. Extract just those flat rules (excluding page-number + structural
// ones that would fight the canvas layout) so the canvas can inject them. Single
// source: sliced from gridBaseCss, no duplication.
export const typedBlockCss = gridBaseCss
  .split("}")
  .map((r) => r.trim())
  .filter((r) => r.includes(".pc-") && !r.includes(".pc-pageno"))
  .map((r) => r + "}")
  .join("\n");

// Just the theme skin (no structural baseCss) — the editing surface scopes THIS
// onto its container so editing looks like output. baseCss is pagination-only.
export function themeSkinCss(theme: ThemeName): string {
  if (theme === "verbatim") return VERBATIM_SKIN; // imported docs: neutral base, own styling
  const skin = skins[theme];
  if (skin === undefined) throw new Error(`unknown theme "${theme}" (have: ${themeNames().join(", ")})`);
  return skin;
}
