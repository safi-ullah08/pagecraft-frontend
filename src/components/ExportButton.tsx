import { useRef, useState } from "react";
import { startExport, pollForExportUrl } from "../api.ts";

export function ExportButton({ documentId, theme }: { documentId: string; theme: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);

  async function onClick() {
    setIsExporting(true);
    setError(null);

    try {
      const { jobId } = await startExport(documentId, theme);
      const ready = await pollForExportUrl(jobId);
      // NOT window.open: a render takes minutes, and by the time it resolves the
      // click that started it is long gone — every popup blocker kills a
      // window.open outside a user gesture. Hand the user a link to click instead;
      // their click IS the gesture, so nothing is blocked.
      setUrl(ready);
      dlg.current?.showModal();
    } catch (err) {
      console.error("Export failed:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {/* The one action people hunt for, so it wears the primary tokens the rest
          of the chrome keeps for itself — dark coffee, parchment ink, big hit area. */}
      <button
        onClick={onClick}
        disabled={isExporting}
        style={{
          background: isExporting ? "var(--ui-muted)" : "var(--ui-primary)",
          color: "var(--ui-primary-ink)",
          border: "1px solid var(--ui-primary)",
          borderRadius: "6px",
          padding: "10px 20px",
          fontSize: "1rem",
          fontWeight: 600,
          letterSpacing: ".01em",
          cursor: isExporting ? "progress" : "pointer",
        }}
      >
        {isExporting ? "Generating PDF…" : "Export PDF"}
      </button>
      {error && <span style={{ color: "red", fontSize: "0.875rem" }}>{error}</span>}
      {/* ponytail: native <dialog> — modal, Esc-to-close and backdrop for free, no library. */}
      <dialog
        ref={dlg}
        style={{
          background: "var(--ui-panel)", color: "var(--ui-ink)",
          border: "1px solid var(--ui-border-strong)", borderRadius: "10px",
          padding: "20px 24px", boxShadow: "0 12px 40px rgba(51,38,26,.25)",
        }}
      >
        <p style={{ margin: "0 0 14px", fontSize: "1rem" }}>Your PDF is ready.</p>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {url && (
            <a
              href={url}
              download={`${documentId}.pdf`}
              target="_blank"
              rel="noreferrer"
              onClick={() => dlg.current?.close()}
              style={{
                background: "var(--ui-primary)", color: "var(--ui-primary-ink)",
                borderRadius: "6px", padding: "9px 18px", fontWeight: 600, textDecoration: "none",
              }}
            >
              Download PDF
            </a>
          )}
          <button onClick={() => dlg.current?.close()} style={{ padding: "9px 14px" }}>Close</button>
        </div>
      </dialog>
    </div>
  );
}
