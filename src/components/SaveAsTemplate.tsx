import { useEffect, useState } from "react";
import { listWorkspaces, saveAsTemplateFor, templateSavesOf, type AdminWorkspace, type SavedTemplate, type TemplateSave } from "../api.ts";

// Staff-only: turn the document the designer just built into a template owned by
// the customer who asked for it. The backend does the conversion (pages, blocks,
// theme, images) — this dialog only picks the target and names it.
export function SaveAsTemplate({ documentId, title, onClose }: { documentId: string; title: string; onClose: () => void }) {
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[] | null>(null);
  const [saves, setSaves] = useState<TemplateSave[]>([]);
  const [target, setTarget] = useState("");
  const [name, setName] = useState(title || "Untitled template");
  const [docType, setDocType] = useState<"leadMagnet" | "ebook" | "report">("ebook");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<SavedTemplate | null>(null);

  useEffect(() => {
    listWorkspaces().then(setWorkspaces).catch((e) => setErr(String(e instanceof Error ? e.message : e)));
    templateSavesOf(documentId).then(setSaves).catch(() => { /* first save */ });
  }, [documentId]);

  async function save() {
    if (!target || !name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      setDone(await saveAsTemplateFor({ documentId, targetWorkspaceId: target, name: name.trim(), docType }));
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  // A person, not a uuid: name and email come from Clerk; the id is the last resort.
  const label = (w: AdminWorkspace) => {
    const who = [w.name, w.email].filter(Boolean).join(" · ") || w.clerkId || w.id.slice(0, 8);
    return `${who} — ${w.documents} doc${w.documents === 1 ? "" : "s"}, ${w.templates} template${w.templates === 1 ? "" : "s"}`;
  };
  const existing = saves.find((s) => s.workspaceId === target);

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">Save as template for a customer</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {done ? (
          <div className="stack">
            <p className="modal-note">
              {done.updated ? "Updated" : "Saved"} <strong>{done.name}</strong> {done.updated ? `to v${done.version}` : "to that workspace"} — {done.pages} page{done.pages === 1 ? "" : "s"}, {done.blocks} blocks, theme <code>{done.theme}</code>
              {done.imagesCopied > 0 && `, ${done.imagesCopied} image${done.imagesCopied === 1 ? "" : "s"} copied across`}.
              {done.skippedFlowPages > 0 && ` ${done.skippedFlowPages} flow page${done.skippedFlowPages === 1 ? " was" : "s were"} skipped — only grid pages become template pages.`}
            </p>
            <p className="modal-note">They'll see it under "My templates" the next time they load the editor.</p>
            <div className="modal-actions"><button className="app-btn" onClick={onClose}>Done</button></div>
          </div>
        ) : (
          <div className="stack">
            <label className="field">
              <span className="field-label">Customer workspace</span>
              {workspaces === null ? (
                <span className="modal-note">Loading…</span>
              ) : (
                <select className="field-input" value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">Pick a workspace…</option>
                  {workspaces.map((w) => <option key={w.id} value={w.id}>{label(w)}</option>)}
                </select>
              )}
            </label>

            <label className="field">
              <span className="field-label">Template name</span>
              <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme brand ebook" />
            </label>

            <label className="field">
              <span className="field-label">Gallery group</span>
              <select className="field-input" value={docType} onChange={(e) => setDocType(e.target.value as typeof docType)}>
                <option value="ebook">Ebook</option>
                <option value="leadMagnet">Lead magnet</option>
                <option value="report">Report</option>
              </select>
            </label>

            {existing && (
              <p className="modal-note">
                This document is already saved for them as <strong>{existing.name}</strong> (v{existing.version}).
                Saving updates that template instead of adding a second one.
              </p>
            )}
            {!existing && saves.length > 0 && (
              <p className="modal-note">Also saved for {saves.length} other workspace{saves.length === 1 ? "" : "s"}; those copies are untouched.</p>
            )}

            <p className="modal-note">
              Every grid page of this document becomes a template page, with its blocks, styling and images.
              The current theme travels with it; design-wizard tweaks are saved as a skin for that customer.
            </p>

            {err && <p className="modal-error">{err}</p>}

            <div className="modal-actions">
              <button className="app-btn" onClick={onClose}>Cancel</button>
              <button className="app-btn is-primary" onClick={() => void save()} disabled={!target || !name.trim() || busy}>
                {busy ? "Saving…" : existing ? "Update template" : "Save template"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
