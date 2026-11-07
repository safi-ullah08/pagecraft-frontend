import { StrictMode, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, SignedIn, SignedOut, SignIn, useAuth } from "@clerk/clerk-react";
import { App } from "./App.tsx";
import { Dashboard } from "./components/Dashboard.tsx";
import { ConfirmModal } from "./components/ConfirmModal.tsx";
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

// The app subdomain's front door. Signed out, this used to be a bare Clerk box
// on an empty page: no product name, no way back to kitaabio.com, and nothing a
// payment provider's compliance reviewer (or a first-time visitor who typed the
// wrong subdomain) could use to tell what they had reached. The marketing site
// owns the selling — this only names the product and points home.
const SITE = "https://kitaabio.com";
const footLink = { color: "var(--ui-muted)", textDecoration: "none", borderBottom: "1px solid var(--ui-border-strong)" };

function SignedOutShell() {
  return (
    <div style={{ display: "grid", gridTemplateRows: "1fr auto", minHeight: "100vh", padding: 24, boxSizing: "border-box" }}>
      <div style={{ display: "grid", placeItems: "center", gap: 20, alignContent: "center" }}>
        <header style={{ textAlign: "center" }}>
          <a href={SITE} style={{ color: "var(--ui-ink)", textDecoration: "none", fontSize: 30, letterSpacing: "0.01em" }}>Kitaabio</a>
          <p style={{ margin: "6px 0 0", color: "var(--ui-muted)", fontSize: 15 }}>
            Documents that export exactly as designed.
          </p>
        </header>
        <SignIn routing="hash" />
      </div>
      <footer style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", fontSize: 13, color: "var(--ui-muted)" }}>
        <a href={SITE} style={footLink}>← kitaabio.com</a>
        <a href={`${SITE}/terms`} style={footLink}>Terms</a>
        <a href={`${SITE}/privacy`} style={footLink}>Privacy</a>
        <a href="mailto:safi@kitaabio.com" style={footLink}>safi@kitaabio.com</a>
      </footer>
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
      <ConfirmModal/>
    </SignedIn>
    <SignedOut>
      <SignedOutShell />
    </SignedOut>
  </ClerkProvider>
) : (
  <>
    <CatalogGate><View /></CatalogGate>
    <ConfirmModal/>
  </>
);

createRoot(document.getElementById("root")!).render(<StrictMode>{root}</StrictMode>);
