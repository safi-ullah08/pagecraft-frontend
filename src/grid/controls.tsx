import type { CSSProperties, ReactNode } from "react";

// Inspector form controls (ported from temp/src/_shared, CSS vars → concrete
// colors so they don't depend on app-level design tokens).
const TEXT = "#111";
const MUTED = "#666";
const SURFACE = "#f5f5f5";
const BORDER = "#ddd";
const BORDER_STRONG = "#bbb";
const ACCENT = "#E07A5F";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ padding: "14px 14px 18px", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: MUTED, fontWeight: 600, marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
      <span style={{ color: MUTED }}>{label}</span>
      {children}
    </label>
  );
}

export const inputStyle: CSSProperties = {
  background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT,
  padding: "6px 8px", borderRadius: 4, fontSize: 12, outline: "none",
};

export function Slider({ value, min, max, step = 1, onChange, unit }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} style={{ flex: 1 }} />
      <div style={{ minWidth: 46, textAlign: "right", fontSize: 11, color: MUTED }}>{value}{unit ?? ""}</div>
    </div>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: SURFACE, border: `1px solid ${BORDER}`, padding: "6px 10px", borderRadius: 4, fontSize: 12, color: TEXT, cursor: "pointer" }}>
      <span style={{ color: MUTED }}>{label}</span>
      <span style={{ width: 28, height: 16, background: value ? ACCENT : BORDER_STRONG, borderRadius: 999, position: "relative", transition: "background .12s" }}>
        <span style={{ position: "absolute", top: 2, left: value ? 14 : 2, width: 12, height: 12, background: "#fff", borderRadius: "50%", transition: "left .12s" }} />
      </span>
    </button>
  );
}

export function Select<T extends string>({ value, options, onChange }: {
  value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} style={inputStyle}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: 28, height: 24, padding: 0, border: `1px solid ${BORDER}`, borderRadius: 4, background: "transparent" }} />
      <input value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, flex: 1, fontFamily: "monospace" }} />
    </div>
  );
}

export const resetBtn: CSSProperties = { background: "transparent", border: "none", color: MUTED, fontSize: 10, cursor: "pointer", padding: "0 2px", opacity: 0.7 };
export const PALETTE = { TEXT, MUTED, SURFACE, BORDER, BORDER_STRONG, ACCENT };
