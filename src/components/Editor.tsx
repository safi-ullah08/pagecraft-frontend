import { useEditor, EditorContent, BubbleMenu, type JSONContent } from "@tiptap/react";
import { extensions } from "@pagecraft/model";
import { useMemo } from "react";
import { SlashCommands } from "../slash.ts";
import { themeSkinCss } from "../themes.ts";
import { scopeThemeCss } from "../scope-css.ts";
import { setBlockAttr, deleteBlock, moveBlock } from "../node-controls.ts";

// Tiptap on the SHARED schema. The editing surface is skinned with the active
// theme (scoped so it styles only this container) so editing looks like output.
// "/" opens the insert menu; selecting text opens node controls (the override
// attrs that already serialize to utility classes). Edits stream up to autosave.
export function Editor({ content, theme, onChange }: { content: JSONContent; theme: string; onChange: (doc: JSONContent) => void }) {
  const editor = useEditor({
    extensions: [...extensions, SlashCommands],
    content,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  const surfaceCss = useMemo(() => {
    // unknown/legacy theme name (e.g. a renamed skin): an unstyled surface beats
    // a thrown render that white-screens the whole editor pane.
    try {
      return scopeThemeCss(themeSkinCss(theme), ".editor-surface");
    } catch {
      return "";
    }
  }, [theme]);

  const btn = { padding: "2px 6px", border: "1px solid #ccc", background: "#fff", borderRadius: 3, cursor: "pointer", fontSize: 12 } as const;

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
      <style>{surfaceCss}</style>
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
      <div className="editor-surface">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
