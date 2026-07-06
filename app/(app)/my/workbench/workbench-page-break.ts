import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      insertPageBreak: () => ReturnType;
    };
  }
}

/** Visual page break for document mode (Pages / Word style). */
export const WorkbenchPageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  parseHTML() {
    return [{ tag: 'hr[data-type="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["hr", mergeAttributes(HTMLAttributes, { "data-type": "page-break" })];
  },

  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent([
              { type: this.name },
              { type: "paragraph" },
            ])
            .run(),
    };
  },
});
