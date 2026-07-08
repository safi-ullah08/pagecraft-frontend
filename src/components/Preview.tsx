import { useEffect, useRef } from "react";
import type { JSONContent } from "@tiptap/react";
import { serialize, type ThemeName } from "@pagecraft/model";
import { documentCss, DEFAULT_THEME } from "../themes.ts";
import { Previewer } from "pagedjs";

// Live paged.js preview of the CURRENT section. Re-paginates in-browser with NO
// server round-trip. serialize + documentCss are the SAME ones the worker uses
// for the PDF — that's the 1-to-1 WYSIWYG guarantee. THE headline win.
export function Preview({ doc, theme = DEFAULT_THEME }: { doc: JSONContent | null; theme?: ThemeName }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const runId = useRef(0);

  useEffect(() => {
    if (!doc || !ref.current) return;
    // ponytail: 400ms debounce, not per-keystroke — paged.js is heavy.
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const el = ref.current;
      if (!el) return;
      const id = ++runId.current; // ignore results from a superseded run
      el.innerHTML = ""; // drop prior pages before re-paginating
      try {
        // wrap in .page-content exactly as the worker does, so layout matches.
        // serialize/documentCss are inside the try: an unknown theme throws and
        // must surface as a preview error, not an unhandled rejection.
        const content = `<div class="page-content">${serialize(doc)}</div>`;
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
  }, [doc, theme]);

  // ponytail: a fresh Previewer per render leaks a <style> in <head> each pass —
  // fine for now; reuse/cleanup if the preview visibly degrades over a session.
  return <div ref={ref} style={{ flex: 1, overflow: "auto", background: "#eee", padding: 16 }} />;
}
