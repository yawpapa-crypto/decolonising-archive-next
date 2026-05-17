import { Extension } from "@tiptap/core";

export const DOCUMENT_FONT_FAMILIES = [
  { id: "source-serif", label: "Source Serif", value: '"Source Serif 4", Georgia, serif' },
  { id: "inter", label: "Inter", value: '"Inter", "Inter Tight", system-ui, sans-serif' },
  { id: "georgia", label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { id: "times", label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { id: "arial", label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { id: "courier", label: "Courier", value: "'Courier New', Courier, monospace" },
] as const;

export type DocumentFontFamilyId = (typeof DOCUMENT_FONT_FAMILIES)[number]["id"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontFamily: {
      setFontFamily: (fontFamily: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
  }
}

export const FontFamily = Extension.create({
  name: "fontFamily",

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
          fontFamily: {
            default: null,
            parseHTML: (element) =>
              element.style.fontFamily?.replace(/['"]+/g, "") || null,
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) return {};
              return { style: `font-family: ${attributes.fontFamily}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontFamily:
        (fontFamily: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontFamily }).run(),
      unsetFontFamily:
        () =>
        ({ chain }) =>
          chain().unsetMark("textStyle").run(),
    };
  },
});
