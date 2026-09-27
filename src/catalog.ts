// Boot-time loader for the backend-stored template catalog: structures (the
// outlines), theme skins (the CSS) and uploaded fonts. Everything downstream
// (gallery, store, canvas, measure) reads the registries synchronously, so the
// app renders only after this resolves — see <CatalogGate> in main.tsx.
import { fetchTemplates, fetchThemes, fetchFonts, fetchFontFile, type ApiFont } from "./api.ts";
import { setStructures } from "./grid/templates.ts";
import { registerThemes } from "./themes.ts";

let loading: Promise<void> | null = null;
let faces = "";

// @font-face rules for the workspace's uploaded fonts, on blob: URLs. Injected
// into the app document once; the gallery's srcdoc iframes (same origin, so
// blob: URLs resolve) prepend it via fontFaceCss().
export function fontFaceCss(): string {
  return faces;
}

async function loadFonts(fonts: ApiFont[]): Promise<void> {
  const uploads = fonts.filter((f) => f.source === "upload" && f.owned);
  const rules = await Promise.all(uploads.map(async (f) => {
    try {
      const url = URL.createObjectURL(await fetchFontFile(f.id));
      const family = f.family.replace(/["'\\<>;{}]/g, "");
      return `@font-face{font-family:"${family}";font-style:${f.style};font-weight:${f.weight};font-display:block;src:url(${url})${f.format ? ` format("${f.format}")` : ""}}`;
    } catch (e) {
      console.error("font load failed:", f.family, e);
      return "";
    }
  }));
  faces = rules.filter(Boolean).join("\n");
  if (!faces) return;
  const el = document.getElementById("pc-user-fonts") ?? document.head.appendChild(Object.assign(document.createElement("style"), { id: "pc-user-fonts" }));
  el.textContent = faces;
}

async function load(): Promise<void> {
  const [templates, themes, fonts] = await Promise.all([fetchTemplates(), fetchThemes(), fetchFonts()]);
  registerThemes(themes);
  setStructures(templates.map((t) => ({ key: t.key, name: t.name, docType: t.docType, owned: t.owned, ...t.spec })));
  await loadFonts(fonts);
}

// Idempotent: every caller shares the first load. A failure clears the promise
// so a later call (e.g. a retry button) can try again.
export function loadCatalog(): Promise<void> {
  loading ??= load().catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}
