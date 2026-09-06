import { useEffect, useRef, useSyncExternalStore } from "react";

// A promise-based confirmation modal that replaces the native window.confirm().
// Usage from anywhere:  if (!(await confirmDialog({ title: "Delete this page?", danger: true }))) return;
// A single <ConfirmModalHost /> mounted at the app root (main.tsx) renders it, so
// call sites need no context/props — they just import confirmDialog and await it.

export type ConfirmOptions = {
  title: string;              // the main question, shown bold
  body?: string;              // optional supporting line under the title
  confirmLabel?: string;      // default "OK"
  cancelLabel?: string;       // default "Cancel"
  danger?: boolean;           // red confirm button for destructive actions
};

type Request = ConfirmOptions & { id: number; resolve: (ok: boolean) => void };

let current: Request | null = null;
let counter = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Opens the dialog and resolves true (confirm) / false (cancel, Esc, backdrop).
// A string is shorthand for { title }. If a dialog is already open it is
// cancelled and replaced, so a stray second call can't leave one stuck.
export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  const opts = typeof options === "string" ? { title: options } : options;
  return new Promise<boolean>((resolve) => {
    current?.resolve(false);
    current = { ...opts, id: ++counter, resolve };
    emit();
  });
}

function settle(ok: boolean) {
  const req = current;
  current = null;
  emit();
  req?.resolve(ok);
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getSnapshot = () => current;

export function ConfirmModalHost() {
  const req = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!req) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); settle(false); }
      else if (e.key === "Enter") { e.preventDefault(); settle(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [req]);

  if (!req) return null;
  const danger = req.danger ?? false;

  return (
    <div onClick={() => settle(false)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--ui-panel)", borderRadius: 12, padding: "22px 24px", width: "100%", maxWidth: 400,
          boxShadow: "0 12px 48px rgba(0,0,0,.35)", border: "1px solid var(--ui-border)" }}>
        <h2 id="confirm-title" style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--ui-ink)" }}>{req.title}</h2>
        {req.body && <p style={{ fontSize: 14, color: "var(--ui-muted)", margin: "8px 0 0", lineHeight: 1.5 }}>{req.body}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button onClick={() => settle(false)}
            style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "var(--ui-ink)", background: "var(--ui-paper)",
              border: "1px solid var(--ui-border-strong)", borderRadius: 8, cursor: "pointer" }}>
            {req.cancelLabel ?? "Cancel"}
          </button>
          <button ref={confirmRef} onClick={() => settle(true)}
            style={{ padding: "8px 16px", fontSize: 14, fontWeight: 700, borderRadius: 8, cursor: "pointer", border: "none",
              color: danger ? "#fff" : "var(--ui-primary-ink)",
              background: danger ? "#b00020" : "var(--ui-primary)",
              boxShadow: danger ? "0 2px 8px rgba(176,0,32,.35)" : "0 2px 8px rgba(62,44,24,.35)" }}>
            {req.confirmLabel ?? "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
