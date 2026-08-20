import { useState } from "react";
import { startExport, pollForExportUrl } from "../api.ts";

export function ExportButton({ documentId, theme }: { documentId: string; theme: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setIsExporting(true);
    setError(null);

    try {
    const { jobId } = await startExport(documentId, theme);
      const url = await pollForExportUrl(jobId);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Export failed:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      console.log("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button onClick={onClick} disabled={isExporting}>
      {isExporting ? "Generating PDF..." : "Export PDF"}
    </button>
  );
}