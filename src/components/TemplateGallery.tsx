import { useEffect, useState } from "react";
import { gridSerialize, layout, type LayoutPlan, type GridSection as ModelGridSection } from "@pagecraft/model";
import { documentCss, themeNames } from "../themes.ts";
import { listTemplates, templateSections, structureToLayoutSpec, docPlanToLayout, STRUCTURES, DOC_LABELS, type Template, type DocType } from "../grid/templates.ts";
import { createFromTemplate, getDocument } from "../api.ts";

// The user-facing "Templates" surface — NO theme picker. Each card is one structure
// bound to one theme (the 15 = themes × 3 structures). The thumbnail is page 1 of the
// real interpreted structure, rendered through the SAME gridSerialize + documentCss
// as the editor/PDF, in an iframe (isolates the @page/:root CSS from the app) scaled
// down. Pick → createFromTemplate → open the new doc. See TEMPLATES-PLAN.md v2 Step 4.

// A4 at 96dpi. The iframe renders full-size, then transform-scales into the card.
const PAGE_W = 794, PAGE_H = 1123, CARD_W = 190;
const SCALE = CARD_W / PAGE_W;

// Thumbnails render in their own iframes, which don't inherit the app's fonts —
// mirror index.html's font link (same families the Gotenberg image bakes in).
const FONT_LINKS = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Crimson+Pro:ital,wght@0,200..900;1,200..900&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400..700;1,400..700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap">`;

// With a plan (an imported doc's frozen chapters + meta), the card shows page 1
// of the REAL layout — the user's title/author/hero bound into each design —
// instead of placeholder copy. Slimmed (2 chapters × 12 nodes) and stub-measured:
// only front pages show, so flow measurement precision is irrelevant.
const PREVIEW_GEOM = { rowPx: 60, colPx: 60 };
const previewMeasure = (d: { content?: unknown[] }, cols: number) => ({ w: cols * 60, h: 60 * (d.content?.length ?? 1) * (12 / cols) });
const slimPlan = (plan: LayoutPlan): LayoutPlan => ({
  meta: plan.meta,
  chapters: plan.chapters.slice(0, 2).map((c) => ({ ...c, nodes: c.nodes.slice(0, 12) })),
});

function thumbHtml(t: Template, plan: LayoutPlan | null): string {
  let page1: ModelGridSection = templateSections(t)[0]!;
  if (plan) {
    try {
      page1 = layout(plan, structureToLayoutSpec(STRUCTURES[t.structKey]), PREVIEW_GEOM, previewMeasure).sections[0] ?? page1;
    } catch { /* placeholder preview beats a broken card */ }
  }
  return `<!doctype html><html><head><meta charset="utf-8">${FONT_LINKS}<style>html,body{margin:0}${documentCss(t.theme, "grid")}</style></head><body>${gridSerialize(page1)}</body></html>`;
}

const prettyTheme = (t: string) => t.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// Three modes:
//  - applyToDocId set = "add a template to this imported doc" (keeps content,
//    applies look + cover + TOC via the ?tpl param the editor reads on load).
//  - onPick set = the caller owns the pick (e.g. a pending file upload whose
//    import mode depends on this choice — the doc doesn't exist yet).
//  - neither = "start a new doc from a template" (createFromTemplate).
export function TemplateGallery({ onClose, applyToDocId, onPick, previewPlan }: { onClose: () => void; applyToDocId?: string; onPick?: (t: Template) => Promise<void> | void; previewPlan?: LayoutPlan }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const importing = !!applyToDocId || !!onPick;

  // Real-content previews: caller-supplied plan, or fetched from the doc being
  // templated (post-import gallery). Cards upgrade in place when it arrives.
  const [plan, setPlan] = useState<LayoutPlan | null>(previewPlan ? slimPlan(previewPlan) : null);
  useEffect(() => {
    if (previewPlan || !applyToDocId) return;
    getDocument(applyToDocId)
      .then((d) => { if (d.docPlan) setPlan(slimPlan(docPlanToLayout(d.docPlan, d.sourceMeta ?? {}))); })
      .catch(() => { /* placeholder previews */ });
  }, [applyToDocId, previewPlan]);

  const all = listTemplates(themeNames());
  const groups = (Object.keys(DOC_LABELS) as DocType[]).map((dt) => ({ dt, items: all.filter((t) => t.docType === dt) }));

  async function pick(t: Template) {
    if (busy) return;
    setBusy(t.id);
    setErr(null);
    try {
      if (onPick) {
        await onPick(t); // caller navigates on success
        return;
      }
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
        style={{ background: "var(--ui-panel)", borderRadius: 10, padding: "24px 28px", width: "100%", maxWidth: 940, boxShadow: "0 8px 40px rgba(0,0,0,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, flex: 1 }}>{importing ? "Add a template to your document" : "Start from a template"}</h2>
          {importing && (
            <button onClick={onClose} style={{ marginRight: 12, padding: "6px 12px", fontSize: 13, fontWeight: 600, color: "var(--ui-muted)", background: "#fff", border: "1px solid var(--ui-border-strong)", borderRadius: 6, cursor: "pointer" }}>
              Skip — open as imported
            </button>
          )}
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", color: "var(--ui-muted)", lineHeight: 1 }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: "var(--ui-muted)", marginTop: 0 }}>
          {importing ? (plan ? "Previews show your content laid into each design. Pick one — you can edit everything after." : "Applies the design to your imported content.") : "Pick a look — you can edit everything after."}
        </p>
        {err && <p style={{ color: "#b00020", fontSize: 13 }}>{err}</p>}

        {groups.map(({ dt, items }) => (
          <section key={dt} style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--ui-muted)", margin: "0 0 12px" }}>{DOC_LABELS[dt]}</h3>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, ${CARD_W}px)`, gap: 18 }}>
              {items.map((t) => (
                <button key={t.id} onClick={() => pick(t)} disabled={!!busy} title={`${t.name} · ${prettyTheme(t.theme)}`}
                  style={{ padding: 0, border: "1px solid var(--ui-border)", borderRadius: 8, background: "#fff", cursor: busy ? "default" : "pointer", overflow: "hidden", textAlign: "left" }}>
                  <div style={{ width: CARD_W, height: PAGE_H * SCALE, overflow: "hidden", position: "relative", background: "#fff" }}>
                    <iframe title={t.id} scrolling="no" tabIndex={-1} srcDoc={thumbHtml(t, plan)}
                      style={{ width: PAGE_W, height: PAGE_H, border: 0, transform: `scale(${SCALE})`, transformOrigin: "top left", pointerEvents: "none" }} />
                    {busy === t.id && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(251,247,235,.78)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "var(--ui-ink)" }}>Creating…</div>
                    )}
                  </div>
                  <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--ui-muted)", borderTop: "1px solid var(--ui-border)" }}>{prettyTheme(t.theme)}</div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
