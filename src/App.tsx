import { ChapterNav } from "./components/ChapterNav.tsx";
import { Editor } from "./components/Editor.tsx";
import { Preview } from "./components/Preview.tsx";
import { Toolbar } from "./components/Toolbar.tsx";
import { ExportButton } from "./components/ExportButton.tsx";
import { useState } from "react";
import type { JSONContent } from "@tiptap/react";

// Phase 1: single content-section path. ChapterNav (cover/toc) is an inert
// stub behind progressive disclosure.
export function App() {
  const [doc, setDoc] = useState<JSONContent | null>(null);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <ChapterNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 8, padding: 8, borderBottom: "1px solid #ddd" }}>
          <Toolbar />
          <ExportButton documentId="TODO" />
        </div>
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <Editor onChange={setDoc} />
          <Preview doc={doc} />
        </div>
      </div>
    </div>
  );
}
