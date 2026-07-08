import { useEffect, useRef } from "react";
import type { JSONContent } from "@tiptap/react";
import { serialize, type ThemeName } from "@pagecraft/model";
import { documentCss, DEFAULT_THEME } from "../themes.ts";
import { Previewer } from "pagedjs";

// Live paged.js preview of the WHOLE document (all sections concatenated), in
// order. Re-paginates in-browser with NO server round-trip. serialize +
// documentCss are the SAME ones the worker uses for the PDF — the 1-to-1 WYSIWYG
// guarantee. min-height:0 lets the pane scroll through the pages.
export function Preview({ sections, theme = DEFAULT_THEME }: { sections: JSONContent[]; theme?: ThemeName }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const runId = useRef(0);

  useEffect(() => {
    if (!ref.current) return;
    // ponytail: 400ms debounce, not per-keystroke — paged.js is heavy.
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const el = ref.current;
      if (!el) return;
      const id = ++runId.current; // ignore results from a superseded run
      el.innerHTML = ""; // drop prior pages before re-paginating
      try {
        // Concatenate every section's serialized HTML, wrapped in .page-content
        // exactly as the worker does. serialize/documentCss are inside the try:
        // an unknown theme throws and must surface as a preview error, not an
        // unhandled rejection.
        const body = sections.map((s) => serialize(s)).join("\n");
        const content = `<div class="page-content">${body}</div>`;
        const css = documentCss(theme);
        // polisher.add accepts { name: cssText } to inline CSS (no fetch)
        await new Previewer().preview(content, [{ "doc.css": css }], el);
      } catch (e) {
        if (id === runId.current) {
          el.innerHTML = `<pre style="color:#b00020">preview error: ${String(e)}</pre>`;
        }
      }
    }, 400);
    return () => clearTimeout(timer.current);
  }, [sections, theme]);

  // ponytail: a fresh Previewer per render leaks a <style> in <head> each pass —
  // fine for now; reuse/cleanup if the preview visibly degrades over a session.
  return <div ref={ref} style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: "auto", background: "#eee", padding: 16 }} />;
}
