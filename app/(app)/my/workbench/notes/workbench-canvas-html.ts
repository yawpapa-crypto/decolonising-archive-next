import type { CanvasObject } from "./workbench-canvas-types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function canvasObjectToDocumentHtml(object: CanvasObject): string {
  const title = escapeHtml(object.title || "Canvas item");
  const body = escapeHtml(object.body || "");
  switch (object.type) {
    case "quote":
      return `<blockquote><p>${body || title}</p></blockquote><p></p>`;
    case "source":
      return `<p><strong>Source:</strong> ${title}</p>${body ? `<p>${body}</p>` : ""}<p></p>`;
    case "citation":
      return `<p><strong>Citation marker:</strong> ${title}</p>${body ? `<p>${body}</p>` : ""}<p></p>`;
    case "task":
      return `<p><strong>Task:</strong> ${title}</p>${body ? `<p>${body}</p>` : ""}<p></p>`;
    case "question":
      return `<p><strong>Question:</strong> ${title}</p>${body ? `<p>${body}</p>` : ""}<p></p>`;
    case "link":
      return `<p><strong>Link:</strong> <a href="${escapeHtml(object.body || object.title)}">${title}</a></p><p></p>`;
    case "sticky":
      return `<p><strong>Note:</strong> ${body || title}</p><p></p>`;
    case "frame":
      return `<h3>${title}</h3>${body ? `<p>${body}</p>` : ""}<p></p>`;
    case "image":
      return object.imageUrl
        ? `<figure><img src="${escapeHtml(object.imageUrl)}" alt="${escapeHtml(object.imageAlt || title)}" />${object.imageCaption ? `<figcaption>${escapeHtml(object.imageCaption)}</figcaption>` : ""}</figure><p></p>`
        : `<p><strong>Image:</strong> ${title}</p><p></p>`;
    default:
      return `<p><strong>${title}:</strong> ${body}</p><p></p>`;
  }
}

export function canvasObjectsToDocumentHtml(objects: CanvasObject[]): string {
  return objects.map(canvasObjectToDocumentHtml).join("");
}
