import { useEffect, useState } from "react";
import {
  listConnections, disconnectSource, connectWordpress, listSourceContent, importItems, startOauth, getPickerToken,
  type ConnectionSource, type ConnectionInfo, type SourceItem,
} from "../api.ts";

// Google Picker globals (loaded on demand from apis.google.com).
declare global {
  interface Window { gapi?: { load: (lib: string, cb: () => void) => void }; google?: { picker?: any } }
}

// The "Import from…" hub: connect a source once per workspace, then browse,
// search and multi-select content to pull in as chapters. Two contexts:
//  - no appendTo → the selection becomes a NEW book (caller navigates)
//  - appendTo    → chapters append to that document (caller reloads)
// Overlay + styling mirror TemplateGallery; state per source is intentionally
// simple: connections list drives connect-pane vs picker-pane.

const SOURCES: Array<{ key: ConnectionSource; name: string; ready: boolean }> = [
  { key: "wordpress", name: "WordPress", ready: true },
  { key: "notion", name: "Notion", ready: true },
  { key: "googledocs", name: "Google Docs", ready: true },
];

export function ImportHub({ onClose, onImported, appendTo, initialTab }: {
  onClose: () => void;
  onImported: (documentId: string, appended: boolean) => void;
  appendTo?: { documentId: string; afterSectionId?: string | null };
  initialTab?: ConnectionSource;
}) {
  const [tab, setTab] = useState<ConnectionSource>(initialTab ?? "wordpress");
  const [connections, setConnections] = useState<ConnectionInfo[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => listConnections().then(setConnections).catch((e) => setErr(String(e.message ?? e)));
  useEffect(() => { refresh(); }, []);

  const conn = connections?.find((c) => c.source === tab) ?? null;
  const meta = SOURCES.find((s) => s.key === tab)!;

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(30,20,10,.45)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto", padding: "40px 24px" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--ui-panel)", borderRadius: 10, padding: "24px 28px", width: "100%", maxWidth: 720, boxShadow: "0 8px 40px rgba(30,20,10,.35)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, flex: 1, color: "var(--ui-ink)" }}>
            {appendTo ? "Add chapters from…" : "Import a book from…"}
          </h2>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", color: "var(--ui-muted)", lineHeight: 1 }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: "var(--ui-muted)", marginTop: 0 }}>
          Each selected item becomes a chapter{appendTo ? " at the end of this book." : " of a new book."}
        </p>

        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--ui-border)", marginBottom: 16 }}>
          {SOURCES.map((s) => (
            <button key={s.key} onClick={() => { setTab(s.key); setErr(null); }}
              style={{ padding: "8px 14px", fontSize: 13, border: "none", background: "transparent", cursor: "pointer", borderRadius: 0,
                borderBottom: tab === s.key ? "2px solid var(--ui-accent)" : "2px solid transparent",
                fontWeight: tab === s.key ? 700 : 400, color: tab === s.key ? "var(--ui-ink)" : "var(--ui-muted)" }}>
              {s.name}
            </button>
          ))}
        </div>

        {err && <p style={{ color: "#b00020", fontSize: 13 }}>{err}</p>}

        {connections === null ? (
          <p style={{ color: "var(--ui-muted)", fontSize: 13 }}>Loading…</p>
        ) : !meta.ready ? (
          <div style={{ padding: "28px 0", textAlign: "center", color: "var(--ui-muted)", fontSize: 14 }}>
            <p style={{ margin: 0 }}>Connect {meta.name} is coming online next — the WordPress picker works today.</p>
          </div>
        ) : conn && tab === "googledocs" ? (
          <GooglePickerPane label={conn.label} appendTo={appendTo} onImported={onImported}
            onDisconnect={async () => { await disconnectSource(tab).catch(() => {}); refresh(); }} />
        ) : conn ? (
          <Picker source={tab} label={conn.label} appendTo={appendTo} onImported={onImported}
            onDisconnect={async () => { await disconnectSource(tab).catch(() => {}); refresh(); }} />
        ) : tab === "wordpress" ? (
          <WordpressConnect onConnected={refresh} />
        ) : (
          <OauthConnect source={tab} name={meta.name} />
        )}
      </div>
    </div>
  );
}

// OAuth sources: one button → provider consent → the callback redirects back to
// the app with ?connected=<source> (Dashboard reopens the hub on that tab).
function OauthConnect({ source, name }: { source: ConnectionSource; name: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      window.location.href = await startOauth(source);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setBusy(false);
    }
  }
  return (
    <div style={{ padding: "20px 0", textAlign: "center" }}>
      <p style={{ fontSize: 14, color: "var(--ui-muted)", marginTop: 0 }}>
        {source === "notion"
          ? "You'll pick which Notion pages to share on Notion's consent screen — only those appear here."
          : `Connect your ${name} account to pick documents.`}
      </p>
      {err && <p style={{ color: "#b00020", fontSize: 13 }}>{err}</p>}
      <button onClick={go} disabled={busy}
        style={{ padding: "10px 18px", fontSize: 14, fontWeight: 700, color: "var(--ui-primary-ink)", background: "var(--ui-primary)", border: "none", borderRadius: 8, cursor: "pointer" }}>
        {busy ? "Opening…" : `Connect ${name}`}
      </button>
    </div>
  );
}

// Google tab: no server-side listing — the Google Picker grants drive.file
// access to exactly what the user picks, and hands back the ids.
function GooglePickerPane({ label, appendTo, onImported, onDisconnect }: {
  label: string | null;
  appendTo?: { documentId: string; afterSectionId?: string | null };
  onImported: (documentId: string, appended: boolean) => void;
  onDisconnect: () => void;
}) {
  const [picked, setPicked] = useState<Array<{ id: string; name: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function openPicker() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const { accessToken, apiKey, appId } = await getPickerToken();
      if (!window.google?.picker) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://apis.google.com/js/api.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Failed to load the Google picker"));
          document.head.appendChild(s);
        });
        await new Promise<void>((resolve) => window.gapi!.load("picker", resolve));
      }
      const g = window.google!.picker;
      const builder = new g.PickerBuilder()
        .setOAuthToken(accessToken)
        .addView(new g.DocsView(g.ViewId.DOCUMENTS))
        .enableFeature(g.Feature.MULTISELECT_ENABLED)
        .setCallback((data: { action: string; docs?: Array<{ id: string; name: string }> }) => {
          if (data.action === g.Action.PICKED && data.docs) {
            setPicked((prev) => {
              const seen = new Set(prev.map((d) => d.id));
              return [...prev, ...data.docs!.filter((d) => !seen.has(d.id))];
            });
          }
        });
      if (apiKey) builder.setDeveloperKey(apiKey);
      if (appId) builder.setAppId(appId);
      builder.build().setVisible(true);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (importing || picked.length === 0) return;
    setImporting(true);
    setErr(null);
    try {
      const { documentId, appended } = await importItems("googledocs", picked.map((d) => ({ id: d.id })),
        appendTo ? { documentId: appendTo.documentId, afterSectionId: appendTo.afterSectionId } : undefined);
      onImported(documentId, appended);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setImporting(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "var(--ui-muted)" }}>Connected as <b style={{ color: "var(--ui-ink)" }}>{label ?? "Google"}</b></span>
        <button onClick={onDisconnect} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "transparent", color: "var(--ui-muted)", cursor: "pointer" }}>
          Disconnect
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={openPicker} disabled={busy} style={{ padding: "7px 12px", fontSize: 13 }}>
          {busy ? "Opening…" : picked.length ? "Pick more documents" : "Pick documents"}
        </button>
      </div>
      {err && <p style={{ color: "#b00020", fontSize: 13 }}>{err}</p>}
      <div style={{ maxHeight: 340, overflowY: "auto", border: "1px solid var(--ui-border)", borderRadius: 8, background: "var(--ui-paper)" }}>
        {picked.length === 0 ? (
          <p style={{ padding: 14, fontSize: 13, color: "var(--ui-muted)" }}>Nothing picked yet — “Pick documents” opens your Google Drive.</p>
        ) : (
          picked.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: "1px solid var(--ui-border)", fontSize: 14 }}>
              <span style={{ flex: 1, color: "var(--ui-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
              <button onClick={() => setPicked((p) => p.filter((x) => x.id !== d.id))}
                style={{ border: "none", background: "transparent", color: "var(--ui-muted)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
          ))
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 14 }}>
        {importing && <span style={{ fontSize: 12, color: "var(--ui-muted)" }}>Fetching content and images — large docs can take a minute…</span>}
        <button onClick={run} disabled={importing || picked.length === 0}
          style={{ padding: "10px 18px", fontSize: 14, fontWeight: 700, borderRadius: 8, border: "none", cursor: picked.length ? "pointer" : "default",
            color: "var(--ui-primary-ink)", background: picked.length ? "var(--ui-primary)" : "var(--ui-border)" }}>
          {importing ? "Importing…" : `Add ${picked.length || ""} chapter${picked.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}

function WordpressConnect({ onConnected }: { onConnected: () => void }) {
  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function connect() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await connectWordpress({ siteUrl, username, appPassword });
      onConnected();
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setBusy(false);
    }
  }

  const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "9px 10px", fontSize: 14, marginBottom: 10 };
  return (
    <div style={{ maxWidth: 440 }}>
      <p style={{ fontSize: 13, color: "var(--ui-muted)", marginTop: 0 }}>
        For your own site, create an <b>application password</b> under Users → Profile → Application Passwords.
        For any public WordPress site, just the URL works (read-only).
      </p>
      <input style={field} placeholder="https://yourblog.com" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
      <input style={field} placeholder="WordPress username (optional for public sites)" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input style={field} type="password" placeholder="Application password (optional for public sites)" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} />
      {err && <p style={{ color: "#b00020", fontSize: 13 }}>{err}</p>}
      <button onClick={connect} disabled={busy}
        style={{ padding: "9px 16px", fontSize: 14, fontWeight: 700, color: "var(--ui-primary-ink)", background: "var(--ui-primary)", border: "none", borderRadius: 8, cursor: "pointer" }}>
        {busy ? "Checking credentials…" : "Connect site"}
      </button>
    </div>
  );
}

function Picker({ source, label, appendTo, onImported, onDisconnect }: {
  source: ConnectionSource;
  label: string | null;
  appendTo?: { documentId: string; afterSectionId?: string | null };
  onImported: (documentId: string, appended: boolean) => void;
  onDisconnect: () => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SourceItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function search(reset = true, cursor?: string) {
    setLoading(true);
    setErr(null);
    try {
      const res = await listSourceContent(source, query, cursor);
      setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
      setNextCursor(res.nextCursor);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void search(); }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function run() {
    if (importing || selected.size === 0) return;
    setImporting(true);
    setErr(null);
    try {
      const picked = items.filter((i) => selected.has(i.id)).map((i) => ({ id: i.id })); // preserves list order
      const { documentId, appended } = await importItems(source, picked, appendTo ? { documentId: appendTo.documentId, afterSectionId: appendTo.afterSectionId } : undefined);
      onImported(documentId, appended);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setImporting(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "var(--ui-muted)" }}>Connected to <b style={{ color: "var(--ui-ink)" }}>{label ?? source}</b></span>
        <button onClick={onDisconnect} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "transparent", color: "var(--ui-muted)", cursor: "pointer" }}>
          Disconnect
        </button>
        <div style={{ flex: 1 }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search…" style={{ width: 200, padding: "7px 10px", fontSize: 13 }} />
        <button onClick={() => search()} disabled={loading} style={{ padding: "7px 12px", fontSize: 13 }}>Search</button>
      </div>

      {err && <p style={{ color: "#b00020", fontSize: 13 }}>{err}</p>}

      {source === "notion" && (
        <p style={{ fontSize: 12, color: "var(--ui-muted)", background: "var(--ui-accent-soft)", border: "1px solid var(--ui-border)", borderRadius: 8, padding: "7px 10px", margin: "0 0 10px" }}>
          Heads up: Notion imports fetch every block and image through Notion's rate-limited API — a long page can take a couple of minutes. Your book opens automatically when it's done.
        </p>
      )}

      <div style={{ maxHeight: 340, overflowY: "auto", border: "1px solid var(--ui-border)", borderRadius: 8, background: "var(--ui-paper)" }}>
        {loading && items.length === 0 ? (
          <p style={{ padding: 14, fontSize: 13, color: "var(--ui-muted)" }}>Loading…</p>
        ) : items.length === 0 ? (
          <p style={{ padding: 14, fontSize: 13, color: "var(--ui-muted)" }}>
            {source === "notion" && !query
              ? "No pages shared yet — in Notion, share pages with the integration (or re-run Connect and pick more pages)."
              : <>Nothing found{query ? ` for “${query}”` : ""}.</>}
          </p>
        ) : (
          items.map((it) => (
            <label key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: "1px solid var(--ui-border)", cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggle(it.id)} />
              <span style={{ flex: 1, color: "var(--ui-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
              {it.date && <span style={{ fontSize: 12, color: "var(--ui-muted)" }}>{new Date(it.date).toLocaleDateString()}</span>}
            </label>
          ))
        )}
        {nextCursor && (
          <button onClick={() => search(false, nextCursor)} disabled={loading}
            style={{ width: "100%", padding: "9px 0", border: "none", background: "transparent", color: "var(--ui-accent)", fontSize: 13, cursor: "pointer" }}>
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 14 }}>
        {importing && <span style={{ fontSize: 12, color: "var(--ui-muted)" }}>Fetching content and images — large pages can take a minute…</span>}
        <button onClick={run} disabled={importing || selected.size === 0}
          style={{ padding: "10px 18px", fontSize: 14, fontWeight: 700, borderRadius: 8, border: "none", cursor: selected.size ? "pointer" : "default",
            color: "var(--ui-primary-ink)", background: selected.size ? "var(--ui-primary)" : "var(--ui-border)" }}>
          {importing ? "Importing…" : `Add ${selected.size || ""} chapter${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
