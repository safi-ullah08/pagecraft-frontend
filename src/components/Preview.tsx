import { useEffect, useRef } from "react";
import type { JSONContent } from "@tiptap/react";
import { serialize, themeCss } from "@pagecraft/model";

// Live paged.js preview of the CURRENT section. Re-paginates in-browser with NO
// server round-trip. serialize + themeCss are the SAME ones the worker uses for
// the PDF — that's the 1-to-1 WYSIWYG guarantee. THE headline risk to validate.
export function Preview({ doc }: { doc: JSONContent | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!doc || !ref.current) return;
    // ponytail: 400ms debounce, not per-keystroke — paged.js is heavy.
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current!;
      const html = serialize(doc);
      // TODO(paged.js): new Previewer().preview(html, [styleSheets], el),
      // clearing prior pages first; set window.__pagedDone on its resolve so
      // export can reuse the same "done" signal.
      el.innerHTML = `<style>${themeCss("classic")}</style><div class="page-content">${html}</div>`;
    }, 400);
  }, [doc]);

  return <div ref={ref} style={{ flex: 1, overflow: "auto", background: "#eee", padding: 16 }} />;
}
