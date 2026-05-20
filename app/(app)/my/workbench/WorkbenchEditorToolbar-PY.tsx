"use client";

import { useRef, useState } from "react";
import type { ChainedCommands } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import type { MouseEvent, ReactNode } from "react";
import {
  DOCUMENT_FONT_FAMILIES,
  type DocumentFontFamilyId,
} from "./workbench-editor-font-family";

const FONT_SIZE_OPTIONS = ["12", "14", "16", "18", "20", "24", "28", "32"];

function resolveFontFamilyId(fontFamily: string | undefined): string {
  if (!fontFamily) return "";
  const normalized = fontFamily.replace(/['"]/g, "").toLowerCase();
  const match = DOCUMENT_FONT_FAMILIES.find((entry) =>
    entry.value.replace(/['"]/g, "").toLowerCase().includes(normalized.split(",")[0]?.trim() ?? ""),
  );
  return match?.id ?? "";
}

type Props = {
  editor: Editor;
  noteId?: string;
  onImageError?: (message: string) => void;
  onOpenCitation?: (event?: MouseEvent<HTMLButtonElement>) => void;
  onOpenAICitation?: () => void;
  trailingControls?: ReactNode;
  leadingControls?: ReactNode;
  layout?: "ribbon" | "sidebar";
};

function ToolbarButton({
  label,
  ariaLabel,
  active,
  disabled,
  className,
  onClick,
}: {
  label: string;
  ariaLabel: string;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className={`workbench-editor-button${active ? " is-active" : ""}${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      title={ariaLabel}
    >
      {label}
    </button>
  );
}


function editorChain(editor: Editor): ChainedCommands {
  return editor.chain().focus();
}

export default function WorkbenchEditorToolbar({
  editor,
  noteId,
  onImageError,
  onOpenCitation,
  onOpenAICitation,
  trailingControls,
  leadingControls,
  layout = "ribbon",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  if (!editor || editor.isDestroyed) {
    return null;
  }

  const currentFontSize =
    (editor.getAttributes("textStyle").fontSize as string | undefined)?.replace("px", "") ?? "";
  const currentFontFamily = resolveFontFamilyId(
    editor.getAttributes("textStyle").fontFamily as string | undefined,
  );

  function run(command: () => boolean) {
    command();
    editorChain(editor);
  }

  async function handleImageFile(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("noteId", noteId || "temp");

    const res = await fetch("/api/workbench/notes/upload-image", {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as { url?: string; error?: string; details?: string };
    if (!res.ok || !data.url) {
      onImageError?.(data.error || data.details || "Could not upload image.");
      return;
    }
    editorChain(editor).setImage({ src: data.url }).run();
  }

  function applyLink() {
    const url = linkUrl.trim();
    if (!url) {
      editorChain(editor).extendMarkRange("link").unsetLink().run();
    } else {
      editorChain(editor).extendMarkRange("link").setLink({ href: url }).run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  }

  const isSidebar = layout === "sidebar";

  return (
    <div
      className={`workbench-editor-toolbar${isSidebar ? " workbench-editor-toolbar--sidebar" : ""}`}
      role="toolbar"
      aria-label="Formatting"
    >
      {!isSidebar && leadingControls ? (
        <div
          className="workbench-editor-toolbar-group workbench-editor-toolbar-group--menus"
          aria-label="Document menu"
        >
          {leadingControls}
        </div>
      ) : null}
      <div className="workbench-editor-toolbar-group workbench-editor-toolbar-group--primary" aria-label="Formatting controls">
        <ToolbarButton
          label={isSidebar ? "Body" : "P"}
          ariaLabel="Paragraph"
          active={editor.isActive("paragraph")}
          onClick={() => run(() => editorChain(editor).setParagraph().run())}
        />
        <ToolbarButton
          label="H2"
          ariaLabel="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => run(() => editorChain(editor).toggleHeading({ level: 2 }).run())}
        />
        <ToolbarButton
          label="H3"
          ariaLabel="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => run(() => editorChain(editor).toggleHeading({ level: 3 }).run())}
        />

        <label className="workbench-editor-toolbar-select-wrap workbench-editor-toolbar-font-wrap">
          <span className="workbench-editor-toolbar-size-label" aria-hidden="true">
            Font
          </span>
          <select
            className="workbench-editor-toolbar-select workbench-note-font-family-select"
            value={currentFontFamily}
            aria-label="Font family"
            title="Font family"
            onChange={(event) => {
              const id = event.target.value as DocumentFontFamilyId | "";
              const entry = DOCUMENT_FONT_FAMILIES.find((item) => item.id === id);
              if (entry) {
                run(() => editorChain(editor).setFontFamily(entry.value).run());
              } else {
                run(() => editorChain(editor).unsetFontFamily().run());
              }
            }}
          >
            <option value="">Default</option>
            {DOCUMENT_FONT_FAMILIES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <label className="workbench-editor-toolbar-select-wrap workbench-editor-toolbar-size-wrap">
          <span className="workbench-editor-toolbar-size-label" aria-hidden="true">
            Size
          </span>
          <select
            className="workbench-editor-toolbar-select workbench-note-font-size-select"
            value={currentFontSize}
            aria-label="Font size"
            title="Font size"
            onChange={(event) => {
              const size = event.target.value;
              if (size) {
                run(() => editorChain(editor).setFontSize(`${size}px`).run());
              } else {
                run(() => editorChain(editor).unsetFontSize().run());
              }
            }}
          >
            <option value="">—</option>
            {FONT_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <ToolbarButton
          label="B"
          ariaLabel="Bold"
          active={editor.isActive("bold")}
          onClick={() => run(() => editorChain(editor).toggleBold().run())}
        />
        <ToolbarButton
          label="I"
          ariaLabel="Italic"
          active={editor.isActive("italic")}
          onClick={() => run(() => editorChain(editor).toggleItalic().run())}
        />
        <ToolbarButton
          label="U"
          ariaLabel="Underline"
          active={editor.isActive("underline")}
          onClick={() => run(() => editorChain(editor).toggleUnderline().run())}
        />
        <ToolbarButton
          label="S"
          ariaLabel="Strike"
          active={editor.isActive("strike")}
          onClick={() => run(() => editorChain(editor).toggleStrike().run())}
        />
        <ToolbarButton
          label="•"
          ariaLabel="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => run(() => editorChain(editor).toggleBulletList().run())}
        />
        <ToolbarButton
          label="1."
          ariaLabel="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => run(() => editorChain(editor).toggleOrderedList().run())}
        />
        <ToolbarButton
          label="☐"
          ariaLabel="Task list"
          active={editor.isActive("taskList")}
          onClick={() => run(() => editorChain(editor).toggleTaskList().run())}
        />
        <ToolbarButton
          label="Link"
          ariaLabel="Link"
          active={editor.isActive("link")}
          onClick={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            setLinkUrl(prev ?? "");
            setLinkOpen((v) => !v);
          }}
        />
        <ToolbarButton
          label="AI"
          ariaLabel="AI citation assistant"
          className="workbench-button-ai"
          onClick={() => onOpenAICitation?.()}
          disabled={!onOpenAICitation}
        />
        <ToolbarButton
          label="Cite"
          ariaLabel="Insert citation"
          className="workbench-button-cite"
          onClick={(event) => onOpenCitation?.(event)}
          disabled={!onOpenCitation}
        />
        <ToolbarButton
          label="Img"
          ariaLabel="Image"
          onClick={() => fileRef.current?.click()}
        />
        <ToolbarButton
          label="Tbl"
          ariaLabel="Table"
          onClick={() =>
            run(() =>
              editorChain(editor).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
            )
          }
        />
        <ToolbarButton
          label="—"
          ariaLabel="Divider"
          onClick={() => run(() => editorChain(editor).insertContent('<hr />').run())}
        />
        <ToolbarButton
          label="“"
          ariaLabel="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => run(() => editorChain(editor).toggleBlockquote().run())}
        />
        <ToolbarButton
          label="L"
          ariaLabel="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => run(() => editorChain(editor).setTextAlign("left").run())}
        />
        <ToolbarButton
          label="C"
          ariaLabel="Align centre"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => run(() => editorChain(editor).setTextAlign("center").run())}
        />
        <ToolbarButton
          label="R"
          ariaLabel="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => run(() => editorChain(editor).setTextAlign("right").run())}
        />
      </div>

      <div className="workbench-editor-toolbar-group workbench-editor-toolbar-group--history" aria-label="History">
        <ToolbarButton
          label="↶"
          ariaLabel="Undo"
          disabled={!editor.can().undo()}
          onClick={() => run(() => editorChain(editor).undo().run())}
        />
        <ToolbarButton
          label="↷"
          ariaLabel="Redo"
          disabled={!editor.can().redo()}
          onClick={() => run(() => editorChain(editor).redo().run())}
        />
      </div>


      {!isSidebar && trailingControls ? (
        <div
          className="workbench-editor-toolbar-group workbench-editor-toolbar-group--document"
          aria-label="Document view"
        >
          {trailingControls}
        </div>
      ) : null}

      {linkOpen ? (
        <div className="workbench-editor-link-popover">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://"
            aria-label="Link URL"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
          />
          <button type="button" className="workbench-editor-button" onClick={applyLink}>
            Apply
          </button>
          <button
            type="button"
            className="workbench-editor-button"
            onClick={() => {
              setLinkOpen(false);
              setLinkUrl("");
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        className="workbench-editor-image-input"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleImageFile(file);
        }}
      />
    </div>
  );
}

