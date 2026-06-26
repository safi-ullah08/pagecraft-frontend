// pagedjs ships no type declarations. Minimal shim for what Preview.tsx uses.
declare module "pagedjs" {
  export class Previewer {
    // stylesheets: array of URL strings or { name: cssText } objects (inline CSS)
    preview(
      content: string | Element,
      stylesheets: Array<string | Record<string, string>>,
      renderTo: Element,
    ): Promise<{ pages: unknown[] }>;
  }
}
