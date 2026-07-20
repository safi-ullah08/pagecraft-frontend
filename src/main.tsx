import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, SignedIn, SignedOut, SignIn, useAuth } from "@clerk/clerk-react";
import { App } from "./App.tsx";
import { Dashboard } from "./components/Dashboard.tsx";
import { setTokenGetter } from "./api.ts";
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

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

// Without a Clerk key the app runs open (backend is single-tenant dev mode too).
const root = clerkKey ? (
  <ClerkProvider publishableKey={clerkKey}>
    <SignedIn>
      <AuthBridge />
      <View />
    </SignedIn>
    <SignedOut>
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <SignIn routing="hash" />
      </div>
    </SignedOut>
  </ClerkProvider>
) : (
  <View />
);

createRoot(document.getElementById("root")!).render(<StrictMode>{root}</StrictMode>);
