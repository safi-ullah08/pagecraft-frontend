import { useEffect, useRef, useState } from "react";
import { listDocuments, createDocument, deleteDocument, renameDocument, getBillingStatus, startCheckout, uploadDocument, type DocumentSummary } from "../api.ts";
import { ImportBar } from "./ImportBar.tsx";
import { ImportHub } from "./ImportHub.tsx";
import { TemplateGallery } from "./TemplateGallery.tsx";

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
  const [plan, setPlan] = useState<"free" | "pro" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  const [importedDocId, setImportedDocId] = useState<string | null>(null); // set = gallery in "apply to import" mode
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listDocuments().then(setDocs).catch((e) => setErr(String(e instanceof Error ? e.message : e)));
    getBillingStatus().then((s) => setPlan(s.plan)).catch(() => setPlan("free"));
  }, []);

  async function upload(file: File) {
    if (uploading) return;
    setUploading(true);
    setErr(null);
    try {
      const { documentId } = await uploadDocument(file);
      // Prompt to apply a template to the freshly-imported doc (keeps content).
      // Dismissing the gallery opens the doc as-is.
      setImportedDocId(documentId);
      setGalleryOpen(true);
      setUploading(false);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setUploading(false);
    }
  }

  async function upgrade() {
    try {
      await startCheckout(); // redirects to Lemon Squeezy on success
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    }
  }

  async function create() {
    if (creating) return;
    const name = prompt("Name your document", "Untitled");
    if (name === null) return; // cancelled
    setCreating(true);
    try {
      const { document } = await createDocument(name.trim() || "Untitled");
      openDoc(document.id);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setCreating(false);
    }
  }

  async function rename(id: string, current: string) {
    const name = prompt("Rename document", current || "Untitled");
    if (name === null || !name.trim() || name.trim() === current) return;
    const title = name.trim();
    setDocs((d) => d?.map((x) => (x.id === id ? { ...x, title } : x)) ?? null); // optimistic
    try {
      await renameDocument(id, title);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      listDocuments().then(setDocs); // re-sync on failure
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
    <div style={{ minHeight: "100vh", background: "var(--ui-bg)" }}>
      {/* hover/skeleton states — inline styles can't express :hover */}
      <style>{`
        .dash-card { transition: box-shadow .15s ease, transform .15s ease, border-color .15s ease; }
        .dash-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(35,20,12,.10); border-color: var(--ui-border-strong) !important; }
        .dash-del, .dash-act { opacity: 0; transition: opacity .12s ease; }
        .dash-card:hover .dash-del, .dash-card:hover .dash-act { opacity: 1; }
        .dash-del:hover { background: #FBEAE6 !important; color: #b00020 !important; }
        .dash-act:hover { background: var(--ui-accent-soft) !important; color: var(--ui-accent) !important; }
        .dash-skel { animation: dashPulse 1.2s ease-in-out infinite; }
        @keyframes dashPulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
      `}</style>
      <div style={{ maxWidth: 1020, margin: "0 auto", padding: "36px 24px 64px" }}>
        {galleryOpen && (
          <TemplateGallery
            applyToDocId={importedDocId ?? undefined}
            onClose={() => { if (importedDocId) openDoc(importedDocId); else setGalleryOpen(false); }}
          />
        )}
        {hubOpen && (
          <ImportHub
            onClose={() => setHubOpen(false)}
            onImported={(documentId) => {
              // same flow as file upload: offer a template for the fresh import
              setHubOpen(false);
              setImportedDocId(documentId);
              setGalleryOpen(true);
            }}
          />
        )}
        <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.02em", color: "var(--ui-ink)" }}>
              My documents
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ui-muted)" }}>
              {docs === null ? "Loading your library…"
                : docs.length === 0 ? "Your library is empty"
                : `${docs.length} document${docs.length === 1 ? "" : "s"} in your library`}
              {plan === "pro" && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#2e7d32", background: "#E8F3E9", padding: "2px 8px", borderRadius: 999 }}>PRO ✓</span>}
            </p>
          </div>
          {plan === "free" && (
            <button onClick={upgrade} style={ghostBtn}>Upgrade to Pro</button>
          )}
          <ImportBar />
          <input ref={fileInput} type="file" accept=".docx,.md,.markdown,.txt" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
          <button onClick={() => setHubOpen(true)} title="Import posts from WordPress, Notion or Google Docs" style={ghostBtn}>
            ⇩ Import from…
          </button>
          <button onClick={() => fileInput.current?.click()} disabled={uploading} title="Upload a .docx, .md or .txt file" style={ghostBtn}>
            {uploading ? "Uploading…" : "↑ Upload"}
          </button>
          <button onClick={() => { setImportedDocId(null); setGalleryOpen(true); }} title="Start from a ready-made template" style={ghostBtn}>
            ◆ Templates
          </button>
          <button onClick={create} disabled={creating}
            style={{ padding: "9px 16px", fontSize: 14, fontWeight: 700, color: "var(--ui-primary-ink)", background: "var(--ui-primary)",
              border: "none", borderRadius: 8, cursor: "pointer", boxShadow: "0 2px 8px rgba(62,44,24,.35)" }}>
            {creating ? "Creating…" : "+ New document"}
          </button>
        </header>

        {plan === "free" && (
          <p style={{ fontSize: 12, color: "var(--ui-accent)", background: "var(--ui-accent-soft)", border: "1px solid var(--ui-border)",
            borderRadius: 8, padding: "8px 12px", margin: "10px 0 0", display: "inline-block" }}>
            Free plan — exported PDFs carry a small “Made with Kator.io” line on every page. Upgrade to Pro to remove it.
          </p>
        )}

        {err && <p style={{ color: "#b00020", fontSize: 13 }}>{err}</p>}

        <div style={{ marginTop: 26 }}>
          {docs === null ? (
            <div style={grid}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="dash-skel" style={{ ...cardShell, height: 190, background: "var(--ui-accent-soft)", border: "1px solid var(--ui-border)" }} />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div style={{ border: "2px dashed var(--ui-border-strong)", borderRadius: 14, padding: "56px 24px", textAlign: "center", background: "var(--ui-panel)" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", color: "var(--ui-ink)" }}>Create your first document</h2>
              <p style={{ fontSize: 14, color: "var(--ui-muted)", margin: "0 0 20px" }}>
                Start from a beautiful template, upload a file, or begin with a blank page.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => { setImportedDocId(null); setGalleryOpen(true); }} style={ghostBtn}>◆ Browse templates</button>
                <button onClick={create} disabled={creating}
                  style={{ padding: "9px 16px", fontSize: 14, fontWeight: 700, color: "var(--ui-primary-ink)", background: "var(--ui-primary)", border: "none", borderRadius: 8, cursor: "pointer" }}>
                  {creating ? "Creating…" : "+ New document"}
                </button>
              </div>
            </div>
          ) : (
            <div style={grid}>
              {docs.map((d) => (
                <div key={d.id} className="dash-card" onClick={() => openDoc(d.id)}
                  style={{ ...cardShell, border: "1px solid var(--ui-border)", background: "var(--ui-paper)", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                  {/* mini "page" motif: accent wash + the title's initial as a big drop cap */}
                  <div style={{ height: 96, background: "linear-gradient(135deg, rgba(138,90,43,.16), rgba(138,90,43,.05))",
                    display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid var(--ui-border)" }}>
                    <span style={{ fontFamily: "var(--ui-serif)", fontSize: 44, fontWeight: 700, color: "var(--ui-accent)", opacity: .85, lineHeight: 1 }}>
                      {(d.title || "U").trim().charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <button className="dash-del" title="Delete document"
                    onClick={(e) => { e.stopPropagation(); void remove(d.id, d.title); }}
                    style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 8, border: "none",
                      background: "rgba(255,255,255,.9)", color: "var(--ui-muted)", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>
                    ×
                  </button>
                  <button className="dash-act" title="Rename document"
                    onClick={(e) => { e.stopPropagation(); void rename(d.id, d.title); }}
                    style={{ position: "absolute", top: 8, right: 40, width: 28, height: 28, borderRadius: 8, border: "none",
                      background: "rgba(255,255,255,.9)", color: "var(--ui-muted)", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>
                    ✎
                  </button>
                  <div style={{ padding: "12px 14px 14px" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ui-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.title || "Untitled"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ui-muted)", marginTop: 4 }}>
                      {d.pages} page{d.pages === 1 ? "" : "s"} · {new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const grid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18,
};
const cardShell: React.CSSProperties = { borderRadius: 12 };
const ghostBtn: React.CSSProperties = {
  padding: "9px 14px", fontSize: 14, fontWeight: 600, color: "var(--ui-accent)", background: "var(--ui-paper)",
  border: "1px solid var(--ui-border)", borderRadius: 8, cursor: "pointer",
};
