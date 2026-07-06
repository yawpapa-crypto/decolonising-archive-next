import Link from "@tiptap/extension-link";

function readDataAttr(element: HTMLElement, name: string) {
  const value = element.getAttribute(name);
  return value?.trim() ? value.trim() : null;
}

function dataAttr(name: string, value: string | null | undefined) {
  if (!value?.trim()) return {};
  return { [name]: value.trim() };
}

export const WorkbenchCitationLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: (element) => readDataAttr(element, "class"),
        renderHTML: (attributes) => dataAttr("class", attributes.class as string | null | undefined),
      },
      dataCitationId: {
        default: null,
        parseHTML: (element) => readDataAttr(element, "data-citation-id"),
        renderHTML: (attributes) =>
          dataAttr("data-citation-id", attributes.dataCitationId as string | null | undefined),
      },
      dataReferenceId: {
        default: null,
        parseHTML: (element) => readDataAttr(element, "data-reference-id"),
        renderHTML: (attributes) =>
          dataAttr("data-reference-id", attributes.dataReferenceId as string | null | undefined),
      },
      dataRecordId: {
        default: null,
        parseHTML: (element) => readDataAttr(element, "data-record-id"),
        renderHTML: (attributes) =>
          dataAttr("data-record-id", attributes.dataRecordId as string | null | undefined),
      },
      dataTitle: {
        default: null,
        parseHTML: (element) => readDataAttr(element, "data-title"),
        renderHTML: (attributes) => dataAttr("data-title", attributes.dataTitle as string | null | undefined),
      },
      dataAuthors: {
        default: null,
        parseHTML: (element) => readDataAttr(element, "data-authors"),
        renderHTML: (attributes) =>
          dataAttr("data-authors", attributes.dataAuthors as string | null | undefined),
      },
      dataYear: {
        default: null,
        parseHTML: (element) => readDataAttr(element, "data-year"),
        renderHTML: (attributes) => dataAttr("data-year", attributes.dataYear as string | null | undefined),
      },
      dataSource: {
        default: null,
        parseHTML: (element) => readDataAttr(element, "data-source"),
        renderHTML: (attributes) =>
          dataAttr("data-source", attributes.dataSource as string | null | undefined),
      },
      dataUrl: {
        default: null,
        parseHTML: (element) => readDataAttr(element, "data-url"),
        renderHTML: (attributes) => dataAttr("data-url", attributes.dataUrl as string | null | undefined),
      },
      dataDoi: {
        default: null,
        parseHTML: (element) => readDataAttr(element, "data-doi"),
        renderHTML: (attributes) => dataAttr("data-doi", attributes.dataDoi as string | null | undefined),
      },
      dataCitationDisplay: {
        default: null,
        parseHTML: (element) => readDataAttr(element, "data-citation-display"),
        renderHTML: (attributes) =>
          dataAttr("data-citation-display", attributes.dataCitationDisplay as string | null | undefined),
      },
      dataCitationPrefix: {
        default: null,
        parseHTML: (element) => readDataAttr(element, "data-citation-prefix"),
        renderHTML: (attributes) =>
          dataAttr("data-citation-prefix", attributes.dataCitationPrefix as string | null | undefined),
      },
      dataCitationSuffix: {
        default: null,
        parseHTML: (element) => readDataAttr(element, "data-citation-suffix"),
        renderHTML: (attributes) =>
          dataAttr("data-citation-suffix", attributes.dataCitationSuffix as string | null | undefined),
      },
      dataCitationPages: {
        default: null,
        parseHTML: (element) => readDataAttr(element, "data-citation-pages"),
        renderHTML: (attributes) =>
          dataAttr("data-citation-pages", attributes.dataCitationPages as string | null | undefined),
      },
    };
  },
}).configure({
  openOnClick: false,
  autolink: true,
  linkOnPaste: true,
  validate: (href) => /^(https?:|mailto:|tel:|#)/i.test(href),
  HTMLAttributes: { rel: "noopener noreferrer" },
});
