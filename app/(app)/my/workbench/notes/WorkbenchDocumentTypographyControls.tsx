"use client";

import { useCallback, useEffect, useState } from "react";
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

type TypographyControlState = {
  fontSize: string;
};

const DEFAULT_TYPOGRAPHY_CONTROL_STATE: TypographyControlState = {
  fontSize: "",
};

function editorChain(editor: Editor): ReturnType<Editor["chain"]> {
  return editor.chain().focus();
}

function getTypographyControlState(editor: Editor): TypographyControlState {
  const textAttributes = editor.getAttributes("textStyle");
  return {
    fontSize: (textAttributes.fontSize as string | undefined)?.replace("px", "") ?? "",
  };
}

function areTypographyControlsEqual(
  a: TypographyControlState,
  b: TypographyControlState,
) {
  return a.fontSize === b.fontSize;
}

export default function WorkbenchDocumentTypographyControls({
  editor,
  documentFontFamilyId,
  onDocumentFontFamilyChange,
  disabled = false,
}: Props) {
  const [controls, setControls] = useState(DEFAULT_TYPOGRAPHY_CONTROL_STATE);

  const refreshSelection = useCallback(() => {
    if (!editor || editor.isDestroyed) return;

    const nextControls = getTypographyControlState(editor);
    setControls((currentControls) =>
      areTypographyControlsEqual(currentControls, nextControls)
        ? currentControls
        : nextControls,
    );
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    let frame = 0;

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        refreshSelection();
      });
    };

    editor.on("selectionUpdate", scheduleUpdate);
    scheduleUpdate();

    return () => {
      window.cancelAnimationFrame(frame);
      editor.off("selectionUpdate", scheduleUpdate);
    };
  }, [editor, refreshSelection]);

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
          value={controls.fontSize}
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
