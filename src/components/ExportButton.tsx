import { startExport } from "../api.ts";

// Kicks off an async export job (never renders inline). Polling the job for the
// download URL is TODO.
export function ExportButton({ documentId }: { documentId: string }) {
  async function onClick() {
    const { jobId } = await startExport(documentId);
    console.log("export job:", jobId); // TODO: poll GET /api/export/:jobId -> url
  }
  return <button onClick={onClick}>Export PDF</button>;
}
