import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import { extensions } from "@pagecraft/model";
import { useEffect } from "react";

// Tiptap bound to the SHARED schema. Emits Tiptap JSON upward; the Preview pane
// paginates it. Autosave (debounced PUT /api/sections) is wired in api.ts — TODO.
export function Editor({ onChange }: { onChange: (doc: JSONContent) => void }) {
  const editor = useEditor({
    extensions,
    content: "<h1>Untitled</h1><p>Start writing…</p>",
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  useEffect(() => {
    if (editor) onChange(editor.getJSON());
  }, [editor]);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
      <EditorContent editor={editor} />
    </div>
  );
}
