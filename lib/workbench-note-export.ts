import { normalizeNoteTitle } from "@/lib/workbench-note-utils";

export type WorkbenchNoteExportFormat =
  | "pdf"
  | "docx"
  | "doc"
  | "md"
  | "html"
  | "txt"
  | "jpeg";

export const DOCUMENT_PAGE_JPEG_SELECTOR = ".workbench-document-pages-stack";

export async function copyNoteToClipboard(title: string, plainText: string) {
  const noteTitle = normalizeNoteTitle(title) || "Untitled note";
  const body = plainText.trim();
  const content = body ? `${noteTitle}\n\n${body}` : noteTitle;
  await navigator.clipboard.writeText(content);
}

export type WorkbenchNoteExportOption = {
  id: WorkbenchNoteExportFormat;
  label: string;
  description: string;
  extension: string;
};

export const WORKBENCH_NOTE_EXPORT_OPTIONS: WorkbenchNoteExportOption[] = [
  {
    id: "pdf",
    label: "PDF",
    description: "Opens print dialog to save as PDF",
    extension: ".pdf",
  },
  {
    id: "docx",
    label: "Word document",
    description: "Editable Microsoft Word file",
    extension: ".docx",
  },
  {
    id: "md",
    label: "Markdown",
    description: "Markdown with headings and lists",
    extension: ".md",
  },
  {
    id: "html",
    label: "HTML",
    description: "Web page you can open in a browser",
    extension: ".html",
  },
  {
    id: "txt",
    label: "Plain text",
    description: "Simple text without formatting",
    extension: ".txt",
  },
  {
    id: "jpeg",
    label: "JPEG image",
    description: "Screenshot of the document pages",
    extension: ".jpg",
  },
  {
    id: "doc",
    label: "Word (legacy .doc)",
    description: "Older HTML-based Word fallback",
    extension: ".doc",
  },
];

export async function exportDocumentPagesAsJpeg(filename: string) {
  const element = document.querySelector<HTMLElement>(DOCUMENT_PAGE_JPEG_SELECTOR);
  if (!element) {
    throw new Error("Could not find document pages to export. Open Document mode first.");
  }

  const { toJpeg } = await import("html-to-image");
  const dataUrl = await toJpeg(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  });

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename.endsWith(".jpg") || filename.endsWith(".jpeg") ? filename : `${filename}.jpg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Produces a real .docx (OOXML) file from the note's rendered HTML.
 *
 * Unlike the legacy `.doc` export (which is HTML disguised with a .doc
 * extension and a Word MIME type), this generates a proper Word document via
 * the `docx` package — fully editable, no compatibility warnings on open.
 *
 * The `docx` import is dynamic so the ~700 KB package only loads when the user
 * actually clicks "Export DOCX".
 */
export async function exportNoteAsDocx(
  noteTitle: string,
  htmlString: string,
  filename: string,
) {
  const docxLib = await import("docx");
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    ExternalHyperlink,
    AlignmentType,
  } = docxLib;

  type DocxParagraph = InstanceType<typeof Paragraph>;

  const doc = new DOMParser().parseFromString(
    `<div>${htmlString || ""}</div>`,
    "text/html",
  );
  const root = doc.body.firstElementChild ?? doc.body;

  const paragraphs: DocxParagraph[] = [];

  // Title heading at the top.
  paragraphs.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: noteTitle, bold: true })],
    }),
  );

  type Style = { bold?: boolean; italic?: boolean; underline?: boolean };

  function runsFromNode(node: Node, style: Style): InstanceType<typeof TextRun>[] {
    const out: InstanceType<typeof TextRun>[] = [];
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text) {
        out.push(
          new TextRun({
            text,
            bold: style.bold,
            italics: style.italic,
            underline: style.underline ? {} : undefined,
          }),
        );
      }
      return out;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return out;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") {
      out.push(new TextRun({ text: "", break: 1 }));
      return out;
    }
    const nextStyle: Style = { ...style };
    if (tag === "strong" || tag === "b") nextStyle.bold = true;
    if (tag === "em" || tag === "i") nextStyle.italic = true;
    if (tag === "u") nextStyle.underline = true;
    el.childNodes.forEach((child) => {
      out.push(...runsFromNode(child, nextStyle));
    });
    return out;
  }

  function hyperlinkChildren(el: HTMLAnchorElement, style: Style) {
    const link = el.getAttribute("href") || "";
    const inner: InstanceType<typeof TextRun>[] = [];
    el.childNodes.forEach((child) => {
      inner.push(
        ...runsFromNode(child, { ...style, underline: true }),
      );
    });
    if (!inner.length) {
      inner.push(new TextRun({ text: el.textContent ?? link, underline: {} }));
    }
    return new ExternalHyperlink({ link: link || "#", children: inner });
  }

  function paragraphChildrenFromInline(el: HTMLElement) {
    const kids: (InstanceType<typeof TextRun> | InstanceType<typeof ExternalHyperlink>)[] = [];
    el.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const childEl = child as HTMLElement;
        if (childEl.tagName.toLowerCase() === "a") {
          kids.push(hyperlinkChildren(childEl as HTMLAnchorElement, {}));
          return;
        }
      }
      kids.push(...runsFromNode(child, {}));
    });
    return kids;
  }

  function pushHeading(el: HTMLElement, level: keyof typeof HeadingLevel) {
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel[level],
        children: paragraphChildrenFromInline(el),
      }),
    );
  }

  function pushParagraph(el: HTMLElement) {
    const children = paragraphChildrenFromInline(el);
    if (!children.length) {
      paragraphs.push(new Paragraph({ children: [new TextRun("")] }));
      return;
    }
    paragraphs.push(new Paragraph({ children }));
  }

  function pushList(el: HTMLElement, ordered: boolean) {
    const items = Array.from(el.children).filter(
      (c) => c.tagName.toLowerCase() === "li",
    );
    items.forEach((li, index) => {
      const children = paragraphChildrenFromInline(li as HTMLElement);
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: ordered ? `${index + 1}. ` : "• " }),
            ...children,
          ],
          indent: { left: 360 },
        }),
      );
    });
  }

  function pushBlockquote(el: HTMLElement) {
    paragraphs.push(
      new Paragraph({
        children: paragraphChildrenFromInline(el).map((run) =>
          run instanceof TextRun
            ? new TextRun({
                text: (run as { options?: { text?: string } }).options?.text ?? "",
                italics: true,
              })
            : run,
        ),
        indent: { left: 720 },
      }),
    );
  }

  function pushCode(el: HTMLElement) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: el.textContent ?? "",
            font: "Courier New",
          }),
        ],
      }),
    );
  }

  function walk(node: Node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    switch (tag) {
      case "h1":
        return pushHeading(el, "HEADING_1");
      case "h2":
        return pushHeading(el, "HEADING_2");
      case "h3":
        return pushHeading(el, "HEADING_3");
      case "h4":
        return pushHeading(el, "HEADING_4");
      case "h5":
        return pushHeading(el, "HEADING_5");
      case "h6":
        return pushHeading(el, "HEADING_6");
      case "p":
        return pushParagraph(el);
      case "ul":
        return pushList(el, false);
      case "ol":
        return pushList(el, true);
      case "blockquote":
        return pushBlockquote(el);
      case "pre":
      case "code":
        return pushCode(el);
      case "hr":
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: "—".repeat(40) })] }));
        return;
      case "div":
      case "section":
      case "article":
      case "main":
        Array.from(el.children).forEach(walk);
        return;
      default:
        // Fallback: treat unknown elements as a paragraph if they have content.
        if ((el.textContent ?? "").trim()) {
          pushParagraph(el);
        }
    }
  }

  Array.from(root.children).forEach(walk);

  if (paragraphs.length === 1) {
    // Only the title — add an empty body so Word doesn't show "blank doc".
    paragraphs.push(new Paragraph({ children: [new TextRun("")] }));
  }

  const document_ = new Document({
    creator: "Decolonising Archive",
    title: noteTitle,
    sections: [{ children: paragraphs }],
  });

  const blob = await Packer.toBlob(document_);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
