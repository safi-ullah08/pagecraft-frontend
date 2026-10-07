import { useMemo, useState } from "react";
import { designCss, type DesignTokens } from "@pagecraft/model";
import { useStore } from "../store.ts";
import { themeNames, themeSkinCss } from "../themes.ts";
import { scopeThemeCss } from "../scope-css.ts";
import { extractSpecimen, specimenHtml } from "./specimen.ts";
import { Section, Field, Select, Slider, ColorPicker, PALETTE } from "./controls.tsx";

// The design wizard: the step between "imported a document" and "staring at a grid".
// Linear — pick a look, then tweak it — and every preview renders THE USER'S OWN
// content, never lorem ipsum.
//
// Previewing a look costs one small specimen render (a heading + two paragraphs),
// NOT a pagination of the book. Same CSS the page uses, just a tiny surface.
//
// Output is only ever `DesignTokens` — no block is mutated, so a later theme swap
// still means something (D7).

let seq = 0; // unique scope class per preview instance

function Preview({ theme, design, html, height }: {
  theme: string; design: DesignTokens; html: string; height?: number;
}) {
  const cls = useMemo(() => `pc-prev-${++seq}`, []);
  const css = useMemo(() => {
    try {
      // the SAME skin + overlay the page gets, confined to this box
      return scopeThemeCss(themeSkinCss(theme) + "\n" + designCss(design), `.${cls}`);
    } catch {
      return "";
    }
  }, [theme, design, cls]);
  return (
    <>
      <style>{css}</style>
      <div className={cls}
        style={{ padding: "10px 12px", background: "#fff", borderRadius: 3, overflow: "hidden",
          height, fontSize: 11, lineHeight: 1.4 }}
        dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}

// A tiny page glyph showing one vs two text columns — the whole choice at a glance.
function ColsGlyph({ cols, active }: { cols: 1 | 2; active: boolean }) {
  const ink = active ? "var(--ui-accent)" : "#9a9a9a";
  const line = (x: number, y: number, w: number) => (
    <rect x={x} y={y} width={w} height={2.4} rx={1.2} fill={ink} />
  );
  return (
    <svg width={34} height={44} viewBox="0 0 34 44" style={{ flexShrink: 0 }} aria-hidden>
      <rect x={1} y={1} width={32} height={42} rx={3} fill="#fff" stroke={active ? "var(--ui-accent)" : "#d9d4c7"} strokeWidth={1.4} />
      {cols === 1
        ? [7, 12, 17, 22, 27, 32].map((y) => <g key={y}>{line(6, y, 22)}</g>)
        : [7, 12, 17, 22, 27, 32].map((y) => <g key={y}>{line(6, y, 9)}{line(19, y, 9)}</g>)}
    </svg>
  );
}

const FONTS = [
  { value: "", label: "Theme default" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: '"Playfair Display", Georgia, serif', label: "Playfair" },
  { value: '"DM Sans", Helvetica, Arial, sans-serif', label: "DM Sans" },
  { value: '"Inter", Helvetica, Arial, sans-serif', label: "Inter" },
  { value: '"Courier New", monospace', label: "Courier" },
];

export function DesignWizard({ onClose }: { onClose: () => void }) {
  const sections = useStore((s) => s.sections);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const design = useStore((s) => s.design);
  const setDesign = useStore((s) => s.setDesign);
  const columns = useStore((s) => s.columns);
  const setColumns = useStore((s) => s.setColumns);
  const appliedTemplate = useStore((s) => s.appliedTemplate);

  const [step, setStep] = useState(0);
  const [applyingCols, setApplyingCols] = useState(false);
  const chooseColumns = async (n: 1 | 2) => {
    if (n === columns || applyingCols) return;
    setApplyingCols(true);
    try { await setColumns(n); } finally { setApplyingCols(false); }
  };
  const specimen = useMemo(() => extractSpecimen(sections), [sections]);
  const html = useMemo(() => specimenHtml(specimen), [specimen]);
  const usingTheirs = sections.length > 0;

  const STEPS = ["Look", "Headings", "Body", "Columns"];
  const set = (patch: Partial<DesignTokens>) => setDesign(patch);

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--ui-panel)", borderRadius: 8, width: "min(900px, 100%)", maxHeight: "100%",
          display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 12px 48px rgba(0,0,0,.35)" }}>

        {/* header + steps */}
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${PALETTE.BORDER}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: PALETTE.TEXT }}>Design your document</div>
          <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
            {STEPS.map((s, i) => (
              <button key={s} onClick={() => setStep(i)}
                style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, cursor: "pointer",
                  border: `1px solid ${i === step ? "var(--ui-accent)" : PALETTE.BORDER}`,
                  background: i === step ? "var(--ui-accent-soft)" : "transparent",
                  color: i === step ? PALETTE.TEXT : PALETTE.MUTED }}>
                {i + 1}. {s}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: PALETTE.MUTED, fontSize: 12 }}>Skip</button>
        </div>

        <div style={{ display: "flex", minHeight: 0, flex: 1 }}>
          {/* controls */}
          <div style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${PALETTE.BORDER}`, overflowY: "auto" }}>
            {step === 0 && (
              <Section title={usingTheirs ? "Previewed with your content" : "Pick a look"}>
                <div style={{ display: "grid", gap: 8 }}>
                  {themeNames().map((t) => (
                    <button key={t} onClick={() => setTheme(t)}
                      style={{ textAlign: "left", padding: 0, borderRadius: 5, cursor: "pointer", overflow: "hidden",
                        border: `2px solid ${t === theme ? "var(--ui-accent)" : PALETTE.BORDER}`, background: "#fff" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: PALETTE.TEXT, padding: "5px 8px", background: PALETTE.SURFACE }}>{t}</div>
                      <div style={{ transform: "scale(.92)", transformOrigin: "top left", width: "108%" }}>
                        <Preview theme={t} design={design} html={html} height={104} />
                      </div>
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {step === 1 && (
              <Section title="Headings">
                <Field label="Font"><Select value={design.headingFont ?? ""} options={FONTS} onChange={(v) => set({ headingFont: v || undefined })} /></Field>
                <Field label="Size"><Slider value={design.headingSize ?? 32} min={16} max={72} onChange={(v) => set({ headingSize: v })} /></Field>
                <Field label="Weight"><Slider value={design.headingWeight ?? 700} min={300} max={900} step={100} onChange={(v) => set({ headingWeight: v })} /></Field>
                <Field label="Colour"><ColorPicker value={design.headingColor ?? "#000000"} onChange={(v) => set({ headingColor: v })} /></Field>
                <Field label="Align"><Select value={design.headingAlign ?? "left"} options={[{ value: "left", label: "Left" }, { value: "center", label: "Centred" }]} onChange={(v) => set({ headingAlign: v as "left" | "center" })} /></Field>
                <Field label="Accent"><ColorPicker value={design.accent ?? "var(--ui-accent)"} onChange={(v) => set({ accent: v })} /></Field>
              </Section>
            )}

            {step === 2 && (
              <Section title="Body text">
                <Field label="Font"><Select value={design.bodyFont ?? ""} options={FONTS} onChange={(v) => set({ bodyFont: v || undefined })} /></Field>
                <Field label="Size"><Slider value={design.bodySize ?? 16} min={9} max={28} onChange={(v) => set({ bodySize: v })} /></Field>
                <Field label="Line height"><Slider value={design.lineHeight ?? 1.5} min={1} max={2.4} step={0.05} onChange={(v) => set({ lineHeight: v })} /></Field>
                <Field label="Measure"><Slider value={design.measure ?? 0} min={0} max={110} onChange={(v) => set({ measure: v })} /></Field>
                <div style={{ fontSize: 10, color: PALETTE.MUTED, marginTop: -4 }}>0 = full width. Caps line length only; page layout is unchanged.</div>
                <Field label="Drop cap">
                  <input type="checkbox" checked={!!design.dropCap} onChange={(e) => set({ dropCap: e.target.checked })} />
                </Field>
              </Section>
            )}

            {step === 3 && (
              <Section title="Body columns">
                <div style={{ fontSize: 10, color: PALETTE.MUTED, marginTop: -4, marginBottom: 2 }}>
                  How the body text flows on each page. Photos stay where the template places them.
                </div>
                {([
                  { n: 2 as const, label: "Two columns", hint: "The template as designed — text reads left column, then right." },
                  { n: 1 as const, label: "Single column", hint: "One full-width column per page. Simpler, easier to read." },
                ]).map(({ n, label, hint }) => {
                  const active = columns === n;
                  return (
                    <button key={n} disabled={applyingCols} onClick={() => chooseColumns(n)}
                      style={{ display: "flex", gap: 10, alignItems: "center", textAlign: "left", width: "100%",
                        padding: "10px 11px", marginBottom: 8, borderRadius: 6, cursor: applyingCols ? "wait" : "pointer",
                        border: `2px solid ${active ? "var(--ui-accent)" : PALETTE.BORDER}`,
                        background: active ? "var(--ui-accent-soft)" : "#fff", opacity: applyingCols && !active ? 0.6 : 1 }}>
                      <ColsGlyph cols={n} active={active} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: PALETTE.TEXT }}>{label}</div>
                        <div style={{ fontSize: 10, color: PALETTE.MUTED, lineHeight: 1.35, marginTop: 2 }}>{hint}</div>
                      </div>
                    </button>
                  );
                })}
                <div style={{ fontSize: 10, color: PALETTE.MUTED, lineHeight: 1.4, marginTop: 2 }}>
                  {applyingCols
                    ? "Re-laying your document…"
                    : appliedTemplate
                      ? "Changing this re-lays your document right away."
                      : "Applies when you lay this document out with a template."}
                </div>
              </Section>
            )}

            {/* the parked cover flow — a visible seam, honestly labelled */}
            <Section title="Cover">
              <button disabled title="Cover design is a separate flow — not built yet"
                style={{ padding: "8px 10px", borderRadius: 4, border: `1px dashed ${PALETTE.BORDER_STRONG}`,
                  background: PALETTE.SURFACE, color: PALETTE.MUTED, fontSize: 11, cursor: "not-allowed", textAlign: "left" }}>
                Design your cover → <span style={{ opacity: .8 }}>coming soon</span>
              </button>
              <div style={{ fontSize: 10, color: PALETTE.MUTED }}>
                Meanwhile, Templates › Front cover has ready-made covers that follow this look.
              </div>
            </Section>
          </div>

          {/* live preview — their content, current theme + overrides */}
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", background: "var(--ui-bg-deep)", padding: 18 }}>
            <div style={{ fontSize: 10, color: "var(--ui-muted)", marginBottom: 8 }}>
              {usingTheirs ? "Your content, previewed live" : "Sample content — import a document to preview your own"}
            </div>
            <div style={{ background: "#fff", boxShadow: "0 1px 8px rgba(0,0,0,.2)", borderRadius: 3 }}>
              <Preview theme={theme} design={design} html={html} />
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${PALETTE.BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setDesign(null)}
            style={{ fontSize: 11, padding: "7px 12px", borderRadius: 4, cursor: "pointer",
              border: `1px solid ${PALETTE.BORDER}`, background: "#fff", color: PALETTE.MUTED }}>
            Reset to theme
          </button>
          <div style={{ flex: 1 }} />
          {step > 0 && (
            <button onClick={() => setStep(step - 1)}
              style={{ fontSize: 12, padding: "7px 14px", borderRadius: 4, cursor: "pointer", border: `1px solid ${PALETTE.BORDER}`, background: "#fff" }}>Back</button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)}
              style={{ fontSize: 12, padding: "7px 16px", borderRadius: 4, cursor: "pointer", border: "none", background: "var(--ui-accent)", color: "#fff", fontWeight: 600 }}>Next</button>
          ) : (
            <button onClick={onClose}
              style={{ fontSize: 12, padding: "7px 16px", borderRadius: 4, cursor: "pointer", border: "none", background: "var(--ui-accent)", color: "#fff", fontWeight: 600 }}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
