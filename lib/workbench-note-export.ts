import { htmlToPlainText } from "@/lib/workbench-note-utils";

export function noteToPlainTextExport(title: string, plainText: string) {
  const heading = title.trim() || "Untitled note";
  const body = plainText.trim();
  return body ? `${heading}\n\n${body}` : heading;
}

export function noteToMarkdown(title: string, plainText: string) {
  const heading = title.trim() || "Untitled note";
  const body = plainText.trim();
  if (!body) return `# ${heading}\n`;
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return `# ${heading}\n\n${paragraphs.join("\n\n")}\n`;
}

export function safeNoteFileSlug(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "note";
}

export async function copyNoteToClipboard(title: string, plainText: string) {
  const text = noteToPlainTextExport(title, plainText);
  await navigator.clipboard.writeText(text);
  return text;
}

export function downloadNoteMarkdown(title: string, plainText: string) {
  const markdown = noteToMarkdown(title, plainText);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeNoteFileSlug(title)}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function htmlToMarkdownLight(html: string) {
  return htmlToPlainText(html);
}
