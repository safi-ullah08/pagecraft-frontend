// Thin fetch wrapper to the backend (/api is proxied to :4000 in dev).
import type { JSONContent } from "@tiptap/react";
import { DEFAULT_THEME } from "./themes.ts";
import type { GridSection } from "./grid/types.ts";

// Clerk's getToken(), injected at startup by <AuthBridge> (see main.tsx).
// When Clerk is on, requests must wait for it to be wired or they fire tokenless
// and 401 (the initial load races the provider mount / StrictMode double-mount).
const clerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
let tokenGetter: (() => Promise<string | null>) | null = null;
let markReady!: () => void;
const tokenReady = new Promise<void>((r) => (markReady = r));
export function setTokenGetter(fn: () => Promise<string | null>) {
  tokenGetter = fn;
  markReady();
}

// fetch + the Clerk bearer token. Drop-in for fetch across this module.
async function authedFetch(input: string, init: RequestInit = {}) {
  if (clerkEnabled) await tokenReady;
  const token = tokenGetter ? await tokenGetter() : null;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

// A section's content is a Tiptap doc (flow) or a GridSection (grid); the shape
// self-describes (grid = { type:"grid", … }). Both round-trip through the same PUT.
export type SectionContent = JSONContent | GridSection;
export type Section = { id: string; content: SectionContent; version: number };
export type Document = { id: string; title: string; theme: string; sections: Section[] };

export async function createDocument(title = "Untitled") {
  const res = await authedFetch("/api/documents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`create failed: ${res.status}`);
  return res.json() as Promise<{ document: { id: string }; section: Section }>;
}

export type DocumentSummary = { id: string; title: string; createdAt: string; pages: number };

// Dashboard: my documents, newest first.
export async function listDocuments() {
  const res = await authedFetch("/api/documents");
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  return (await res.json()).documents as DocumentSummary[];
}

export async function deleteDocument(id: string) {
  const res = await authedFetch(`/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
}

// Billing (Lemon Squeezy). getBillingStatus tells the dashboard free vs pro;
// startCheckout redirects to the LS checkout for the current workspace.
export async function getBillingStatus() {
  const res = await authedFetch("/api/billing/status");
  if (!res.ok) throw new Error(`billing status failed: ${res.status}`);
  return (await res.json()) as { plan: "free" | "pro"; subStatus?: string | null; currentPeriodEnd?: string | null };
}

export async function startCheckout() {
  const res = await authedFetch("/api/billing/checkout");
  if (res.status === 503) throw new Error("Billing isn't configured yet.");
  if (!res.ok) throw new Error(`checkout failed: ${res.status}`);
  const { url } = (await res.json()) as { url: string };
  window.location.href = url;
}

export async function getDocument(id: string) {
  const res = await authedFetch(`/api/documents/${id}`);
  if (!res.ok) throw new Error(`load failed: ${res.status}`);
  return res.json() as Promise<Document>;
}

// add a new page (empty grid section) at the end of a document
export async function addSection(documentId: string) {
  const res = await authedFetch(`/api/documents/${documentId}/sections`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`add page failed: ${res.status}`);
  return res.json() as Promise<Section>;
}

export async function deleteSection(id: string) {
  const res = await authedFetch(`/api/sections/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`delete page failed: ${res.status}`);
}

// insert new pages right after a section (split / break-to-next-page)
export async function insertSectionsAfter(documentId: string, afterSectionId: string, pages: SectionContent[]) {
  const res = await authedFetch(`/api/documents/${documentId}/sections/insert-after`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ afterSectionId, pages }),
  });
  if (!res.ok) throw new Error(`insert failed: ${res.status}`);
  return res.json() as Promise<{ sections: Section[] }>;
}

// replace a document's sections with the flow→grid paginated pages
export async function convertDocument(documentId: string, pages: SectionContent[]) {
  const res = await authedFetch(`/api/documents/${documentId}/convert`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pages }),
  });
  if (!res.ok) throw new Error(`convert failed: ${res.status}`);
  return res.json() as Promise<{ sections: Section[] }>;
}

export async function getSection(id: string) {
  const res = await authedFetch(`/api/sections/${id}`);
  if (!res.ok) throw new Error(`section load failed: ${res.status}`);
  return res.json() as Promise<Section>;
}

// Returns the new version. Throws "version_conflict" on 409 so the caller can
// re-read and retry (optimistic concurrency).
export async function saveSection(id: string, content: SectionContent, version: number) {
  const res = await authedFetch(`/api/sections/${id}`, {
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
  const res = await authedFetch(`/api/integrations/${source}/import`, {
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
  const res = await authedFetch("/api/export", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ documentId, theme }),
  });
  return res.json() as Promise<{ jobId: string }>;
}
