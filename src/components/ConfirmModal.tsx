import { useEffect, useRef, useState, useSyncExternalStore } from "react";


export type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export type PromptOptions = ConfirmOptions & {
  defaultValue?: string;
  placeholder?: string;
};

type ConfirmRequest = ConfirmOptions & { kind: "confirm"; id: number; resolve: (ok: boolean) => void };
type PromptRequest = PromptOptions & { kind: "prompt"; id: number; resolve: (value: string | null) => void };
type Request = ConfirmRequest | PromptRequest;

let current: Request | null = null;
let counter = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Open a confirm/prompt dialog. Only one can be open at a time; opening a new one cancels the previous.
function open(req: Omit<ConfirmRequest, "id"> | Omit<PromptRequest, "id">) {
  cancel();
  current = { ...req, id: ++counter } as Request;
  emit();
}

export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  const opts = typeof options === "string" ? { title: options } : options;
  return new Promise<boolean>((resolve) => open({ ...opts, kind: "confirm", resolve }));
}

export function promptDialog(options: PromptOptions | string): Promise<string | null> {
  const opts = typeof options === "string" ? { title: options } : options;
  return new Promise<string | null>((resolve) => open({ ...opts, kind: "prompt", resolve }));
}

function cancel() {
  const req = current;
  current = null;
  emit();
  if (req?.kind === "confirm") req.resolve(false);
  else req?.resolve(null);
}

function accept(value: string) {
  const req = current;
  current = null;
  emit();
  if (req?.kind === "confirm") req.resolve(true);
  else req?.resolve(value);
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getSnapshot = () => current;

export function ConfirmModal() {
  const req = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const isPrompt = req?.kind === "prompt";

  useEffect(() => {
    if (!req) return;
    if (req.kind === "prompt") {
      setValue(req.defaultValue ?? "");
      // focus + select so the suggested name can be typed over immediately
      requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select(); });
    } else {
      confirmRef.current?.focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); cancel(); }
      else if (e.key === "Enter" && req.kind === "confirm") { e.preventDefault(); accept(""); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [req]);

  if (!req) return null;
  const danger = req.danger ?? false;

  return (
    <div onClick={() => cancel()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--ui-panel)", borderRadius: 12, padding: "22px 24px", width: "100%", maxWidth: 400,
          boxShadow: "0 12px 48px rgba(0,0,0,.35)", border: "1px solid var(--ui-border)" }}>
        <h2 id="confirm-title" style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--ui-ink)" }}>{req.title}</h2>
        {req.body && <p style={{ fontSize: 14, color: "var(--ui-muted)", margin: "8px 0 0", lineHeight: 1.5 }}>{req.body}</p>}
        {isPrompt && (
          <input ref={inputRef} type="text" value={value} placeholder={(req as PromptRequest).placeholder}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); accept(value); } }}
            style={{ width: "100%", boxSizing: "border-box", marginTop: 14, padding: "9px 11px", fontSize: 14,
              color: "var(--ui-ink)", background: "var(--ui-paper)", border: "1px solid var(--ui-border-strong)", borderRadius: 8 }} />
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button onClick={() => cancel()}
            style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "var(--ui-ink)", background: "var(--ui-paper)",
              border: "1px solid var(--ui-border-strong)", borderRadius: 8, cursor: "pointer" }}>
            {req.cancelLabel ?? "Cancel"}
          </button>
          <button ref={confirmRef} onClick={() => accept(value)}
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
