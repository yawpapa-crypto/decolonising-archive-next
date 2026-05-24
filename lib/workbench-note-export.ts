import { normalizeNoteTitle } from "@/lib/workbench-note-utils";

export type WorkbenchNoteExportFormat = "txt" | "md" | "html" | "jpeg" | "doc" | "pdf";

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
    description: "Opens print dialog to save or print as PDF",
    extension: ".pdf",
  },
  {
    id: "doc",
    label: "Word document",
    description: "Download as Microsoft Word (.doc)",
    extension: ".doc",
  },
  {
    id: "txt",
    label: "Plain text",
    description: "Simple text without formatting",
    extension: ".txt",
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
    id: "jpeg",
    label: "JPEG image",
    description: "Screenshot of the document pages as an image",
    extension: ".jpg",
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
