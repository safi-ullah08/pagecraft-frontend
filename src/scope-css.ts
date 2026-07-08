// Prefix a theme skin's selectors so it styles ONLY the editor surface, not the
// whole app. Theme skins are flat CSS (no nested at-rules) except @page, which we
// drop for on-screen editing. `html`/`body` map to the surface element itself;
// every other selector nests under it. Keeps the editing surface visually matched
// to the paged output without a second stylesheet.
export function scopeThemeCss(css: string, root: string): string {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g; // theme CSS has no nested braces
  let m: RegExpExecArray | null;
  while ((m = re.exec(noComments))) {
    const rawSel = m[1]!.trim();
    const body = m[2]!.trim();
    if (!body || rawSel.startsWith("@")) continue; // drop @page etc. on screen
    const sel = rawSel
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (/^(html|body)$/i.test(s) ? root : `${root} ${s}`))
      .join(", ");
    rules.push(`${sel} { ${body} }`);
  }
  return rules.join("\n");
}
