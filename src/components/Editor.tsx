import { useEffect } from "react";
import { useEditor, EditorContent, BubbleMenu, type JSONContent } from "@tiptap/react";
import { extensions } from "@pagecraft/model";
import { SlashCommands } from "../slash.ts";
import { setBlockAttr, deleteBlock, moveBlock } from "../node-controls.ts";
import { useStore } from "../store.ts";

// One Tiptap instance per section, on the SHARED schema. The editing surface is
// skinned by the App-level scoped theme CSS (.editor-surface), so all sections
// share one <style> and this component is not its own scroll container — the
// section column scrolls. "/" inserts nodes; selecting text opens the override
// controls. Edits stream up to per-section autosave; focus marks the active one.
export function Editor({ content, onChange, onFocus }: {
  content: JSONContent;
  onChange: (doc: JSONContent) => void;
  onFocus?: () => void;
}) {
  const setActiveEditor = useStore((s) => s.setActiveEditor);
  const bumpSel = useStore((s) => s.bumpSel);
  const editor = useEditor({
    extensions: [...extensions, SlashCommands],
    content,
    onUpdate: ({ editor }) => { onChange(editor.getJSON()); bumpSel(); },
    onFocus: ({ editor }) => { onFocus?.(); setActiveEditor(editor); },
    onSelectionUpdate: () => bumpSel(), // keep the top-bar font size mirrored to the caret
  });

  // Drop the top bar's reference when this instance unmounts, so it never points
  // at a destroyed editor (a stale one would throw when the control reads it).
  useEffect(() => () => {
    if (useStore.getState().activeEditor === editor) setActiveEditor(null);
  }, [editor, setActiveEditor]);

  const btn = { padding: "2px 6px", border: "1px solid #ccc", background: "#fff", borderRadius: 3, cursor: "pointer", fontSize: 12 } as const;

  return (
    <div className="editor-surface">
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div style={{ display: "flex", gap: 3, padding: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 6, boxShadow: "0 2px 8px rgba(0,0,0,.12)" }}>
            <button style={btn} title="align left" onClick={() => setBlockAttr(editor, { align: "left" })}>⯇</button>
            <button style={btn} title="align center" onClick={() => setBlockAttr(editor, { align: "center" })}>≡</button>
            <button style={btn} title="align right" onClick={() => setBlockAttr(editor, { align: "right" })}>⯈</button>
            <button style={btn} title="justify" onClick={() => setBlockAttr(editor, { align: "justify" })}>☰</button>
            <span style={{ width: 1, background: "#ddd" }} />
            <button style={btn} title="accent colour" onClick={() => setBlockAttr(editor, { paletteColor: "accent" })}>●</button>
            <button style={btn} title="text colour" onClick={() => setBlockAttr(editor, { paletteColor: "text" })}>○</button>
            <button style={btn} title="span 6 cols" onClick={() => setBlockAttr(editor, { span: "6" })}>6</button>
            <button style={btn} title="span 12 cols" onClick={() => setBlockAttr(editor, { span: "12" })}>12</button>
            <button style={btn} title="break before" onClick={() => setBlockAttr(editor, { breakBefore: true })}>⤓</button>
            <span style={{ width: 1, background: "#ddd" }} />
            <button style={btn} title="move up" onClick={() => moveBlock(editor, -1)}>↑</button>
            <button style={btn} title="move down" onClick={() => moveBlock(editor, 1)}>↓</button>
            <button style={btn} title="delete block" onClick={() => deleteBlock(editor)}>🗑</button>
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
