"use client";

import { useEffect, useReducer } from "react";
import type { Editor } from "@tiptap/react";
import { ChevronDown } from "lucide-react";
import {
  DOCUMENT_FONT_FAMILIES,
  DOCUMENT_FONT_SIZES,
  type DocumentFontFamilyId,
} from "./workbench-document-typography";

type Props = {
  editor: Editor;
  documentFontFamilyId: DocumentFontFamilyId;
  onDocumentFontFamilyChange: (fontFamilyId: DocumentFontFamilyId) => void;
  disabled?: boolean;
};

function editorChain(editor: Editor): ReturnType<Editor["chain"]> {
  return editor.chain().focus();
}

export default function WorkbenchDocumentTypographyControls({
  editor,
  documentFontFamilyId,
  onDocumentFontFamilyChange,
  disabled = false,
}: Props) {
  const [, refreshSelection] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    const updateControls = () => refreshSelection();
    editor.on("selectionUpdate", updateControls);
    editor.on("transaction", updateControls);
    return () => {
      editor.off("selectionUpdate", updateControls);
      editor.off("transaction", updateControls);
    };
  }, [editor]);

  const textAttributes = editor.getAttributes("textStyle");
  const currentFontSize =
    (textAttributes.fontSize as string | undefined)?.replace("px", "") ?? "";

  return (
    <div className="workbench-document-typography" role="group" aria-label="Text formatting">
      <label className="workbench-document-typography__field workbench-document-typography__field--family">
        <select
          className="workbench-document-typography__select"
          value={documentFontFamilyId}
          aria-label="Font family"
          disabled={disabled}
          onChange={(event) => {
            const id = event.target.value;
            if (id) onDocumentFontFamilyChange(id as DocumentFontFamilyId);
          }}
        >
          {DOCUMENT_FONT_FAMILIES.map((font) => (
            <option key={font.id} value={font.id}>
              {font.label}
            </option>
          ))}
        </select>
        <ChevronDown size={13} strokeWidth={2} aria-hidden />
      </label>
      <span className="workbench-document-typography__divider" aria-hidden />
      <label className="workbench-document-typography__field workbench-document-typography__field--size">
        <select
          className="workbench-document-typography__select"
          value={currentFontSize}
          aria-label="Font size"
          disabled={disabled}
          onChange={(event) => {
            const size = event.target.value;
            if (size) {
              editorChain(editor).setFontSize(`${size}px`).run();
            } else {
              editorChain(editor).unsetFontSize().run();
            }
          }}
        >
          <option value="">Auto</option>
          {DOCUMENT_FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <ChevronDown size={13} strokeWidth={2} aria-hidden />
      </label>
    </div>
  );
}
