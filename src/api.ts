// Thin fetch wrapper to the backend (/api is proxied to :4000 in dev).
import type { JSONContent } from "@tiptap/react";

export async function saveSection(id: string, content: JSONContent, version: number) {
  const res = await fetch(`/api/sections/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content, version }),
  });
  if (res.status === 409) throw new Error("version_conflict");
  return res.json() as Promise<{ version: number }>;
}

export async function startExport(documentId: string, theme = "classic") {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ documentId, theme }),
  });
  return res.json() as Promise<{ jobId: string }>;
}
