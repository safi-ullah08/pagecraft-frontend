import { StrictMode, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, SignedIn, SignedOut, SignIn, useAuth } from "@clerk/clerk-react";
import { App } from "./App.tsx";
import { Dashboard } from "./components/Dashboard.tsx";
import { setTokenGetter } from "./api.ts";
import { loadCatalog } from "./catalog.ts";
import "./ui-theme.css";
import "./styles.css";

// Router-free split: ?doc=<id> opens the editor, anything else the dashboard.
// Navigation is a full reload (see Dashboard/ImportBar), so this is read once.
const View = new URLSearchParams(location.search).has("doc") ? App : Dashboard;

// Feeds Clerk's getToken() to api.ts once signed in, so every request carries the
// bearer token. Renders nothing.
function AuthBridge() {
  const { getToken } = useAuth();
  useEffect(() => setTokenGetter(() => getToken()), [getToken]);
  return null;
}

// Templates, theme skins and fonts live in the backend; the editor and gallery
// read them synchronously, so hold rendering until the catalog has loaded.
// Rendered after <AuthBridge> so its effect wires the token getter first.
function CatalogGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setState("loading");
    loadCatalog()
      .then(() => live && setState("ready"))
      .catch((e) => {
        console.error("catalog load failed:", e);
        if (live) setState("error");
      });
    return () => { live = false; };
  }, [attempt]);
  if (state === "ready") return <>{children}</>;
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", fontSize: 14, color: "var(--ui-muted)" }}>
      {state === "loading" ? "Loading templates…" : (
        <div>Couldn't load templates. <button onClick={() => setAttempt((n) => n + 1)}>Retry</button></div>
      )}
    </div>
  );
}

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

// Without a Clerk key the app runs open (backend is single-tenant dev mode too).
const root = clerkKey ? (
  <ClerkProvider publishableKey={clerkKey}>
    <SignedIn>
      <AuthBridge />
      <CatalogGate><View /></CatalogGate>
    </SignedIn>
    <SignedOut>
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <SignIn routing="hash" />
      </div>
    </SignedOut>
  </ClerkProvider>
) : (
  <CatalogGate><View /></CatalogGate>
);

createRoot(document.getElementById("root")!).render(<StrictMode>{root}</StrictMode>);
