import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, SignedIn, SignedOut, SignIn, useAuth } from "@clerk/clerk-react";
import { App } from "./App.tsx";
import { setTokenGetter } from "./api.ts";
import "./styles.css";

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
      <App />
    </SignedIn>
    <SignedOut>
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <SignIn routing="hash" />
      </div>
    </SignedOut>
  </ClerkProvider>
) : (
  <App />
);

createRoot(document.getElementById("root")!).render(<StrictMode>{root}</StrictMode>);
