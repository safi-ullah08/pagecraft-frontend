import { useEffect } from "react";
import { ChapterNav } from "./components/ChapterNav.tsx";
import { Editor } from "./components/Editor.tsx";
import { Preview } from "./components/Preview.tsx";
import { Toolbar } from "./components/Toolbar.tsx";
import { ExportButton } from "./components/ExportButton.tsx";
import { ImportBar } from "./components/ImportBar.tsx";
import { useStore } from "./store.ts";

// Flow editor on real data: import (or bootstrap) a document, edit one section at
// a time, live-paged preview, themed surface. ChapterNav switches sections.
export function App() {
  const load = useStore((s) => s.load);
  const documentId = useStore((s) => s.documentId);
  const theme = useStore((s) => s.theme);
  const edit = useStore((s) => s.edit);
  const active = useStore((s) => s.sections.find((x) => x.id === s.activeId) ?? null);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <ChapterNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 8, padding: 8, borderBottom: "1px solid #ddd", alignItems: "center" }}>
          <Toolbar />
          <ImportBar />
          {documentId && <ExportButton documentId={documentId} theme={theme} />}
        </div>
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {active ? (
            <>
              {/* key by section id: remount the editor when switching chapters */}
              <Editor key={active.id} content={active.content} theme={theme} onChange={edit} />
              <Preview doc={active.content} theme={theme} />
            </>
          ) : (
            <div style={{ padding: 16 }}>Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}
