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

  const [step, setStep] = useState(0);
  const specimen = useMemo(() => extractSpecimen(sections), [sections]);
  const html = useMemo(() => specimenHtml(specimen), [specimen]);
  const usingTheirs = sections.length > 0;

  const STEPS = ["Look", "Headings", "Body"];
  const set = (patch: Partial<DesignTokens>) => setDesign(patch);

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 8, width: "min(900px, 100%)", maxHeight: "100%",
          display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 12px 48px rgba(0,0,0,.35)" }}>

        {/* header + steps */}
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${PALETTE.BORDER}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: PALETTE.TEXT }}>Design your document</div>
          <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
            {STEPS.map((s, i) => (
              <button key={s} onClick={() => setStep(i)}
                style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, cursor: "pointer",
                  border: `1px solid ${i === step ? "#E07A5F" : PALETTE.BORDER}`,
                  background: i === step ? "#E07A5F18" : "transparent",
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
                        border: `2px solid ${t === theme ? "#E07A5F" : PALETTE.BORDER}`, background: "#fff" }}>
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
                <Field label="Accent"><ColorPicker value={design.accent ?? "#E07A5F"} onChange={(v) => set({ accent: v })} /></Field>
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
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", background: "#eee", padding: 18 }}>
            <div style={{ fontSize: 10, color: "#777", marginBottom: 8 }}>
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
              style={{ fontSize: 12, padding: "7px 16px", borderRadius: 4, cursor: "pointer", border: "none", background: "#E07A5F", color: "#fff", fontWeight: 600 }}>Next</button>
          ) : (
            <button onClick={onClose}
              style={{ fontSize: 12, padding: "7px 16px", borderRadius: 4, cursor: "pointer", border: "none", background: "#E07A5F", color: "#fff", fontWeight: 600 }}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
