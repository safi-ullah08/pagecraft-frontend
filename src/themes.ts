// Browser-side twin of the model's documentCss/themeNames. The model loads theme
// skins with node:fs, which Vite can't bundle — so the browser assembles the SAME
// sheet from the SAME baseCss + the SAME .css skin files (globbed as raw text).
// baseCss and the skin files are the single source; the worker's documentCss and
// this produce byte-identical CSS, preserving the 1-to-1 WYSIWYG guarantee.
// ponytail: exists ONLY because fs can't run in the browser; delete if the model
// ever ships a bundler-safe skin loader.
import { baseCss, gridBaseCss, type LayoutMode, type ThemeName } from "@pagecraft/model";

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
  return layoutMode === "grid"
    ? `${themeSkinCss(theme)}\n${gridBaseCss}`
    : `${baseCss}\n${themeSkinCss(theme)}`;
}

// Just the theme skin (no structural baseCss) — the editing surface scopes THIS
// onto its container so editing looks like output. baseCss is pagination-only.
export function themeSkinCss(theme: ThemeName): string {
  const skin = skins[theme];
  if (skin === undefined) throw new Error(`unknown theme "${theme}" (have: ${themeNames().join(", ")})`);
  return skin;
}
