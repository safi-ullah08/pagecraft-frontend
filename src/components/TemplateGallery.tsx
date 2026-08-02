import { useState } from "react";
import { gridSerialize } from "@pagecraft/model";
import { documentCss, themeNames } from "../themes.ts";
import { listTemplates, templateSections, DOC_LABELS, type Template, type DocType } from "../grid/templates.ts";
import { createFromTemplate } from "../api.ts";

// The user-facing "Templates" surface — NO theme picker. Each card is one structure
// bound to one theme (the 15 = themes × 3 structures). The thumbnail is page 1 of the
// real interpreted structure, rendered through the SAME gridSerialize + documentCss
// as the editor/PDF, in an iframe (isolates the @page/:root CSS from the app) scaled
// down. Pick → createFromTemplate → open the new doc. See TEMPLATES-PLAN.md v2 Step 4.

// A4 at 96dpi. The iframe renders full-size, then transform-scales into the card.
const PAGE_W = 794, PAGE_H = 1123, CARD_W = 190;
const SCALE = CARD_W / PAGE_W;

function thumbHtml(t: Template): string {
  const page1 = templateSections(t)[0]!;
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}${documentCss(t.theme, "grid")}</style></head><body>${gridSerialize(page1)}</body></html>`;
}

const prettyTheme = (t: string) => t.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// applyToDocId set = "add a template to this imported doc" (keeps content, applies
// look + cover + TOC via the ?tpl param the editor reads on load). Unset = "start a
// new doc from a template" (createFromTemplate replaces with the placeholder pages).
export function TemplateGallery({ onClose, applyToDocId }: { onClose: () => void; applyToDocId?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const importing = !!applyToDocId;

  const all = listTemplates(themeNames());
  const groups = (Object.keys(DOC_LABELS) as DocType[]).map((dt) => ({ dt, items: all.filter((t) => t.docType === dt) }));

  async function pick(t: Template) {
    if (busy) return;
    setBusy(t.id);
    setErr(null);
    try {
      if (applyToDocId) {
        window.location.search = `?doc=${applyToDocId}&tpl=${t.id}`; // editor applies on load
        return;
      }
      const id = await createFromTemplate(t);
      window.location.search = `?doc=${id}`; // full reload into the new doc
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setBusy(null);
    }
  }

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto", padding: "40px 24px" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 10, padding: "24px 28px", width: "100%", maxWidth: 940, boxShadow: "0 8px 40px rgba(0,0,0,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, flex: 1 }}>{importing ? "Add a template to your document" : "Start from a template"}</h2>
          {importing && (
            <button onClick={onClose} style={{ marginRight: 12, padding: "6px 12px", fontSize: 13, fontWeight: 600, color: "#666", background: "#fff", border: "1px solid #ccc", borderRadius: 6, cursor: "pointer" }}>
              Skip — open as imported
            </button>
          )}
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: "#888", marginTop: 0 }}>
          {importing ? "Applies the look plus a matching cover and contents — your imported pages are kept." : "Pick a look — you can edit everything after."}
        </p>
        {err && <p style={{ color: "#b00020", fontSize: 13 }}>{err}</p>}

        {groups.map(({ dt, items }) => (
          <section key={dt} style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#555", margin: "0 0 12px" }}>{DOC_LABELS[dt]}</h3>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, ${CARD_W}px)`, gap: 18 }}>
              {items.map((t) => (
                <button key={t.id} onClick={() => pick(t)} disabled={!!busy} title={`${t.name} · ${prettyTheme(t.theme)}`}
                  style={{ padding: 0, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", cursor: busy ? "default" : "pointer", overflow: "hidden", textAlign: "left" }}>
                  <div style={{ width: CARD_W, height: PAGE_H * SCALE, overflow: "hidden", position: "relative", background: "#fff" }}>
                    <iframe title={t.id} scrolling="no" tabIndex={-1} srcDoc={thumbHtml(t)}
                      style={{ width: PAGE_W, height: PAGE_H, border: 0, transform: `scale(${SCALE})`, transformOrigin: "top left", pointerEvents: "none" }} />
                    {busy === t.id && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#333" }}>Creating…</div>
                    )}
                  </div>
                  <div style={{ padding: "8px 10px", fontSize: 12, color: "#666", borderTop: "1px solid #eee" }}>{prettyTheme(t.theme)}</div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
