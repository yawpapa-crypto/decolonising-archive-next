"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Extension, Mark, type ChainedCommands } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { WorkbenchCitationLink } from "./workbench-citation-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import { getWorkbenchNoteTemplate } from "@/lib/workbench-note-templates";
import WorkbenchEditorToolbar from "./WorkbenchEditorToolbar";
import WorkbenchNoteSlashMenu, {
  type SlashMenuItem,
} from "./notes/WorkbenchNoteSlashMenu";
import { FontFamily } from "./workbench-editor-font-family";
import { WorkbenchPageBreak } from "./workbench-page-break";


function editorChain(editor: Editor): ChainedCommands {
  return editor.chain().focus();
}

type FontSizeOptions = {
  types: string[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create<FontSizeOptions>({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, ""),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().unsetMark("textStyle").run(),
    };
  },
});

const TextStyleMark = Mark.create({
  name: "textStyle",

  parseHTML() {
    return [{ tag: "span" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
});

export type WorkbenchEditorPayload = {
  html: string;
  json: Record<string, unknown>;
  plainText: string;
  wordCount: number;
  characterCount: number;
};

type Props = {
  contentHtml: string;
  noteId?: string;
  editable?: boolean;
  placeholder?: string;
  onChange: (payload: WorkbenchEditorPayload) => void;
  onImageError?: (message: string) => void;
  onRequestImageUpload?: () => void;
  insertHtml?: string | null;
  onInsertHtmlApplied?: () => void;
  onEditorReady?: (editor: Editor) => void;
  compactToolbar?: boolean;
  hideToolbar?: boolean;
  onOpenCitation?: (event?: MouseEvent<HTMLButtonElement>) => void;
  onOpenAICitation?: () => void;
};

function payloadFromEditor(ed: NonNullable<ReturnType<typeof useEditor>>): WorkbenchEditorPayload {
  const storage = ed.storage.characterCount as { words?: () => number; characters?: () => number };
  return {
    html: ed.getHTML(),
    json: ed.getJSON() as Record<string, unknown>,
    plainText: ed.getText(),
    wordCount: storage.words?.() ?? 0,
    characterCount: storage.characters?.() ?? ed.getText().length,
  };
}

export default function WorkbenchRichTextEditor({
  contentHtml,
  noteId,
  editable = true,
  placeholder = "Start writing your research note...",
  onChange,
  onImageError,
  onRequestImageUpload,
  insertHtml,
  onInsertHtmlApplied,
  onEditorReady,
  compactToolbar = false,
  hideToolbar = false,
  onOpenCitation,
  onOpenAICitation,
}: Props) {
  const onChangeRef = useRef(onChange);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const closeSlash = useCallback(() => {
    setSlashOpen(false);
    setSlashQuery("");
  }, []);

  const applySlashItem = useCallback(
    (item: SlashMenuItem, editor: NonNullable<ReturnType<typeof useEditor>>) => {
      const { from } = editor.state.selection;
      const $from = editor.state.doc.resolve(from);
      const blockStart = $from.start();
      const textBefore = editor.state.doc.textBetween(blockStart, from, "\n", "\n");
      const slashIndex = textBefore.lastIndexOf("/");
      if (slashIndex >= 0) {
        editorChain(editor)
          .deleteRange({ from: blockStart + slashIndex, to: from })
          .run();
      }

      if (item.kind === "template" && item.templateId) {
        const template = getWorkbenchNoteTemplate(item.templateId);
        editorChain(editor).insertContent(template.html).run();
        closeSlash();
        onChangeRef.current(payloadFromEditor(editor));
        return;
      }

      const chain = editorChain(editor);
      switch (item.id) {
        case "h2":
          chain.toggleHeading({ level: 2 }).run();
          break;
        case "h3":
          chain.toggleHeading({ level: 3 }).run();
          break;
        case "bullet":
          chain.toggleBulletList().run();
          break;
        case "ordered":
          chain.toggleOrderedList().run();
          break;
        case "task":
          chain.toggleTaskList().run();
          break;
        case "quote":
          chain.toggleBlockquote().run();
          break;
        case "divider":
          chain.insertContent('<hr />').run();
          break;
        case "table":
          chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
          break;
        case "image":
          onRequestImageUpload?.();
          break;
        default:
          break;
      }
      closeSlash();
      onChangeRef.current(payloadFromEditor(editor));
    },
    [closeSlash, onRequestImageUpload],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      WorkbenchCitationLink,
      Placeholder.configure({ placeholder }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: { class: "workbench-note-image" },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Typography,
      CharacterCount,
      TextStyleMark,
      FontSize,
      FontFamily,
      WorkbenchPageBreak,
    ],
    content: contentHtml || "<p></p>",
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChangeRef.current(payloadFromEditor(ed));
      const { from } = ed.state.selection;
      const $from = ed.state.doc.resolve(from);
      const blockStart = $from.start();
      const textBefore = ed.state.doc.textBetween(blockStart, from, "\n", "\n");
      const slashIndex = textBefore.lastIndexOf("/");
      if (slashIndex >= 0) {
        const prefix = textBefore.slice(0, slashIndex);
        if (slashIndex === 0 || /\s$/.test(prefix)) {
          setSlashOpen(true);
          setSlashQuery(textBefore.slice(slashIndex + 1));
          return;
        }
      }
      if (slashOpen) closeSlash();
    },
    editorProps: {
      attributes: {
        class: "workbench-rich-editor__surface",
        "aria-label": "Note body",
      },
      handleKeyDown: (_view, event) => {
        if (slashOpen && (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter")) {
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
    onEditorReady?.(editor);
  }, [editor, editable, onEditorReady]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = contentHtml || "<p></p>";
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [contentHtml, editor]);

  useEffect(() => {
    if (!editor || !insertHtml) return;
    editorChain(editor).insertContent(insertHtml).run();
    onChangeRef.current(payloadFromEditor(editor));
    onInsertHtmlApplied?.();
  }, [editor, insertHtml, onInsertHtmlApplied]);

  if (!editor) {
    return <div className="workbench-rich-editor workbench-rich-editor--loading" aria-busy="true" />;
  }

  return (
    <div
      className={`workbench-rich-editor-wrap${compactToolbar ? " workbench-rich-editor-wrap--compact" : ""}`}
    >
      {editable && !hideToolbar ? (
        <WorkbenchEditorToolbar
          editor={editor}
          noteId={noteId}
          onImageError={onImageError}
          onOpenCitation={onOpenCitation}
          onOpenAICitation={onOpenAICitation}
        />
      ) : null}
      {slashOpen ? (
        <WorkbenchNoteSlashMenu
          open={slashOpen}
          query={slashQuery}
          onClose={closeSlash}
          onSelect={(item) => applySlashItem(item, editor)}
        />
      ) : null}
      <EditorContent editor={editor} className="workbench-rich-editor" />
    </div>
  );
}
