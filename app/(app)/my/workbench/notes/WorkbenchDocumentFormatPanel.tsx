"use client";

import { useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import {
  DOCUMENT_FONT_FAMILIES,
  type DocumentFontFamilyId,
} from "../workbench-editor-font-family";

const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32"];

function editorChain(editor: Editor): ReturnType<Editor["chain"]> {
  return editor.chain().focus();
}

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
  onOpenCitation?: () => void;
  onInsertPageBreak?: () => void;
};

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="workbench-format-panel__section">
      <h3 className="workbench-format-panel__section-label">{label}</h3>
      {children}
    </section>
  );
}

function Chip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`workbench-format-panel__chip${active ? " is-active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export default function WorkbenchDocumentFormatPanel({
  editor,
  onOpenCitation,
  onInsertPageBreak,
}: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  if (!editor || editor.isDestroyed) return null;

  const currentFontSize =
    (editor.getAttributes("textStyle").fontSize as string | undefined)?.replace("px", "") ?? "";
  const currentFontFamily = resolveFontFamilyId(
    editor.getAttributes("textStyle").fontFamily as string | undefined,
  );

  function run(command: () => boolean) {
    command();
    editorChain(editor);
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

  return (
    <div className="workbench-format-panel">
      <Section label="Paragraph style">
        <div className="workbench-format-panel__row">
          <Chip
            label="Body"
            active={editor.isActive("paragraph")}
            onClick={() => run(() => editorChain(editor).setParagraph().run())}
          />
          <Chip
            label="Heading 2"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => run(() => editorChain(editor).toggleHeading({ level: 2 }).run())}
          />
          <Chip
            label="Heading 3"
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => run(() => editorChain(editor).toggleHeading({ level: 3 }).run())}
          />
        </div>
      </Section>

      <Section label="Font">
        <label className="workbench-format-panel__field">
          <span className="workbench-format-panel__field-label">Family</span>
          <select
            className="workbench-format-panel__select"
            value={currentFontFamily}
            aria-label="Font family"
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
        <label className="workbench-format-panel__field">
          <span className="workbench-format-panel__field-label">Size</span>
          <select
            className="workbench-format-panel__select"
            value={currentFontSize}
            aria-label="Font size"
            onChange={(event) => {
              const size = event.target.value;
              if (size) {
                run(() => editorChain(editor).setFontSize(`${size}px`).run());
              } else {
                run(() => editorChain(editor).unsetFontSize().run());
              }
            }}
          >
            <option value="">Auto</option>
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} pt
              </option>
            ))}
          </select>
        </label>
      </Section>

      <Section label="Character">
        <div className="workbench-format-panel__row">
          <Chip
            label="B"
            active={editor.isActive("bold")}
            onClick={() => run(() => editorChain(editor).toggleBold().run())}
          />
          <Chip
            label="I"
            active={editor.isActive("italic")}
            onClick={() => run(() => editorChain(editor).toggleItalic().run())}
          />
          <Chip
            label="U"
            active={editor.isActive("underline")}
            onClick={() => run(() => editorChain(editor).toggleUnderline().run())}
          />
          <Chip
            label="S"
            active={editor.isActive("strike")}
            onClick={() => run(() => editorChain(editor).toggleStrike().run())}
          />
        </div>
      </Section>

      <Section label="Alignment">
        <div className="workbench-format-panel__row">
          <Chip
            label="Left"
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => run(() => editorChain(editor).setTextAlign("left").run())}
          />
          <Chip
            label="Centre"
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => run(() => editorChain(editor).setTextAlign("center").run())}
          />
          <Chip
            label="Right"
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => run(() => editorChain(editor).setTextAlign("right").run())}
          />
        </div>
      </Section>

      <Section label="Lists">
        <div className="workbench-format-panel__row">
          <Chip
            label="Bullets"
            active={editor.isActive("bulletList")}
            onClick={() => run(() => editorChain(editor).toggleBulletList().run())}
          />
          <Chip
            label="Numbers"
            active={editor.isActive("orderedList")}
            onClick={() => run(() => editorChain(editor).toggleOrderedList().run())}
          />
          <Chip
            label="Tasks"
            active={editor.isActive("taskList")}
            onClick={() => run(() => editorChain(editor).toggleTaskList().run())}
          />
        </div>
      </Section>

      <Section label="Insert">
        <div className="workbench-format-panel__row workbench-format-panel__row--wrap">
          <Chip
            label="New page"
            disabled={!onInsertPageBreak}
            onClick={() => onInsertPageBreak?.()}
          />
          <Chip
            label="Link"
            active={editor.isActive("link") || linkOpen}
            onClick={() => {
              const prev = editor.getAttributes("link").href as string | undefined;
              setLinkUrl(prev ?? "");
              setLinkOpen((open) => !open);
            }}
          />
          <Chip
            label="Cite"
            disabled={!onOpenCitation}
            onClick={() => onOpenCitation?.()}
          />
          <Chip
            label="Quote"
            active={editor.isActive("blockquote")}
            onClick={() => run(() => editorChain(editor).toggleBlockquote().run())}
          />
        </div>
        {linkOpen ? (
          <div className="workbench-format-panel__link">
            <input
              type="url"
              value={linkUrl}
              placeholder="https://"
              aria-label="Link URL"
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
              }}
            />
            <div className="workbench-format-panel__link-actions">
              <button type="button" className="workbench-format-panel__action" onClick={applyLink}>
                Apply
              </button>
              <button
                type="button"
                className="workbench-format-panel__action workbench-format-panel__action--ghost"
                onClick={() => {
                  setLinkOpen(false);
                  setLinkUrl("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </Section>

      <Section label="History">
        <div className="workbench-format-panel__row">
          <Chip
            label="Undo"
            disabled={!editor.can().undo()}
            onClick={() => run(() => editorChain(editor).undo().run())}
          />
          <Chip
            label="Redo"
            disabled={!editor.can().redo()}
            onClick={() => run(() => editorChain(editor).redo().run())}
          />
        </div>
      </Section>
    </div>
  );
}
