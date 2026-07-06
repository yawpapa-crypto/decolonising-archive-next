import { Extension } from "@tiptap/core";

export const DOCUMENT_FONT_FAMILIES = [
  {
    id: "inter",
    label: "Inter",
    value: 'var(--font-workbench-inter), "Inter", system-ui, sans-serif',
  },
  {
    id: "roboto",
    label: "Roboto",
    value: 'var(--font-workbench-roboto), "Roboto", system-ui, sans-serif',
  },
  {
    id: "open-sans",
    label: "Open Sans",
    value: 'var(--font-workbench-open-sans), "Open Sans", system-ui, sans-serif',
  },
  {
    id: "lato",
    label: "Lato",
    value: 'var(--font-workbench-lato), "Lato", system-ui, sans-serif',
  },
  {
    id: "montserrat",
    label: "Montserrat",
    value: 'var(--font-workbench-montserrat), "Montserrat", system-ui, sans-serif',
  },
  {
    id: "poppins",
    label: "Poppins",
    value: 'var(--font-workbench-poppins), "Poppins", system-ui, sans-serif',
  },
  {
    id: "source-sans-3",
    label: "Source Sans 3",
    value: 'var(--font-workbench-source-sans-3), "Source Sans 3", system-ui, sans-serif',
  },
  {
    id: "nunito-sans",
    label: "Nunito Sans",
    value: 'var(--font-workbench-nunito-sans), "Nunito Sans", system-ui, sans-serif',
  },
  {
    id: "merriweather",
    label: "Merriweather",
    value: 'var(--font-workbench-merriweather), "Merriweather", Georgia, serif',
  },
  {
    id: "ibm-plex-sans",
    label: "IBM Plex Sans",
    value: 'var(--font-workbench-ibm-plex-sans), "IBM Plex Sans", system-ui, sans-serif',
  },
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
