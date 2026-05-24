export type WorkbenchDocumentFontCategory =
  | "Clean writing"
  | "Premium modern"
  | "Long-form serif";

export type WorkbenchDocumentFontOption = {
  id: string;
  label: string;
  category: WorkbenchDocumentFontCategory;
  cssVariable: string;
  fontFamily: string;
  recommendedFor: string;
  preview: string;
};

export const DEFAULT_WORKBENCH_DOCUMENT_FONT_ID = "inter";

export const WORKBENCH_DOCUMENT_FONT_OPTIONS = [
  {
    id: "inter",
    label: "Inter",
    category: "Clean writing",
    cssVariable: "--font-workbench-inter",
    fontFamily: 'var(--font-workbench-inter), "Inter", system-ui, sans-serif',
    recommendedFor: "Clean digital notes and interface-heavy writing",
    preview: "Balanced for focused research notes",
  },
  {
    id: "roboto",
    label: "Roboto",
    category: "Clean writing",
    cssVariable: "--font-workbench-roboto",
    fontFamily: 'var(--font-workbench-roboto), "Roboto", system-ui, sans-serif',
    recommendedFor: "Dense notes, drafts, and structured research",
    preview: "A practical rhythm for everyday writing",
  },
  {
    id: "open-sans",
    label: "Open Sans",
    category: "Clean writing",
    cssVariable: "--font-workbench-open-sans",
    fontFamily: 'var(--font-workbench-open-sans), "Open Sans", system-ui, sans-serif',
    recommendedFor: "Readable notes with a friendly editorial tone",
    preview: "Open, legible and calm on long pages",
  },
  {
    id: "lato",
    label: "Lato",
    category: "Clean writing",
    cssVariable: "--font-workbench-lato",
    fontFamily: 'var(--font-workbench-lato), "Lato", system-ui, sans-serif',
    recommendedFor: "Reflective writing and teaching notes",
    preview: "Warm detail without losing structure",
  },
  {
    id: "source-sans-3",
    label: "Source Sans 3",
    category: "Clean writing",
    cssVariable: "--font-workbench-source-sans-3",
    fontFamily: 'var(--font-workbench-source-sans-3), "Source Sans 3", system-ui, sans-serif',
    recommendedFor: "Research notes that need quiet, strong readability",
    preview: "A crisp voice for archive work",
  },
  {
    id: "montserrat",
    label: "Montserrat",
    category: "Premium modern",
    cssVariable: "--font-workbench-montserrat",
    fontFamily: 'var(--font-workbench-montserrat), "Montserrat", system-ui, sans-serif',
    recommendedFor: "Polished proposals, headings, and presentation drafts",
    preview: "Modern presence for polished documents",
  },
  {
    id: "poppins",
    label: "Poppins",
    category: "Premium modern",
    cssVariable: "--font-workbench-poppins",
    fontFamily: 'var(--font-workbench-poppins), "Poppins", system-ui, sans-serif',
    recommendedFor: "Contemporary notes, planning, and clear summaries",
    preview: "Rounded, confident and easy to scan",
  },
  {
    id: "nunito-sans",
    label: "Nunito Sans",
    category: "Premium modern",
    cssVariable: "--font-workbench-nunito-sans",
    fontFamily: 'var(--font-workbench-nunito-sans), "Nunito Sans", system-ui, sans-serif',
    recommendedFor: "Accessible notes with a soft modern feel",
    preview: "Gentle shape for collaborative drafts",
  },
  {
    id: "ibm-plex-sans",
    label: "IBM Plex Sans",
    category: "Premium modern",
    cssVariable: "--font-workbench-ibm-plex-sans",
    fontFamily: 'var(--font-workbench-ibm-plex-sans), "IBM Plex Sans", system-ui, sans-serif',
    recommendedFor: "Technical, scholarly, and precise research notes",
    preview: "Precise tone for rigorous analysis",
  },
  {
    id: "merriweather",
    label: "Merriweather",
    category: "Long-form serif",
    cssVariable: "--font-workbench-merriweather",
    fontFamily: 'var(--font-workbench-merriweather), "Merriweather", Georgia, serif',
    recommendedFor: "Long-form essays, reflective writing, and reading comfort",
    preview: "Essay-like texture for sustained reading",
  },
] as const satisfies readonly WorkbenchDocumentFontOption[];

export type WorkbenchDocumentFontId = (typeof WORKBENCH_DOCUMENT_FONT_OPTIONS)[number]["id"];

export function isWorkbenchDocumentFontId(value: unknown): value is WorkbenchDocumentFontId {
  return (
    typeof value === "string" &&
    WORKBENCH_DOCUMENT_FONT_OPTIONS.some((option) => option.id === value)
  );
}

export function getWorkbenchDocumentFontOption(
  value: unknown,
): WorkbenchDocumentFontOption {
  const id = isWorkbenchDocumentFontId(value)
    ? value
    : DEFAULT_WORKBENCH_DOCUMENT_FONT_ID;
  return (
    WORKBENCH_DOCUMENT_FONT_OPTIONS.find((option) => option.id === id) ??
    WORKBENCH_DOCUMENT_FONT_OPTIONS[0]
  );
}
