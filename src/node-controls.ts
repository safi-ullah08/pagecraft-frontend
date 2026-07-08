import type { Editor } from "@tiptap/react";

// The override attrs (align/span/paletteColor/breakBefore) and delete/move all
// target the TOP-LEVEL block containing the selection (the doc's direct child),
// so "span the callout 6 cols" affects the callout, not the paragraph inside it.
function topName(editor: Editor): string | null {
  const { $from } = editor.state.selection;
  return $from.depth >= 1 ? $from.node(1).type.name : null;
}

export function setBlockAttr(editor: Editor, attrs: Record<string, unknown>) {
  const name = topName(editor);
  if (name) editor.chain().focus().updateAttributes(name, attrs).run();
}

export function deleteBlock(editor: Editor) {
  const name = topName(editor);
  if (name) editor.chain().focus().deleteNode(name).run();
}

// Swap the current top-level block with its previous/next sibling. ProseMirror
// has no move command; delete-then-reinsert at the neighbour's position.
export function moveBlock(editor: Editor, dir: -1 | 1) {
  const { state } = editor;
  const { $from } = state.selection;
  if ($from.depth < 1) return;
  const index = $from.index(0);
  const target = index + dir;
  if (target < 0 || target >= state.doc.childCount) return;
  const node = state.doc.child(index);
  const start = $from.before(1);
  const tr = state.tr.delete(start, start + node.nodeSize);
  const lead = index + dir; // siblings kept before the reinsert point
  let pos = 0;
  for (let i = 0; i < lead; i++) pos += tr.doc.child(i).nodeSize;
  editor.view.dispatch(tr.insert(pos, node).scrollIntoView());
}
