import { useEffect, useState } from "react";
import { listDocuments, createDocument, deleteDocument, type DocumentSummary } from "../api.ts";
import { ImportBar } from "./ImportBar.tsx";

// The landing view (no ?doc in the URL): list / create / import / open / delete
// my documents. Navigation is a real reload to ?doc=<id> — the editor bootstraps
// that document on mount (see store.load), so no client router is needed.
function openDoc(id: string) {
  window.location.search = `?doc=${id}`;
}

export function Dashboard() {
  const [docs, setDocs] = useState<DocumentSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listDocuments().then(setDocs).catch((e) => setErr(String(e instanceof Error ? e.message : e)));
  }, []);

  async function create() {
    if (creating) return;
    setCreating(true);
    try {
      const { document } = await createDocument();
      openDoc(document.id);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setCreating(false);
    }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDocs((d) => d?.filter((x) => x.id !== id) ?? null); // optimistic
    try {
      await deleteDocument(id);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      listDocuments().then(setDocs); // re-sync on failure
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, flex: 1 }}>My documents</h1>
        <ImportBar />
        <button onClick={create} disabled={creating}
          style={{ padding: "8px 14px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#E07A5F",
            border: "none", borderRadius: 6, cursor: "pointer" }}>
          {creating ? "Creating…" : "+ New document"}
        </button>
      </header>

      {err && <p style={{ color: "#b00020", fontSize: 13 }}>{err}</p>}

      {docs === null ? (
        <p style={{ color: "#666" }}>Loading…</p>
      ) : docs.length === 0 ? (
        <p style={{ color: "#666" }}>No documents yet. Create one or import a URL to get started.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {docs.map((d) => (
            <div key={d.id}
              style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 16, background: "#fff",
                display: "flex", flexDirection: "column", gap: 8, minHeight: 120 }}>
              <button onClick={() => openDoc(d.id)}
                style={{ textAlign: "left", border: "none", background: "transparent", cursor: "pointer",
                  padding: 0, font: "inherit", fontWeight: 600, fontSize: 15, color: "#111", flex: 1 }}>
                {d.title || "Untitled"}
              </button>
              <div style={{ fontSize: 12, color: "#888" }}>
                {d.pages} page{d.pages === 1 ? "" : "s"} · {new Date(d.createdAt).toLocaleDateString()}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => openDoc(d.id)} style={btn}>Open</button>
                <button onClick={() => remove(d.id, d.title)} style={{ ...btn, color: "#b00020" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  fontSize: 12, padding: "4px 10px", borderRadius: 4, border: "1px solid #ccc",
  background: "#fff", cursor: "pointer",
};
