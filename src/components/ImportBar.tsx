import { useState } from "react";
import { importSource } from "../api.ts";

// Paste a URL (or raw HTML) → import into a new document → open it. On success we
// navigate to ?doc=<id>; the store bootstraps that document on reload.
export function ImportBar() {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    const v = value.trim();
    if (!v || busy) return;
    setBusy(true);
    setErr(null);
    try {
      // raw HTML if it looks like markup, else treat as a URL
      const isHtml = v.startsWith("<");
      const { documentId } = await importSource(isHtml ? "html" : "url", isHtml ? { html: v } : { url: v });
      window.location.search = `?doc=${documentId}`; // reload into the imported doc
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <input
        style={{ width: 240, padding: "3px 6px", fontSize: 13 }}
        placeholder="Import URL or paste HTML…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && run()}
      />
      <button onClick={run} disabled={busy}>{busy ? "Importing…" : "Import"}</button>
      {err && <span style={{ color: "#b00020", fontSize: 12 }} title={err}>import failed</span>}
    </div>
  );
}
