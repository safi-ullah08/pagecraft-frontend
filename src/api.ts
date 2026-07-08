// Thin fetch wrapper to the backend (/api is proxied to :4000 in dev).
import type { JSONContent } from "@tiptap/react";
import { DEFAULT_THEME } from "./themes.ts";

export type Section = { id: string; content: JSONContent; version: number };
export type Document = { id: string; title: string; theme: string; sections: Section[] };

export async function createDocument(title = "Untitled") {
  const res = await fetch("/api/documents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return res.json() as Promise<{ document: { id: string }; section: Section }>;
}

export async function getDocument(id: string) {
  const res = await fetch(`/api/documents/${id}`);
  if (!res.ok) throw new Error(`load failed: ${res.status}`);
  return res.json() as Promise<Document>;
}

export async function getSection(id: string) {
  const res = await fetch(`/api/sections/${id}`);
  if (!res.ok) throw new Error(`section load failed: ${res.status}`);
  return res.json() as Promise<Section>;
}

// Returns the new version. Throws "version_conflict" on 409 so the caller can
// re-read and retry (optimistic concurrency).
export async function saveSection(id: string, content: JSONContent, version: number) {
  const res = await fetch(`/api/sections/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content, version }),
  });
  if (res.status === 409) throw new Error("version_conflict");
  if (!res.ok) throw new Error(`save failed: ${res.status}`); // never let {version: undefined} through
  return res.json() as Promise<{ version: number }>;
}

// Import a source (url | html | wordpress | …) into a NEW document. Returns the
// new documentId; the caller navigates to it.
export async function importSource(source: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/integrations/${source}/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.json().then((j) => j.message ?? j.error).catch(() => null);
    throw new Error(msg ?? `import failed: ${res.status}`);
  }
  return res.json() as Promise<{ documentId: string; sections: number }>;
}

export async function startExport(documentId: string, theme = DEFAULT_THEME) {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ documentId, theme }),
  });
  return res.json() as Promise<{ jobId: string }>;
}
