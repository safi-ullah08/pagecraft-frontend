import { useEffect, useRef } from "react";
import { serialize, gridSerialize, type ThemeName, type GridSection } from "@pagecraft/model";
import { documentCss, DEFAULT_THEME } from "../themes.ts";
import { isGridSection } from "../grid/types.ts";
import type { SectionContent } from "../api.ts";
import { Previewer } from "pagedjs";

// The "PDF preview" tab: on-screen 1:1 of the exported PDF, whole document, via the
// SAME serialize + documentCss the worker uses. Flow docs paginate with paged.js;
// grid docs are already explicitly paged (.page divs) so they render directly — no
// paged.js. Read-only; the actual export stays server-side Gotenberg.
export function Preview({ sections, theme = DEFAULT_THEME }: { sections: SectionContent[]; theme?: ThemeName }) {
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
      el.innerHTML = ""; // drop prior pages before re-rendering
      try {
        const isGrid = sections.length > 0 && sections.every(isGridSection);
        if (isGrid) {
          // grid pages are explicit + fixed-size — render straight, no paged.js.
          const body = sections.map((s) => gridSerialize(s as GridSection)).join("\n");
          const css = documentCss(theme, "grid") +
            "\n.page{margin:0 auto 16px;box-shadow:0 1px 8px rgba(0,0,0,.25)}";
          el.innerHTML = `<style>${css}</style>${body}`;
        } else {
          // flow: paginate the whole document with paged.js. serialize/documentCss
          // are inside the try — an unknown theme throws and must surface as a
          // preview error, not an unhandled rejection.
          const body = sections.map((s) => serialize(s as never)).join("\n");
          const content = `<div class="page-content">${body}</div>`;
          const css = documentCss(theme, "flow");
          await new Previewer().preview(content, [{ "doc.css": css }], el);
        }
      } catch (e) {
        if (id === runId.current) {
          el.innerHTML = `<pre style="color:#b00020">preview error: ${String(e)}</pre>`;
        }
      }
    }, 400);
    return () => clearTimeout(timer.current);
  }, [sections, theme]);

  return <div ref={ref} style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: "auto", background: "#eee", padding: 16 }} />;
}
