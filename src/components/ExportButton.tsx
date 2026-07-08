import { startExport } from "../api.ts";

// Kicks off an async export job (never renders inline). Uses the SAME theme as
// the preview so the PDF matches. Polling the job for the URL is TODO.
export function ExportButton({ documentId, theme }: { documentId: string; theme: string }) {
  async function onClick() {
    const { jobId } = await startExport(documentId, theme);
    console.log("export job:", jobId); // TODO: poll GET /api/export/:jobId -> url
  }
  return <button onClick={onClick}>Export PDF</button>;
}
