// Machine-readable editor load status on window.__pcLoad, for headless callers:
// the demo factory opens `?doc=…&tpl=…` in a headless browser and waits for
// state to leave "loading" (pageCraft-backend src/demo/layout.ts). Inert for
// people — nothing in the UI reads it.
export type PcLoad = { state: "loading" | "done" | "error"; report: string[]; error?: string };

declare global {
  interface Window { __pcLoad?: PcLoad }
}

export function signalLoad(patch: Partial<PcLoad>): void {
  const cur: PcLoad = window.__pcLoad ?? { state: "loading", report: [] };
  // an error sticks: a later "done" from the load tail must not mask it
  if (cur.state === "error" && patch.state === "done") return;
  window.__pcLoad = { ...cur, ...patch };
}
