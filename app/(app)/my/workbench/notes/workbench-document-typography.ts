import {
  WORKBENCH_DOCUMENT_FONT_OPTIONS,
  type WorkbenchDocumentFontId,
} from "./workbench-font-options";

export const DOCUMENT_FONT_FAMILIES = WORKBENCH_DOCUMENT_FONT_OPTIONS.map((font) => ({
  id: font.id,
  label: font.label,
  value: font.fontFamily,
})) as Array<{
  id: WorkbenchDocumentFontId;
  label: string;
  value: string;
}>;

export type DocumentFontFamilyId = WorkbenchDocumentFontId;

export const DOCUMENT_FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32"];

export function resolveDocumentFontFamilyId(fontFamily: string | undefined): string {
  if (!fontFamily) return "";
  const normalized = fontFamily.replace(/['"]/g, "").toLowerCase();
  const selectedFamily = normalized.split(",")[0]?.trim() ?? "";
  const match = DOCUMENT_FONT_FAMILIES.find((entry) =>
    entry.value.replace(/['"]/g, "").toLowerCase().includes(selectedFamily) ||
    selectedFamily.includes(entry.id),
  );
  return match?.id ?? "";
}
